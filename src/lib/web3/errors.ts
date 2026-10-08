/** Map wallet/RPC/viem errors to short, actionable messages. Never invents chain results. */
import {
  BaseError,
  ContractFunctionRevertedError,
  InsufficientFundsError,
  UserRejectedRequestError,
} from "viem";

export function errorCode(e: unknown): number | undefined {
  const x = e as { code?: number; data?: { originalError?: { code?: number } }; cause?: unknown };
  return x?.code ?? x?.data?.originalError?.code ?? (x?.cause ? errorCode(x.cause) : undefined);
}

export function friendlyError(e: unknown): string {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return "Request rejected in wallet.";
    if (e.walk((x) => x instanceof InsufficientFundsError))
      return "Insufficient testnet ETH for gas — top up from a faucet.";
    const revert = e.walk(
      (x) => x instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError | null;
    if (revert)
      return `Reverted: ${revert.reason ?? revert.data?.errorName ?? revert.shortMessage}`;
    return e.shortMessage || e.message;
  }
  const code = errorCode(e);
  if (code === 4001) return "Request rejected in wallet.";
  if (code === 4902) return "This network is not added to your wallet.";
  if (code === -32002) return "A wallet request is already pending — open your wallet.";
  const msg = e instanceof Error ? e.message : String(e);
  if (/insufficient funds/i.test(msg))
    return "Insufficient testnet ETH for gas — top up from a faucet.";
  return msg.slice(0, 300);
}
