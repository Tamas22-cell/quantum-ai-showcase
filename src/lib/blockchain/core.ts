/**
 * Educational blockchain primitives built on the Web Crypto API (browser + Node 18+).
 * Everything is deterministic given its inputs, except key generation in the wallet demo.
 */

export type Tx = { from: string; to: string; amount: number };
export type BlockHeader = { index: number; prevHash: string; timestamp: string; merkleRoot: string; nonce: number };

const enc = new TextEncoder();

export function bytesToHex(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i]!.toString(16).padStart(2, "0");
  return s;
}

export async function sha256Hex(input: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", enc.encode(input)));
}

/** Canonical, key-ordered serialisation so identical data always hashes identically. */
export function serializeTx(tx: Tx): string {
  return JSON.stringify({ from: tx.from, to: tx.to, amount: tx.amount });
}

export function serializeHeader(h: BlockHeader): string {
  return `${h.index}|${h.prevHash}|${h.timestamp}|${h.merkleRoot}|${h.nonce}`;
}

// ---------- Merkle tree (Bitcoin-style: duplicate last node on odd levels) ----------
export async function merkleLevels(leavesData: string[]): Promise<string[][]> {
  if (leavesData.length === 0) return [[await sha256Hex("")]];
  let level = await Promise.all(leavesData.map(sha256Hex));
  const levels = [level];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const l = level[i]!;
      const r = level[i + 1] ?? l;
      next.push(await sha256Hex(l + r));
    }
    levels.push(next);
    level = next;
  }
  return levels;
}

export async function merkleRoot(txs: Tx[]): Promise<string> {
  const levels = await merkleLevels(txs.map(serializeTx));
  return levels[levels.length - 1]![0]!;
}

export async function blockHash(h: BlockHeader): Promise<string> {
  return sha256Hex(serializeHeader(h));
}

// ---------- Proof-of-work ----------
export const MAX_DIFFICULTY = 5;
export type MineResult = { found: boolean; nonce: number; hash: string; attempts: number; ms: number };

/**
 * Brute-force nonce search for `difficulty` leading hex zeros.
 * Capped at `maxAttempts` and yields to the event loop periodically so the UI stays responsive.
 */
export async function mine(
  header: Omit<BlockHeader, "nonce">,
  difficulty: number,
  opts: { maxAttempts?: number; onProgress?: (attempts: number) => void; signal?: { aborted: boolean } } = {},
): Promise<MineResult> {
  const d = Math.max(0, Math.min(MAX_DIFFICULTY, Math.floor(difficulty)));
  const target = "0".repeat(d);
  const max = opts.maxAttempts ?? 2_000_000;
  const t0 = performance.now();
  let hash = "";
  for (let nonce = 0; nonce < max; nonce++) {
    hash = await blockHash({ ...header, nonce });
    if (hash.startsWith(target)) return { found: true, nonce, hash, attempts: nonce + 1, ms: performance.now() - t0 };
    if (nonce % 2000 === 1999) {
      opts.onProgress?.(nonce + 1);
      if (opts.signal?.aborted) return { found: false, nonce, hash, attempts: nonce + 1, ms: performance.now() - t0 };
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return { found: false, nonce: max - 1, hash, attempts: max, ms: performance.now() - t0 };
}

// ---------- Wallet / ECDSA P-256 demo ----------
export type DemoWallet = { publicKey: CryptoKey; privateKey: CryptoKey; publicHex: string; address: string };

export async function generateDemoWallet(): Promise<DemoWallet> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
  const publicHex = bytesToHex(raw);
  // Demo address: first 20 bytes of SHA-256(pubkey) — illustrative, not a real chain format.
  const address = "0xdemo" + (await sha256Hex(publicHex)).slice(0, 36);
  return { publicKey: pair.publicKey, privateKey: pair.privateKey, publicHex, address };
}

export async function signMessage(key: CryptoKey, message: string): Promise<string> {
  return bytesToHex(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(message)));
}

export async function verifyMessage(key: CryptoKey, message: string, sigHex: string): Promise<boolean> {
  const pairs = sigHex.match(/.{1,2}/g) ?? [];
  const sig = new Uint8Array(pairs.map((h) => parseInt(h, 16) || 0));
  try {
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, enc.encode(message));
  } catch {
    return false;
  }
}

// ---------- On-chain analytics on a local sample ----------
export type AddressStat = { address: string; sent: number; received: number; net: number; txCount: number };
export type Analytics = {
  txCount: number; volume: number; meanTx: number; medianTx: number; uniqueAddresses: number;
  top: AddressStat[]; whaleShare: number; gini: number;
};

export function analyze(txs: Tx[]): Analytics {
  const stats = new Map<string, AddressStat>();
  const get = (a: string) => {
    let s = stats.get(a);
    if (!s) { s = { address: a, sent: 0, received: 0, net: 0, txCount: 0 }; stats.set(a, s); }
    return s;
  };
  for (const t of txs) {
    const f = get(t.from); f.sent += t.amount; f.txCount++;
    const r = get(t.to); r.received += t.amount; r.txCount++;
  }
  stats.forEach((s) => { s.net = s.received - s.sent; });
  const amounts = txs.map((t) => t.amount).sort((a, b) => a - b);
  const volume = amounts.reduce((a, b) => a + b, 0);
  const n = amounts.length;
  const median = n === 0 ? 0 : n % 2 ? amounts[(n - 1) / 2]! : (amounts[n / 2 - 1]! + amounts[n / 2]!) / 2;
  const whale = volume > 0 ? amounts.slice(Math.floor(n * 0.9)).reduce((a, b) => a + b, 0) / volume : 0;
  // Gini of transaction sizes (0 = equal, 1 = concentrated)
  let gini = 0;
  if (n > 0 && volume > 0) {
    let cum = 0;
    amounts.forEach((x, i) => { cum += (2 * (i + 1) - n - 1) * x; });
    gini = cum / (n * volume);
  }
  const top = [...stats.values()].sort((a, b) => b.sent + b.received - (a.sent + a.received)).slice(0, 5);
  return { txCount: n, volume, meanTx: n ? volume / n : 0, medianTx: median, uniqueAddresses: stats.size, top, whaleShare: whale, gini };
}

/** Deterministic synthetic transaction set (seeded LCG, heavy-tailed amounts). */
export function sampleTransactions(count = 60, seed = 2026): Tx[] {
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const addrs = Array.from({ length: 12 }, (_, i) => `0xA${(i + 1).toString(16).padStart(2, "0")}`);
  return Array.from({ length: count }, () => {
    const from = addrs[Math.floor(rnd() * addrs.length)]!;
    let to = addrs[Math.floor(rnd() * addrs.length)]!;
    if (to === from) to = addrs[(addrs.indexOf(from) + 1) % addrs.length]!;
    const amount = Math.round(Math.pow(1 - rnd(), -1.2) * 100) / 100; // Pareto-like
    return { from, to, amount };
  });
}
