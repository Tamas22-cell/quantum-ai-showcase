import { useEffect, useMemo, useRef, useState } from "react";
import { Check, KeyRound, Loader2, Pickaxe, Plus, Save, ShieldCheck, ShieldX, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveExperimentSnapshot } from "@/lib/experiment-history";
import {
  MAX_DIFFICULTY, analyze, blockHash, generateDemoWallet, merkleLevels, mine, sampleTransactions, serializeTx,
  signMessage, verifyMessage, type DemoWallet, type MineResult, type Tx,
} from "@/lib/blockchain/core";

const GENESIS_PREV = "0".repeat(64);
const FIXED_TS = "2026-01-01T00:00:00Z"; // fixed so block hashes are reproducible
const DEFAULT_TXS: Tx[] = [
  { from: "alice", to: "bob", amount: 12.5 },
  { from: "bob", to: "carol", amount: 4.2 },
  { from: "carol", to: "dave", amount: 1.75 },
];

const inputCls = "h-9 w-full min-w-0 rounded-sm border border-border bg-background px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const panel = "rounded-md border border-border bg-card p-4 sm:p-5";
const label = "font-mono text-[10px] uppercase tracking-wider text-muted-foreground";

function Hash({ value, highlight = 0 }: { value: string; highlight?: number }) {
  return (
    <code className="block break-all font-mono text-xs leading-5">
      <span className="text-primary">{value.slice(0, highlight)}</span>
      <span className="text-foreground">{value.slice(highlight)}</span>
    </code>
  );
}

export function BlockchainLab() {
  // Shared state — the block builder, miner and Merkle view all use the same transactions.
  const [txs, setTxs] = useState<Tx[]>(DEFAULT_TXS);
  const [index, setIndex] = useState(1);
  const [levels, setLevels] = useState<string[][]>([]);
  const [nonce, setNonce] = useState(0);
  const [hash, setHash] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [mining, setMining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mineResult, setMineResult] = useState<MineResult | null>(null);
  const abortRef = useRef({ aborted: false });

  const root = levels.length ? levels[levels.length - 1]![0]! : "";

  useEffect(() => {
    let live = true;
    merkleLevels(txs.map(serializeTx)).then((l) => { if (live) setLevels(l); });
    setMineResult(null);
    return () => { live = false; };
  }, [txs]);

  useEffect(() => {
    if (!root) return;
    let live = true;
    blockHash({ index, prevHash: GENESIS_PREV, timestamp: FIXED_TS, merkleRoot: root, nonce }).then((h) => { if (live) setHash(h); });
    return () => { live = false; };
  }, [index, root, nonce]);

  useEffect(() => () => { abortRef.current.aborted = true; }, []);

  function updateTx(i: number, patch: Partial<Tx>) {
    setTxs((prev) => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }

  async function runMine() {
    abortRef.current = { aborted: false };
    setMining(true); setProgress(0); setMineResult(null);
    const r = await mine({ index, prevHash: GENESIS_PREV, timestamp: FIXED_TS, merkleRoot: root }, difficulty, {
      maxAttempts: 2_000_000, onProgress: setProgress, signal: abortRef.current,
    });
    setMining(false);
    setMineResult(r);
    if (r.found) setNonce(r.nonce);
  }

  const valid = hash.startsWith("0".repeat(difficulty));

  // Wallet demo
  const [wallet, setWallet] = useState<DemoWallet | null>(null);
  const [message, setMessage] = useState("Transfer 10 SIM from alice to bob");
  const [signature, setSignature] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);

  async function newWallet() {
    setWallet(await generateDemoWallet());
    setSignature(""); setVerified(null);
  }
  async function sign() {
    if (!wallet) return;
    setSignature(await signMessage(wallet.privateKey, message));
    setVerifyMsg(message); setVerified(null);
  }
  async function verify() {
    if (!wallet) return;
    setVerified(await verifyMessage(wallet.publicKey, verifyMsg, signature));
  }

  // Analytics
  const [seed, setSeed] = useState(2026);
  const sample = useMemo(() => sampleTransactions(60, seed), [seed]);
  const stats = useMemo(() => analyze(sample), [sample]);

  const [saved, setSaved] = useState(false);
  function save() {
    saveExperimentSnapshot({
      module: "Blockchain Research Lab",
      route: "/lab/blockchain",
      fields: {
        transactions: String(txs.length),
        blockIndex: String(index),
        merkleRoot: root,
        nonce: String(nonce),
        blockHash: hash,
        difficulty: String(difficulty),
        validPoW: valid,
        miningAttempts: mineResult ? String(mineResult.attempts) : "not mined",
        signatureVerified: verified === null ? "not tested" : String(verified),
        analyticsSeed: String(seed),
        analyticsGini: stats.gini.toFixed(3),
      },
      summary: [
        `Block #${index} with ${txs.length} transactions`,
        `Merkle root ${root}`,
        `Nonce ${nonce} → hash ${hash} (${valid ? "valid" : "invalid"} at difficulty ${difficulty})`,
        mineResult ? `Mining: ${mineResult.attempts} attempts in ${mineResult.ms.toFixed(0)} ms` : "",
        `Analytics (seed ${seed}): ${stats.txCount} tx, volume ${stats.volume.toFixed(2)}, Gini ${stats.gini.toFixed(3)}, top-10% share ${(stats.whaleShare * 100).toFixed(1)}%`,
      ].filter(Boolean).join("\n"),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border-strong bg-surface px-4 py-3 text-xs text-muted-foreground">
        <span>Educational simulation using SHA-256 and ECDSA from your browser's Web Crypto API. No real chain, funds, wallets or network calls.</span>
        <Button type="button" variant="outline" size="sm" onClick={save} disabled={!hash}>
          {saved ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {saved ? "Saved to history" : "Save experiment"}
        </Button>
      </div>

      <Tabs defaultValue="block">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-card p-1">
          <TabsTrigger value="block">Block builder</TabsTrigger>
          <TabsTrigger value="mining">Mining</TabsTrigger>
          <TabsTrigger value="merkle">Merkle tree</TabsTrigger>
          <TabsTrigger value="wallet">Wallet &amp; signature</TabsTrigger>
          <TabsTrigger value="analytics">On-chain analytics</TabsTrigger>
          <TabsTrigger value="quantum">Blockchain + Quantum</TabsTrigger>
        </TabsList>

        {/* 1. Block builder */}
        <TabsContent value="block" className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <section className={panel} aria-labelledby="txs-h">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="txs-h" className={label}>Transactions</h2>
              <Button type="button" size="sm" variant="ghost" onClick={() => setTxs((p) => [...p, { from: "eve", to: "alice", amount: 1 }])} disabled={txs.length >= 8}>
                <Plus className="size-4" aria-hidden="true" /> Add
              </Button>
            </div>
            <ul className="space-y-2">
              {txs.map((t, i) => (
                <li key={i} className="grid grid-cols-[1fr_1fr_5rem_auto] items-center gap-2">
                  <input aria-label={`Transaction ${i + 1} sender`} className={inputCls} value={t.from} onChange={(e) => updateTx(i, { from: e.target.value })} />
                  <input aria-label={`Transaction ${i + 1} recipient`} className={inputCls} value={t.to} onChange={(e) => updateTx(i, { to: e.target.value })} />
                  <input aria-label={`Transaction ${i + 1} amount`} type="number" step="0.01" className={inputCls} value={t.amount} onChange={(e) => updateTx(i, { amount: Number(e.target.value) || 0 })} />
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove transaction ${i + 1}`} onClick={() => setTxs((p) => p.filter((_, j) => j !== i))} disabled={txs.length <= 1}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <section className={panel} aria-labelledby="hdr-h">
            <h2 id="hdr-h" className={label}>Block header</h2>
            <dl className="mt-3 space-y-3 text-xs">
              <div><dt className={label}>Index</dt><dd><input aria-label="Block index" type="number" min={0} className={inputCls} value={index} onChange={(e) => setIndex(Math.max(0, Number(e.target.value) || 0))} /></dd></div>
              <div><dt className={label}>Previous hash</dt><dd><Hash value={GENESIS_PREV} /></dd></div>
              <div><dt className={label}>Timestamp (fixed)</dt><dd className="font-mono">{FIXED_TS}</dd></div>
              <div><dt className={label}>Merkle root</dt><dd><Hash value={root} /></dd></div>
              <div><dt className={label}>Nonce</dt><dd><input aria-label="Nonce" type="number" min={0} className={inputCls} value={nonce} onChange={(e) => setNonce(Math.max(0, Number(e.target.value) || 0))} /></dd></div>
              <div><dt className={label}>Block hash · SHA-256(header)</dt><dd data-testid="block-hash"><Hash value={hash} highlight={valid ? difficulty : 0} /></dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Edit any transaction or field and the hash changes completely — that is what makes tampering visible.</p>
          </section>
        </TabsContent>

        {/* 2. Mining */}
        <TabsContent value="mining" className="mt-4">
          <section className={panel} aria-labelledby="mine-h">
            <h2 id="mine-h" className={label}>Proof-of-work</h2>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-xs">
                <span className={label}>Difficulty (leading hex zeros): {difficulty}</span>
                <input type="range" min={1} max={MAX_DIFFICULTY} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="w-56 accent-[var(--color-primary)]" aria-valuetext={`${difficulty} leading zeros`} />
              </label>
              {mining ? (
                <Button type="button" variant="outline" onClick={() => { abortRef.current.aborted = true; }}>Stop</Button>
              ) : (
                <Button type="button" onClick={runMine} disabled={!root}><Pickaxe className="size-4" aria-hidden="true" /> Mine block</Button>
              )}
              <span className="font-mono text-[10px] uppercase text-muted-foreground">expected ≈ {(16 ** difficulty).toLocaleString()} attempts</span>
            </div>
            <div aria-live="polite" className="mt-4 space-y-2 text-xs">
              {mining && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Hashing… {progress.toLocaleString()} attempts</p>}
              {mineResult && (
                <p data-testid="mine-result" className={mineResult.found ? "text-primary" : "text-destructive"}>
                  {mineResult.found
                    ? `Found nonce ${mineResult.nonce} after ${mineResult.attempts.toLocaleString()} attempts in ${mineResult.ms.toFixed(0)} ms (≈ ${Math.round(mineResult.attempts / Math.max(mineResult.ms, 1) * 1000).toLocaleString()} H/s).`
                    : `Stopped after ${mineResult.attempts.toLocaleString()} attempts without a valid hash.`}
                </p>
              )}
              <div><span className={label}>Current hash · nonce {nonce}</span><Hash value={hash} highlight={valid ? difficulty : 0} /></div>
              <p className={valid ? "text-primary" : "text-muted-foreground"}>{valid ? "Valid proof-of-work for this difficulty." : "Hash does not meet the target yet."}</p>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Real Bitcoin difficulty requires ~19+ leading hex zeros on specialised hardware; this simulation caps at {MAX_DIFFICULTY} to stay responsive in the browser.</p>
          </section>
        </TabsContent>

        {/* 3. Merkle */}
        <TabsContent value="merkle" className="mt-4">
          <section className={panel} aria-labelledby="merkle-h">
            <h2 id="merkle-h" className={label}>Merkle tree · leaves → root</h2>
            <div className="mt-4 space-y-4 overflow-x-auto">
              {[...levels].reverse().map((lvl, ri) => {
                const depth = levels.length - 1 - ri;
                return (
                  <div key={depth}>
                    <div className={`${label} mb-2`}>{ri === 0 ? "Root" : depth === 0 ? "Leaves · SHA-256(tx)" : `Level ${depth}`}</div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {lvl.map((h, i) => (
                        <div key={i} title={h} className={`rounded-sm border px-2 py-1 font-mono text-[11px] ${ri === 0 ? "border-primary/60 bg-signal-soft text-primary" : "border-border bg-background"}`}>
                          {depth === 0 && txs[i] ? <span className="mr-1 text-muted-foreground">{txs[i]!.from}→{txs[i]!.to}</span> : null}
                          {h.slice(0, 10)}…
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Pairs are hashed together level by level (the last node is duplicated on odd levels, as in Bitcoin). Changing one transaction changes every hash on its path to the root.</p>
          </section>
        </TabsContent>

        {/* 4. Wallet */}
        <TabsContent value="wallet" className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className={panel} aria-labelledby="wallet-h">
            <h2 id="wallet-h" className={label}>Ephemeral test wallet · ECDSA P-256</h2>
            <Button type="button" className="mt-3" onClick={newWallet}><KeyRound className="size-4" aria-hidden="true" /> {wallet ? "Generate new test keys" : "Generate test keys"}</Button>
            {wallet && (
              <div className="mt-4 space-y-3 text-xs">
                <div><span className={label}>Test address</span><Hash value={wallet.address} /></div>
                <div><span className={label}>Public key (raw, hex)</span><Hash value={wallet.publicHex} /></div>
                <p className="text-muted-foreground">The private key stays inside this browser tab in memory and is never shown, stored or sent anywhere.</p>
              </div>
            )}
            <p className="mt-4 rounded-sm border border-dashed border-border-strong p-3 text-xs text-muted-foreground">
              Educational simulation only: no real funds, not a real wallet format, and never paste real seed phrases or private keys into any website.
            </p>
          </section>
          <section className={panel} aria-labelledby="sign-h">
            <h2 id="sign-h" className={label}>Sign &amp; verify</h2>
            <label className="mt-3 block text-xs"><span className={label}>Message to sign</span>
              <textarea className={`${inputCls} h-20 py-2`} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <Button type="button" className="mt-2" size="sm" onClick={sign} disabled={!wallet}>Sign</Button>
            {signature && (
              <div className="mt-4 space-y-2 text-xs">
                <div><span className={label}>Signature</span><Hash value={signature} /></div>
                <label className="block"><span className={label}>Message to verify (edit to tamper)</span>
                  <textarea className={`${inputCls} h-20 py-2`} value={verifyMsg} onChange={(e) => { setVerifyMsg(e.target.value); setVerified(null); }} />
                </label>
                <Button type="button" size="sm" variant="outline" onClick={verify}>Verify</Button>
                {verified !== null && (
                  <p role="status" className={`flex items-center gap-2 ${verified ? "text-primary" : "text-destructive"}`}>
                    {verified ? <ShieldCheck className="size-4" aria-hidden="true" /> : <ShieldX className="size-4" aria-hidden="true" />}
                    {verified ? "Signature valid for this message and public key." : "Invalid — the message or signature was altered."}
                  </p>
                )}
              </div>
            )}
          </section>
        </TabsContent>

        {/* 5. Analytics */}
        <TabsContent value="analytics" className="mt-4">
          <section className={panel} aria-labelledby="an-h">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="an-h" className={label}>Local sample · 60 synthetic transfers · 12 addresses</h2>
              <label className="flex items-center gap-2 text-xs"><span className={label}>Seed</span>
                <input type="number" className={`${inputCls} w-24`} value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
              </label>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Transactions", stats.txCount.toString()],
                ["Volume", stats.volume.toFixed(2)],
                ["Mean / median", `${stats.meanTx.toFixed(2)} / ${stats.medianTx.toFixed(2)}`],
                ["Active addresses", stats.uniqueAddresses.toString()],
                ["Top-10% tx share", `${(stats.whaleShare * 100).toFixed(1)}%`],
                ["Gini (tx size)", stats.gini.toFixed(3)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-sm border border-border bg-background p-3"><dt className={label}>{k}</dt><dd className="mt-1 font-mono text-sm">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left font-mono text-xs">
                <caption className={`${label} mb-2 text-left`}>Most active addresses</caption>
                <thead className="text-muted-foreground"><tr><th className="py-1">Address</th><th>Sent</th><th>Received</th><th>Net flow</th><th>Tx</th></tr></thead>
                <tbody>
                  {stats.top.map((a) => (
                    <tr key={a.address} className="border-t border-border">
                      <td className="py-1.5">{a.address}</td><td>{a.sent.toFixed(2)}</td><td>{a.received.toFixed(2)}</td>
                      <td className={a.net >= 0 ? "text-primary" : "text-destructive"}>{a.net >= 0 ? "+" : ""}{a.net.toFixed(2)}</td><td>{a.txCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Seeded heavy-tailed synthetic data generated locally — not real chain data. The same metrics (flow, concentration, whale share) apply to real explorer exports.</p>
          </section>
        </TabsContent>

        {/* 6. Quantum */}
        <TabsContent value="quantum" className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            ["Shor's algorithm → signatures", "A large fault-tolerant quantum computer running Shor's algorithm could derive ECDSA/EdDSA private keys from public keys. Addresses whose public key is already on-chain (reused or spent-from) are the exposed set. Published resource estimates put this at thousands of logical qubits (millions of physical qubits) — far beyond today's devices."],
            ["Grover's algorithm → hashing / mining", "Grover gives at most a quadratic speed-up for brute-force search, so SHA-256 keeps ~128-bit security against preimage search. Proof-of-work is not broken, though large quantum miners could in theory gain an edge."],
            ["Post-quantum cryptography", "NIST standardised ML-KEM (FIPS 203), ML-DSA (FIPS 204, lattice-based) and SLH-DSA (FIPS 205, hash-based) in 2024. Trade-off for blockchains: PQ signatures and keys are much larger (≈ 2–50 KB), raising block space and fee costs."],
            ["Migration research questions", "Hybrid classical+PQ signatures, soft-fork opt-in PQ address types, and deadlines for moving funds from exposed public keys. \"Harvest now, decrypt later\" matters most for long-lived keys and encrypted data."],
          ].map(([t, d]) => (
            <section key={t} className={panel}>
              <h2 className="text-sm font-medium">{t}</h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">{d}</p>
            </section>
          ))}
          <p className="text-xs text-muted-foreground md:col-span-2">
            Educational explainer, not a security assessment. No existing quantum computer can break the signatures or hashes used by real blockchains today;
            the threat concerns future fault-tolerant machines. The ECDSA example above is exactly the kind of scheme Shor's algorithm targets.
          </p>
        </TabsContent>
      </Tabs>

      <aside aria-label="Limitations and safety" className="rounded-md border border-dashed border-border-strong bg-surface p-4 text-xs leading-6 text-muted-foreground">
        <p className="font-mono uppercase tracking-wider text-foreground">Limitations &amp; safety</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Educational browser simulation — not connected to any real blockchain network; no network calls are made.</li>
          <li>Transactions and analytics use synthetic, seeded data, not real chain data or investment information.</li>
          <li>No wallet connection and no private-key custody: test keys are generated in memory, never stored or uploaded, and vanish when you leave the page.</li>
          <li>Mining difficulty is capped for responsiveness; timings are not representative of real networks.</li>
        </ul>
      </aside>
    </div>
  );
}
