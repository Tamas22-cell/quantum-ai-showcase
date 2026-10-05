/**
 * Supported EVM testnets for the Web3 & Solidity Lab.
 * Public RPCs are no-key endpoints; explorers are the canonical Etherscan-family sites.
 */
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";
import type { Chain } from "viem";

export type TestnetConfig = {
  id: number;
  key: "sepolia" | "base-sepolia" | "arbitrum-sepolia";
  name: string;
  explorerName: string;
  explorer: string;
  rpcs: string[];
  faucet: string;
  chain: Chain;
};

export const TESTNETS: TestnetConfig[] = [
  {
    id: 11155111, key: "sepolia", name: "Ethereum Sepolia", explorerName: "Etherscan",
    explorer: "https://sepolia.etherscan.io",
    rpcs: ["https://ethereum-sepolia-rpc.publicnode.com", "https://rpc.sepolia.org"],
    faucet: "https://www.alchemy.com/faucets/ethereum-sepolia", chain: sepolia,
  },
  {
    id: 84532, key: "base-sepolia", name: "Base Sepolia", explorerName: "BaseScan",
    explorer: "https://sepolia.basescan.org",
    rpcs: ["https://base-sepolia-rpc.publicnode.com", "https://sepolia.base.org"],
    faucet: "https://www.alchemy.com/faucets/base-sepolia", chain: baseSepolia,
  },
  {
    id: 421614, key: "arbitrum-sepolia", name: "Arbitrum Sepolia", explorerName: "Arbiscan",
    explorer: "https://sepolia.arbiscan.io",
    rpcs: ["https://arbitrum-sepolia-rpc.publicnode.com", "https://sepolia-rollup.arbitrum.io/rpc"],
    faucet: "https://www.alchemy.com/faucets/arbitrum-sepolia", chain: arbitrumSepolia,
  },
];

export const getTestnet = (id: number | null | undefined) => TESTNETS.find((t) => t.id === id);

export const txUrl = (t: TestnetConfig, hash: string) => `${t.explorer}/tx/${hash}`;
export const addressUrl = (t: TestnetConfig, address: string) => `${t.explorer}/address/${address}`;
export const codeUrl = (t: TestnetConfig, address: string) => `${t.explorer}/address/${address}#code`;
/** Etherscan-family manual verification form, pre-filled with the address. */
export const verifyUrl = (t: TestnetConfig, address: string) => `${t.explorer}/verifyContract?a=${address}`;

export const toHexChainId = (id: number) => `0x${id.toString(16)}`;

/** Params for wallet_addEthereumChain (EIP-3085). */
export function addChainParams(t: TestnetConfig) {
  return {
    chainId: toHexChainId(t.id),
    chainName: t.name,
    nativeCurrency: t.chain.nativeCurrency,
    rpcUrls: t.rpcs,
    blockExplorerUrls: [t.explorer],
  };
}
