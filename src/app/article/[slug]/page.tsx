import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Calendar, User, Share2, Sparkles, ExternalLink } from "lucide-react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../../firebase";

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  content: string;
  source: string;
  image: string | null;
  video?: string | null;
  aiSummary?: string | null;
  slug?: string;
}

// Get the domain base url safely
const getAppUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3015";
};

// Fetch articles from both Firestore (exclusive editorials) and the news API (RSS)
async function getArticle(slug: string): Promise<NewsItem | null> {
  // 1. Try querying Firestore editorials first
  try {
    const editorialsCol = collection(db, "editorials");
    const q = query(editorialsCol, where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "",
        link: `/article/${data.slug}`,
        pubDate: data.pubDate || new Date().toISOString(),
        content: data.content || "",
        source: "EDITORIALE",
        image: data.image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800",
        aiSummary: data.aiSummary || "",
        slug: data.slug || "",
      };
    }
  } catch (firestoreError) {
    console.error("Error querying Firestore for article server-side:", firestoreError);
  }

  // 2. Fallback to local news API
  const appUrl = getAppUrl();
  try {
    const res = await fetch(`${appUrl}/api/news`, { 
      cache: "no-store",
      headers: {
        "Accept": "application/json"
      }
    });
    
    if (!res.ok) return null;
    const news: NewsItem[] = await res.json();
    if (Array.isArray(news)) {
      return news.find((item) => item.slug === slug) || null;
    }
  } catch (error) {
    console.error("Error fetching article server-side:", error);
  }
  return null;
}


// Generate dynamic metadata for search engines and social cards
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await getArticle(resolvedParams.slug);
  
  if (!article) {
    return {
      title: "Articolo non trovato | GamesPulse",
    };
  }

  return {
    title: `${article.title} | GamesPulse`,
    description: article.aiSummary || article.content.substring(0, 160),
    openGraph: {
      title: article.title,
      description: article.aiSummary || article.content.substring(0, 160),
      type: "article",
      publishedTime: article.pubDate,
      authors: [article.source],
      images: article.image ? [{ url: article.image }] : [],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = await getArticle(resolvedParams.slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neon-blue selection:text-black">
      {/* Immersive background image glow */}
      {article.image && (
        <div className="absolute top-0 left-0 right-0 h-[60vh] z-0 overflow-hidden pointer-events-none">
          <img 
            src={article.image} 
            alt="" 
            className="w-full h-full object-cover opacity-15 blur-2xl scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
        </div>
      )}

      {/* Main Container */}
      <article className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Navigation back */}
        <Link 
          href={`/?article=${article.slug}`}
          className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-zinc-500 hover:text-neon-blue uppercase transition-colors mb-12 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Torna alla Reader View
        </Link>

        {/* Article Metadata Head */}
        <div className="space-y-6 mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-neon-blue/20 border border-neon-blue/30 rounded-full text-[9px] font-black tracking-widest uppercase text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.1)]">
              {article.source}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.pubDate).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400">
            {article.title}
          </h1>
        </div>

        {/* Hero image card */}
        {article.image && (
          <div className="w-full aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.8)] mb-10">
            <img 
              src={article.image} 
              alt={article.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Article Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Reading Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Quick AI summary card (Highly regarded as original value add by crawler) */}
            {article.aiSummary && (
              <div className="relative group p-6 bg-neon-blue/5 border-l-4 border-neon-blue rounded-r-3xl backdrop-blur-md overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Sparkles className="w-12 h-12 text-neon-blue animate-pulse" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neon-blue/70 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-neon-blue" />
                  Quick AI Summary
                </h3>
                <p className="text-base md:text-lg font-bold text-neon-blue italic leading-snug">
                  &ldquo;{article.aiSummary}&rdquo;
                </p>
              </div>
            )}

            {/* Main content body */}
            <div className="prose prose-invert max-w-none text-zinc-300 text-base md:text-lg leading-relaxed space-y-6 font-medium">
              <p>{article.content}</p>
              
              <p>
                Questo articolo è stato originariamente pubblicato da <strong className="text-white">{article.source}</strong>. Per visualizzare l&apos;approfondimento originale e supportare gli autori, clicca sul link di seguito.
              </p>
            </div>

            {/* Premium action button link to source */}
            <div className="pt-6 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
              <a 
                href={article.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-neon-blue text-black font-black text-xs uppercase tracking-widest hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95 transition-all shadow-[0_0_15px_rgba(0,243,255,0.3)]"
              >
                Continua su {article.source}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Google AdSense Blocco Annuncio inside content */}
            <div className="w-full py-8 border-t border-b border-white/5 my-8 flex flex-col items-center">
              <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-600 uppercase mb-4">Annuncio Pubblicitario</span>
              {/* AdSense ins placeholder */}
              <ins className="adsbygoogle"
                   style={{ display: "block", textAlign: "center" }}
                   data-ad-layout="in-article"
                   data-ad-format="fluid"
                   data-ad-client="ca-pub-1385801472165821"
                   data-ad-slot="default"></ins>
            </div>

          </div>

          {/* Right Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-white/5">
                Info Fonte
              </h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Pubblicazione:</span>
                  <span className="text-sm font-semibold text-white">
                    {new Date(article.pubDate).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })} del {new Date(article.pubDate).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Autore Originale:</span>
                  <span className="text-sm font-semibold text-white">Redazione {article.source}</span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Piattaforma:</span>
                  <span className="text-sm font-semibold text-neon-blue capitalize">GamesPulse Gaming Network</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-950/20 border border-dashed border-white/10 rounded-3xl text-center space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Ti piace GamesPulse?</h4>
              <p className="text-xs text-zinc-500 font-medium">Aggiungi il sito alla schermata home del tuo smartphone per l&apos;esperienza app nativa premium.</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
