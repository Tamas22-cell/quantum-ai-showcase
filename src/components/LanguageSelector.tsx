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

// Additional portfolio and navigation labels.
Object.assign(dictionary.hu, {"Research":"Kutatás","AI Lab":"AI labor","Quantum Lab":"Kvantumlabor","Crypto Intelligence":"Kriptopiaci elemzés","Web3 Monitor":"Web3 monitor","AI & Quantum Computing Researcher":"AI- és kvantumszámítástechnikai kutató","Open live project":"Élő projekt megnyitása","Financial research":"Pénzügyi kutatás","Quantum finance":"Kvantumpénzügy","Portfolio optimization":"Portfólióoptimalizálás","AI agents":"AI-ügynökök","Quantitative finance":"Kvantitatív pénzügyek","Quantum computing":"Kvantumszámítástechnika"});
Object.assign(dictionary.de, {"Research":"Forschung","AI Lab":"KI-Labor","Quantum Lab":"Quantenlabor","Crypto Intelligence":"Kryptoanalyse","Web3 Monitor":"Web3-Monitor","AI & Quantum Computing Researcher":"KI- und Quantencomputing-Forscher","Open live project":"Live-Projekt öffnen","Financial research":"Finanzforschung","Quantum finance":"Quantenfinanzen","Portfolio optimization":"Portfoliooptimierung","AI agents":"KI-Agenten","Quantitative finance":"Quantitative Finanzen","Quantum computing":"Quantencomputing"});
Object.assign(dictionary.fr, {"Research":"Recherche","AI Lab":"Laboratoire IA","Quantum Lab":"Laboratoire quantique","Crypto Intelligence":"Analyse crypto","Web3 Monitor":"Suivi Web3","AI & Quantum Computing Researcher":"Chercheur en IA et informatique quantique","Open live project":"Ouvrir le projet en ligne","Financial research":"Recherche financière","Quantum finance":"Finance quantique","Portfolio optimization":"Optimisation de portefeuille","AI agents":"Agents IA","Quantitative finance":"Finance quantitative","Quantum computing":"Informatique quantique"});
Object.assign(dictionary.it, {"Research":"Ricerca","AI Lab":"Laboratorio IA","Quantum Lab":"Laboratorio quantistico","Crypto Intelligence":"Analisi crypto","Web3 Monitor":"Monitor Web3","AI & Quantum Computing Researcher":"Ricercatore in IA e informatica quantistica","Open live project":"Apri il progetto online","Financial research":"Ricerca finanziaria","Quantum finance":"Finanza quantistica","Portfolio optimization":"Ottimizzazione del portafoglio","AI agents":"Agenti IA","Quantitative finance":"Finanza quantitativa","Quantum computing":"Informatica quantistica"});

const originalText = new WeakMap<Text, string>();

export function LanguageSelector() {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("quantum-lab-language");
    const selected = languages.find(x => x.code === saved)?.code;
    if (selected) setLanguage(selected);
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
          const el = node as Text;
          const original = originalText.get(el) ?? el.textContent ?? "";
          if (!originalText.has(el)) originalText.set(el, original);
          const key = original.trim();
          const translation = dictionary[language][key] ?? dictionary[language][Object.keys(dictionary[language]).find(k => k.toUpperCase() === key) ?? ""]?.toUpperCase();
          const next = translation ? original.replace(key, translation) : original;
          if (el.textContent !== next) el.textContent = next;
        }
      });
    };
    translate();
    const observer = new MutationObserver(() => { observer.disconnect(); translate(); observer.observe(document.body, {childList:true,subtree:true}); });
    observer.observe(document.body, {childList:true,subtree:true});
    return () => observer.disconnect();
  }, [language]);
  return (
    <div data-language-selector="" style={{position:"fixed",bottom:18,right:12,zIndex:2147483647,background:"#101a2c",color:"white",border:"1px solid #64748b",borderRadius:9,padding:"6px 10px",fontSize:13}}>
      <label htmlFor="site-language" style={{marginRight:6}}>🌐</label>
      <select id="site-language" aria-label="Website language" value={language} onChange={e=>setLanguage(e.target.value as Language)} style={{background:"#101a2c",color:"white",border:0}}>
        {languages.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </div>
  );
}
