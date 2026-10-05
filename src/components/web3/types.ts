import type { Address } from "viem";

import type { TestnetConfig } from "@/lib/web3/chains";
import type { OnchainTx } from "@/lib/web3/history";
import type { AbiItem } from "@/lib/web3/security";

/** Compiled artifact handed from the existing solc integration to the on-chain panels. */
export type CompiledArtifact = {
  source: string;
  abi: AbiItem[];
  bytecode: string;
  compilerVersion: string;
  contractName: string;
  compiled: boolean;
  errors: number;
  warnings: number;
};

/** Shared chain context for panels that read/write real chain state. */
export type ChainCtx = {
  testnet: TestnetConfig;
  account: Address | null;
  /** Wallet is connected AND on the selected testnet. */
  ready: boolean;
  recordTx: (tx: OnchainTx) => void;
  requestSwitch: () => void;
};
