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

Object.assign(dictionary.hu, {"Independent research portfolio":"Független kutatási portfólió","Researcher":"Kutató","Computing Researcher":"Számítástechnikai kutató","AI Development":"AI-fejlesztés","Explore projects":"Projektek felfedezése","Explore Projects":"Projektek megtekintése","Belépés / Regisztráció":"Belépés / Regisztráció","Research Question":"Kutatási kérdés","Planner Agent":"Tervező ügynök","Data Agent":"Adatügynök","Market Agent":"Piaci ügynök","Risk Agent":"Kockázati ügynök","Critic Agent":"Ellenőrző ügynök","Final Synthesis":"Végső összegzés","AI & Quantum":"AI és kvantum","Independent Research":"Független kutatás"});
Object.assign(dictionary.de, {"Independent research portfolio":"Unabhängiges Forschungsportfolio","Researcher":"Forscher","Computing Researcher":"Computing-Forscher","AI Development":"KI-Entwicklung","Explore Projects":"Projekte entdecken","Belépés / Regisztráció":"Anmelden / Registrieren","Research Question":"Forschungsfrage","Planner Agent":"Planungsagent","Data Agent":"Datenagent","Market Agent":"Marktagent","Risk Agent":"Risikoagent","Critic Agent":"Prüfagent","Final Synthesis":"Abschließende Synthese","AI & Quantum":"KI und Quanten"});
Object.assign(dictionary.fr, {"Independent research portfolio":"Portfolio de recherche indépendant","Researcher":"Chercheur","Computing Researcher":"Chercheur en informatique","AI Development":"Développement IA","Explore Projects":"Explorer les projets","Belépés / Regisztráció":"Connexion / Inscription","Research Question":"Question de recherche","Planner Agent":"Agent de planification","Data Agent":"Agent de données","Market Agent":"Agent de marché","Risk Agent":"Agent de risque","Critic Agent":"Agent critique","Final Synthesis":"Synthèse finale","AI & Quantum":"IA et quantique"});
Object.assign(dictionary.it, {"Independent research portfolio":"Portfolio di ricerca indipendente","Researcher":"Ricercatore","Computing Researcher":"Ricercatore informatico","AI Development":"Sviluppo IA","Explore Projects":"Esplora i progetti","Belépés / Regisztráció":"Accesso / Registrazione","Research Question":"Domanda di ricerca","Planner Agent":"Agente pianificatore","Data Agent":"Agente dati","Market Agent":"Agente di mercato","Risk Agent":"Agente di rischio","Critic Agent":"Agente revisore","Final Synthesis":"Sintesi finale","AI & Quantum":"IA e quantistica"});


// Additional full-section labels and descriptions for the five-language experience.
Object.assign(dictionary.hu, {"Autonomous AI Systems":"Autonóm AI-rendszerek","Multi-agent coordination, financial research workflows and verifiable decision support.":"Többügynökös koordináció, pénzügyi kutatási munkafolyamatok és ellenőrizhető döntéstámogatás.","Quantum Finance":"Kvantumpénzügyek","Portfolio optimization, stress testing and hybrid classical-quantum financial experiments.":"Portfólióoptimalizálás, stressztesztek és hibrid klasszikus–kvantum pénzügyi kísérletek.","Quantum Algorithms":"Kvantumalgoritmusok","QAOA, VQE and QML research focused on practical hybrid system design.":"QAOA-, VQE- és QML-kutatás gyakorlati hibrid rendszerek fejlesztéséhez.","Open AI Research":"AI-kutatás megnyitása","Open Finance Lab":"Pénzügyi labor megnyitása","Open Quantum Lab":"Kvantumlabor megnyitása","Run research pulse":"Kutatási impulzus indítása","Research field":"Kutatási terület","Hybrid intelligence topology":"Hibrid intelligencia topológiája","Agent coordination":"Ügynökkoordináció","Quantum optimization":"Kvantumoptimalizálás","QML signal":"QML-jel","Hybrid confidence":"Hibrid megbízhatóság","Awaiting pulse":"Impulzusra vár","Simulation / v1.0":"Szimuláció / v1.0","Ask AI Research Assistant":"AI-kutatási asszisztens kérdezése","Explore research":"Kutatás felfedezése","Local interactive simulation · research visualization · no quantum advantage claim":"Helyi interaktív szimuláció · kutatási vizualizáció · nem állít kvantumelőnyt","Independent research portfolio":"Független kutatási portfólió","Multi-agent AI":"Többügynökös AI","Market Analysis":"Piacelemzés","Risk Analysis":"Kockázatelemzés","News / Sentiment":"Hírek / hangulat","Research Question":"Kutatási kérdés","AI Financial Research Platform":"AI pénzügyi kutatási platform","Quantum Portfolio Optimizer":"Kvantumportfólió-optimalizáló"});
Object.assign(dictionary.de, {"Autonomous AI Systems":"Autonome KI-Systeme","Multi-agent coordination, financial research workflows and verifiable decision support.":"Multi-Agenten-Koordination, Finanzforschung und überprüfbare Entscheidungsunterstützung.","Quantum Finance":"Quantenfinanzen","Portfolio optimization, stress testing and hybrid classical-quantum financial experiments.":"Portfoliooptimierung, Stresstests und hybride klassisch-quantenbasierte Finanzexperimente.","Quantum Algorithms":"Quantenalgorithmen","QAOA, VQE and QML research focused on practical hybrid system design.":"QAOA-, VQE- und QML-Forschung für praxisnahe hybride Systeme.","Open AI Research":"KI-Forschung öffnen","Open Finance Lab":"Finanzlabor öffnen","Open Quantum Lab":"Quantenlabor öffnen","Run research pulse":"Forschungsimpuls starten","Research field":"Forschungsfeld","Hybrid intelligence topology":"Topologie hybrider Intelligenz","Agent coordination":"Agentenkoordination","Quantum optimization":"Quantenoptimierung","QML signal":"QML-Signal","Hybrid confidence":"Hybride Zuverlässigkeit","Awaiting pulse":"Warten auf Impuls","Simulation / v1.0":"Simulation / v1.0","Ask AI Research Assistant":"KI-Forschungsassistent fragen","Explore research":"Forschung erkunden","Local interactive simulation · research visualization · no quantum advantage claim":"Lokale interaktive Simulation · Forschungsvisualisierung · kein behaupteter Quantenvorteil","Independent research portfolio":"Unabhängiges Forschungsportfolio","Multi-agent AI":"Multi-Agenten-KI","Market Analysis":"Marktanalyse","Risk Analysis":"Risikoanalyse","News / Sentiment":"Nachrichten / Stimmung","Research Question":"Forschungsfrage","AI Financial Research Platform":"KI-Finanzforschungsplattform","Quantum Portfolio Optimizer":"Quantenportfolio-Optimierer"});
Object.assign(dictionary.fr, {"Autonomous AI Systems":"Systèmes d’IA autonomes","Multi-agent coordination, financial research workflows and verifiable decision support.":"Coordination multi-agents, recherche financière et aide à la décision vérifiable.","Quantum Finance":"Finance quantique","Portfolio optimization, stress testing and hybrid classical-quantum financial experiments.":"Optimisation de portefeuille, tests de résistance et expériences financières hybrides classiques-quantiques.","Quantum Algorithms":"Algorithmes quantiques","QAOA, VQE and QML research focused on practical hybrid system design.":"Recherche QAOA, VQE et QML axée sur les systèmes hybrides pratiques.","Open AI Research":"Ouvrir la recherche IA","Open Finance Lab":"Ouvrir le laboratoire financier","Open Quantum Lab":"Ouvrir le laboratoire quantique","Run research pulse":"Lancer l’impulsion de recherche","Research field":"Domaine de recherche","Hybrid intelligence topology":"Topologie de l’intelligence hybride","Agent coordination":"Coordination des agents","Quantum optimization":"Optimisation quantique","QML signal":"Signal QML","Hybrid confidence":"Fiabilité hybride","Awaiting pulse":"En attente d’impulsion","Simulation / v1.0":"Simulation / v1.0","Ask AI Research Assistant":"Interroger l’assistant de recherche IA","Explore research":"Explorer la recherche","Local interactive simulation · research visualization · no quantum advantage claim":"Simulation interactive locale · visualisation de recherche · aucun avantage quantique revendiqué","Independent research portfolio":"Portfolio de recherche indépendant","Multi-agent AI":"IA multi-agents","Market Analysis":"Analyse de marché","Risk Analysis":"Analyse des risques","News / Sentiment":"Actualités / sentiment","Research Question":"Question de recherche","AI Financial Research Platform":"Plateforme de recherche financière IA","Quantum Portfolio Optimizer":"Optimiseur de portefeuille quantique"});
Object.assign(dictionary.it, {"Autonomous AI Systems":"Sistemi di IA autonomi","Multi-agent coordination, financial research workflows and verifiable decision support.":"Coordinamento multi-agente, ricerca finanziaria e supporto decisionale verificabile.","Quantum Finance":"Finanza quantistica","Portfolio optimization, stress testing and hybrid classical-quantum financial experiments.":"Ottimizzazione del portafoglio, stress test ed esperimenti finanziari ibridi classico-quantistici.","Quantum Algorithms":"Algoritmi quantistici","QAOA, VQE and QML research focused on practical hybrid system design.":"Ricerca QAOA, VQE e QML per sistemi ibridi pratici.","Open AI Research":"Apri la ricerca IA","Open Finance Lab":"Apri il laboratorio finanziario","Open Quantum Lab":"Apri il laboratorio quantistico","Run research pulse":"Avvia impulso di ricerca","Research field":"Campo di ricerca","Hybrid intelligence topology":"Topologia dell’intelligenza ibrida","Agent coordination":"Coordinamento degli agenti","Quantum optimization":"Ottimizzazione quantistica","QML signal":"Segnale QML","Hybrid confidence":"Affidabilità ibrida","Awaiting pulse":"In attesa dell’impulso","Simulation / v1.0":"Simulazione / v1.0","Ask AI Research Assistant":"Chiedi all’assistente di ricerca IA","Explore research":"Esplora la ricerca","Local interactive simulation · research visualization · no quantum advantage claim":"Simulazione interattiva locale · visualizzazione di ricerca · nessun vantaggio quantistico dichiarato","Independent research portfolio":"Portfolio di ricerca indipendente","Multi-agent AI":"IA multi-agente","Market Analysis":"Analisi di mercato","Risk Analysis":"Analisi del rischio","News / Sentiment":"Notizie / sentiment","Research Question":"Domanda di ricerca","AI Financial Research Platform":"Piattaforma di ricerca finanziaria IA","Quantum Portfolio Optimizer":"Ottimizzatore di portafoglio quantistico"});

const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, Map<string, string>>();

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
      document.querySelectorAll("body").forEach(root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.parentElement?.closest("[data-language-selector],script,style,textarea,input,code,pre")) continue;
          const el = node as Text;
          const original = originalText.get(el) ?? el.textContent ?? "";
          if (!originalText.has(el)) originalText.set(el, original);
          const key = original.trim();
          const exact = dictionary[language][key];
          const upperKey = Object.keys(dictionary[language]).find(k => k.toUpperCase() === key);
          const translation = exact ?? (upperKey ? dictionary[language][upperKey].toUpperCase() : undefined);
          const next = translation ? original.replace(key, translation) : original;
          if (el.textContent !== next) el.textContent = next;
        }
      });
      document.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label],[alt]").forEach(el => {
        if (el.closest("[data-language-selector],script,style,code,pre")) return;
        let originals = originalAttrs.get(el);
        if (!originals) { originals = new Map(); originalAttrs.set(el, originals); }
        for (const attr of ["placeholder", "title", "aria-label", "alt"]) {
          if (!el.hasAttribute(attr)) continue;
          if (!originals.has(attr)) originals.set(attr, el.getAttribute(attr) ?? "");
          const original = originals.get(attr) ?? "";
          const key = original.trim();
          const translated = dictionary[language][key];
          const next = translated ? original.replace(key, translated) : original;
          if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
        }
      });
    };
    translate();
    const observer = new MutationObserver(() => { observer.disconnect(); translate(); observer.observe(document.body, {childList:true,subtree:true,characterData:true}); });
    observer.observe(document.body, {childList:true,subtree:true,characterData:true});
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
