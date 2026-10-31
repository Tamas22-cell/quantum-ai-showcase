import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, ExternalLink, Globe2, RefreshCw, ShieldAlert } from "lucide-react";
import { LabShell } from "@/components/lab/lab-shell";
import { getGeopoliticalNews, type GeoArticle } from "@/lib/geopolitical-news.functions";

type Feed = Awaited<ReturnType<typeof getGeopoliticalNews>>;
const themes = [
  { name: "Energy security", assets: "Brent / WTI · Natural gas", detail: "Supply disruptions, shipping routes, sanctions and OPEC decisions." },
  { name: "Risk appetite", assets: "S&P 500 · Nasdaq · BTC", detail: "Escalation, policy uncertainty and changes in global liquidity." },
  { name: "Safe havens", assets: "Gold · US Treasuries · USD", detail: "Flight-to-quality flows, real yields and central-bank policy." },
  { name: "Supply chains", assets: "Semiconductors · Shipping", detail: "Trade controls, Taiwan Strait risk and transport bottlenecks." },
];
function stamp(raw: string) {
  if (!raw) return "Publication time unavailable";
  const date = new Date(raw);
  return Number.isNaN(date.valueOf()) ? "Publication time unavailable" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}
export const Route = createFileRoute("/lab/geopolitics-intelligence")({
  head: () => ({
    meta: [
      { title: "Geopolitics Intelligence — Quantum AI Lab" },
      { name: "description", content: "Source-linked global geopolitical news and transparent research into potential cross-asset transmission channels." },
      { property: "og:title", content: "Geopolitics Intelligence — Quantum AI Lab" },
    ],
  }),
  component: GeopoliticsPage,
});
function GeopoliticsPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [region, setRegion] = useState("All");
  const [search, setSearch] = useState("");
  const refresh = async () => {
    setLoading(true);
    setFailure("");
    try { setFeed(await getGeopoliticalNews()); }
    catch { setFailure("Could not contact the news service. Please retry."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const articles = useMemo(() => {
    const seen = new Set<string>();
    return (feed?.regions ?? []).flatMap((r) => r.articles).filter((item: GeoArticle) => {
      if (region !== "All" && item.region !== region) return false;
      if (search && !(item.title + " " + item.domain).toLowerCase().includes(search.toLowerCase())) return false;
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [feed, region, search]);
  const unavailable = feed?.regions.filter((r) => r.error).map((r) => r.name) ?? [];
  return (
    <LabShell crumb="Geopolitics Intelligence">
      <div className="mb-8 max-w-4xl">
        <span className="font-mono text-xs uppercase text-primary">Research / Global risk monitoring</span>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl"><Globe2 className="size-8 text-primary" /> Geopolitics Intelligence</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">A source-linked global news monitor with regional coverage and a cross-asset risk research framework. Headlines are external reporting, not verified facts or investment signals.</p>
        <a href="#geo-headlines" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Activity className="size-5" /> Élő hírek és adatok megnyitása ↓</a>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4"><span className="font-mono text-[10px] uppercase text-muted-foreground">Source</span><p className="mt-2 font-semibold">Google News RSS</p><p className="text-xs text-muted-foreground">Third-party publisher headlines</p></div>
        <div className="rounded-md border border-border bg-card p-4"><span className="font-mono text-[10px] uppercase text-muted-foreground">Coverage</span><p className="mt-2 font-semibold">Past 48 hours</p><p className="text-xs text-muted-foreground">English-language source articles</p></div>
        <div className="rounded-md border border-border bg-card p-4"><span className="font-mono text-[10px] uppercase text-muted-foreground">Last fetch</span><p className="mt-2 font-semibold">{feed ? new Date(feed.fetchedAt).toLocaleTimeString("en-GB", { timeZone: "UTC" }) + " UTC" : "—"}</p><p className="text-xs text-muted-foreground">On-demand refresh; not a live push feed</p></div>
      </div>
      <section className="rounded-md border border-border bg-card p-4 sm:p-6" aria-labelledby="geo-headlines">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><span className="font-mono text-[10px] uppercase tracking-wider text-primary">Open-source news intelligence</span><h2 id="geo-headlines" className="mt-1 text-xl font-semibold">Global headlines</h2></div>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs hover:border-primary/60 disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
        <div className="my-5 flex flex-wrap gap-2">
          {["All", ...(feed?.regions.map((r) => r.name) ?? ["Europe", "United States", "China / Taiwan", "Middle East", "Global Economy"])].map((name) => (
            <button key={name} type="button" onClick={() => setRegion(name)} aria-pressed={region === name} className={`min-h-11 rounded-sm border px-4 py-2 font-mono text-[11px] uppercase ${region === name ? "border-primary bg-signal-soft text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{name}</button>
          ))}
        </div>
        <input aria-label="Search headlines" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter headlines or publishers…" className="mb-4 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        {unavailable.length > 0 && <p role="status" className="mb-4 flex items-center gap-2 text-xs text-amber-500"><ShieldAlert className="size-4" /> Some sources are unavailable: {unavailable.join(", ")}.</p>}
        {failure && <p role="alert" className="mb-4 text-sm text-destructive">{failure}</p>}
        {loading && <p role="status" className="py-8 text-sm text-muted-foreground">Loading sourced headlines…</p>}
        {!loading && articles.length === 0 && <p className="py-8 text-sm text-muted-foreground">No articles available for this filter. Try another region or refresh; no sample headlines are substituted.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {!loading && articles.map((item) => (
            <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="group block rounded-md border border-border bg-background p-4 hover:border-primary/60">
              <div className="mb-2 flex justify-between gap-3 font-mono text-[10px] text-muted-foreground"><span>{item.region} · {item.domain}</span><ExternalLink className="size-3.5 shrink-0" /></div>
              <h3 className="text-sm font-semibold leading-6 group-hover:text-primary">{item.title}</h3>
              <p className="mt-3 text-[11px] text-muted-foreground">{stamp(item.publishedAt)}</p>
              <span className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-primary/60 bg-signal-soft px-4 py-2 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground">Eredeti hír megnyitása <ExternalLink className="size-4" /></span>
            </a>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">Google News aggregates reporting from third-party publishers. Always open the original publisher, verify the event date and corroborate consequential claims with independent sources. Listing does not imply endorsement.</p>
      </section>
      <section className="mt-5 rounded-md border border-border bg-card p-4 sm:p-6" aria-labelledby="geo-markets">
        <span className="font-mono text-[10px] uppercase text-primary">Analyst framework · qualitative, not real-time pricing</span>
        <h2 id="geo-markets" className="mt-1 flex items-center gap-2 text-xl font-semibold"><Activity className="size-5 text-primary" /> Geopolitical transmission to markets</h2>
        <p className="mt-2 text-sm text-muted-foreground">Potential channels to investigate after a confirmed event; these are hypotheses, not measured impacts or predictions.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{themes.map((t) => <article key={t.name} className="rounded-md border border-border bg-background p-4"><h3 className="font-semibold">{t.name}</h3><p className="mt-1 font-mono text-[11px] text-primary">{t.assets}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{t.detail}</p></article>)}</div>
      </section>
    </LabShell>
  );
}
