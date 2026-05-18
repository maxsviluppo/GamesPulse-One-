import Link from "next/link";
import { ShieldCheck, ChevronLeft, Cookie } from "lucide-react";

export const metadata = {
  title: "Cookie Policy | GamesPulse",
  description: "Informativa sull'utilizzo dei cookie per l'applicazione GamesPulse.",
};

export default function CookiePage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neon-blue selection:text-black">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_rgba(0,243,255,0.08)_0%,_transparent_75%)] rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_rgba(255,0,255,0.08)_0%,_transparent_75%)] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-24">
        {/* Navigation back */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-zinc-500 hover:text-neon-blue uppercase transition-colors mb-12 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Torna alla Home
        </Link>

        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,0,255,0.15)]">
            <Cookie className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tighter uppercase md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              Cookie Policy
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">
              Ultimo aggiornamento: 18 Maggio 2026
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="prose prose-invert max-w-none space-y-8 text-zinc-400 text-sm md:text-base leading-relaxed font-medium">
          
          <p>
            Questa informativa descrive come <strong className="text-white">GamesPulse</strong> utilizza i cookie e tecnologie simili per fornire, proteggere e migliorare il proprio servizio. Navigando sul sito, acconsenti all&apos;uso dei cookie in conformità con la presente informativa.
          </p>

          <section className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(255,0,255,1)]" />
              1. Cosa sono i Cookie?
            </h2>
            <p>
              I cookie sono piccoli file di testo che i siti web visitati dall&apos;utente inviano al suo browser, dove vengono memorizzati per essere poi ritrasmessi agli stessi siti alla visita successiva. Consentono al sito di ricordare le tue preferenze di navigazione (es. login, lingua, filtri di categoria) rendendo la navigazione più rapida ed efficiente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(255,0,255,1)]" />
              2. Quali Cookie Utilizziamo?
            </h2>
            <p>
              Utilizziamo tre macro-categorie di cookie sul nostro sito:
            </p>
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <h3 className="text-white font-bold text-sm uppercase mb-1">A. Cookie Tecnici Necessari</h3>
                <p className="text-xs">
                  Sono indispensabili per navigare sul sito e usufruire delle sue funzioni di base (come l&apos;autenticazione tramite Firebase o la memorizzazione del consenso dei cookie). Senza questi cookie, il servizio non potrebbe funzionare correttamente. Non richiedono il preventivo consenso dell&apos;utente.
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <h3 className="text-white font-bold text-sm uppercase mb-1">B. Cookie Analitici (Anonimizzati)</h3>
                <p className="text-xs">
                  Forniti da Google Analytics 4, ci consentono di raccogliere informazioni aggregate e totalmente anonime sul numero di utenti che visitano il sito e su come interagiscono con esso (es. quali categorie sono più cliccate). Questo ci aiuta a monitorare la stabilità dell&apos;app e migliorarla.
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <h3 className="text-white font-bold text-sm uppercase mb-1">C. Cookie di Profilazione Pubblicitaria (Google AdSense)</h3>
                <p className="text-xs">
                  Google AdSense utilizza cookie per pubblicare annunci personalizzati e mirati sulle preferenze di gioco e di navigazione degli utenti. I cookie pubblicitari consentono a Google e ai suoi partner di selezionare gli annunci più pertinenti ed evitare di mostrare pubblicità ripetute o non gradite.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(255,0,255,1)]" />
              3. Come Gestire o Disattivare i Cookie?
            </h2>
            <p>
              Puoi configurare il tuo browser per accettare, bloccare o eliminare tutti o parte dei cookie installati sul tuo dispositivo. Ciascun browser ha procedure diverse per la gestione delle impostazioni:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-xs md:text-sm">
              <li>
                <strong className="text-white">Google Chrome:</strong> Impostazioni &gt; Privacy e sicurezza &gt; Cookie e altri dati dei siti.
              </li>
              <li>
                <strong className="text-white">Apple Safari:</strong> Preferenze &gt; Privacy &gt; Blocca tutti i cookie.
              </li>
              <li>
                <strong className="text-white">Mozilla Firefox:</strong> Opzioni &gt; Privacy e sicurezza &gt; Cookie e dati dei siti.
              </li>
              <li>
                <strong className="text-white">Microsoft Edge:</strong> Impostazioni &gt; Autorizzazioni sito &gt; Cookie e dati salvati.
              </li>
            </ul>
            <p className="mt-4">
              Per quanto riguarda i cookie pubblicitari di terze parti, puoi impostare le tue preferenze direttamente tramite la piattaforma europea <a href="https://www.youronlinechoices.com/it/" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">Your Online Choices</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
