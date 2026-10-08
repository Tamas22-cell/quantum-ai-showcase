# Quantum AI Lab – Auth and Admin deployment

Routes: `/account` (registration, login, reset, password update) and `/admin` (admin login and protected user count).

1. Create a Supabase project, configure Authentication email verification and approved redirect URL `https://quantum-ai-showcase.vercel.app/account`.
2. In Vercel Project > Settings > Environment Variables add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public anon/publishable key only; NEVER service role key), then redeploy.
3. Run `supabase/site-admin.sql` in Supabase SQL editor. Register your own account, confirm your email, and execute the final INSERT with your email to grant admin rights.
4. Configure Supabase CAPTCHA/Turnstile (server-side enforced), email templates, and URL allowlist.
5. Enforce actual 30-day session TTL in your auth backend policy before advertising guaranteed 30-day duration; client checkbox is currently informational only.
6. Hook site error monitoring and menu health checks into backend functions/RPCs. These widgets currently say integration required. NEVER expose error logs or backend admin credentials to public browser clients.
7. Test registration, verification, login, reset, logout, admin authorization (especially normal user's forbidden access), session expiry and CAPTCHA before production release.

Admin must be inaccessible to normal users even by directly typing `/admin`. A keyboard shortcut is only a navigation convenience, not a security measure.
