import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authConfigured, supabase } from "../lib/site-auth";

export const Route = createFileRoute("/account")({ component: AccountPage });

type Mode = "login" | "register" | "forgot" | "change";
function AccountPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/account" } });
        if (error) throw error;
        setMessage("Regisztráció elküldve. Ellenőrizd az e-mail címed.");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // The 30-day checkbox is a preference only until backend session TTL is configured.
        setMessage(remember ? "Sikeres belépés. A 30 napos munkamenethez szerveroldali TTL beállítás szükséges." : "Sikeres bejelentkezés.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/account" });
        if (error) throw error;
        setMessage("Ha a cím létezik, elküldtük a jelszó-visszaállító linket.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("A jelszavad megváltozott.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sikertelen művelet");
    } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
    <div className="w-full max-w-md rounded-2xl border border-cyan-800/50 bg-slate-900 p-8 shadow-2xl">
      <a href="/" className="text-cyan-400 text-sm">← Quantum AI Lab</a>
      <h1 className="text-2xl font-bold mt-5">{({login:"Bejelentkezés",register:"Regisztráció",forgot:"Elfelejtett jelszó",change:"Jelszó módosítása"} as Record<Mode,string>)[mode]}</h1>
      {!authConfigured && <p role="alert" className="mt-4 rounded bg-amber-950 p-3 text-amber-200">A hitelesítés beállítására vár. Supabase környezeti változók szükségesek.</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode !== "change" && <label className="block text-sm">E-mail cím<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-lg bg-slate-800 border border-slate-600 p-3" /></label>}
        {mode !== "forgot" && <label className="block text-sm">{mode==="change"?"Új jelszó":"Jelszó"}<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} className="mt-2 w-full rounded-lg bg-slate-800 border border-slate-600 p-3" /></label>}
        {mode === "login" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> Maradjak bejelentkezve 30 napig (backend beállítás után)</label>}
        <button type="submit" disabled={!authConfigured || busy} className="w-full rounded-lg bg-cyan-600 p-3 font-semibold disabled:opacity-50">{busy?"Feldolgozás...":"Folytatás"}</button>
      </form>
      {message && <p role="status" className="mt-4 text-sm text-cyan-200">{message}</p>}
      <nav className="mt-6 flex flex-wrap gap-3 text-sm text-cyan-400">
        {(["login","register","forgot","change"] as Mode[]).map(m=><button key={m} type="button" onClick={()=>{setMode(m);setMessage("");}} className="underline">{({login:"Belépés",register:"Regisztráció",forgot:"Jelszó visszaállítás",change:"Jelszócsere"} as Record<Mode,string>)[m]}</button>)}
      </nav>
      <p className="mt-6 text-xs text-slate-400">A robotellenőrzést szerveroldalon ellenőrzött CAPTCHA-val kell aktiválni. A 3×3 képes feladvány típusa a CAPTCHA-szolgáltatótól függ.</p>
    </div>
  </main>;
}
