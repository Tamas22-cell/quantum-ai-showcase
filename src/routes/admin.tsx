import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authConfigured, requireAdmin, supabase } from "../lib/site-auth";

export const Route = createFileRoute("/admin")({ component: AdminPage });
function AdminPage() {
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void check(); }, []);
  async function check() {
    const ok = await requireAdmin(); setAllowed(ok);
    if (ok && supabase) {
      const result = await supabase.rpc("site_user_count");
      if (!result.error) setCount(result.data);
      else setError(result.error.message);
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!supabase) return;
    const { error: signInError } = await supabase.auth.signInWithPassword({email,password});
    if (signInError) {setError("Hibás belépési adatok."); return;}
    await check();
    if (!(await requireAdmin())) setError("Nincs adminjogosultságod.");
  }
  return <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
    <div className="max-w-5xl mx-auto">
      <a href="/" className="text-cyan-400 text-sm">← Vissza az oldalra</a>
      <h1 className="text-3xl font-bold mt-8">Quantum AI Lab · Admin</h1>
      {!authConfigured && <p role="alert" className="mt-6 text-amber-300">Az admin backend konfigurációjára vár.</p>}
      {!allowed ? <form onSubmit={login} className="mt-8 max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 space-y-4">
        <h2 className="font-semibold">Admin bejelentkezés</h2>
        <input aria-label="E-mail" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail cím" className="w-full bg-slate-800 rounded p-3"/>
        <input aria-label="Jelszó" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Jelszó" className="w-full bg-slate-800 rounded p-3"/>
        <button disabled={!authConfigured} className="bg-cyan-600 rounded p-3 w-full disabled:opacity-50">Belépés az adminfelületre</button>
      </form> : <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-700 bg-slate-900 p-6"><h2>Regisztrált felhasználók</h2><strong className="text-3xl">{count ?? "—"}</strong></article>
        <article className="rounded-xl border border-slate-700 bg-slate-900 p-6"><h2>Hibás menüpontok</h2><p className="text-slate-400 mt-3">Monitoring-integráció szükséges</p></article>
        <article className="rounded-xl border border-slate-700 bg-slate-900 p-6"><h2>API állapot</h2><p className="text-slate-400 mt-3">Health-check integráció szükséges</p></article>
      </section>}
      {error && <p role="alert" className="mt-5 text-red-300">{error}</p>}
    </div>
  </main>;
}
