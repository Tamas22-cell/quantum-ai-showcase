import { Atom, BrainCircuit, Cpu, LineChart, Network, Orbit, Trophy } from "lucide-react";

const cards = [
  {
    id: "ml",
    title: "Machine Learning Training",
    subtitle: "Live epoch / loss / accuracy",
    icon: LineChart,
  },
  {
    id: "rf",
    title: "Real Random Forest",
    subtitle: "120 trees · feature importance",
    icon: Network,
  },
  { id: "cm", title: "Confusion Matrix", subtitle: "Precision · Recall · F1", icon: Cpu },
  { id: "nn", title: "Neural Network", subtitle: "4 → 8 → 8 → 4 → 3", icon: BrainCircuit },
  { id: "qc", title: "Qiskit Circuit", subtitle: "2 qubits · live state", icon: Atom },
  { id: "qs", title: "Quantum State", subtitle: "Bloch-style visualization", icon: Orbit },
  { id: "vqc", title: "VQC Convergence", subtitle: "150 optimizer evaluations", icon: LineChart },
  { id: "lb", title: "QML Leaderboard", subtitle: "Classical vs quantum", icon: Trophy },
] as const;

function MiniVisual({ id }: { id: (typeof cards)[number]["id"] }) {
  if (id === "ml") {
    return (
      <div className="relative h-36 overflow-hidden rounded-lg border border-cyan-400/20 bg-slate-950/70 p-3">
        <div className="absolute inset-x-3 bottom-7 h-px bg-white/10" />
        <div className="absolute bottom-7 left-3 top-3 w-px bg-white/10" />
        <svg viewBox="0 0 260 100" className="h-full w-full overflow-visible">
          <polyline
            className="mlq-line mlq-line-cyan"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            points="0,84 24,72 48,65 72,51 96,42 120,35 144,30 168,24 192,19 216,16 250,13"
          />
          <polyline
            className="mlq-line mlq-line-green"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            points="0,18 24,24 48,31 72,38 96,45 120,50 144,56 168,61 192,66 216,70 250,74"
          />
        </svg>
        <div className="absolute bottom-2 left-3 right-3 flex justify-between font-mono text-[9px] text-cyan-200/70">
          <span>
            Epoch <b className="text-white">2883</b>
          </span>
          <span>
            Loss <b className="text-white">0.030</b>
          </span>
          <span>
            Acc <b className="text-white">98%</b>
          </span>
        </div>
      </div>
    );
  }

  if (id === "rf") {
    return (
      <div className="h-36 rounded-lg border border-emerald-400/20 bg-slate-950/70 p-4">
        <div className="mb-3 font-mono text-[9px] text-emerald-300">
          MODEL: RandomForestClassifier · TREES: 120
        </div>
        <div className="space-y-3">
          {[92, 86, 68, 44].map((w, i) => (
            <div key={i} className="grid grid-cols-[52px_1fr] items-center gap-2">
              <span className="font-mono text-[8px] text-slate-400">feature {i + 1}</span>
              <div className="h-3 overflow-hidden rounded-full bg-white/5">
                <div
                  className="mlq-bar h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300"
                  style={{ ["--bar-w" as string]: `${w}%`, animationDelay: `${i * 140}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === "cm") {
    return (
      <div className="grid h-36 grid-cols-3 gap-2 rounded-lg border border-fuchsia-400/20 bg-slate-950/70 p-4">
        {[11, 1, 0, 0, 12, 1, 0, 1, 12].map((n, i) => (
          <div
            key={i}
            className="mlq-cell grid place-items-center rounded-md border border-white/5 bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/15 font-mono text-sm font-bold text-white"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {n}
          </div>
        ))}
      </div>
    );
  }

  if (id === "nn") {
    const cols = [4, 6, 6, 4, 3];
    return (
      <div className="flex h-36 items-center justify-between rounded-lg border border-sky-400/20 bg-slate-950/70 px-4">
        {cols.map((count, ci) => (
          <div key={ci} className="flex flex-col gap-2">
            {Array.from({ length: count }).map((_, ni) => (
              <span
                key={ni}
                className="mlq-node size-3 rounded-full border border-cyan-300/70 bg-cyan-300/20 shadow-[0_0_12px_rgba(34,211,238,.25)]"
                style={{ animationDelay: `${(ci * 5 + ni) * 70}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (id === "qc") {
    return (
      <div className="relative h-36 rounded-lg border border-violet-400/20 bg-slate-950/70 p-4">
        {[0, 1].map((r) => (
          <div key={r} className="relative mt-5 h-px bg-cyan-300/30">
            {[18, 48, 78].map((left, i) => (
              <span
                key={i}
                className="mlq-gate absolute -top-4 grid size-8 place-items-center rounded-md border border-cyan-300/40 bg-slate-900 font-mono text-xs text-cyan-200"
                style={{ left: `${left}%`, animationDelay: `${(r * 3 + i) * 180}ms` }}
              >
                {["H", "ZZ", "RY"][i]}
              </span>
            ))}
          </div>
        ))}
        <div className="absolute bottom-3 left-4 font-mono text-[9px] text-violet-300">
          AerSimulator · shots 2048
        </div>
      </div>
    );
  }

  if (id === "qs") {
    return (
      <div className="relative grid h-36 place-items-center overflow-hidden rounded-lg border border-cyan-400/20 bg-slate-950/70">
        <div className="mlq-sphere relative size-24 rounded-full border border-cyan-300/70 shadow-[0_0_30px_rgba(34,211,238,.25)]">
          <div className="absolute inset-3 rounded-full border border-cyan-300/25" />
          <div className="absolute left-1/2 top-1/2 h-px w-20 -translate-x-1/2 -translate-y-1/2 rotate-[22deg] bg-cyan-300/40" />
          <div className="mlq-orbit absolute inset-0">
            <span className="absolute left-1/2 top-0 size-3 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.9)]" />
          </div>
        </div>
      </div>
    );
  }

  if (id === "vqc") {
    return (
      <div className="relative h-36 rounded-lg border border-emerald-400/20 bg-slate-950/70 p-3">
        <svg viewBox="0 0 260 100" className="h-full w-full">
          <polyline
            className="mlq-line mlq-line-violet"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            points="0,12 18,45 32,60 50,67 70,71 92,74 118,77 145,79 176,81 210,82 250,83"
          />
        </svg>
        <div className="absolute bottom-2 left-3 font-mono text-[9px] text-emerald-300">
          Final objective 0.527370 · Accuracy 92%
        </div>
      </div>
    );
  }

  return (
    <div className="h-36 rounded-lg border border-amber-400/20 bg-slate-950/70 p-4">
      <div className="mb-4 font-mono text-[9px] uppercase tracking-wider text-amber-300">
        Benchmark leader · Random Forest
      </div>
      {[
        ["Random Forest", 100],
        ["Neural Network", 100],
        ["QML VQC", 92],
      ].map(([name, score], i) => (
        <div key={String(name)} className="mb-3 grid grid-cols-[90px_1fr_34px] items-center gap-2">
          <span className="font-mono text-[8px] text-slate-300">{name}</span>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="mlq-bar h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300"
              style={{ ["--bar-w" as string]: `${score}%`, animationDelay: `${i * 180}ms` }}
            />
          </div>
          <span className="font-mono text-[8px] text-emerald-300">{score}%</span>
        </div>
      ))}
    </div>
  );
}

export function LiveResearchMarquee() {
  const loopCards = [...cards, ...cards];

  return (
    <section className="relative overflow-hidden border-b border-border bg-surface/35 py-10 sm:py-12">
      <div className="mx-auto mb-6 flex max-w-7xl items-end justify-between gap-4 px-5 sm:px-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            Live research stream
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Machine Learning + Quantum Lab in motion
          </h2>
        </div>
        <p className="hidden max-w-md text-right text-xs leading-5 text-muted-foreground md:block">
          Continuous live-style research cards inspired by the ML + QML dashboard.
        </p>
      </div>

      <div className="mlq-mask overflow-hidden">
        <div className="mlq-track flex w-max gap-4 px-4">
          {loopCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={`${card.id}-${index}`}
                className="w-[310px] shrink-0 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(11,25,48,.96),rgba(7,16,31,.98))] p-4 shadow-[0_10px_40px_rgba(0,0,0,.28)] sm:w-[360px]"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-cyan-300/25 bg-cyan-300/5 text-cyan-300">
                        <Icon className="size-4" />
                      </span>
                      <h3 className="truncate text-sm font-semibold text-white">{card.title}</h3>
                    </div>
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                      {card.subtitle}
                    </p>
                  </div>
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.9)]" />
                </div>
                <MiniVisual id={card.id} />
              </article>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes mlq-scroll { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        @keyframes mlq-draw { 0% { stroke-dashoffset: 520; opacity: .25; } 35%,100% { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes mlq-bar { 0%,15% { width: 8%; opacity: .35; } 60%,100% { width: var(--bar-w); opacity: 1; } }
        @keyframes mlq-cell { 0%,100% { transform: scale(.96); filter: brightness(.82); } 50% { transform: scale(1.04); filter: brightness(1.35); } }
        @keyframes mlq-node { 0%,100% { transform: scale(.9); opacity: .45; } 50% { transform: scale(1.35); opacity: 1; box-shadow: 0 0 16px rgba(34,211,238,.8); } }
        @keyframes mlq-gate { 0%,100% { transform: translateY(0); box-shadow: 0 0 0 rgba(167,139,250,0); } 50% { transform: translateY(-3px); box-shadow: 0 0 18px rgba(167,139,250,.55); } }
        @keyframes mlq-spin { to { transform: rotate(360deg); } }
        .mlq-track { animation: mlq-scroll 34s linear infinite; }
        .mlq-mask { -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); }
        .mlq-line { stroke-dasharray: 520; stroke-dashoffset: 520; animation: mlq-draw 4.6s ease-in-out infinite; }
        .mlq-line-cyan { color: rgb(34 211 238); }
        .mlq-line-green { color: rgb(110 231 183); animation-delay: .55s; }
        .mlq-line-violet { color: rgb(167 139 250); }
        .mlq-bar { width: 8%; animation: mlq-bar 3.6s ease-in-out infinite alternate; }
        .mlq-cell { animation: mlq-cell 2.4s ease-in-out infinite; }
        .mlq-node { animation: mlq-node 2.1s ease-in-out infinite; }
        .mlq-gate { animation: mlq-gate 2.4s ease-in-out infinite; }
        .mlq-orbit { animation: mlq-spin 3.8s linear infinite; }
        .mlq-sphere { animation: mlq-cell 4.2s ease-in-out infinite; }
        .mlq-track:hover { animation-play-state: paused; }
        @media (max-width: 640px) { .mlq-track { animation-duration: 26s; } }
        @media (prefers-reduced-motion: reduce) {
          .mlq-track, .mlq-line, .mlq-bar, .mlq-cell, .mlq-node, .mlq-gate, .mlq-orbit, .mlq-sphere { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
