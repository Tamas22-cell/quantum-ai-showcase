import { useMemo, useState } from "react";
import { isAddress, keccak256, stringToHex, type Abi, type Address } from "viem";

import { txUrl } from "@/lib/web3/chains";
import { friendlyError } from "@/lib/web3/errors";
import { runSecurityChecks, type CheckStatus } from "@/lib/web3/security";
import { getInjected, publicClientFor, receiptToTx, trackReceipt, walletClientFor } from "@/lib/web3/tx";

import type { ChainCtx, CompiledArtifact } from "./types";
import { ExplorerLink, btnPrimary } from "./ui";

const STATUS_STYLE: Record<CheckStatus, string> = {
  pass: "text-emerald-400 border-emerald-500/40",
  info: "text-cyan-300 border-cyan-500/40",
  warn: "text-amber-300 border-amber-500/40",
  fail: "text-destructive border-destructive/50",
};

type Smoke = { state: "idle" | "running" | "pass" | "fail"; log: string[]; hash?: string };
type LocalScan = {
  state: "idle" | "done";
  score: number;
  verdict: "PASS" | "REVIEW" | "FAIL";
  pass: number;
  warn: number;
  fail: number;
  info: number;
};

/** Static heuristic checks + local scan summary + explicit wallet-signed write→read smoke test. */
export function SecurityPanel({ artifact, ctx, abi, address }: { artifact: CompiledArtifact; ctx: ChainCtx; abi: AbiItemList; address: string }) {
  const checks = useMemo(() => runSecurityChecks(artifact), [artifact]);
  const supportsSmoke = abi.some((f) => f.type === "function" && f.name === "store" && f.inputs?.map((p) => p.type).join(",") === "bytes32,string")
    && abi.some((f) => f.type === "function" && f.name === "records");

  const [localScan, setLocalScan] = useState<LocalScan>({ state: "idle", score: 0, verdict: "REVIEW", pass: 0, warn: 0, fail: 0, info: 0 });
  const [smoke, setSmoke] = useState<Smoke>({ state: "idle", log: [] });

  function runLocalSecurityTest() {
    const counts = checks.reduce(
      (acc, check) => {
        acc[check.status] += 1;
        return acc;
      },
      { pass: 0, warn: 0, fail: 0, info: 0 } as Record<CheckStatus, number>,
    );

    const total = Math.max(1, checks.length);
    const penalty = counts.fail * 35 + counts.warn * 12 + counts.info * 2;
    const score = Math.max(0, Math.min(100, Math.round(100 - penalty * (8 / Math.max(8, total)))));
    const verdict: LocalScan["verdict"] = counts.fail > 0 ? "FAIL" : counts.warn > 0 ? "REVIEW" : "PASS";

    setLocalScan({
      state: "done",
      score,
      verdict,
      pass: counts.pass,
      warn: counts.warn,
      fail: counts.fail,
      info: counts.info,
    });
  }

  async function runSmoke() {
    const provider = getInjected();
    if (!provider || !ctx.account || !isAddress(address)) return;
    if (!window.confirm(`Send a real test transaction to ${address} on ${ctx.testnet.name}? Your wallet will ask you to sign and pay testnet gas.`)) return;

    const value = `smoke-test ${new Date().toISOString()}`;
    const id = keccak256(stringToHex(value));
    const log = [`id = ${id}`, `value = "${value}"`];
    setSmoke({ state: "running", log: [...log, "Awaiting signature…"] });

    try {
      const pc = publicClientFor(ctx.testnet);
      const { request } = await pc.simulateContract({
        address: address as Address,
        abi: abi as Abi,
        functionName: "store",
        args: [id, value],
        account: ctx.account,
      });
      const hash = await walletClientFor(ctx.testnet, provider).writeContract({ ...request, account: ctx.account, chain: ctx.testnet.chain });
      const base = { hash, label: "smoke test · store()", chainId: ctx.testnet.id, timestamp: new Date().toISOString() };
      ctx.recordTx({ ...base, status: "pending" });
      setSmoke({ state: "running", log: [...log, `tx ${hash} submitted`], hash });

      const receipt = await trackReceipt(pc, hash, () => undefined);
      if (!receipt) {
        setSmoke({ state: "fail", log: [...log, "Receipt not found within 5 min — result unknown, check the explorer."], hash });
        return;
      }

      const tx = receiptToTx(base, receipt, abi);
      ctx.recordTx(tx);
      if (tx.status !== "success") {
        setSmoke({ state: "fail", log: [...log, `Transaction reverted in block ${tx.blockNumber}.`], hash });
        return;
      }

      const readBack = (await pc.readContract({
        address: address as Address,
        abi: abi as Abi,
        functionName: "records",
        args: [id],
        blockNumber: receipt.blockNumber,
      })) as string;

      const evOk = tx.events?.some((e) => e.name === "RecordStored");
      const ok = readBack === value;
      setSmoke({
        state: ok ? "pass" : "fail",
        hash,
        log: [
          ...log,
          `mined in block ${tx.blockNumber}, gas ${tx.gasUsed}`,
          `records(id) → "${readBack}"`,
          `RecordStored event ${evOk ? "decoded" : "not found"}`,
          ok ? "Read-back matches written value." : "Read-back does NOT match.",
        ],
      });
    } catch (e) {
      setSmoke({ state: "fail", log: [...log, friendlyError(e)] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">Interactive local security test</div>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
              Run the current Solidity source through the built-in heuristic security checks and get a consolidated result instantly. This is a local educational scan, not a formal audit.
            </p>
          </div>
          <button type="button" className={btnPrimary} disabled={!artifact.source.trim()} onClick={runLocalSecurityTest}>
            Run Security Test
          </button>
        </div>

        {localScan.state === "done" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="status">
            <div className="rounded-md border border-border bg-background p-3 lg:col-span-2">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">Overall result</div>
              <div className={`mt-2 text-2xl font-semibold ${localScan.verdict === "PASS" ? "text-emerald-400" : localScan.verdict === "FAIL" ? "text-destructive" : "text-amber-300"}`}>
                {localScan.verdict}
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">Security score: {localScan.score}/100</div>
            </div>
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="font-mono text-[10px] uppercase text-emerald-400">Pass</div>
              <div className="mt-2 text-xl font-semibold text-foreground">{localScan.pass}</div>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="font-mono text-[10px] uppercase text-amber-300">Warnings</div>
              <div className="mt-2 text-xl font-semibold text-foreground">{localScan.warn}</div>
            </div>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="font-mono text-[10px] uppercase text-destructive">Failures</div>
              <div className="mt-2 text-xl font-semibold text-foreground">{localScan.fail}</div>
            </div>
            <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3">
              <div className="font-mono text-[10px] uppercase text-cyan-300">Info</div>
              <div className="mt-2 text-xl font-semibold text-foreground">{localScan.info}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Static heuristic checks · not a formal audit</div>
          {!artifact.source.trim() ? (
            <p className="mt-3 text-sm text-muted-foreground">No source.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-3 rounded-md border border-border bg-background p-3">
                  <span className={`h-fit shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="mt-0.5 break-words text-xs text-muted-foreground">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Runtime smoke test · real chain</div>
          {!supportsSmoke ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Available for contracts exposing <code>store(bytes32,string)</code> and <code>records(bytes32)</code> (the default ResearchRegistry).
            </p>
          ) : (
            <>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Writes a unique test record with your wallet signature, waits for the receipt, then reads it back with eth_call. PASS/FAIL comes only from the chain result. Nothing is sent without your click and confirmation.
              </p>
              <button type="button" className={`${btnPrimary} mt-3`} disabled={!ctx.ready || !isAddress(address) || smoke.state === "running"} onClick={() => void runSmoke()}>
                {smoke.state === "running" ? "Running…" : "Run smoke test"}
              </button>
              {!ctx.ready ? <p className="mt-2 text-[11px] text-muted-foreground">Connect your wallet on {ctx.testnet.name} and set a deployed address first.</p> : null}
              {smoke.state !== "idle" ? (
                <div role="status" className="mt-3 rounded-md border border-border bg-background p-3 font-mono text-[11px]">
                  <div className={smoke.state === "pass" ? "text-emerald-400" : smoke.state === "fail" ? "text-destructive" : "text-muted-foreground"}>
                    {smoke.state === "pass" ? "PASS" : smoke.state === "fail" ? "FAIL" : "RUNNING"}
                  </div>
                  {smoke.log.map((l, i) => <div key={i} className="mt-1 break-all text-muted-foreground">{l}</div>)}
                  {smoke.hash ? <div className="mt-1"><ExplorerLink href={txUrl(ctx.testnet, smoke.hash)}>{smoke.hash}</ExplorerLink></div> : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type AbiItemList = CompiledArtifact["abi"];
