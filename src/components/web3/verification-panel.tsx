import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { codeUrl, verifyUrl, type TestnetConfig } from "@/lib/web3/chains";
import type { Deployment } from "@/lib/web3/history";
import {
  getContractVerificationStatus,
  submitContractVerification,
  type VerificationStatus,
} from "@/lib/web3/verification.functions";

import { CopyButton, ExplorerLink, Field, btnGhost, btnPrimary } from "./ui";

/** solc "0.8.30+commit.73712a01.Emscripten.clang" → explorer form value "v0.8.30+commit.73712a01". */
export const explorerCompilerVersion = (v: string) => (v && v !== "—" ? `v${v.replace(/^v/, "").split(".Emscripten")[0]}` : "—");

const EMPTY_STATUS: VerificationStatus = {
  configured: false,
  checked: false,
  verified: false,
  source: "none",
  message: "Verification status has not been checked yet.",
};

/** Live explorer/Sourcify verification status + optional server-side explorer submission. */
export function VerificationPanel({ testnet, deployment }: { testnet: TestnetConfig; deployment?: Deployment | undefined }) {
  const statusFn = useServerFn(getContractVerificationStatus);
  const submitFn = useServerFn(submitContractVerification);
  const [status, setStatus] = useState<VerificationStatus>(EMPTY_STATUS);
  const [busy, setBusy] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const refresh = useCallback(async () => {
    if (!deployment) return;
    setBusy(true);
    try {
      const next = await statusFn({ data: { chainId: testnet.id, address: deployment.address } });
      setStatus(next);
    } catch (error) {
      setStatus({
        configured: false,
        checked: false,
        verified: false,
        source: "none",
        message: error instanceof Error ? error.message : "Verification status request failed.",
      });
    } finally {
      setBusy(false);
    }
  }, [deployment, statusFn, testnet.id]);

  useEffect(() => {
    setSubmitMsg("");
    if (deployment) void refresh();
    else setStatus(EMPTY_STATUS);
  }, [deployment, refresh]);

  if (!deployment) return <p className="text-sm text-muted-foreground">Deploy a contract on {testnet.name} to enable live verification.</p>;

  const abi = JSON.stringify(deployment.abi);
  const ver = explorerCompilerVersion(deployment.compilerVersion);

  async function submit() {
    // `deployment` is a prop: narrowing does not survive into this closure, so re-check it here.
    if (!deployment) return;
    setBusy(true);
    setSubmitMsg("");
    try {
      const result = await submitFn({
        data: {
          chainId: testnet.id,
          address: deployment.address,
          source: deployment.source,
          contractName: deployment.contractName,
          compilerVersion: ver,
          constructorArgs: deployment.constructorArgs || "",
        },
      });
      setSubmitMsg(result.message + (result.guid ? ` · request ${result.guid}` : ""));
      if (result.alreadyVerified) {
        setStatus({ configured: true, checked: true, verified: true, source: "etherscan", message: "Contract is already verified." });
      } else if (result.ok) {
        setStatus({ configured: true, checked: true, verified: false, source: "etherscan", message: "Verification submitted; explorer processing may still be pending." });
        window.setTimeout(() => void refresh(), 1500);
      }
    } catch (error) {
      setSubmitMsg(error instanceof Error ? error.message : "Verification submission failed.");
    } finally {
      setBusy(false);
    }
  }

  const tone = status.verified
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : status.checked
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";

  return (
    <div>
      <div className={`rounded-md border p-3 font-mono text-xs ${tone}`} role="status">
        <div className="font-semibold">{status.verified ? "VERIFIED" : status.checked ? "NOT VERIFIED" : "LIVE STATUS"}</div>
        <div className="mt-1 opacity-90">{status.message}</div>
        {status.source !== "none" ? <div className="mt-1 text-[10px] opacity-75">Source: {status.source}{status.match ? ` · ${status.match} match` : ""}</div> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btnGhost} disabled={busy} onClick={() => void refresh()}>
          {busy ? "Checking…" : "Check live status"}
        </button>
        <button type="button" className={btnPrimary} disabled={busy || !status.configured || status.verified} onClick={() => void submit()}>
          {status.verified ? "Already verified" : "Submit verification"}
        </button>
      </div>

      {!status.configured ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Live public verification status works through Sourcify. Add <code>ETHERSCAN_API_KEY</code> in Vercel to enable explorer API status and one-click explorer submission.
        </p>
      ) : null}
      {submitMsg ? <p className="mt-3 break-words font-mono text-[11px] text-muted-foreground">{submitMsg}</p> : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1"><Field k="Contract address" v={deployment.address} /><CopyButton value={deployment.address} /></div>
        <div className="space-y-1"><Field k="Compiler version" v={ver} /><CopyButton value={ver} /></div>
        <div className="space-y-1"><Field k="Contract name" v={deployment.contractName} /><CopyButton value={deployment.contractName} /></div>
        <Field k="Optimizer" v="Enabled · 200 runs" />
        <Field k="EVM version" v="Compiler default" />
        <div className="space-y-1"><Field k="Constructor args (ABI-encoded)" v={deployment.constructorArgs || "None"} />{deployment.constructorArgs ? <CopyButton value={deployment.constructorArgs} /> : null}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton value={deployment.source} label="Copy source" />
        <CopyButton value={abi} label="Copy ABI" />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <ExplorerLink href={verifyUrl(testnet, deployment.address)}>Open manual verification on {testnet.explorerName}</ExplorerLink>
        <ExplorerLink href={codeUrl(testnet, deployment.address)}>Open contract code on {testnet.explorerName}</ExplorerLink>
      </div>
    </div>
  );
}
