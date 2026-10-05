import { useEffect, useMemo, useState } from "react";
import { isAddress, parseEther, type Abi, type Address } from "viem";

import { defaultArgFor, formatValue, parseArgs } from "@/lib/web3/abi-args";
import { addressUrl, txUrl } from "@/lib/web3/chains";
import { friendlyError } from "@/lib/web3/errors";
import type { AbiItem } from "@/lib/web3/security";
import { ethCost, publicClientFor, receiptToTx, trackReceipt, walletClientFor, getInjected, type TxPhase } from "@/lib/web3/tx";

import type { ChainCtx } from "./types";
import { ExplorerLink, btnGhost, btnPrimary, inputCls } from "./ui";

type Result = { kind: "ok" | "err" | "info"; text: string; hash?: string };

/** ABI-driven controls against a real deployed contract: eth_call for reads, signed txs for writes. */
export function ContractPanel({ ctx, abi, address, setAddress, latestAddress }: { ctx: ChainCtx; abi: AbiItem[]; address: string; setAddress: (a: string) => void; latestAddress?: string | undefined }) {
  const fns = useMemo(() => abi.filter((f) => f.type === "function"), [abi]);
  const [args, setArgs] = useState<Record<string, string[]>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<string>("");

  useEffect(() => {
    const d: Record<string, string[]> = {};
    fns.forEach((f, i) => { d[`${f.name}-${i}`] = (f.inputs ?? []).map((p) => defaultArgFor(p.type)); });
    setArgs(d); setResults({});
  }, [fns]);

  // Confirm bytecode exists at the address on the selected chain (real eth_getCode).
  useEffect(() => {
    if (!isAddress(address)) { setCodeStatus(address ? "Invalid address" : ""); return; }
    let live = true;
    publicClientFor(ctx.testnet).getCode({ address: address as Address })
      .then((c) => live && setCodeStatus(c && c !== "0x" ? `Contract code found on ${ctx.testnet.name}` : `No contract code at this address on ${ctx.testnet.name}`))
      .catch((e) => live && setCodeStatus(`RPC error: ${friendlyError(e)}`));
    return () => { live = false; };
  }, [address, ctx.testnet]);

  const set = (key: string, r: Result) => setResults((s) => ({ ...s, [key]: r }));
  const validAddress = isAddress(address);

  async function read(f: AbiItem, key: string) {
    setBusy(key);
    try {
      const parsed = parseArgs(f.inputs, args[key]);
      const out = await publicClientFor(ctx.testnet).readContract({ address: address as Address, abi: abi as Abi, functionName: f.name!, args: parsed });
      set(key, { kind: "ok", text: `eth_call → ${formatValue(out)}` });
    } catch (e) { set(key, { kind: "err", text: friendlyError(e) }); }
    finally { setBusy(null); }
  }

  function common(f: AbiItem, key: string) {
    const parsed = parseArgs(f.inputs, args[key]);
    const value = f.stateMutability === "payable" ? parseEther(values[key] || "0") : undefined;
    return { address: address as Address, abi: abi as Abi, functionName: f.name!, args: parsed, account: ctx.account!, value };
  }

  async function estimate(f: AbiItem, key: string) {
    setBusy(key);
    try {
      const pc = publicClientFor(ctx.testnet);
      const [gas, price] = await Promise.all([pc.estimateContractGas(common(f, key)), pc.getGasPrice()]);
      set(key, { kind: "info", text: `Estimated gas ${gas.toLocaleString()} · ≈ ${ethCost(gas, price, ctx.testnet.chain.nativeCurrency.symbol)} at current gas price` });
    } catch (e) { set(key, { kind: "err", text: friendlyError(e) }); }
    finally { setBusy(null); }
  }

  async function write(f: AbiItem, key: string) {
    const provider = getInjected();
    if (!provider || !ctx.account) return;
    setBusy(key);
    const label = `${f.name}()`;
    try {
      const pc = publicClientFor(ctx.testnet);
      // Simulate first: surfaces revert reasons before asking for a signature.
      const { request } = await pc.simulateContract(common(f, key));
      set(key, { kind: "info", text: "Awaiting wallet signature…" });
      const hash = await walletClientFor(ctx.testnet, provider).writeContract({ ...request, account: ctx.account, chain: ctx.testnet.chain });
      const base = { hash, label, chainId: ctx.testnet.id, timestamp: new Date().toISOString() };
      ctx.recordTx({ ...base, status: "pending" });
      const phaseText: Record<TxPhase, string> = { submitted: "Submitted · waiting for block…", confirming: "Mined · confirming…", confirmed: "Confirmed", failed: "Failed (reverted)", "pending-timeout": "Still pending after 5 min — check the explorer; recheck from history." };
      const receipt = await trackReceipt(pc, hash, (p) => set(key, { kind: p === "failed" ? "err" : "info", text: phaseText[p], hash }));
      if (receipt) {
        const tx = receiptToTx(base, receipt, abi);
        ctx.recordTx(tx);
        const ev = tx.events?.map((e) => `${e.name}(${Object.entries(e.args).map(([k, v]) => `${k}=${v}`).join(", ")})`).join("; ");
        set(key, { kind: tx.status === "success" ? "ok" : "err", hash, text: `${tx.status === "success" ? "Confirmed" : "Reverted"} in block ${tx.blockNumber} · gas used ${Number(tx.gasUsed).toLocaleString()}${ev ? ` · events: ${ev}` : ""}` });
      }
    } catch (e) { set(key, { kind: "err", text: friendlyError(e) }); }
    finally { setBusy(null); }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-xs text-muted-foreground">Contract address on {ctx.testnet.name}
          <input value={address} onChange={(e) => setAddress(e.target.value.trim())} placeholder="0x… (deployed or pasted compatible address)" className={inputCls} />
        </label>
        <button type="button" className={btnGhost} disabled={!latestAddress} onClick={() => latestAddress && setAddress(latestAddress)}>Use latest deployment</button>
      </div>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        {codeStatus}{validAddress ? <> · <ExplorerLink href={addressUrl(ctx.testnet, address)}>view on {ctx.testnet.explorerName}</ExplorerLink></> : null}
      </p>

      {fns.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Compile a contract (or deploy one) to generate controls from its ABI.</p> : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {fns.map((f, i) => {
            const key = `${f.name}-${i}`;
            const isRead = f.stateMutability === "view" || f.stateMutability === "pure";
            const r = results[key];
            return (
              <div key={key} className="rounded-md border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="font-mono text-xs font-semibold">{f.name}({(f.inputs ?? []).map((p) => p.type).join(",")})</code>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${isRead ? "border-cyan-500/40 text-cyan-300" : "border-amber-500/40 text-amber-300"}`}>{isRead ? "eth_call" : `signed tx · ${f.stateMutability}`}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {(f.inputs ?? []).map((p, j) => (
                    <label key={j} className="block text-xs text-muted-foreground">{p.name || `arg${j}`} · {p.type}
                      <input value={args[key]?.[j] ?? ""} onChange={(e) => setArgs((s) => { const n = [...(s[key] ?? [])]; n[j] = e.target.value; return { ...s, [key]: n }; })} className={inputCls} />
                    </label>
                  ))}
                  {f.stateMutability === "payable" ? (
                    <label className="block text-xs text-muted-foreground">value ({ctx.testnet.chain.nativeCurrency.symbol})
                      <input value={values[key] ?? "0"} onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))} className={inputCls} />
                    </label>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {isRead ? (
                    <button type="button" className={btnPrimary} disabled={!validAddress || busy === key} onClick={() => void read(f, key)}>Read (eth_call)</button>
                  ) : ctx.ready ? (
                    <>
                      <button type="button" className={btnGhost} disabled={!validAddress || busy === key} onClick={() => void estimate(f, key)}>Estimate gas</button>
                      <button type="button" className={btnPrimary} disabled={!validAddress || busy === key} onClick={() => void write(f, key)}>Sign &amp; send</button>
                    </>
                  ) : (
                    <button type="button" className={btnGhost} onClick={ctx.requestSwitch}>{ctx.account ? `Switch to ${ctx.testnet.name} to write` : "Connect wallet to write"}</button>
                  )}
                </div>
                {r ? (
                  <div role="status" className={`mt-3 whitespace-pre-wrap break-all rounded-md border border-border bg-background p-3 font-mono text-[11px] ${r.kind === "ok" ? "text-emerald-300" : r.kind === "err" ? "text-destructive" : "text-muted-foreground"}`}>
                    {r.text}{r.hash ? <div className="mt-1"><ExplorerLink href={txUrl(ctx.testnet, r.hash)}>{r.hash}</ExplorerLink></div> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Arguments: bool true/false · ints decimal or 0x · bytes32 as 0x-hex or <code>text:label</code> · arrays as JSON, e.g. <code>[1,2]</code>.</p>
    </div>
  );
}
