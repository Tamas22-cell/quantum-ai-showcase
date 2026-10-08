import { useCallback, useEffect, useState } from "react";
import { getAddress, type Address } from "viem";

import { addChainParams, toHexChainId, type TestnetConfig } from "@/lib/web3/chains";
import { errorCode, friendlyError } from "@/lib/web3/errors";
import { getInjected } from "@/lib/web3/tx";

/** Injected EIP-1193 wallet state: availability, account, chain, connect and switch/add-chain. */
export function useWallet() {
  const [available, setAvailable] = useState(false);
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState("Not connected");

  useEffect(() => {
    const p = getInjected();
    setAvailable(Boolean(p));
    if (!p) return;
    const onAccounts = (a: unknown) => {
      const list = a as string[];
      setAccount(list?.[0] ? getAddress(list[0]) : null);
    };
    const onChain = (id: unknown) => setChainId(parseInt(String(id), 16));
    // Silent reads only — never prompts the user on page load.
    p.request({ method: "eth_accounts" })
      .then(onAccounts)
      .catch(() => undefined);
    p.request({ method: "eth_chainId" })
      .then(onChain)
      .catch(() => undefined);
    p.on?.("accountsChanged", onAccounts);
    p.on?.("chainChanged", onChain);
    return () => {
      p.removeListener?.("accountsChanged", onAccounts);
      p.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const p = getInjected();
    if (!p) {
      setStatus("No injected EVM wallet found. Install MetaMask or a compatible wallet.");
      return;
    }
    try {
      const list = (await p.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(list?.[0] ? getAddress(list[0]) : null);
      setChainId(parseInt(String(await p.request({ method: "eth_chainId" })), 16));
      setStatus(list?.[0] ? "Connected" : "No account returned");
    } catch (e) {
      setStatus(friendlyError(e));
    }
  }, []);

  /** wallet_switchEthereumChain, falling back to wallet_addEthereumChain when the chain is unknown (4902). */
  const switchTo = useCallback(async (t: TestnetConfig) => {
    const p = getInjected();
    if (!p) {
      setStatus("No injected EVM wallet found.");
      return;
    }
    try {
      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHexChainId(t.id) }],
      });
      setStatus(`Switched to ${t.name}`);
    } catch (e) {
      if (errorCode(e) === 4902) {
        try {
          await p.request({ method: "wallet_addEthereumChain", params: [addChainParams(t)] });
          setStatus(`Added and switched to ${t.name}`);
        } catch (e2) {
          setStatus(friendlyError(e2));
        }
      } else setStatus(friendlyError(e));
    }
  }, []);

  return { available, account, chainId, status, connect, switchTo, provider: getInjected };
}
