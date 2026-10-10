- Python lab runs Pyodide from CDN in an inline Blob Web Worker, booted only on /lab/python — keeps site bundle light and allows timeout/stop via terminate().
- Blockchain lab logic lives in src/lib/blockchain/core.ts on Web Crypto (SHA-256, ECDSA P-256) — no deps, testable in Node, UI stays thin.

- Web3 on-chain logic lives in src/lib/web3/* (viem, pure/testable) with UI in src/components/web3/*; wallet is injected EIP-1193 only — no private keys, no explorer API keys in client code.
- Interactive Quantum Lab (/lab/bloch-sphere): exact ZXZ math lives in src/lib/quantum/bloch-zxz.ts (Qiskit Rz/Rx conventions, U = Rz(γ)Rx(β)Rz(α)); the three.js scene is lazy-loaded after a WebGL check with a 2D fallback — keeps SSR safe and the main bundle light.
