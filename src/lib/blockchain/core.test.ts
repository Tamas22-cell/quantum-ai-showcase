import { describe, expect, it } from "vitest";
import { analyze, blockHash, generateDemoWallet, merkleLevels, merkleRoot, mine, sampleTransactions, sha256Hex, signMessage, verifyMessage } from "./core";

describe("blockchain core", () => {
  it("sha256 matches known vector", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("merkle root is deterministic and sensitive to tx changes", async () => {
    const txs = sampleTransactions(5);
    const a = await merkleRoot(txs);
    expect(await merkleRoot(txs)).toBe(a);
    expect(await merkleRoot([{ ...txs[0]!, amount: txs[0]!.amount + 1 }, ...txs.slice(1)])).not.toBe(a);
    const levels = await merkleLevels(["a", "b", "c"]);
    expect(levels.map((l) => l.length)).toEqual([3, 2, 1]);
  });

  it("mining finds a hash with the required prefix", async () => {
    const header = { index: 1, prevHash: "0".repeat(64), timestamp: "2026-01-01T00:00:00Z", merkleRoot: "ab" };
    const r = await mine(header, 2);
    expect(r.found).toBe(true);
    expect(r.hash.startsWith("00")).toBe(true);
    expect(await blockHash({ ...header, nonce: r.nonce })).toBe(r.hash);
  });

  it("signatures verify and detect tampering", async () => {
    const w = await generateDemoWallet();
    const sig = await signMessage(w.privateKey, "hello");
    expect(await verifyMessage(w.publicKey, "hello", sig)).toBe(true);
    expect(await verifyMessage(w.publicKey, "hellO", sig)).toBe(false);
  });

  it("analytics are deterministic and consistent", () => {
    const a = analyze(sampleTransactions());
    expect(a).toEqual(analyze(sampleTransactions()));
    expect(a.txCount).toBe(60);
    expect(a.gini).toBeGreaterThanOrEqual(0);
    expect(a.gini).toBeLessThanOrEqual(1);
  });
});
