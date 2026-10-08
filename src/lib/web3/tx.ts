/** Clients, receipt tracking and log decoding on top of viem. Browser-only helpers. */
import {
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  formatEther,
  http,
  parseEventLogs,
  type Abi,
  type Hash,
  type PublicClient,
  type TransactionReceipt,
} from "viem";

import type { TestnetConfig } from "./chains";
import type { OnchainEvent, OnchainTx } from "./history";

export type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...a: unknown[]) => void) => void;
};

export const getInjected = (): Eip1193 | undefined =>
  typeof window === "undefined"
    ? undefined
    : (window as unknown as { ethereum?: Eip1193 }).ethereum;

const publicClients = new Map<number, PublicClient>();
/** Read-only client over no-key public RPCs (with fallback). */
export function publicClientFor(t: TestnetConfig): PublicClient {
  let c = publicClients.get(t.id);
  if (!c) {
    c = createPublicClient({
      chain: t.chain,
      transport: fallback(t.rpcs.map((u) => http(u, { timeout: 15_000 }))),
    }) as PublicClient;
    publicClients.set(t.id, c);
  }
  return c;
}

export function walletClientFor(t: TestnetConfig, provider: Eip1193) {
  return createWalletClient({
    chain: t.chain,
    transport: custom(provider as Parameters<typeof custom>[0]),
  });
}

export type TxPhase = "submitted" | "confirming" | "confirmed" | "failed" | "pending-timeout";

/**
 * Poll for the receipt (submitted → confirming once mined), then wait one more block before
 * reporting confirmed/failed. Returns null if still pending after `timeoutMs`.
 */
export async function trackReceipt(
  client: PublicClient,
  hash: Hash,
  onPhase: (p: TxPhase) => void,
  timeoutMs = 300_000,
): Promise<TransactionReceipt | null> {
  onPhase("submitted");
  const start = Date.now();
  let receipt: TransactionReceipt | null = null;
  while (Date.now() - start < timeoutMs) {
    try {
      receipt = await client.getTransactionReceipt({ hash });
    } catch {
      receipt = null;
    }
    if (receipt) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!receipt) {
    onPhase("pending-timeout");
    return null;
  }
  onPhase("confirming");
  const until = Date.now() + 60_000;
  while (Date.now() < until) {
    try {
      if ((await client.getBlockNumber()) > receipt.blockNumber) break;
    } catch {
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  onPhase(receipt.status === "success" ? "confirmed" : "failed");
  return receipt;
}

/** Decode receipt logs against the ABI; undecodable logs are skipped. */
export function decodeEvents(abi: unknown[], receipt: TransactionReceipt): OnchainEvent[] {
  try {
    return parseEventLogs({ abi: abi as Abi, logs: receipt.logs, strict: false }).map((l) => {
      const args = (l as { args?: unknown }).args;
      const rec: Record<string, string> = {};
      if (args && typeof args === "object")
        for (const [k, v] of Object.entries(args))
          if (!/^\d+$/.test(k)) rec[k] = typeof v === "bigint" ? v.toString() : String(v);
      return { name: (l as { eventName?: string }).eventName ?? "event", args: rec };
    });
  } catch {
    return [];
  }
}

export function receiptToTx(
  base: Pick<OnchainTx, "hash" | "label" | "chainId" | "timestamp">,
  r: TransactionReceipt,
  abi: unknown[],
): OnchainTx {
  return {
    ...base,
    status: r.status === "success" ? "success" : "reverted",
    blockNumber: r.blockNumber.toString(),
    gasUsed: r.gasUsed.toString(),
    effectiveGasPrice: r.effectiveGasPrice?.toString(),
    contractAddress: r.contractAddress ?? undefined,
    events: decodeEvents(abi, r),
  };
}

export const gwei = (wei?: string | bigint) =>
  wei == null ? "—" : `${(Number(wei) / 1e9).toFixed(4)} gwei`;
export const ethCost = (gas: bigint, price: bigint, symbol: string) =>
  `${Number(formatEther(gas * price)).toFixed(8)} ${symbol}`;
