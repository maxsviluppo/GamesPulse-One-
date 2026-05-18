import Link from "next/link";
import { Mail, ChevronLeft, Send, MapPin, Globe } from "lucide-react";

export const metadata = {
  title: "Contatti | GamesPulse",
  description: "Contatta la redazione ed il team di sviluppo di GamesPulse per collaborazioni o segnalazioni.",
};

export default function ContactsPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neon-blue selection:text-black">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-15%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(0,243,255,0.06)_0%,_transparent_75%)] rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-15%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(255,0,255,0.06)_0%,_transparent_75%)] rounded-full blur-3xl" />
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
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,0,255,0.15)] animate-pulse">
            <Mail className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              Contatti
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">
              Entra in contatto con noi
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-zinc-400 text-sm font-medium">
          
          {/* Left Column: Direct Contacts */}
          <div className="md:col-span-1 space-y-6">
            <h2 className="text-white text-base font-bold uppercase tracking-wide border-b border-white/5 pb-2">
              Info Contatti
            </h2>
            
            <div className="space-y-4 text-xs md:text-sm">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-neon-blue shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Email Generale:</span>
                  <a href="mailto:castromassimo@gmail.com" className="text-white hover:text-neon-blue transition-colors font-semibold">
                    castromassimo@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Località:</span>
                  <span className="text-white font-semibold">Italia</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Sito Web:</span>
                  <a href="https://www.gamespulse.it" target="_blank" rel="noopener noreferrer" className="text-white hover:text-emerald-400 transition-colors font-semibold">
                    www.gamespulse.it
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Form placeholder (visual validation) */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-white text-base font-bold uppercase tracking-wide border-b border-white/5 pb-2">
              Invia un Messaggio
            </h2>

            <form className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="name" className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Nome Completo</label>
                  <input 
                    type="text" 
                    id="name" 
                    placeholder="Il tuo nome" 
                    className="w-full bg-zinc-950/60 border border-white/5 rounded-2xl p-3 text-xs focus:outline-none focus:border-neon-blue/40 text-white transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="email" className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Indirizzo Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    placeholder="La tua email" 
                    className="w-full bg-zinc-950/60 border border-white/5 rounded-2xl p-3 text-xs focus:outline-none focus:border-neon-blue/40 text-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="message" className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Messaggio</label>
                <textarea 
                  id="message" 
                  rows={5}
                  placeholder="Scrivi qui il tuo messaggio..." 
                  className="w-full bg-zinc-950/60 border border-white/5 rounded-2xl p-3 text-xs focus:outline-none focus:border-neon-blue/40 text-white transition-colors resize-none"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-neon-blue text-black font-black text-xs uppercase tracking-widest opacity-80 cursor-not-allowed hover:opacity-100 transition-all"
              >
                Invia Messaggio
                <Send className="w-3.5 h-3.5" />
              </button>
              <p className="text-[9px] text-zinc-600 font-medium">Nota: Il form è attivo a scopi di validazione. Per comunicazioni urgenti, scrivi direttamente all&apos;indirizzo email di contatto.</p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
