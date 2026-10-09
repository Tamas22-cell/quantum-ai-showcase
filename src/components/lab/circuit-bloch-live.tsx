import { useId, useState } from "react";
import type { StateVector } from "@/lib/quantum";
import { Panel } from "./charts";

export function reducedBloch(s: StateVector, qubit: number) {
  const bit = 1 << qubit;
  let x = 0,
    y = 0,
    z = 0;
  for (let i = 0; i < s.re.length; i++) {
    if (i & bit) continue;
    const j = i | bit;
    const ar = s.re[i]!,
      ai = s.im[i]!,
      br = s.re[j]!,
      bi = s.im[j]!;
    x += 2 * (ar * br + ai * bi);
    y += 2 * (ar * bi - ai * br);
    z += ar * ar + ai * ai - br * br - bi * bi;
  }
  return { x, y, z };
}

/** Perspective-style interactive projection driven by the actual circuit state. */
export function CircuitBlochLive({ state }: { state: StateVector }) {
  const id = useId().replace(/:/g, "");
  const [qubit, setQubit] = useState(0);
  const [yaw, setYaw] = useState(35);
  const [pitch, setPitch] = useState(22);
  const selected = Math.min(qubit, state.n - 1);
  const v = reducedBloch(state, selected);
  const a = (yaw * Math.PI) / 180,
    b = (pitch * Math.PI) / 180;
  const project = (p: typeof v) => {
    const horizontal = p.x * Math.cos(a) - p.y * Math.sin(a);
    const depth = p.x * Math.sin(a) + p.y * Math.cos(a);
    return { x: 180 + 116 * horizontal, y: 182 + 116 * (depth * Math.sin(b) - p.z * Math.cos(b)) };
  };
  const center = project({ x: 0, y: 0, z: 0 });
  const tip = project(v);
  const length = Math.hypot(v.x, v.y, v.z);
  const poleTop = project({ x: 0, y: 0, z: 1 });
  const poleBottom = project({ x: 0, y: 0, z: -1 });
  const axes = [
    { label: "x", p: { x: 1.22, y: 0, z: 0 }, color: "#fd74b9" },
    { label: "y", p: { x: 0, y: 1.22, z: 0 }, color: "#7dd3fc" },
    { label: "z", p: { x: 0, y: 0, z: 1.23 }, color: "#52f4b5" },
  ];
  const theta = length > 1e-8 ? Math.acos(Math.max(-1, Math.min(1, v.z / length))) : null;
  const phi = length > 1e-8 ? Math.atan2(v.y, v.x) : null;
  const equator = (from: number, to: number) =>
    Array.from({ length: 61 }, (_, i) => {
      const t = from + ((to - from) * i) / 60;
      const p = project({ x: Math.cos(t), y: Math.sin(t), z: 0 });
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }).join(" ");
  // Split the latitude ring by camera depth: faint behind the sphere, vivid in front.
  const halfRing = (front: boolean) =>
    Array.from({ length: 101 }, (_, i) => {
      const t = (i / 100) * Math.PI * 2;
      const depth = Math.cos(t) * Math.sin(a) + Math.sin(t) * Math.cos(a);
      const isFront = depth >= 0;
      const p = project({ x: Math.cos(t), y: Math.sin(t), z: 0 });
      return { p, visible: front === isFront };
    })
      .map(
        ({ p, visible }, i, arr) =>
          `${visible ? (i === 0 || !arr[i - 1]?.visible ? "M" : "L") : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
      )
      .join(" ");
  const angleArc = (points: Array<typeof v>) =>
    points
      .map((p, i) => {
        const pt = project(p);
        return `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      })
      .join(" ");
  const meridian = (angle: number) =>
    angleArc(
      Array.from({ length: 81 }, (_, i) => {
        const t = (i * Math.PI * 2) / 80;
        return {
          x: Math.sin(t) * Math.cos(angle),
          y: Math.sin(t) * Math.sin(angle),
          z: Math.cos(t),
        };
      }),
    );
  const parallels = [-0.65, -0.33, 0.33, 0.65].map((z) =>
    angleArc(
      Array.from({ length: 81 }, (_, i) => {
        const t = (i * Math.PI * 2) / 80;
        const r = Math.sqrt(1 - z * z);
        return { x: r * Math.cos(t), y: r * Math.sin(t), z };
      }),
    ),
  );
  const direction = phi ?? 0;
  const thetaArc =
    theta === null
      ? ""
      : angleArc(
          Array.from({ length: 33 }, (_, i) => {
            const t = (theta * i) / 32;
            return {
              x: 0.31 * Math.sin(t) * Math.cos(direction),
              y: 0.31 * Math.sin(t) * Math.sin(direction),
              z: 0.31 * Math.cos(t),
            };
          }),
        );
  const phiArc =
    phi === null
      ? ""
      : angleArc(
          Array.from({ length: 33 }, (_, i) => {
            const t = (phi * i) / 32;
            return { x: 0.43 * Math.cos(t), y: 0.43 * Math.sin(t), z: 0 };
          }),
        );
  return (
    <Panel
      title="Live Circuit Bloch View · Neon 3D"
      aside={
        <span className="font-mono text-[10px] text-muted-foreground">Exact circuit state</span>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(210px,.75fr)] md:items-center">
        <svg
          viewBox="0 0 360 364"
          role="img"
          aria-label={`Qubit ${selected}: Bloch x ${v.x.toFixed(3)}, y ${v.y.toFixed(3)}, z ${v.z.toFixed(3)}`}
          className="mx-auto aspect-square w-full max-w-[440px]"
        >
          <defs>
            <linearGradient id={`${id}-sphere`} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#14e993" />
              <stop offset="29%" stopColor="#149f95" />
              <stop offset="53%" stopColor="#18428c" />
              <stop offset="75%" stopColor="#83356f" />
              <stop offset="100%" stopColor="#ff176d" />
            </linearGradient>
            <radialGradient id={`${id}-halo`}>
              <stop offset="60%" stopColor="#17449e" stopOpacity=".38" />
              <stop offset="100%" stopColor="#2863da" stopOpacity=".08" />
            </radialGradient>
            <filter id={`${id}-glow`} x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
            <marker
              id={`${id}-arrow`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
            </marker>
          </defs>
          <rect x="0" y="0" width="360" height="364" rx="16" fill="#061753" />
          <circle cx="180" cy="182" r="157" fill={`url(#${id}-halo)`} />
          <circle
            cx="180"
            cy="182"
            r="116"
            fill={`url(#${id}-sphere)`}
            stroke="#f8fafc"
            strokeWidth="1.5"
          />
          {parallels.map((path, i) => (
            <path
              key={`latitude-${i}`}
              d={path}
              fill="none"
              stroke="#a5f3fc"
              strokeWidth=".9"
              opacity=".3"
            />
          ))}
          {[0, Math.PI / 3, (2 * Math.PI) / 3].map((angle, i) => (
            <path
              key={`meridian-${i}`}
              d={meridian(angle)}
              fill="none"
              stroke={i === 1 ? "#f0abfc" : "#67e8f9"}
              strokeWidth="1"
              opacity=".42"
            />
          ))}
          <path
            d={halfRing(false)}
            fill="none"
            stroke="#99bff8"
            strokeDasharray="3 6"
            strokeWidth="1.2"
            opacity=".35"
          />
          <path d={halfRing(true)} fill="none" stroke="#7dd3fc" strokeWidth="1.8" opacity=".8" />
          <path
            d={equator(0, Math.PI * 2)}
            fill="none"
            stroke="#dbeafe"
            strokeDasharray="2 9"
            strokeWidth=".5"
            opacity=".22"
          />
          {axes.map((axis) => {
            const end = project(axis.p);
            return (
              <g key={axis.label}>
                <line
                  x1={center.x}
                  y1={center.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={axis.color}
                  strokeWidth="2"
                />
                <text x={end.x + 8} y={end.y + 8} fill={axis.color} fontSize="18" fontWeight="600">
                  {axis.label.toUpperCase()}
                </text>
              </g>
            );
          })}
          <circle
            cx={poleTop.x}
            cy={poleTop.y}
            r="7"
            fill="#15df79"
            stroke="#fff"
            strokeWidth="1.5"
          />
          <circle
            cx={poleBottom.x}
            cy={poleBottom.y}
            r="7"
            fill="#fc236e"
            stroke="#fff"
            strokeWidth="1.5"
          />
          <text x={poleTop.x - 43} y={poleTop.y - 11} fill="#fff" fontSize="17">
            |0⟩
          </text>
          <text x={poleBottom.x - 43} y={poleBottom.y + 22} fill="#fff" fontSize="17">
            |1⟩
          </text>
          {length > 1e-8 && (
            <>
              <line
                x1={tip.x}
                y1={tip.y}
                x2={tip.x}
                y2={center.y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 5"
                opacity=".9"
              />
              <path d={thetaArc} stroke="#67e8f9" strokeWidth="2.5" fill="none" />
              <path d={phiArc} stroke="#67e8f9" strokeWidth="2.5" fill="none" opacity=".8" />
              <line
                x1={center.x}
                y1={center.y}
                x2={tip.x}
                y2={tip.y}
                stroke="#f59e0b"
                strokeWidth="9"
                opacity=".5"
                filter={`url(#${id}-glow)`}
              />
              <line
                x1={center.x}
                y1={center.y}
                x2={tip.x}
                y2={tip.y}
                stroke="#fbbf24"
                strokeWidth="3.5"
                markerEnd={`url(#${id}-arrow)`}
                style={{ transition: "x2 450ms ease, y2 450ms ease" }}
              />
              <circle
                cx={tip.x}
                cy={tip.y}
                r="4.5"
                fill="#fbbf24"
                style={{ transition: "cx 450ms ease, cy 450ms ease" }}
              />
              <text x={tip.x + 9} y={tip.y - 6} fill="#fcd34d" fontSize="16">
                |ψ⟩
              </text>
              {theta !== null && (
                <text x={center.x + 15} y={center.y - 28} fill="#67e8f9" fontSize="17">
                  θ
                </text>
              )}
              {phi !== null && (
                <text x={center.x + 20} y={center.y + 26} fill="#67e8f9" fontSize="17">
                  φ
                </text>
              )}
            </>
          )}
          {length <= 1e-8 && (
            <g>
              <circle cx={center.x} cy={center.y} r="15" fill="#fbbf24" opacity=".18" />
              <circle cx={center.x} cy={center.y} r="6" fill="#fbbf24" />
              <text x="180" y="344" textAnchor="middle" fill="#fcd34d" fontSize="12">
                Mixed state · Bloch vector = 0
              </text>
            </g>
          )}
          <circle cx={center.x} cy={center.y} r="3" fill="#fcd34d" />
        </svg>
        <div className="space-y-3 text-sm">
          <label className="block">
            Qubit
            <select
              className="mt-1 w-full rounded border border-border bg-background p-2"
              value={selected}
              onChange={(e) => setQubit(Number(e.target.value))}
            >
              {Array.from({ length: state.n }, (_, i) => (
                <option key={i} value={i}>
                  q{i}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Rotation: {yaw}°
            <input
              className="mt-1 w-full"
              type="range"
              min="-180"
              max="180"
              value={yaw}
              onChange={(e) => setYaw(Number(e.target.value))}
            />
          </label>
          <label className="block">
            Tilt: {pitch}°
            <input
              className="mt-1 w-full"
              type="range"
              min="-70"
              max="70"
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
            />
          </label>
          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            {(["x", "y", "z"] as const).map((k) => (
              <div key={k} className="rounded border border-border p-2">
                <span
                  className={
                    k === "x" ? "text-pink-400" : k === "y" ? "text-violet-400" : "text-cyan-400"
                  }
                >
                  {k}: {v[k].toFixed(3)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Bloch length: {length.toFixed(3)}. θ:{" "}
            {theta === null ? "—" : ((theta * 180) / Math.PI).toFixed(1) + "°"} · φ:{" "}
            {phi === null ? "—" : ((phi * 180) / Math.PI).toFixed(1) + "°"}. Values below 1 indicate
            a reduced mixed state. Interactive 3D projection of a classical quantum-state
            simulation, not quantum hardware.
          </p>
        </div>
      </div>
    </Panel>
  );
}
