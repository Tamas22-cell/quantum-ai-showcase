import { GATE_META, type Circuit } from "@/lib/quantum";

const COL = 52,
  ROW = 48,
  PAD_L = 44,
  PAD_T = 28;

/** SVG circuit diagram. One operation per column (sequence order = time order). */
export function CircuitDiagram({
  circuit,
  selected,
  onSelect,
}: {
  circuit: Circuit;
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const { numQubits: n, ops } = circuit;
  const width = PAD_L + Math.max(ops.length, 4) * COL + 24;
  const height = PAD_T + (n - 1) * ROW + 28;
  const y = (q: number) => PAD_T + q * ROW;

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-background/60">
      <svg
        width={width}
        height={height}
        className="block"
        role="group"
        aria-label={`Circuit diagram with ${n} qubits and ${ops.length} operations`}
      >
        {Array.from({ length: n }, (_, q) => (
          <g key={q}>
            <text
              x={10}
              y={y(q)}
              dominantBaseline="middle"
              fill="var(--muted-foreground)"
              fontSize="11"
              fontFamily="IBM Plex Mono, monospace"
            >
              q{q}
            </text>
            <line x1={PAD_L - 8} x2={width - 8} y1={y(q)} y2={y(q)} stroke="var(--border-strong)" />
          </g>
        ))}
        {ops.map((op, i) => {
          const x = PAD_L + i * COL + COL / 2 - 4;
          const sel = selected === i;
          const stroke = sel ? "var(--emerald)" : "var(--primary)";
          const meta = GATE_META[op.gate];
          const common = {
            role: "button" as const,
            tabIndex: 0,
            style: { cursor: "pointer", outline: "none" },
            "aria-label": `Step ${i + 1}: ${meta.description}${op.theta !== undefined && meta.param ? ` θ=${(op.theta / Math.PI).toFixed(3)}π` : ""} on ${op.qubits.map((q) => `q${q}`).join(", ")}${sel ? " (selected)" : ""}`,
            onClick: () => onSelect(i),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(i);
              }
            },
          };
          if (meta.arity === 2) {
            const [c, t] = op.qubits as [number, number];
            return (
              <g key={i} {...common}>
                <rect
                  x={x - 18}
                  y={Math.min(y(c), y(t)) - 18}
                  width={36}
                  height={Math.abs(y(c) - y(t)) + 36}
                  fill="transparent"
                  stroke={sel ? stroke : "none"}
                  strokeDasharray="3 3"
                  rx={4}
                />
                <line x1={x} x2={x} y1={y(c)} y2={y(t)} stroke={stroke} strokeWidth={1.5} />
                <circle cx={x} cy={y(c)} r={5} fill={stroke} />
                {op.gate === "CNOT" ? (
                  <g>
                    <circle
                      cx={x}
                      cy={y(t)}
                      r={11}
                      fill="var(--background)"
                      stroke={stroke}
                      strokeWidth={1.5}
                    />
                    <line
                      x1={x - 11}
                      x2={x + 11}
                      y1={y(t)}
                      y2={y(t)}
                      stroke={stroke}
                      strokeWidth={1.5}
                    />
                    <line
                      x1={x}
                      x2={x}
                      y1={y(t) - 11}
                      y2={y(t) + 11}
                      stroke={stroke}
                      strokeWidth={1.5}
                    />
                  </g>
                ) : (
                  <circle cx={x} cy={y(t)} r={5} fill={stroke} />
                )}
              </g>
            );
          }
          const q = op.qubits[0]!;
          return (
            <g key={i} {...common}>
              <rect
                x={x - 17}
                y={y(q) - 17}
                width={34}
                height={34}
                rx={4}
                fill={sel ? "var(--emerald-soft)" : "var(--surface-raised)"}
                stroke={stroke}
                strokeWidth={sel ? 2 : 1}
              />
              <text
                x={x}
                y={y(q) + (meta.param ? -3 : 1)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--foreground)"
                fontSize="12"
                fontFamily="IBM Plex Mono, monospace"
              >
                {meta.label}
              </text>
              {meta.param ? (
                <text
                  x={x}
                  y={y(q) + 10}
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize="7.5"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {((op.theta ?? 0) / Math.PI).toFixed(2)}π
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
