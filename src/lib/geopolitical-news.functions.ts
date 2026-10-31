import { createServerFn } from "@tanstack/react-start";

export type GeoArticle = {
  title: string;
  url: string;
  domain: string;
  publishedAt: string;
  region: string;
};

const REGIONS = [
  { name: "Europe", url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml" },
  { name: "United States", url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml" },
  { name: "China / Taiwan", url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml" },
  { name: "Middle East", url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml" },
  { name: "Global Economy", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
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
async function fetchRegion(name: string, feedUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(feedUrl, {
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
    provider: "BBC News section RSS (direct publisher links)",
    regions: await Promise.all(REGIONS.map(({ name, url }) => fetchRegion(name, url))),
  };
});
