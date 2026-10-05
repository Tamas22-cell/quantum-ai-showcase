import { useCallback, useEffect, useMemo, useState } from "react";
import { encodeAbiParameters, encodeDeployData, formatEther, type Abi, type AbiParameter, type Hex } from "viem";
import { RefreshCw, Rocket, ShieldCheck, WalletCards } from "lucide-react";

import { parseArgs, defaultArgFor } from "@/lib/web3/abi-args";
import { TESTNETS, addressUrl, getTestnet, txUrl } from "@/lib/web3/chains";
import { friendlyError } from "@/lib/web3/errors";
import { loadDeployments, loadNetwork, loadTxs, saveDeployments, saveNetwork, saveTxs, type Deployment, type OnchainTx } from "@/lib/web3/history";
import { ethCost, getInjected, gwei, publicClientFor, receiptToTx, trackReceipt, walletClientFor, type TxPhase } from "@/lib/web3/tx";

import { ContractPanel } from "./contract-panel";
import { SecurityPanel } from "./security-panel";
import type { ChainCtx, CompiledArtifact } from "./types";
import { ExplorerLink, Field, ModeBadge, btnGhost, btnPrimary, inputCls, type LabMode } from "./ui";
import { useWallet } from "./use-wallet";
import { VerificationPanel } from "./verification-panel";

type DeployPhase = "idle" | "awaiting-signature" | TxPhase;
const PHASE_LABEL: Record<DeployPhase, string> = {
  idle: "Ready", "awaiting-signature": "Awaiting wallet signature…", submitted: "Submitted · waiting to be mined…",
  confirming: "Mined · confirming…", confirmed: "Confirmed", failed: "Failed (reverted)", "pending-timeout": "Still pending — check the explorer",
};

function Section({ n, title, icon, aside, children }: { n: string; title: string; icon: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-md border border-cyan-400/40 bg-cyan-400/5 p-5 sm:p-6" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-cyan-300">{icon}{n} · On-chain testnet</div>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Real testnet layer of the Web3 lab: wallet, deploy, ABI read/write, receipts/events, verification, security. */
export function OnchainLab({ artifact }: { artifact: CompiledArtifact }) {
  const wallet = useWallet();
  const [netId, setNetId] = useState(11155111);
  const [txs, setTxs] = useState<OnchainTx[]>([]);
  const [deployments, setDeployments] = useState<Record<string, Deployment>>({});
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<string>("—");
  const [balanceStatus, setBalanceStatus] = useState("");

  const testnet = getTestnet(netId) ?? TESTNETS[0]!;
  const symbol = testnet.chain.nativeCurrency.symbol;
  const deployment = deployments[String(testnet.id)];
  const ready = Boolean(wallet.account && wallet.chainId === testnet.id);
  const mode: LabMode = !wallet.account ? "SANDBOX" : ready && address ? "ON-CHAIN TESTNET" : "WALLET CONNECTED";
  // Use the fresh compiled ABI when present; otherwise the ABI persisted with the latest deployment.
  const abi = artifact.abi.length ? artifact.abi : ((deployment?.abi ?? []) as CompiledArtifact["abi"]);

  // Hydrate persisted state after mount (avoids SSR/client mismatch).
  useEffect(() => { setNetId(loadNetwork()); setTxs(loadTxs()); setDeployments(loadDeployments()); }, []);
  useEffect(() => { setAddress(deployment?.address ?? ""); }, [deployment?.address, testnet.id]);

  const recordTx = useCallback((tx: OnchainTx) => {
    setTxs((cur) => { const next = [tx, ...cur.filter((t) => t.hash !== tx.hash)]; saveTxs(next); return next; });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!wallet.account) { setBalance("—"); return; }
    try {
      const b = await publicClientFor(testnet).getBalance({ address: wallet.account });
      setBalance(`${Number(formatEther(b)).toFixed(6)} ${symbol}`); setBalanceStatus(`updated ${new Date().toLocaleTimeString()}`);
    } catch (e) { setBalanceStatus(`RPC error: ${friendlyError(e)}`); }
  }, [wallet.account, testnet, symbol]);
  useEffect(() => { void refreshBalance(); }, [refreshBalance]);

  const ctx: ChainCtx = { testnet, account: wallet.account, ready, recordTx, requestSwitch: () => (wallet.account ? void wallet.switchTo(testnet) : void wallet.connect()) };

  /* ---------- Deploy ---------- */
  const ctorInputs = useMemo(() => (artifact.abi.find((f) => f.type === "constructor")?.inputs ?? []), [artifact.abi]);
  const [ctorArgs, setCtorArgs] = useState<string[]>([]);
  useEffect(() => { setCtorArgs(ctorInputs.map((p) => defaultArgFor(p.type))); }, [ctorInputs]);
  const [estimate, setEstimate] = useState<{ gas: bigint; price: bigint } | null>(null);
  const [deployPhase, setDeployPhase] = useState<DeployPhase>("idle");
  const [deployMsg, setDeployMsg] = useState("");
  const [lastDeploy, setLastDeploy] = useState<OnchainTx | null>(null);
  useEffect(() => { setEstimate(null); }, [artifact.bytecode, testnet.id]);

  const deployData = () => {
    const args = parseArgs(ctorInputs, ctorArgs);
    return { args, data: encodeDeployData({ abi: artifact.abi as Abi, bytecode: artifact.bytecode as Hex, args }) };
  };

  async function estimateDeploy() {
    setDeployMsg("");
    try {
      const pc = publicClientFor(testnet);
      const { data } = deployData();
      const [gas, price] = await Promise.all([pc.estimateGas({ account: wallet.account ?? undefined, data }), pc.getGasPrice()]);
      setEstimate({ gas, price });
    } catch (e) { setDeployMsg(friendlyError(e)); }
  }

  async function deploy() {
    const provider = getInjected();
    if (!provider || !wallet.account || !ready) return;
    setDeployMsg(""); setLastDeploy(null);
    try {
      const { args } = deployData();
      const pc = publicClientFor(testnet);
      // Pre-flight funds check against a real estimate (where the RPC supports it).
      try {
        const [gas, price, bal] = await Promise.all([pc.estimateGas({ account: wallet.account, data: deployData().data }), pc.getGasPrice(), pc.getBalance({ address: wallet.account })]);
        setEstimate({ gas, price });
        if (bal < gas * price) { setDeployPhase("idle"); setDeployMsg(`Insufficient ${symbol}: need ≈ ${ethCost(gas, price, symbol)}, have ${Number(formatEther(bal)).toFixed(6)}. Get testnet ETH from the faucet.`); return; }
      } catch { /* estimation unsupported: let the wallet estimate */ }
      setDeployPhase("awaiting-signature");
      const hash = await walletClientFor(testnet, provider).deployContract({ abi: artifact.abi as Abi, bytecode: artifact.bytecode as Hex, args, account: wallet.account, chain: testnet.chain });
      const base = { hash, label: `deploy ${artifact.contractName}`, chainId: testnet.id, timestamp: new Date().toISOString() };
      recordTx({ ...base, status: "pending" });
      setLastDeploy({ ...base, status: "pending" });
      const receipt = await trackReceipt(pc, hash, setDeployPhase);
      if (!receipt) return;
      const tx = receiptToTx(base, receipt, artifact.abi);
      recordTx(tx); setLastDeploy(tx);
      if (tx.status === "success" && tx.contractAddress) {
        const dep: Deployment = {
          chainId: testnet.id, address: tx.contractAddress, txHash: hash, contractName: artifact.contractName, abi: artifact.abi,
          constructorArgs: ctorInputs.length ? encodeAbiParameters(ctorInputs as AbiParameter[], args).slice(2) : "",
          compilerVersion: artifact.compilerVersion, source: artifact.source, timestamp: base.timestamp,
        };
        setDeployments((cur) => { const next = { ...cur, [String(testnet.id)]: dep }; saveDeployments(next); return next; });
        setAddress(tx.contractAddress);
        void refreshBalance();
      }
    } catch (e) { setDeployPhase("failed"); setDeployMsg(friendlyError(e)); }
  }

  async function recheck(t: OnchainTx) {
    const net = getTestnet(t.chainId);
    if (!net) return;
    try {
      const r = await publicClientFor(net).getTransactionReceipt({ hash: t.hash as Hex });
      recordTx(receiptToTx(t, r, abi));
    } catch { /* still pending or RPC unavailable — leave as pending */ }
  }

  const onWrongNetwork = wallet.account && wallet.chainId !== testnet.id;
  const walletName = wallet.chainId ? getTestnet(wallet.chainId)?.name ?? `chain ${wallet.chainId}` : "—";

  return (
    <>
      {/* Wallet + network */}
      <Section n="4" title="Wallet & Network" icon={<WalletCards className="size-4" aria-hidden="true" />} aside={<ModeBadge mode={mode} />}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-3">
            <label className="block text-xs text-muted-foreground">Target testnet
              <select value={netId} onChange={(e) => { const id = Number(e.target.value); setNetId(id); saveNetwork(id); }} className={inputCls}>
                {TESTNETS.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.id}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={() => void wallet.connect()}>{wallet.account ? "Reconnect wallet" : "Connect wallet"}</button>
              <button type="button" className={btnGhost} disabled={!wallet.available} onClick={() => void wallet.switchTo(testnet)}>Switch to {testnet.name}</button>
              <button type="button" className={btnGhost} disabled={!wallet.account} onClick={() => void refreshBalance()} aria-label="Refresh balance"><RefreshCw className="inline size-3.5" aria-hidden="true" /> Refresh</button>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground" role="status">{wallet.available ? wallet.status : "No injected EVM wallet detected — sandbox mode only. Install MetaMask or a compatible wallet."}</p>
            {onWrongNetwork ? <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 font-mono text-[11px] text-amber-300">Wallet is on {walletName}. Switch to {testnet.name} to deploy or write.</p> : null}
          </div>
          <div className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-2">
            <Field k="Connected address" v={wallet.account ? <ExplorerLink href={addressUrl(testnet, wallet.account)}>{wallet.account}</ExplorerLink> : "Not connected"} />
            <Field k="Wallet network" v={wallet.chainId ? `${walletName} (${wallet.chainId})` : "—"} />
            <Field k={`Balance on ${testnet.name}`} v={<>{balance}<div className="text-[10px] text-muted-foreground">{balanceStatus}</div></>} />
            <Field k="Faucet" v={<ExplorerLink href={testnet.faucet}>Get {testnet.name} ETH</ExplorerLink>} />
          </div>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">Your keys stay in your wallet. This page never requests, stores or transmits private keys or seed phrases; every transaction requires your explicit signature.</p>
      </Section>

      {/* Deploy */}
      <Section n="5" title="Deploy On-Chain" icon={<Rocket className="size-4" aria-hidden="true" />} aside={<span className="font-mono text-[11px] text-muted-foreground">{testnet.name}</span>}>
        {!artifact.compiled ? <p className="text-sm text-muted-foreground">Compile the contract successfully (section 1) to enable real deployment.</p> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">Artifact · {artifact.contractName} · {Math.max(0, artifact.bytecode.length / 2 - 1).toLocaleString()} bytes</div>
              {ctorInputs.map((p, i) => (
                <label key={i} className="mt-3 block text-xs text-muted-foreground">constructor {p.name || `arg${i}`} · {p.type}
                  <input value={ctorArgs[i] ?? ""} onChange={(e) => setCtorArgs((s) => { const n = [...s]; n[i] = e.target.value; return n; })} className={inputCls} />
                </label>
              ))}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => void estimateDeploy()}>Estimate gas</button>
                {ready
                  ? <button type="button" className={btnPrimary} disabled={["awaiting-signature", "submitted", "confirming"].includes(deployPhase)} onClick={() => void deploy()}>Deploy On-Chain</button>
                  : <button type="button" className={btnPrimary} onClick={ctx.requestSwitch}>{wallet.account ? `Switch to ${testnet.name}` : "Connect wallet to deploy"}</button>}
              </div>
              {estimate ? <p className="mt-3 font-mono text-[11px] text-muted-foreground">Estimated gas {estimate.gas.toLocaleString()} · gas price {gwei(estimate.price)} · ≈ {ethCost(estimate.gas, estimate.price, symbol)}</p> : null}
              {deployMsg ? <p role="alert" className="mt-3 break-words font-mono text-[11px] text-destructive">{deployMsg}</p> : null}
            </div>
            <div className="rounded-md border border-border bg-card p-4" aria-live="polite">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">Deployment status</div>
              <div className={`mt-2 font-mono text-sm font-semibold ${deployPhase === "confirmed" ? "text-emerald-400" : deployPhase === "failed" ? "text-destructive" : "text-cyan-300"}`}>{PHASE_LABEL[deployPhase]}</div>
              {(lastDeploy ?? (deployment ? { hash: deployment.txHash, contractAddress: deployment.address } as Partial<OnchainTx> : null)) ? (() => {
                const d = lastDeploy ?? ({ hash: deployment!.txHash, contractAddress: deployment!.address } as OnchainTx);
                return (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field k="Contract address" v={d.contractAddress ? <ExplorerLink href={addressUrl(testnet, d.contractAddress)}>{d.contractAddress}</ExplorerLink> : "—"} />
                    <Field k="Tx hash" v={<ExplorerLink href={txUrl(testnet, d.hash)}>{d.hash}</ExplorerLink>} />
                    <Field k="Block" v={d.blockNumber ?? "—"} />
                    <Field k="Gas used" v={d.gasUsed ? Number(d.gasUsed).toLocaleString() : "—"} />
                    <Field k="Effective gas price" v={gwei(d.effectiveGasPrice)} />
                    <Field k="Status" v={d.status ?? (lastDeploy ? "—" : "saved from previous session")} />
                  </div>
                );
              })() : <p className="mt-3 text-xs text-muted-foreground">No deployment on {testnet.name} yet.</p>}
            </div>
          </div>
        )}
      </Section>

      {/* Contract interaction */}
      <Section n="6" title="ABI-Driven Contract Panel" icon={<WalletCards className="size-4" aria-hidden="true" />} aside={<ModeBadge mode={mode} />}>
        <ContractPanel ctx={ctx} abi={abi} address={address} setAddress={setAddress} latestAddress={deployment?.address} />
      </Section>

      {/* History */}
      <Section n="7" title="On-Chain Transaction History" icon={<RefreshCw className="size-4" aria-hidden="true" />} aside={<span className="font-mono text-[10px] uppercase text-muted-foreground">Real transactions only · separate from sandbox</span>}>
        {txs.length === 0 ? <p className="text-sm text-muted-foreground">No on-chain transactions yet.</p> : (
          <ul className="space-y-2">
            {txs.map((t) => {
              const net = getTestnet(t.chainId);
              return (
                <li key={t.hash} className="rounded-md border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{t.label} · {net?.name ?? t.chainId}</span>
                    <span className={`font-mono text-[10px] uppercase ${t.status === "success" ? "text-emerald-400" : t.status === "reverted" ? "text-destructive" : "text-amber-300"}`}>{t.status}</span>
                  </div>
                  <div className="mt-1 text-[11px]">{net ? <ExplorerLink href={txUrl(net, t.hash)}>{t.hash}</ExplorerLink> : t.hash}</div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {new Date(t.timestamp).toLocaleString()} · block {t.blockNumber ?? "—"} · gas {t.gasUsed ? Number(t.gasUsed).toLocaleString() : "—"} · {gwei(t.effectiveGasPrice)}
                  </div>
                  {t.contractAddress && net ? <div className="mt-1 text-[11px]">contract <ExplorerLink href={addressUrl(net, t.contractAddress)}>{t.contractAddress}</ExplorerLink></div> : null}
                  {t.events?.length ? (
                    <div className="mt-2 space-y-1">{t.events.map((e, i) => (
                      <div key={i} className="break-all rounded-sm border border-border bg-background px-2 py-1 font-mono text-[10px]"><span className="text-amber-300">{e.name}</span>{" "}{Object.entries(e.args).map(([k, v]) => `${k}=${v}`).join(" · ")}</div>
                    ))}</div>
                  ) : null}
                  {t.status === "pending" ? <button type="button" className={`${btnGhost} mt-2 py-1 text-[10px]`} onClick={() => void recheck(t)}>Recheck receipt</button> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section n="8" title="Contract Verification" icon={<ShieldCheck className="size-4" aria-hidden="true" />}>
        <VerificationPanel testnet={testnet} deployment={deployment} />
      </Section>

      <Section n="9" title="Security & Tests" icon={<ShieldCheck className="size-4" aria-hidden="true" />}>
        <SecurityPanel artifact={artifact} ctx={ctx} abi={abi} address={address} />
      </Section>
    </>
  );
}
