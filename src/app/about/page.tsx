import Link from "next/link";
import { Gamepad2, ChevronLeft, Award, Users, ShieldAlert, Radio } from "lucide-react";

export const metadata = {
  title: "Chi Siamo | GamesPulse",
  description: "La storia, la missione e la tecnologia dietro la piattaforma GamesPulse.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neon-blue selection:text-black">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(0,243,255,0.06)_0%,_transparent_75%)] rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(255,0,255,0.06)_0%,_transparent_75%)] rounded-full blur-3xl" />
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
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.15)] animate-pulse">
            <Gamepad2 className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              Chi Siamo
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">
              La Redazione di GamesPulse
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="prose prose-invert max-w-none space-y-10 text-zinc-400 text-sm md:text-base leading-relaxed font-medium">
          
          <section className="space-y-4">
            <h2 className="text-white text-xl font-black uppercase tracking-tight">
              Il Polso del Gaming in Tempo Reale
            </h2>
            <p>
              <strong className="text-white">GamesPulse</strong> nasce da una visione chiara: superare il caos informativo del web odierno per offrire ai videogiocatori un hub centrale ed elegante. Aggreghiamo in un&apos;unica esperienza d&apos;uso ultra-premium le notizie di testate gaming nazionali e internazionali, arricchendole con sintesi generate tramite intelligenza artificiale per un consumo rapido ed informato.
            </p>
          </section>

          {/* Cards section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
            <div className="p-6 bg-zinc-950/40 border border-white/5 rounded-3xl backdrop-blur-sm">
              <Award className="w-8 h-8 text-neon-blue mb-4" />
              <h3 className="text-white font-bold uppercase tracking-wide text-sm mb-2">Qualità Editoriale</h3>
              <p className="text-xs text-zinc-500">
                Selezioniamo rigorosamente le fonti incluse nel nostro network per garantire informazioni veritiere, tempestive ed autorevoli su PlayStation, Xbox, Nintendo, PC e Mobile.
              </p>
            </div>
            <div className="p-6 bg-zinc-950/40 border border-white/5 rounded-3xl backdrop-blur-sm">
              <Radio className="w-8 h-8 text-pink-500 mb-4" />
              <h3 className="text-white font-bold uppercase tracking-wide text-sm mb-2">Innovazione Tech</h3>
              <p className="text-xs text-zinc-500">
                Utilizziamo i modelli avanzati di Google Gemini per sintetizzare all&apos;istante in frasi efficaci le notizie, offrendo un riassunto immediato prima di addentrarsi nella lettura completa.
              </p>
            </div>
          </div>

          <section className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-sm space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <Users className="w-5 h-5 text-neon-blue" />
              Il Fondatore
            </h2>
            <p>
              GamesPulse è stato interamente ideato, sviluppato e curato da <strong className="text-white">Castro Massimo</strong>, appassionato programmatore ed accanito videogiocatore. 
            </p>
            <p>
              Castro Massimo gestisce l&apos;infrastruttura tecnologica, la curazione dei feed, il server di back-end e lo sviluppo del design premium, con l&apos;obiettivo di creare la risorsa di riferimento definitiva per i gamer italiani ed europei.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <ShieldAlert className="w-5 h-5 text-pink-500" />
              Responsabilità Editoriale e Copyright
            </h2>
            <p>
              Rispettiamo pienamente il lavoro e il copyright delle testate collegate. Il nostro sistema di aggregazione mostra esclusivamente titoli e brevi descrizioni pubbliche forniti tramite feed RSS, reindirizzando costantemente l&apos;utente all&apos;articolo completo sul sito ufficiale della testata di origine.
            </p>
            <p>
              Qualora un editore o un autore desideri richiedere la rimozione dei propri feed dal nostro sistema di aggregazione, è sufficiente inviare una notifica a <a href="mailto:castromassimo@gmail.com" className="text-neon-blue hover:underline">castromassimo@gmail.com</a>. La rimozione avverrà entro 24 ore lavorative.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
