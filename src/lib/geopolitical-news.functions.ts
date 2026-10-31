import { createServerFn } from "@tanstack/react-start";

export type GeoArticle = {
  title: string;
  url: string;
  domain: string;
  publishedAt: string;
  region: string;
};

const REGIONS = [
  { name: "Europe", query: '(Ukraine OR Russia OR "European Union" OR NATO)' },
  { name: "United States", query: '(United States OR Washington OR White House)' },
  { name: "China / Taiwan", query: '(China OR Taiwan OR Beijing)' },
  { name: "Middle East", query: '(Israel OR Iran OR Gaza OR "Middle East")' },
  { name: "Global Economy", query: '(sanctions OR tariffs OR oil OR OPEC OR trade)' },
] as const;

function validUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

export const getGeopoliticalNews = createServerFn({ method: "GET" }).handler(async () => {
  const results = await Promise.all(REGIONS.map(async ({ name, query }) => {
    const params = new URLSearchParams({
      query: query + " sourcelang:english",
      mode: "artlist",
      maxrecords: "12",
      timespan: "48h",
      format: "json",
      sort: "datedesc",
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);
    try {
      const res = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?" + params, {
        signal: controller.signal,
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("GDELT HTTP " + res.status);
      const json = await res.json() as { articles?: Array<Record<string, unknown>> };
      const articles: GeoArticle[] = (json.articles ?? []).flatMap((a) => {
        const url = validUrl(a.url);
        if (!url || typeof a.title !== "string" || !a.title.trim()) return [];
        const publishedAt = typeof a.seendate === "string" ? a.seendate : "";
        return [{ title: a.title.trim(), url, domain: typeof a.domain === "string" ? a.domain : new URL(url).hostname, publishedAt, region: name }];
      });
      return { name, articles, error: null as string | null };
    } catch {
      return { name, articles: [] as GeoArticle[], error: "Source temporarily unavailable" };
    } finally { clearTimeout(timeout); }
  }));
  return {
    fetchedAt: new Date().toISOString(),
    provider: "GDELT Project DOC 2.0",
    regions: results,
  };
});
