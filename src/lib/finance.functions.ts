/**
 * Server-side live market-data bridge. Provider URLs/keys are read from server env only and never returned.
 * With nothing configured, every call reports "Live data not configured".
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { LIVE_SYMBOL, PROVIDERS, parseProviderPayload, providerStatus, type ProviderKind, type ProviderStatus } from "./finance/provider";
import type { PriceSeries } from "./finance/market";

const env = () => Object.fromEntries(PROVIDERS.flatMap((p) => [[p.urlVar, process.env[p.urlVar]], [p.keyVar, process.env[p.keyVar]]]));

export const getFinanceProviderStatus = createServerFn({ method: "GET" }).handler(async (): Promise<ProviderStatus> => providerStatus(env()));

export type LiveResult = { ok: true; series: PriceSeries } | { ok: false; error: string; missing?: string[] };

const LiveInput = z.object({
  kind: z.enum(["crypto", "equity", "history"]),
  symbols: z.array(z.string().regex(LIVE_SYMBOL)).min(2).max(8),
  range: z.enum(["3m", "6m", "1y", "3y", "all"]),
});

export const fetchLiveHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LiveInput.parse(d))
  .handler(async ({ data }): Promise<LiveResult> => {
    const p = PROVIDERS.find((x) => x.kind === (data.kind as ProviderKind))!;
    const url = process.env[p.urlVar], key = process.env[p.keyVar];
    const missing = [!url && p.urlVar, !key && p.keyVar].filter(Boolean) as string[];
    if (missing.length) return { ok: false, error: "Live data not configured.", missing };
    try {
      const q = new URLSearchParams({ symbols: data.symbols.join(","), range: data.range });
      const res = await fetch(`${url!.replace(/\/+$/, "")}/history?${q}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return { ok: false, error: `Market-data provider responded ${res.status}.` };
      const parsed = parseProviderPayload(await res.json());
      return parsed.series ? { ok: true, series: parsed.series } : { ok: false, error: parsed.errors.join(" ") };
    } catch {
      return { ok: false, error: "Could not reach the market-data provider." };
    }
  });
