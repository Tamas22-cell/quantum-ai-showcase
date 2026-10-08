/** Deterministic, stdlib-only Python presets (seeded RNG, no I/O, no network). */
export type PythonPreset = { id: string; label: string; description: string; code: string };

export const PYTHON_PRESETS: PythonPreset[] = [
  {
    id: "quant-finance",
    label: "Quantitative finance",
    description:
      "Seeded GBM price path, log returns, annualised volatility, Sharpe, max drawdown and 95% historical VaR on synthetic data.",
    code: `import math, random, statistics

# Synthetic data only: seeded geometric Brownian motion (not market data)
random.seed(42)
S0, mu, sigma, days = 100.0, 0.08, 0.20, 252
dt = 1 / 252
prices = [S0]
for _ in range(days):
    z = random.gauss(0, 1)
    prices.append(prices[-1] * math.exp((mu - 0.5 * sigma**2) * dt + sigma * math.sqrt(dt) * z))

rets = [math.log(b / a) for a, b in zip(prices, prices[1:])]
ann_ret = statistics.mean(rets) * 252
ann_vol = statistics.stdev(rets) * math.sqrt(252)
sharpe = (ann_ret - 0.02) / ann_vol  # 2% risk-free assumption

peak, mdd = prices[0], 0.0
for p in prices:
    peak = max(peak, p)
    mdd = min(mdd, p / peak - 1)

var95 = -sorted(rets)[int(0.05 * len(rets))]

print(f"Final price       : {prices[-1]:.2f}")
print(f"Annualised return : {ann_ret:.2%}")
print(f"Annualised vol    : {ann_vol:.2%}")
print(f"Sharpe (rf=2%)    : {sharpe:.2f}")
print(f"Max drawdown      : {mdd:.2%}")
print(f"1-day 95% VaR     : {var95:.2%}")
`,
  },
  {
    id: "data-stats",
    label: "Data analysis / statistics",
    description:
      "Descriptive statistics, Pearson correlation, OLS regression and a bootstrap confidence interval on a seeded synthetic dataset.",
    code: `import random, statistics

random.seed(7)
n = 200
x = [random.uniform(0, 10) for _ in range(n)]
y = [1.5 * xi + 3 + random.gauss(0, 2) for xi in x]   # true slope 1.5, intercept 3

mx, my = statistics.mean(x), statistics.mean(y)
sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
sxx = sum((a - mx) ** 2 for a in x)
slope = sxy / sxx
intercept = my - slope * mx
r = statistics.correlation(x, y)

# Bootstrap 95% CI for the slope (seeded)
boot = []
for _ in range(500):
    idx = [random.randrange(n) for _ in range(n)]
    bx = [x[i] for i in idx]; by = [y[i] for i in idx]
    bmx, bmy = statistics.mean(bx), statistics.mean(by)
    boot.append(sum((a - bmx) * (b - bmy) for a, b in zip(bx, by)) / sum((a - bmx) ** 2 for a in bx))
boot.sort()

print(f"n = {n}")
print(f"mean(y) = {my:.3f}, stdev(y) = {statistics.stdev(y):.3f}, median(y) = {statistics.median(y):.3f}")
print(f"Pearson r = {r:.4f}")
print(f"OLS: y = {slope:.4f} x + {intercept:.4f}  (R^2 = {r*r:.4f})")
print(f"Bootstrap 95% CI for slope: [{boot[12]:.4f}, {boot[487]:.4f}]")
`,
  },
  {
    id: "quantum-ai",
    label: "Quantum / AI helpers",
    description:
      "Pure-Python 2-qubit statevector (H + CNOT → Bell state), Born-rule probabilities, entanglement entropy, and a softmax/cross-entropy helper.",
    code: `import math, cmath

# --- 2-qubit statevector simulation (basis |q1 q0>) ---
s = 1 / math.sqrt(2)
state = [1+0j, 0j, 0j, 0j]

def apply_h_q0(v):
    return [s*(v[0]+v[1]), s*(v[0]-v[1]), s*(v[2]+v[3]), s*(v[2]-v[3])]

def apply_cnot_q0_q1(v):   # control q0, target q1: swaps |01> and |11>
    return [v[0], v[3], v[2], v[1]]

state = apply_cnot_q0_q1(apply_h_q0(state))
probs = {f"{i:02b}": abs(a)**2 for i, a in enumerate(state)}
print("Bell state amplitudes:", [f"{a.real:+.4f}" for a in state])
print("Probabilities:", {k: round(p, 4) for k, p in probs.items()})

# Reduced density matrix of q0 -> von Neumann entropy (1.0 = maximally entangled)
rho00 = abs(state[0])**2 + abs(state[2])**2
rho11 = abs(state[1])**2 + abs(state[3])**2
entropy = -sum(p * math.log2(p) for p in (rho00, rho11) if p > 0)
print(f"Entanglement entropy S(q0) = {entropy:.4f} bits")

# --- AI helper: softmax + cross-entropy ---
logits = [2.0, 1.0, 0.1]
m = max(logits)
exps = [math.exp(l - m) for l in logits]
soft = [e / sum(exps) for e in exps]
print("softmax:", [round(p, 4) for p in soft])
print(f"cross-entropy (true class 0) = {-math.log(soft[0]):.4f}")
`,
  },
];
