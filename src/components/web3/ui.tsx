import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export type LabMode = "SANDBOX" | "WALLET CONNECTED" | "ON-CHAIN TESTNET";

const MODE_STYLE: Record<LabMode, string> = {
  SANDBOX: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  "WALLET CONNECTED": "border-amber-500/40 bg-amber-500/10 text-amber-300",
  "ON-CHAIN TESTNET": "border-cyan-400/60 bg-cyan-400/10 text-cyan-300",
};

export function ModeBadge({ mode }: { mode: LabMode }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase ${MODE_STYLE[mode]}`}
    >
      {mode}
    </span>
  );
}

export function ExplorerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 break-all font-mono text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
    </a>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-40"
    >
      {done ? (
        <Check className="size-3" aria-hidden="true" />
      ) : (
        <Copy className="size-3" aria-hidden="true" />
      )}
      {done ? "Copied" : label}
    </button>
  );
}

export const btn =
  "rounded-md border px-4 py-2 font-mono text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const btnPrimary = `${btn} border-cyan-400/60 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/15`;
export const btnGhost = `${btn} border-border bg-background hover:border-primary/50`;
export const inputCls =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary";

export function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{k}</div>
      <div className="mt-1 break-all font-mono text-xs">{v}</div>
    </div>
  );
}
