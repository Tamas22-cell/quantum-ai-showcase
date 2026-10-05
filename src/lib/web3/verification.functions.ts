import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const API = "https://api.etherscan.io/v2/api";

const StatusInput = z.object({
  chainId: z.number().int().positive(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const SubmitInput = StatusInput.extend({
  source: z.string().min(1).max(40_000),
  contractName: z.string().min(1).max(128),
  compilerVersion: z.string().min(1).max(128),
  constructorArgs: z.string().max(20_000).default(""),
});

type EtherscanEnvelope = { status?: string; message?: string; result?: unknown };

function key() {
  return process.env["ETHERSCAN_API_KEY"]?.trim() || "";
}

function apiResult(body: EtherscanEnvelope) {
  return typeof body.result === "string" ? body.result : JSON.stringify(body.result ?? "");
}

async function sourcifyStatus(chainId: number, address: string) {
  const base = "https://repo.sourcify.dev/contracts";
  const urls = [
    { status: "full" as const, url: `${base}/full_match/${chainId}/${address}/metadata.json` },
    { status: "partial" as const, url: `${base}/partial_match/${chainId}/${address}/metadata.json` },
  ];
  for (const item of urls) {
    try {
      const res = await fetch(item.url, { signal: AbortSignal.timeout(8_000) });
      if (res.ok) return item.status;
    } catch {
      // Try the next public source.
    }
  }
  return "none" as const;
}

export type VerificationStatus = {
  configured: boolean;
  checked: boolean;
  verified: boolean;
  source: "etherscan" | "sourcify" | "none";
  match?: "full" | "partial";
  message: string;
};

export const getContractVerificationStatus = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => StatusInput.parse(d))
  .handler(async ({ data }): Promise<VerificationStatus> => {
    const apiKey = key();

    if (apiKey) {
      try {
        const url = new URL(API);
        url.searchParams.set("chainid", String(data.chainId));
        url.searchParams.set("module", "contract");
        url.searchParams.set("action", "getsourcecode");
        url.searchParams.set("address", data.address);
        url.searchParams.set("apikey", apiKey);

        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (res.ok) {
          const body = (await res.json()) as EtherscanEnvelope;
          if (body.status === "1" && Array.isArray(body.result) && body.result.length) {
            const first = body.result[0] as { SourceCode?: unknown; ABI?: unknown };
            const source = typeof first?.SourceCode === "string" ? first.SourceCode.trim() : "";
            const abi = typeof first?.ABI === "string" ? first.ABI.trim() : "";
            const verified = Boolean(source && abi && abi !== "Contract source code not verified");
            return {
              configured: true,
              checked: true,
              verified,
              source: "etherscan",
              message: verified ? "Verified source found on explorer." : "Contract exists, but verified source is not published yet.",
            };
          }
        }
      } catch {
        // Fall through to Sourcify so status remains live even if explorer API is unavailable.
      }
    }

    const sourcify = await sourcifyStatus(data.chainId, data.address);
    if (sourcify === "full" || sourcify === "partial") {
      return {
        configured: Boolean(apiKey),
        checked: true,
        verified: true,
        source: "sourcify",
        match: sourcify,
        message: sourcify === "full" ? "Fully verified source found on Sourcify." : "Partially verified source found on Sourcify.",
      };
    }

    return {
      configured: Boolean(apiKey),
      checked: true,
      verified: false,
      source: "none",
      message: apiKey
        ? "No verified source found on explorer or Sourcify yet."
        : "No verified source found on Sourcify. Add ETHERSCAN_API_KEY on Vercel to enable explorer API status and one-click submission.",
    };
  });

export type SubmitVerificationResult = {
  ok: boolean;
  alreadyVerified?: boolean;
  guid?: string;
  message: string;
};

export const submitContractVerification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }): Promise<SubmitVerificationResult> => {
    const apiKey = key();
    if (!apiKey) return { ok: false, message: "ETHERSCAN_API_KEY is not configured on the server." };

    const form = new URLSearchParams();
    form.set("chainid", String(data.chainId));
    form.set("module", "contract");
    form.set("action", "verifysourcecode");
    form.set("apikey", apiKey);
    form.set("contractaddress", data.address);
    form.set("sourceCode", data.source);
    form.set("codeformat", "solidity-single-file");
    form.set("contractname", data.contractName);
    form.set("compilerversion", data.compilerVersion.startsWith("v") ? data.compilerVersion : `v${data.compilerVersion}`);
    form.set("optimizationUsed", "1");
    form.set("runs", "200");
    form.set("constructorArguements", data.constructorArgs || "");

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form,
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { ok: false, message: `Explorer API HTTP ${res.status}.` };

      const body = (await res.json()) as EtherscanEnvelope;
      const result = apiResult(body);
      const alreadyVerified = /already verified/i.test(result);
      if (body.status === "1") {
        return { ok: true, guid: result, message: "Verification submitted to explorer." };
      }
      if (alreadyVerified) {
        return { ok: true, alreadyVerified: true, message: "Contract is already verified." };
      }
      return { ok: false, message: result || body.message || "Explorer rejected verification submission." };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Verification submission failed." };
    }
  });
