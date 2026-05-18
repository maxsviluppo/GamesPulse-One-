import Link from "next/link";
import { ShieldCheck, ChevronLeft, Mail } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | GamesPulse",
  description: "Informativa sulla privacy e protezione dei dati personali per l'applicazione GamesPulse.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neon-blue selection:text-black">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_rgba(0,243,255,0.08)_0%,_transparent_75%)] rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_rgba(255,0,255,0.08)_0%,_transparent_75%)] rounded-full blur-3xl" />
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
          <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.15)]">
            <ShieldCheck className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tighter uppercase md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              Privacy Policy
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">
              Ultimo aggiornamento: 18 Maggio 2026
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="prose prose-invert max-w-none space-y-8 text-zinc-400 text-sm md:text-base leading-relaxed font-medium">
          
          <section className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,243,255,1)]" />
              1. Titolare del Trattamento dei Dati
            </h2>
            <p>
              L&apos;applicazione <strong className="text-white">GamesPulse</strong> (accessibile all&apos;indirizzo <a href="https://www.gamespulse.it" className="text-neon-blue hover:underline">www.gamespulse.it</a>) è ideata, sviluppata e gestita da:
            </p>
            <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2 text-xs md:text-sm">
              <p><strong className="text-white">Titolare:</strong> Castro Massimo</p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neon-blue" />
                <a href="mailto:castromassimo@gmail.com" className="text-neon-blue hover:underline">castromassimo@gmail.com</a>
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,243,255,1)]" />
              2. Tipologie di Dati Raccolti
            </h2>
            <p>
              GamesPulse raccoglie esclusivamente i dati strettamente necessari all&apos;erogazione del servizio di aggregazione notizie e personalizzazione dell&apos;esperienza utente:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-white">Dati di Profilo (Login con Google):</strong> Indirizzo email, nome visualizzato, foto del profilo ed ID utente forniti tramite autenticazione sicura Firebase Auth.
              </li>
              <li>
                <strong className="text-white">Preferenze Utente:</strong> La lista dei tuoi articoli salvati nei preferiti per consentirne la sincronizzazione multi-dispositivo.
              </li>
              <li>
                <strong className="text-white">Dati di Navigazione:</strong> Cookie tecnici essenziali per mantenere la sessione attiva e parametri analitici aggregati e anonimizzati (tramite Google Analytics 4) per monitorare la stabilità dell&apos;applicazione.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,243,255,1)]" />
              3. Finalità del Trattamento
            </h2>
            <p>
              I dati personali vengono raccolti ed utilizzati per le seguenti finalità legittime:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Consentire la creazione del profilo utente e la sincronizzazione preferiti.</li>
              <li>Migliorare la sicurezza e prevenire attività illecite o fraudolente sulla piattaforma.</li>
              <li>Fornire annunci pubblicitari pertinenti attraverso la rete Google AdSense.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,243,255,1)]" />
              4. Conservazione dei Dati e Sicurezza
            </h2>
            <p>
              Tutti i profili utente e i preferiti sincronizzati sono ospitati su server ultra-sicuri gestiti da <strong className="text-white">Firebase (Google Cloud Platform)</strong>, localizzati all&apos;interno dell&apos;Unione Europea nel pieno rispetto delle linee guida del GDPR. I dati rimangono archiviati fino alla richiesta esplicita di cancellazione da parte dell&apos;utente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,243,255,1)]" />
              5. Diritti dell&apos;Utente (GDPR)
            </h2>
            <p>
              In conformità con il Regolamento Europeo 2016/679 (GDPR), ciascun utente ha il diritto di:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accedere ai propri dati personali in nostro possesso.</li>
              <li>Rettificare o aggiornare informazioni non corrette.</li>
              <li>Richiedere la cancellazione permanente di tutti i propri dati (Diritto all&apos;Oblio) scrivendo a <a href="mailto:castromassimo@gmail.com" className="text-neon-blue hover:underline">castromassimo@gmail.com</a>.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,243,255,1)]" />
              6. Cookie e Annunci di Terze Parti (AdSense)
            </h2>
            <p>
              Questo sito ospita annunci forniti da <strong className="text-white">Google AdSense</strong>. Google utilizza cookie per pubblicare annunci basati sulle visite precedenti dell&apos;utente su questo o su altri siti web. L&apos;uso dei cookie pubblicitari consente a Google e ai suoi partner di pubblicare annunci per gli utenti in base alla loro navigazione. Gli utenti possono scegliere di disattivare la pubblicità personalizzata visitando le <a href="https://settings.google.com/ads" target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">Impostazioni Annunci di Google</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
