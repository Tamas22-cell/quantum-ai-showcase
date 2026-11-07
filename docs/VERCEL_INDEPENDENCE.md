# Lovable-independent Vercel migration checklist

This repository already contains a Vite / TanStack Start application and a Vercel configuration (`vercel.json`). It is **not necessary to delete the Lovable project to run the app on Vercel**.

## Verified repository configuration (2026-10-16)
- GitHub: `Tamas22-cell/quantum-ai-showcase` (`main`).
- `package.json`: `vite build`, TanStack Start, React 19, Nitro, Tailwind.
- `vercel.json`: `{"framework":"tanstack-start"}`.
- `vite.config.ts`: Nitro output `.vercel/output` when `VERCEL` is set; otherwise `dist`.
- The Vercel connector can list `quantum-ai-showcase` but project details return HTTP 403 under the `tamas-quantum-lab` scope. This is an access issue, **not** evidence that the website is down.

## Safe migration procedure
1. Keep the existing production deployment, Lovable project, domain, and GitHub `main` unchanged.
2. Restore Vercel team access with credentials authorized for `tamas-quantum-lab`; verify the project and GitHub repository linkage.
3. Verify the latest Vercel deployment commit matches a known GitHub commit and the site loads, including direct route refresh.
4. Review environment variables and runtime integrations (auth, APIs, Supabase, secrets) and verify each is managed independently of Lovable. Never commit secrets.
5. Run dependency install, typecheck, build, route smoke tests and mobile checks in a preview deployment.
6. Confirm GitHub pushes to the intended Vercel project and domain without any Lovable publish action.
7. Only after verification, stop using Lovable for editing. Cancel subscriptions or delete the Lovable project **only with explicit user confirmation**.

## Rollback
Do not merge breaking changes or replace the production domain before validation. If a preview fails, keep production on its previous known-good deployment.

## D-Wave dashboard
Build as an additive page on a separate branch/PR; label historical metrics as illustrative user-provided backtest figures and do not claim live D-Wave data. Merge only after review and passing checks.
