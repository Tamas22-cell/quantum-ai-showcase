import { codeUrl, verifyUrl, type TestnetConfig } from "@/lib/web3/chains";
import type { Deployment } from "@/lib/web3/history";

import { CopyButton, ExplorerLink, Field } from "./ui";

/** solc "0.8.30+commit.73712a01.Emscripten.clang" → explorer form value "v0.8.30+commit.73712a01". */
export const explorerCompilerVersion = (v: string) => (v && v !== "—" ? `v${v.replace(/^v/, "").split(".Emscripten")[0]}` : "—");

/**
 * Verification READINESS only. Submitting to an explorer API needs a secret key, which must never ship
 * to the browser, so we surface everything needed for manual submission and never claim success.
 */
export function VerificationPanel({ testnet, deployment }: { testnet: TestnetConfig; deployment?: Deployment }) {
  if (!deployment) return <p className="text-sm text-muted-foreground">Deploy a contract on {testnet.name} to prepare verification details.</p>;
  const abi = JSON.stringify(deployment.abi);
  const ver = explorerCompilerVersion(deployment.compilerVersion);
  return (
    <div>
      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 font-mono text-xs text-amber-300" role="status">
        Status: Not verified / verification requires explorer submission
      </p>
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
        <ExplorerLink href={verifyUrl(testnet, deployment.address)}>Verify Contract on {testnet.explorerName}</ExplorerLink>
        <ExplorerLink href={codeUrl(testnet, deployment.address)}>Check verification status on {testnet.explorerName}</ExplorerLink>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Choose "Solidity (Single file)", paste the source, and match the compiler version and optimizer settings above. This lab does not hold an explorer API key and cannot confirm verification itself.</p>
    </div>
  );
}
