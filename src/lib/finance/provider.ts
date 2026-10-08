/**
 * Live market-data provider interface (pure, testable). Configuration lives ONLY in server env vars;
 * the browser receives booleans and env-var names, never URLs or keys.
 */
import { validateSeries, type PriceSeries } from "./market";

export type ProviderKind = "crypto" | "equity" | "history";
export const PROVIDERS: { kind: ProviderKind; label: string; urlVar: string; keyVar: string }[] = [
  {
    kind: "crypto",
    label: "Crypto prices",
    urlVar: "FINANCE_CRYPTO_API_URL",
    keyVar: "FINANCE_CRYPTO_API_KEY",
  },
  {
    kind: "equity",
    label: "Equities / ETF prices",
    urlVar: "FINANCE_EQUITY_API_URL",
    keyVar: "FINANCE_EQUITY_API_KEY",
  },
  {
    kind: "history",
    label: "Historical OHLC / returns",
    urlVar: "FINANCE_HISTORY_API_URL",
    keyVar: "FINANCE_HISTORY_API_KEY",
  },
];

export type ProviderStatus = {
  configured: boolean;
  providers: { kind: ProviderKind; label: string; configured: boolean; missing: string[] }[];
};

export function providerStatus(env: Record<string, string | undefined>): ProviderStatus {
  const providers = PROVIDERS.map((p) => {
    const missing = [p.urlVar, p.keyVar].filter((v) => !env[v]);
    return { kind: p.kind, label: p.label, configured: missing.length === 0, missing };
  });
  return { configured: providers.some((p) => p.configured), providers };
}

export const LIVE_SYMBOL = /^[A-Za-z0-9._\-^/]{1,16}$/;

/**
 * Expected provider payload (adapter contract): { dates: string[], symbols: string[], prices: number[][] }
 * with prices[a][t] aligned to dates. Anything else is rejected.
 */
export function parseProviderPayload(json: unknown): { series?: PriceSeries; errors: string[] } {
  if (!json || typeof json !== "object") return { errors: ["Provider returned no data."] };
  const o = json as { dates?: unknown; symbols?: unknown; prices?: unknown };
  if (!Array.isArray(o.dates) || !Array.isArray(o.symbols) || !Array.isArray(o.prices))
    return { errors: ["Provider payload is malformed (need dates, symbols, prices)."] };
  if (!o.symbols.every((s) => typeof s === "string" && LIVE_SYMBOL.test(s)))
    return { errors: ["Provider returned invalid symbols."] };
  const series: PriceSeries = {
    dates: o.dates as string[],
    symbols: o.symbols as string[],
    prices: o.prices as number[][],
    source: "live",
  };
  const errors = validateSeries(series);
  return errors.length ? { errors } : { series, errors: [] };
}
