# Quantum AI Lab — Supabase Authentication and RBAC

This deployment integrates Supabase email/password authentication. Existing Vercel
Production config must contain `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
(only Supabase's **public** anon/publishable key, NEVER the service-role key).

## Server-authorized admin flow

1. Enable email verification, redirect allowlist and CAPTCHA in your Supabase Auth project.
2. Run `supabase/site-admin.sql` **manually in the same Supabase project**.
3. Register and verify your user at `/account`.
4. Grant admin only to your chosen account using a reviewed, manual SQL insert from
   the bottom of `supabase/site-admin.sql`. No account is promoted automatically.
5. Login at `/account`. The browser attempts `POST /api/admin/session` with its
   short-lived access token. The server rechecks identity through
   `/auth/v1/user` and checks the database `is_site_admin` RPC using the
   same user token. Only then does it issue a Secure, HttpOnly, SameSite=Strict
   admin session cookie (1-hour maximum).
6. Every `/admin` SSR request repeats the live identity + role checks. It returns
   HTTP 403 on missing/invalid/expired tokens, missing RPC or backend outage.
7. Use the admin logout button to clear both the HttpOnly cookie and the
   Supabase client session.

## Safety conditions

- The homepage and Engineering Dashboard remain public.
- If either Supabase environment variable is missing, login stays disabled and
  admin SSR stays denied. No paid service is auto-provisioned.
- The `/account` remember-me checkbox is informational: the server does **not**
  promise 30-day admin sessions.
- Do not mark *active production RBAC* Verified until a real normal user is
  refused, a manually granted admin succeeds, logout revokes access, and
  sessions expire correctly.
- A browser-visible Supabase anon key is expected; a service-role key in this
  variable would be a critical secret exposure. Inspect Vercel's configured
  key type before production use.
- No service-role key or user passwords should be committed or transmitted to
  support channels.
- Rate limits and anti-bot challenges must be enabled in Supabase Auth settings.

Tests cover the fail-closed policy with mocks and a Docker HTTP 403 test without
backend credentials. Live Auth/RBAC depends on manual Supabase project setup.
