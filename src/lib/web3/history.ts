/** localStorage persistence for REAL on-chain activity (never mixed with sandbox data). */
export type OnchainEvent = { name: string; args: Record<string, string> };
export type OnchainTx = {
  hash: string;
  label: string;
  chainId: number;
  status: "pending" | "success" | "reverted";
  timestamp: string;
  blockNumber?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  contractAddress?: string;
  events?: OnchainEvent[];
};
export type Deployment = {
  chainId: number;
  address: string;
  txHash: string;
  contractName: string;
  abi: unknown[];
  constructorArgs: string; // ABI-encoded, no 0x
  compilerVersion: string;
  source: string;
  timestamp: string;
};

const TX_KEY = "web3-lab:onchain-txs:v1";
const DEP_KEY = "web3-lab:deployments:v1";
const NET_KEY = "web3-lab:network:v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = window.localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(key: string, v: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full/blocked: keep in memory only */ }
}

export const loadTxs = () => read<OnchainTx[]>(TX_KEY, []);
export const saveTxs = (t: OnchainTx[]) => write(TX_KEY, t.slice(0, 50));
/** Latest deployment per chain. */
export const loadDeployments = () => read<Record<string, Deployment>>(DEP_KEY, {});
export const saveDeployments = (d: Record<string, Deployment>) => write(DEP_KEY, d);
export const loadNetwork = () => read<number>(NET_KEY, 11155111);
export const saveNetwork = (id: number) => write(NET_KEY, id);
