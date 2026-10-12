import { useEffect, useState } from "react";

const languages = [
  { code: "en", label: "English" },
  { code: "hu", label: "Magyar" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
] as const;
type Language = (typeof languages)[number]["code"];

const dictionary: Record<Language, Record<string, string>> = {
  en: {},
  hu: { "Portfolio": "Portfólió", "Research Lab": "Kutatólabor", "Credentials": "Tanúsítványok", "About": "Rólam", "Projects": "Projektek", "Home": "Főoldal", "Contact": "Kapcsolat", "Sign in": "Bejelentkezés", "Sign up": "Regisztráció", "Run": "Futtatás", "Learn more": "További információ", "View project": "Projekt megtekintése" },
  de: { "Portfolio": "Portfolio", "Research Lab": "Forschungslabor", "Credentials": "Zertifikate", "About": "Über mich", "Projects": "Projekte", "Home": "Startseite", "Contact": "Kontakt", "Sign in": "Anmelden", "Sign up": "Registrieren", "Run": "Ausführen", "Learn more": "Mehr erfahren", "View project": "Projekt ansehen" },
  fr: { "Portfolio": "Portfolio", "Research Lab": "Laboratoire de recherche", "Credentials": "Certifications", "About": "À propos", "Projects": "Projets", "Home": "Accueil", "Contact": "Contact", "Sign in": "Connexion", "Sign up": "Inscription", "Run": "Exécuter", "Learn more": "En savoir plus", "View project": "Voir le projet" },
  it: { "Portfolio": "Portfolio", "Research Lab": "Laboratorio di ricerca", "Credentials": "Certificazioni", "About": "Chi sono", "Projects": "Progetti", "Home": "Home", "Contact": "Contatti", "Sign in": "Accedi", "Sign up": "Registrati", "Run": "Esegui", "Learn more": "Scopri di più", "View project": "Visualizza progetto" },
};

export function LanguageSelector() {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    const saved = localStorage.getItem("quantum-lab-language");
    const browser = navigator.language.slice(0, 2);
    const selected = languages.find(x => x.code === saved)?.code ?? languages.find(x => x.code === browser)?.code ?? "en";
    setLanguage(selected);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("quantum-lab-language", language);
    const translate = () => {
      document.querySelectorAll("main, header, nav, footer").forEach(root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.parentElement?.closest("[data-language-selector],script,style,textarea,input,code,pre")) continue;
          const el = node as Text & { __original?: string };
          const original = el.__original ?? el.textContent ?? "";
          if (!el.__original) el.__original = original;
          const key = original.trim();
          const translation = dictionary[language][key];
          el.textContent = translation ? original.replace(key, translation) : original;
        }
      });
    };
    translate();
    const observer = new MutationObserver(() => { observer.disconnect(); translate(); observer.observe(document.body, {childList:true,subtree:true}); });
    observer.observe(document.body, {childList:true,subtree:true});
    return () => observer.disconnect();
  }, [language]);
  return (
    <div data-language-selector="" style={{position:"fixed",top:12,right:12,zIndex:9999,background:"#101a2c",color:"white",border:"1px solid #64748b",borderRadius:9,padding:"6px 10px",fontSize:13}}>
      <label htmlFor="site-language" style={{marginRight:6}}>🌐</label>
      <select id="site-language" aria-label="Website language" value={language} onChange={e=>setLanguage(e.target.value as Language)} style={{background:"#101a2c",color:"white",border:0}}>
        {languages.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </div>
  );
}
