import { createServerFn } from "@tanstack/react-start";

export type GeoArticle = {
  title: string;
  url: string;
  domain: string;
  publishedAt: string;
  region: string;
};

const REGIONS = [
  { name: "Europe", query: "Ukraine Russia European Union NATO" },
  { name: "United States", query: "United States foreign policy geopolitics" },
  { name: "China / Taiwan", query: "China Taiwan geopolitics" },
  { name: "Middle East", query: "Israel Iran Gaza Middle East" },
  { name: "Global Economy", query: "oil OPEC sanctions" },
] as const;

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (full, code: string) => {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (named[code.toLowerCase()]) return named[code.toLowerCase()];
    if (code.startsWith("#")) {
      const num = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(num) && num > 0 && num <= 0x10ffff ? String.fromCodePoint(num) : full;
    }
    return full;
  });
}
function element(xml: string, tag: string): string {
  const match = xml.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return match ? decodeXml(match[1].trim()) : "";
}
function secureLink(link: string): string | null {
  try { const url = new URL(link); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}
function parseRss(xml: string, region: string): GeoArticle[] {
  const items = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  return items.flatMap((item) => {
    const title = element(item, "title");
    const url = secureLink(element(item, "link"));
    if (!url || !title) return [];
    const date = new Date(element(item, "pubDate"));
    const publisher = element(item, "source");
    return [{
      title, url,
      domain: publisher || new URL(url).hostname,
      publishedAt: Number.isFinite(date.valueOf()) ? date.toISOString() : "",
      region,
    }];
  });
}
async function fetchRegion(name: string, query: string) {
  const rss = new URL("https://news.google.com/rss/search");
  rss.searchParams.set("q", query + " when:2d");
  rss.searchParams.set("hl", "en-US");
  rss.searchParams.set("gl", "US");
  rss.searchParams.set("ceid", "US:en");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(rss, {
      signal: controller.signal,
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("RSS HTTP " + res.status);
    const xml = await res.text();
    const articles = parseRss(xml, name).slice(0, 12);
    if (!articles.length) throw new Error("No valid RSS items");
    return { name, articles, error: null as string | null };
  } catch {
    return { name, articles: [] as GeoArticle[], error: "News source temporarily unavailable" };
  } finally { clearTimeout(timeout); }
}
export const getGeopoliticalNews = createServerFn({ method: "GET" }).handler(async () => {
  return {
    fetchedAt: new Date().toISOString(),
    provider: "Google News RSS (third-party publishers)",
    regions: await Promise.all(REGIONS.map(({ name, query }) => fetchRegion(name, query))),
  };
});
