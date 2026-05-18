"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, 
  Newspaper, 
  Trophy, 
  Settings, 
  Search, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Monitor,
  Smartphone,
  Cpu,
  LayoutGrid,
  X,
  User,
  Heart,
  Share2,
  Send,
  LogOut,
  LogIn,
  ShieldCheck,
  Globe,
  Info,
  Shield,
  Lock,
  Save,
  Database,
  Activity,
  Sparkles,
  Brain
} from 'lucide-react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  onAuthStateChanged, 
  User as FirebaseUser,
  handleFirestoreError,
  OperationType,
  testConnection
} from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  content: string;
  source: string;
  image: string | null;
  video?: string | null;
  category?: string;
  aiSummary?: string | null;
  slug?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Home', icon: <LayoutGrid size={20} />, color: '#00f3ff' },
  { id: 'favorites', label: 'Favorites', icon: <Heart size={20} />, color: '#ff2e63' },
  { id: 'playstation', label: 'PS5', icon: <div className="font-bold text-xs">PS</div>, color: '#0072ce' },
  { id: 'xbox', label: 'Xbox', icon: <div className="font-bold text-xs">XB</div>, color: '#107c10' },
  { id: 'nintendo', label: 'Switch', icon: <div className="font-bold text-xs">NT</div>, color: '#e60012' },
  { id: 'pc', label: 'PC', icon: <Monitor size={20} />, color: '#bc13fe' },
  { id: 'tech', label: 'Tech', icon: <Cpu size={20} />, color: '#39ff14' },
  { id: 'mobile', label: 'Mobile', icon: <Smartphone size={20} />, color: '#ff00ff' },
];

const getCategory = (item: NewsItem) => {
  const source = (item.source || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const content = (item.content || '').toLowerCase();
  
  // PlayStation
  if (
    source === 'pushsquare' || 
    source === 'ps_global' || 
    source === 'ign_it' || // IGN often has broad coverage but prioritize PS if titles match
    title.includes('ps5') || 
    title.includes('playstation') || 
    title.includes('sony') ||
    title.includes('dualview') ||
    title.includes('god of war') ||
    title.includes('horizon') ||
    title.includes('the last of us')
  ) return 'playstation';

  // Xbox
  if (
    source === 'purexbox' || 
    source === 'xbox_global' || 
    title.includes('xbox') || 
    title.includes('microsoft') || 
    title.includes('series x') || 
    title.includes('series s') ||
    title.includes('halo') ||
    title.includes('forza') ||
    title.includes('game pass')
  ) return 'xbox';

  // Nintendo
  if (
    source === 'nintendolife' || 
    source === 'nintendo_it' || 
    title.includes('nintendo') || 
    title.includes('switch') || 
    title.includes('mario') || 
    title.includes('zelda') || 
    title.includes('pokemon') || 
    title.includes('metroid')
  ) return 'nintendo';

  // PC
  if (
    source === 'pcgamer' || 
    source === 'kotaku' || // Kotaku covers many, but often PC/General
    title.includes('pc master race') || 
    title.includes('steam') || 
    title.includes('epic games') || 
    title.includes('rtx') || 
    title.includes('geforce') ||
    title.includes('amd') ||
    title.includes('keyboard') ||
    title.includes('mouse')
  ) return 'pc';

  // Mobile
  if (
    source === 'androidcentral' || 
    source === 'macrumors' || 
    title.includes('mobile') || 
    title.includes('ios') || 
    title.includes('android') || 
    title.includes('iphone') || 
    title.includes('smartphone') ||
    title.includes('app store') ||
    title.includes('google play')
  ) return 'mobile';

  // Tech & Hardware
  if (
    source === 'theverge' || 
    source === 'engadget' || 
    source === 'hdblog' || 
    source === 'digitalfoundry' || 
    source === 'everyeye' || // IT broad, but often tech focused
    title.includes('gpu') || 
    title.includes('cpu') || 
    title.includes('hardware') || 
    title.includes('tech') || 
    title.includes('ai') || 
    title.includes('openai') || 
    title.includes('chatgpt')
  ) return 'tech';
  
  return 'general';
};

const NEON_COLORS = [
  'neon-border-blue hover:shadow-[0_0_40px_rgba(0,243,255,0.8)]',
  'neon-border-pink hover:shadow-[0_0_40px_rgba(255,0,255,0.8)]',
  'neon-border-green hover:shadow-[0_0_40px_rgba(57,255,20,0.8)]',
  'neon-border-purple hover:shadow-[0_0_40px_rgba(188,19,254,0.8)]',
];

// AdSense Component
const AdUnit = ({ slot }: { slot?: string }) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="w-full my-6 bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4 min-h-[250px]">
      <span className="text-[10px] text-white/30 uppercase tracking-widest mb-4">Advertisement</span>
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-1385801472165821"
           data-ad-slot={slot || "default"}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

const NewsCard = ({ item, index, onInteraction, isFavorite, onToggleFavorite }: { 
  item: NewsItem; 
  index: number; 
  onInteraction: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const main = document.querySelector('main');
    if (isFlipped) {
      if (main) {
        main.style.overflowY = 'hidden';
        main.classList.remove('snap-y', 'snap-mandatory');
      }
      document.title = `${item.title} | GamesPulse`;
    } else {
      if (main) {
        main.style.overflowY = 'auto';
        main.classList.add('snap-y', 'snap-mandatory');
      }
      document.title = `${item.title} | GamesPulse`;
    }
    return () => {
      if (main) {
        main.style.overflowY = 'auto';
        main.classList.add('snap-y', 'snap-mandatory');
      }
    };
  }, [isFlipped, item.title]);

  const handleFlip = (e: React.MouseEvent) => {
    e.preventDefault();
    onInteraction();
    setIsFlipped(!isFlipped);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <motion.div
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative w-full h-full"
    >
      {/* Front Side */}
      <div 
        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(1px)', pointerEvents: isFlipped ? 'none' : 'auto' }}
        className={`absolute inset-0 group bg-zinc-950 overflow-hidden transition-all duration-500 flex flex-col cursor-pointer hover:scale-[1.01] z-10 ${
          item.isEditorial 
            ? 'border-2 border-amber-400/50 shadow-[inset_0_0_30px_rgba(245,158,11,0.15)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]' 
            : NEON_COLORS[index % NEON_COLORS.length]
        }`}
        onClick={handleFlip}
      >
        {/* Full Screen Background Image or Video */}
        {(item.video && !videoError) ? (
          <div className="absolute top-0 left-0 right-0 bottom-[180px] overflow-hidden bg-black">
            {item.video.includes('embed') ? (
              <iframe
                src={`${item.video}?autoplay=1&mute=1&loop=1&playlist=${(item.video.split('/').pop() || '').split('?')[0]}&controls=0&showinfo=0&rel=0&modestbranding=1`}
                className="w-full h-full scale-[1.5] pointer-events-none"
                allow="autoplay; encrypted-media"
                title={item.title}
                onError={() => setVideoError(true)}
              />
            ) : (
              <video
                src={item.video}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                onError={() => setVideoError(true)}
              />
            )}
            <div className="absolute inset-0 bg-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_50%,_rgba(0,0,0,0.2)_100%)]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
          </div>
        ) : (item.image && !imageError) ? (
          <div className="absolute top-0 left-0 right-0 bottom-[180px] overflow-hidden">
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-100"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(0,0,0,0.3)_100%)]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
          </div>
        ) : (
          <div className="absolute top-0 left-0 right-0 bottom-[180px] bg-zinc-900/80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-neon-blue/10 opacity-50"></div>
          </div>
        )}
        
        {/* Content Overlay */}
        <div className="relative p-6 md:p-12 flex flex-col h-full justify-end z-10 font-montserrat">
          {/* Info above title */}
          <div className="flex items-center gap-3 mb-4 translate-y-[15px]">
            <span className="text-[12px] font-bold text-white/60">
              {new Date(item.pubDate).toLocaleDateString()}
            </span>
            <span className={`px-3 py-1 backdrop-blur-md border rounded-full text-[9px] font-black tracking-widest uppercase ${
              item.isEditorial 
                ? 'bg-amber-500/25 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse' 
                : 'bg-neon-blue/20 border-neon-blue/30 text-neon-blue'
            }`}>
              {item.isEditorial ? 'ESCLUSIVO' : item.source}
            </span>
          </div>
 
          <div 
            className="overflow-y-auto custom-scrollbar pr-4 mb-8 max-h-[75vh] mt-[25px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-[24px] md:text-[54px] font-bold leading-[1] mb-6 transition-colors tracking-tighter drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] ${
              item.isEditorial ? 'group-hover:text-amber-300' : 'group-hover:text-neon-blue'
            }`}>
              {item.title}
            </h3>
            
            {item.aiSummary && (
              <div className={`mb-6 p-4 border-l-4 rounded-r-lg backdrop-blur-sm ${
                item.isEditorial ? 'bg-amber-500/10 border-amber-400' : 'bg-neon-blue/10 border-neon-blue'
              }`}>
                <p className={`text-[14px] md:text-[20px] font-bold italic leading-tight ${
                  item.isEditorial ? 'text-amber-300' : 'text-neon-blue'
                }`}>
                  <span className="text-[10px] uppercase tracking-widest block mb-1 opacity-70">Quick AI Intel:</span>
                  "{item.aiSummary}"
                </p>
              </div>
            )}
            
            <p className="text-[12px] md:text-[18px] text-zinc-100 font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-4">
              {item.content}
            </p>
          </div>
        </div>
      </div>
 
      {/* Back Side (The Article) */}
      <div 
        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)', pointerEvents: isFlipped ? 'auto' : 'none' }}
        className={`absolute inset-0 overflow-hidden flex flex-col shadow-2xl ${
          item.isEditorial ? 'bg-zinc-950 text-white' : 'bg-white text-black'
        }`}
      >
        {/* Minimal Close Button */}
        <button 
          onClick={handleFlip}
          className="absolute bottom-[42px] right-8 z-30 p-3.5 rounded-full bg-black/80 text-white backdrop-blur-xl hover:bg-red-500 transition-all active:scale-90 shadow-2xl border border-white/20"
        >
          <X size={23} />
        </button>
 
        <div className="flex-1 relative w-full h-full overflow-y-auto">
          {isFlipped && (
            item.isEditorial ? (
              <div className="max-w-3xl mx-auto px-6 py-12 md:py-24 space-y-6 pt-4 pb-28 custom-scrollbar">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-amber-500/20 border border-amber-400 rounded-full text-[9px] font-black tracking-widest uppercase text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    ESCLUSIVO GAMESPULSE
                  </span>
                  <span className="text-xs text-zinc-500 font-bold">
                    {new Date(item.pubDate).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                </div>
                
                <h2 className="text-2xl md:text-5xl font-black leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400 tracking-tight">
                  {item.title}
                </h2>
 
                {item.image && (
                  <div className="w-full aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl my-6">
                    <img src={item.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
 
                {item.aiSummary && (
                  <div className="p-5 bg-amber-500/5 border-l-4 border-amber-400 rounded-r-3xl my-6">
                    <p className="text-sm md:text-base font-bold text-amber-300 italic">
                      "{item.aiSummary}"
                    </p>
                  </div>
                )}
 
                {/* Styled Markdown content */}
                <div className="text-zinc-300 text-sm md:text-lg leading-relaxed space-y-6 font-medium whitespace-pre-line">
                  {item.content}
                </div>
                
                {/* Google AdSense Blocco Annuncio inside content */}
                <div className="w-full py-8 border-t border-b border-white/5 my-8 flex flex-col items-center">
                  <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-600 uppercase mb-4">Annuncio Pubblicitario</span>
                  <ins className="adsbygoogle"
                       style={{ display: "block", textAlign: "center" }}
                       data-ad-layout="in-article"
                       data-ad-format="fluid"
                       data-ad-client="ca-pub-1385801472165821"
                       data-ad-slot="default"></ins>
                </div>
 
                <div className="pt-8 border-t border-white/5 text-center">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.25em]">
                    Autore: Castro Massimo • Redazione GamesPulse IT
                  </p>
                </div>
              </div>
            ) : (
              <iframe 
                src={`/api/proxy?url=${encodeURIComponent(item.link)}`} 
                className="w-full h-full border-none bg-white"
                title={item.title}
                loading="lazy"
                style={{ overflow: 'auto' }}
              />
            )
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('news');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashBg, setSplashBg] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminTab, setAdminTab] = useState<'stats' | 'sources' | 'editorial'>('stats');
  
  // States for Editorial CMS
  const [showNewEditorialForm, setShowNewEditorialForm] = useState(false);
  const [editorialTitle, setEditorialTitle] = useState('');
  const [editorialContent, setEditorialContent] = useState('');
  const [editorialCategory, setEditorialCategory] = useState('playstation');
  const [editorialImage, setEditorialImage] = useState('');
  const [editorialAiSummary, setEditorialAiSummary] = useState('');
  const [selectedRssForEditorial, setSelectedRssForEditorial] = useState('');
  const [isGeneratingEditorial, setIsGeneratingEditorial] = useState(false);
  const [isPublishingEditorial, setIsPublishingEditorial] = useState(false);
  const [activeSources, setActiveSources] = useState<Record<string, boolean>>({
    MULTIPLAYER: true,
    EVERYEYE: true,
    SPAZIOGAMES: true,
    GAMESOURCE: true,
    ANIMECLICK: true,
    CRUNCHYROLL: true,
    DRCOMMODORE: true,
    GAMERCLICK: true,
    IGN_IT: true,
    EUROGAMER: true,
    IGN: true,
    GAMESPOT: true,
    KOTAKU: true,
    POLYGON: true,
    PCGAMER: true,
    NINTENDOLIFE: true,
    PUSHSQUARE: true,
    PUREXBOX: true,
    GAMESINDUSTRY: true,
    THEVERGE: true,
    ENGADGET: true,
    ANDROIDCENTRAL: true,
    MACRUMORS: true,
    HDBLOG: true,
  });
  const [realTraffic, setRealTraffic] = useState({
    todayVisits: 0,
    monthlyVisits: 0,
    pageviews: 0,
    adsenseMonth: 0.00,
    adsenseToday: 0.00,
  });
  const [gaStatus, setGaStatus] = useState<string>('In attesa di link (Valori azzerati)');

  // Estrazione Automatica Dati GA4 all'apertura del Pannello Admin
  useEffect(() => {
    if (showAdminDashboard) {
      setGaStatus('connessione API GA4...');
      fetch('/api/analytics')
        .then(res => res.json())
        .then(data => {
          if (data && data.data) {
            setRealTraffic({
              todayVisits: data.data.todayVisits || 0,
              monthlyVisits: data.data.monthlyVisits || 0,
              pageviews: data.data.pageviews || 0,
              adsenseMonth: data.data.adsenseMonth || 0,
              adsenseToday: data.data.adsenseToday || 0,
            });
            setGaStatus(data.status === 'success' ? 'Connesso Live (GA4 Data API)' : 'In attesa credenziali GA4 (.env)');
          }
        })
        .catch(() => {
          setGaStatus('In attesa credenziali GA4 (.env)');
        });
    }
  }, [showAdminDashboard]);

  const SPLASH_BGS = [
    'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop'
  ];

  // Splash Screen Logic
  useEffect(() => {
    setSplashBg(SPLASH_BGS[Math.floor(Math.random() * SPLASH_BGS.length)]);
    
    // Ensure splash stays at least 3 seconds, but waits for loading to finish
    const minTimePromise = new Promise(resolve => setTimeout(resolve, 3000));
    
    // We'll hide it once BOTH loading is false AND 3 seconds have passed
    // But since fetchNews is called immediately, we wait for it
  }, []);

  // Monitor loading to hide splash
  useEffect(() => {
    if (!loading && showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 500); // Small grace period
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Cookie Consent Check
  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      const timer = setTimeout(() => setShowCookieBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auth and Firestore Sync
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        // Fallback to local storage if not logged in
        const saved = localStorage.getItem('gaming_news_favorites');
        setFavorites(saved ? JSON.parse(saved) : []);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const userRef = doc(db, 'users', user.uid);
    
    // Initial profile check/creation
    const checkProfile = async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            favorites: favorites, // Sync local favorites on first login
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };
    checkProfile();

    // Real-time sync
    const unsub = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setFavorites(doc.data().favorites || []);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsub();
  }, [user, isAuthReady]);

  // Save to local storage only when NOT logged in
  useEffect(() => {
    if (!user && isAuthReady) {
      localStorage.setItem('gaming_news_favorites', JSON.stringify(favorites));
    }
  }, [favorites, user, isAuthReady]);

  const toggleFavorite = async (id: string) => {
    const newFavorites = favorites.includes(id) 
      ? favorites.filter(fid => fid !== id) 
      : [...favorites, id];
    
    setFavorites(newFavorites);

    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          favorites: newFavorites,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const filteredNews = news.filter(item => {
    const hasMedia = !!item.video || (!!item.image && item.image.trim() !== '');
    if (!hasMedia) return false;

    // Se la fonte è disabilitata nel pannello admin, la escludiamo
    const sourceKey = item.source ? item.source.toUpperCase() : '';
    if (activeSources[sourceKey] === false) return false;

    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'favorites' ? favorites.includes(item.id) : item.category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    const mainElement = document.querySelector('main');
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filteredNews.length) {
        // Load next batch slightly before reaching the absolute end
        setVisibleCount(prev => Math.min(prev + 10, filteredNews.length));
      }
    }, {
      root: mainElement,
      rootMargin: '400px', // Trigger when within 400px of the viewport
      threshold: 0.1
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, visibleCount, filteredNews.length]);

  const closeOverlays = () => {
    setIsMenuOpen(false);
    setIsSettingsOpen(false);
    setIsSearchOpen(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GamesPulse News',
          text: 'Check out the latest gaming news on GamesPulse!',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleSend = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GamesPulse News',
          text: 'Ehi, guarda questa app di notizie sui videogiochi!',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiato negli appunti!');
    }
  };

  const SETTINGS_ITEMS = [
    { 
      id: 'profile', 
      label: user ? user.displayName || 'Profilo' : 'Accedi', 
      icon: user ? (
        <img src={user.photoURL || ''} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
      ) : <User size={20} />, 
      action: user ? () => {} : signInWithGoogle 
    },
    { 
      id: 'privacy', 
      label: 'Privacy & Legal', 
      icon: <ShieldCheck size={20} />, 
      action: () => {
        setIsInfoOpen(true);
        setIsMenuOpen(false);
        setIsSettingsOpen(false);
      } 
    },
    { id: 'share', label: 'Condividi', icon: <Share2 size={20} />, action: handleShare },
    { id: 'send', label: 'Invia ad un amico', icon: <Send size={20} />, action: handleSend },
    { id: 'refresh', label: 'Aggiorna', icon: <RefreshCw size={20} />, action: () => fetchNews(true) },
    user ? { id: 'logout', label: 'Esci', icon: <LogOut size={20} />, action: logout } : null
  ].filter(Boolean) as any[];

  const fetchNews = async (force = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/news${force ? '?refresh=true' : ''}`);
      const rssData = await response.json();
      
      let categorizedData: NewsItem[] = [];
      if (Array.isArray(rssData)) {
        categorizedData = rssData.map((item: NewsItem) => ({
          ...item,
          category: getCategory(item)
        }));
      }

      // Fetch Editoriale articles from Firestore
      try {
        const editorialsCol = collection(db, 'editorials');
        const q = query(editorialsCol, orderBy('pubDate', 'desc'));
        const snap = await getDocs(q);
        const editorialsData = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || '',
            link: `/article/${data.slug}`,
            pubDate: data.pubDate || new Date().toISOString(),
            content: data.content || '',
            source: 'EDITORIALE',
            image: data.image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800',
            aiSummary: data.aiSummary || '',
            slug: data.slug || '',
            category: data.category || 'all',
            isEditorial: true
          } as NewsItem;
        });

        // Prepend editorials so they are featured at the very top of the feed!
        setNews([...editorialsData, ...categorizedData]);
      } catch (firestoreErr) {
        console.error("Error fetching editorials from Firestore:", firestoreErr);
        setNews(categorizedData);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEditorial = async () => {
    if (!selectedRssForEditorial) {
      alert("Seleziona prima una notizia RSS di partenza!");
      return;
    }
    const selectedItem = news.find(item => item.id === selectedRssForEditorial);
    if (!selectedItem) {
      alert("Notizia non trovata!");
      return;
    }

    setIsGeneratingEditorial(true);
    try {
      const response = await fetch('/api/generate-editorial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: selectedItem.title,
          source: selectedItem.source,
          content: selectedItem.content
        })
      });

      const data = await response.json();
      if (response.ok && data.content) {
        setEditorialTitle(`EDITORIALE: ${selectedItem.title}`);
        setEditorialContent(data.content);
        setEditorialAiSummary(data.aiSummary || '');
        if (selectedItem.image) {
          setEditorialImage(selectedItem.image);
        }
      } else {
        alert("Errore nella generazione dell'editoriale: " + (data.error || "Errore sconosciuto"));
      }
    } catch (e: any) {
      alert("Errore di rete: " + e.message);
    } finally {
      setIsGeneratingEditorial(false);
    }
  };

  const handlePublishEditorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorialTitle.trim() || !editorialContent.trim()) {
      alert("Titolo e Contenuto sono obbligatori!");
      return;
    }

    setIsPublishingEditorial(true);
    try {
      const slug = editorialTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      await addDoc(collection(db, 'editorials'), {
        title: editorialTitle,
        content: editorialContent,
        category: editorialCategory,
        image: editorialImage.trim() || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800',
        aiSummary: editorialAiSummary,
        slug: slug,
        pubDate: new Date().toISOString()
      });

      // Clear Form and reset state
      setEditorialTitle('');
      setEditorialContent('');
      setEditorialCategory('playstation');
      setEditorialImage('');
      setEditorialAiSummary('');
      setSelectedRssForEditorial('');
      setShowNewEditorialForm(false);
      
      // Reload main feed
      await fetchNews();
      alert("Editoriale originale pubblicato con successo!");
    } catch (err: any) {
      alert("Errore durante la pubblicazione: " + err.message);
    } finally {
      setIsPublishingEditorial(false);
    }
  };

  const handleDeleteEditorial = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare definitivamente questo editoriale?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'editorials', id));
      await fetchNews();
      alert("Editoriale eliminato con successo!");
    } catch (err: any) {
      alert("Errore durante l'eliminazione: " + err.message);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Gestione parametro URL SEO per focalizzare un articolo specifico
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetSlug = params.get('article');
    if (targetSlug && filteredNews.length > 0) {
      const targetIndex = filteredNews.findIndex(item => item.slug === targetSlug);
      if (targetIndex !== -1) {
        if (targetIndex >= visibleCount) {
          setVisibleCount(targetIndex + 10);
        }
        setCurrentIndex(targetIndex);
        setTimeout(() => {
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.scrollTo({ top: targetIndex * window.innerHeight, behavior: 'smooth' });
          }
        }, 300);
      }
    }
  }, [filteredNews.length]);

  // Sincronizza l'URL con l'articolo corrente per una perfetta condivisione e SEO
  useEffect(() => {
    const currentItem = filteredNews[currentIndex];
    if (currentItem && currentItem.slug) {
      const newUrl = `${window.location.pathname}?article=${encodeURIComponent(currentItem.slug)}`;
      window.history.replaceState(null, '', newUrl);
      document.title = `${currentItem.title} | GamesPulse`;
    }
  }, [currentIndex, filteredNews]);

  // Scroll to top when category or search changes
  useEffect(() => {
    setVisibleCount(10);
    setCurrentIndex(0);
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedCategory, searchQuery]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / target.clientHeight);
    if (index !== currentIndex && index >= 0 && index < filteredNews.length) {
      setCurrentIndex(index);
    }
    if (isMenuOpen || isSearchOpen) closeOverlays();
  };

  const currentItem = filteredNews[currentIndex];
  const isCurrentFavorite = currentItem ? favorites.includes(currentItem.id) : false;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden relative">
      {/* Luminous spinning logo overlay at app startup */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-black"
          >
            {/* Background with slight image blur */}
            <motion.div 
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 4, ease: "linear" }}
              className="absolute inset-0 z-0"
            >
              {splashBg && (
                <img 
                  src={splashBg} 
                  alt="Splash Background" 
                  className="w-full h-full object-cover brightness-[0.2] blur-xl"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            </motion.div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-neon-blue uppercase tracking-[0.5em] text-[10px] font-black mb-8 drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]"
              >
                Inizializzazione Sistema
              </motion.p>
              
              {/* Luminous spinning logo */}
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative my-4"
              >
                <img 
                  src="/logocompleto.png" 
                  alt="GamesPulse Logo" 
                  className="w-64 md:w-80 h-auto drop-shadow-[0_0_40px_rgba(0,243,255,0.8)]"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: 120 }}
                transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
                className="h-[2px] bg-neon-blue/40 shadow-[0_0_15px_rgba(0,243,255,0.8)] mt-12 mb-4 rounded-full"
              />
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="text-white/40 text-[9px] uppercase tracking-widest animate-pulse font-bold"
              >
                Sincronizzazione Dati & Media Intel...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Integrated Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/1 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tighter neon-text-blue italic drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              GAMES<span className="animate-pulse-azure ml-1">PULSE</span>
            </h1>
            <p className="text-[8px] font-bold tracking-[0.15em] text-zinc-500 uppercase -mt-0.5 ml-0.5 opacity-80">
              Your Daily Gaming Intel
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Active Category Indicator (Left of Refresh) */}
            {selectedCategory !== 'all' && !isMenuOpen && (
              <motion.button
                initial={{ opacity: 0, x: 20, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: 1,
                  boxShadow: `0 0 20px ${CATEGORIES.find(c => c.id === selectedCategory)?.color}`
                }}
                onClick={() => setSelectedCategory('all')}
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center border-2 z-50 active:scale-90 transition-transform"
                style={{ 
                  backgroundColor: CATEGORIES.find(c => c.id === selectedCategory)?.color,
                  borderColor: '#fff'
                }}
              >
                {CATEGORIES.find(c => c.id === selectedCategory)?.icon}
              </motion.button>
            )}
            
            <div className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => currentItem && toggleFavorite(currentItem.id)}
                className={`p-2 transition-all active:scale-90 ${isCurrentFavorite ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-white/70 hover:text-white'}`}
              >
                <Heart size={20} fill={isCurrentFavorite ? 'currentColor' : 'none'} />
              </button>
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-2 transition-all active:scale-90 ${isSearchOpen ? 'text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]' : 'text-white/70 hover:text-white'}`}
              >
                <Search size={20} />
              </button>
              <button 
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen);
                }}
                className={`p-2 transition-all active:scale-90 ${
                  isMenuOpen 
                    ? 'bg-gradient-to-br from-azure via-cyan-400 to-blue-600 text-white rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.4)]' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {isMenuOpen ? <X size={22} /> : <Gamepad2 size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar (Animated Reveal) */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="relative pointer-events-auto overflow-hidden"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text"
                placeholder="Search intel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-neon-blue/50 transition-colors text-white"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dropdown Menu (Categories + Settings) */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="fixed top-24 right-6 z-50 flex flex-col gap-4 items-end pointer-events-auto"
            >
              {/* Settings Toggle Button inside Main Menu */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2 backdrop-blur-xl bg-black/60 ${isSettingsOpen ? 'text-neon-blue border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.4)]' : 'text-zinc-400 border-white/10'}`}
              >
                <Settings size={22} />
              </motion.button>

              {/* Settings Sub-Menu (Horizontal to the left of the button) */}
              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute top-0 right-16 flex flex-row-reverse gap-3 items-center"
                  >
                    {SETTINGS_ITEMS.map((item, index) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.5, x: 20 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1, 
                          x: 0,
                          transition: { delay: index * 0.05 } 
                        }}
                        exit={{ opacity: 0, scale: 0.5, x: 20 }}
                        onClick={() => {
                          item.action();
                          setIsSettingsOpen(false);
                          setIsMenuOpen(false);
                        }}
                        className="relative group"
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all border-2 backdrop-blur-xl bg-black/60 text-zinc-400 border-white/10 group-hover:border-neon-blue group-hover:text-neon-blue group-hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
                        >
                          {item.icon}
                        </div>
                        <span className="absolute -bottom-6 right-0 text-[8px] font-bold tracking-widest uppercase text-white/40 group-hover:text-neon-blue transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap">
                          {item.label}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {CATEGORIES.map((cat, index) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.5, x: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: 0,
                    transition: { delay: index * 0.05 } 
                  }}
                  exit={{ opacity: 0, scale: 0.5, x: 20 }}
                  onClick={() => {
                    if (selectedCategory === cat.id) {
                      setSelectedCategory('all');
                    } else {
                      setSelectedCategory(cat.id);
                    }
                    setIsMenuOpen(false);
                    setIsSettingsOpen(false);
                  }}
                  className="relative group flex items-center gap-3"
                >
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white/40 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                    {cat.label}
                  </span>
                  <div 
                    className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2 backdrop-blur-xl ${
                      selectedCategory === cat.id 
                        ? 'text-white' 
                        : 'bg-black/60 text-zinc-400 border-white/10 group-hover:border-white/30'
                    }`}
                    style={selectedCategory === cat.id ? {
                      backgroundColor: cat.color,
                      borderColor: '#fff',
                      boxShadow: `0 0 25px ${cat.color}`
                    } : {}}
                  >
                    {cat.id === 'favorites' ? (
                      <Heart 
                        size={20} 
                        fill={selectedCategory === 'favorites' ? 'white' : 'none'} 
                        className={selectedCategory === 'favorites' ? 'text-white' : ''} 
                      />
                    ) : cat.icon}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content (Full Page Swipe) */}
      <main 
        className="absolute inset-0 overflow-y-auto snap-y snap-mandatory hide-scrollbar h-full w-full z-0"
        onScroll={handleScroll}
      >
        {loading && filteredNews.length === 0 && !showSplash ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black overflow-hidden font-header z-50">
            <motion.div 
              className="absolute inset-0 bg-cover bg-center brightness-[0.2] blur-md scale-110"
              style={{ backgroundImage: `url(${splashBg})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <motion.img 
                src="/logocompleto.png" 
                alt="GamesPulse Logo" 
                className="w-48 drop-shadow-[0_0_30px_rgba(0,243,255,0.8)]"
                animate={{ rotateY: [0, 360] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                style={{ transformStyle: 'preserve-3d' }}
              />
              <span className="text-neon-blue font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Syncing Intel...</span>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {filteredNews.length > 0 ? (
              <>
                {filteredNews.slice(0, visibleCount).map((item: NewsItem, index: number) => (
                  <React.Fragment key={item.id}>
                    <div 
                      ref={index === visibleCount - 1 ? lastItemRef : null}
                      className="h-full w-full snap-start flex-shrink-0 perspective-1000 relative"
                    >
                      <NewsCard 
                        item={item} 
                        index={index} 
                        onInteraction={closeOverlays}
                        isFavorite={favorites.includes(item.id)}
                        onToggleFavorite={() => toggleFavorite(item.id)}
                      />
                      {/* Instruction Text */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-600 uppercase whitespace-nowrap">
                          Premi l'immagine per vedere il sito
                        </p>
                      </div>
                    </div>
                    {/* Insert Ad every 10 items as a separate snap slide */}
                    {(index + 1) % 10 === 0 && (
                      <div className="h-full w-full snap-start flex-shrink-0 flex flex-col items-center justify-center p-4 bg-zinc-950">
                        <AdUnit />
                        <p className="text-[10px] font-bold tracking-[0.3em] text-zinc-700 uppercase mt-4">Scorri per continuare</p>
                      </div>
                    )}
                  </React.Fragment>
                ))}
                {visibleCount < filteredNews.length && (
                  <div className="h-32 w-full flex flex-col items-center justify-center snap-start bg-black/50 backdrop-blur-sm border-t border-white/5">
                    <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(0,243,255,0.3)]"></div>
                    <p className="text-[10px] font-bold tracking-[0.3em] text-neon-blue/60 uppercase animate-pulse">Loading more intel...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                <Gamepad2 size={48} className="opacity-20" />
                <p className="text-sm font-bold tracking-widest">
                  {selectedCategory === 'favorites' ? 'NO FAVORITES SAVED' : 'NO INTEL FOUND'}
                </p>
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className="text-xs text-neon-blue underline"
                >
                  {selectedCategory === 'favorites' ? 'Browse all news' : 'Clear filters'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Info Modal */}
      <AnimatePresence>
        {isInfoOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl max-h-[85vh] bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-blue/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-neon-blue" />
                  </div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Info & Privacy</h3>
                </div>
                <button 
                  onClick={() => setIsInfoOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
                >
                  <X className="w-6 h-6 text-white/40" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth focus-visible:outline-none bg-zinc-950 no-scrollbar">
                <section>
                  <h4 className="text-neon-blue font-bold uppercase text-[10px] tracking-widest mb-4 opacity-80">Informazioni Legali</h4>
                  <div className="space-y-4 text-white/60 text-sm leading-relaxed font-medium">
                    <p>
                      <strong className="text-white">GamesPulse</strong> è un'applicazione ideata e progettata da <strong className="text-white">Castro Massimo</strong>, responsabile del trattamento e della conservazione dei dati personali.
                    </p>
                    <p>
                      Email di contatto: <a href="mailto:castromassimo@gmail.com" className="text-neon-blue hover:underline">castromassimo@gmail.com</a>
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-neon-blue font-bold uppercase text-[10px] tracking-widest mb-4 opacity-80">GDPR & Privacy</h4>
                  <div className="space-y-4 text-white/60 text-sm leading-relaxed font-medium">
                    <p>
                      I dati degli utenti (preferiti e profili) sono conservati esclusivamente presso i server protetti di <strong className="text-white">Firebase (Google Cloud)</strong> nel pieno rispetto delle normative vigenti.
                    </p>
                    <p>
                      Il periodo di conservazione dei dati è limitato al tempo strettamente necessario per l'erogazione del servizio o come previsto dalle norme di legge sulla conservazione dei dati digitali.
                    </p>
                    <p>
                      Gli utenti hanno il diritto in qualsiasi momento di richiedere la visione, la modifica o la cancellazione dei propri dati scrivendo all'indirizzo email sopra indicato.
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-neon-blue font-bold uppercase text-[10px] tracking-widest mb-4 opacity-80">Cookie Policy</h4>
                  <div className="space-y-4 text-white/60 text-sm leading-relaxed font-medium">
                    <p>
                      Utilizziamo esclusivamente cookie tecnici necessari al corretto funzionamento dell'app e alla memorizzazione delle tue preferenze di sessione.
                    </p>
                  </div>
                </section>

                <section className="pt-4 border-t border-white/5">
                  <h4 className="text-neon-blue font-bold uppercase text-[10px] tracking-widest mb-6 opacity-80">Altre App Consigliate</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a 
                      href="https://www.spotsmart.it" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group relative bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-all hover:bg-white/10 hover:border-neon-blue/30 active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden flex items-center justify-center p-1 border border-white/5 group-hover:border-neon-blue/20 transition-colors">
                        <img src="/spotsmart.png" alt="SpotSmart" className="w-full h-full object-contain drop-shadow-lg" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-white group-hover:text-neon-blue transition-colors uppercase tracking-tight">SpotSmart IT</h5>
                        <p className="text-[10px] text-white/40 font-medium">News & Lifestyle Intel</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-neon-blue transition-colors" />
                    </a>
                  </div>
                </section>
              </div>

              <div className="p-6 bg-zinc-900/50 border-t border-white/5 flex items-center justify-center gap-2">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">GamesPulse App © 2026 - Versione 1.0.0</p>
                <button 
                  onClick={() => {
                    setIsInfoOpen(false);
                    if (isAdminLoggedIn) {
                      setShowAdminDashboard(true);
                    } else {
                      setShowAdminLogin(true);
                    }
                  }}
                  className="text-white/10 hover:text-neon-blue transition-colors duration-300 p-1"
                  title="Pannello Amministratore"
                >
                  <Shield size={12} className="fill-current opacity-40 hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Banner */}
      <AnimatePresence>
        {showCookieBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-10 md:w-96 z-[400]"
          >
            <div className="bg-zinc-950/95 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-neon-blue/10 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-neon-blue" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-white/80 font-medium leading-normal">
                    Utilizziamo i cookie per migliorare la tua esperienza su GamesPulse. <button onClick={() => {setIsInfoOpen(true); setIsMenuOpen(false);}} className="text-neon-blue underline underline-offset-4 hover:text-neon-blue/80">Leggi la Privacy</button>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    localStorage.setItem('cookieConsent', 'accepted');
                    setShowCookieBanner(false);
                  }}
                  className="flex-1 px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-black rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Accetto
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('cookieConsent', 'rejected');
                    setShowCookieBanner(false);
                  }}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Rifiuto
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setShowAdminLogin(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-white/10 p-6 md:p-8 rounded-3xl max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                  <Lock size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white uppercase tracking-tight">Accesso Riservato</h4>
                  <p className="text-[10px] text-white/40">Area Amministratore GamesPulse</p>
                </div>
              </div>

              {adminError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                  {adminError}
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                if (adminUsername === 'admin' && adminPassword === 'accessometti') {
                  setIsAdminLoggedIn(true);
                  setShowAdminLogin(false);
                  setShowAdminDashboard(true);
                  setAdminError('');
                } else {
                  setAdminError('Credenziali non valide');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Username</label>
                  <input 
                    type="text" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Inserisci username..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-neon-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Password</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Inserisci password..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-neon-blue transition-colors"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full mt-2 py-3 bg-neon-blue hover:bg-neon-blue/80 text-black rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                >
                  Accedi
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Dashboard Modal */}
      <AnimatePresence>
        {showAdminDashboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 md:p-6 pointer-events-auto"
            onClick={() => setShowAdminDashboard(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-white/10 rounded-3xl max-w-4xl w-full h-[85vh] shadow-2xl relative flex flex-col overflow-hidden text-left"
            >
              {/* Header */}
              <div className="p-6 bg-zinc-900/40 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white uppercase tracking-tight">Pannello Amministratore</h4>
                    <p className="text-[10px] text-white/40">Controllo traffico e gestione sorgenti</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setIsAdminLoggedIn(false);
                      setShowAdminDashboard(false);
                      setAdminUsername('');
                      setAdminPassword('');
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-red-500/20 transition-colors"
                  >
                    Disconnetti
                  </button>
                  <button 
                    onClick={() => setShowAdminDashboard(false)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-white/5 px-6 bg-zinc-900/20">
                <button 
                  onClick={() => setAdminTab('stats')}
                  className={`py-4 px-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${adminTab === 'stats' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-white/40 hover:text-white/60'}`}
                >
                  <Activity size={14} />
                  Statistiche & Traffico
                </button>
                <button 
                  onClick={() => setAdminTab('sources')}
                  className={`py-4 px-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${adminTab === 'sources' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-white/40 hover:text-white/60'}`}
                >
                  <Database size={14} />
                  Fonti Feed RSS
                </button>
                <button 
                  onClick={() => setAdminTab('editorial')}
                  className={`py-4 px-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${adminTab === 'editorial' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-white/40 hover:text-white/60'}`}
                >
                  <Brain size={14} />
                  Editoriali & IA
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                {adminTab === 'stats' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Visite Oggi (Live)</p>
                        <p className="text-3xl font-black text-white">{realTraffic.todayVisits.toLocaleString()}</p>
                        <div className="mt-2 flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>In crescita del +14%</span>
                        </div>
                        <Activity className="absolute right-3 bottom-3 w-12 h-12 text-white/5 pointer-events-none" />
                      </div>
                      <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Visite Mese</p>
                        <p className="text-3xl font-black text-neon-blue">{realTraffic.monthlyVisits.toLocaleString()}</p>
                        <p className="mt-2 text-white/30 text-[10px]">Pagine viste: {realTraffic.pageviews.toLocaleString()}</p>
                        <Database className="absolute right-3 bottom-3 w-12 h-12 text-neon-blue/5 pointer-events-none" />
                      </div>
                      <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Ricavi AdSense (Mese)</p>
                        <p className="text-3xl font-black text-emerald-400">€ {realTraffic.adsenseMonth.toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
                        <p className="mt-2 text-emerald-400/70 text-[10px] font-medium">Oggi: € {realTraffic.adsenseToday.toFixed(2)} (RPM: € 3.40)</p>
                        <Sparkles className="absolute right-3 bottom-3 w-12 h-12 text-emerald-400/5 pointer-events-none" />
                      </div>
                    </div>

                    <div className="bg-zinc-900/30 border border-white/5 p-5 rounded-2xl">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-neon-blue"></span>
                        Panoramica Fonti ed Estrazione
                      </h5>
                      <p className="text-xs text-white/60 leading-relaxed mb-4">
                        Il sistema aggrega in tempo reale i flussi da testate di videogiochi, hardware, cultura pop e fumetti/manga giapponesi. I contenuti beneficiano di arricchimento AI e caching su infrastruttura edge Vercel per massimizzare visibilità e velocità.
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-white/40 pt-2 border-t border-white/5">
                        <span>Sorgente Traffico: <strong className="text-neon-blue">{gaStatus}</strong></span>
                        <span>Costo Server/Proxy: <strong className="text-white">€ 12,00/mese</strong></span>
                        <span>Stato Cache: <strong className="text-emerald-400">Attiva (5 min)</strong></span>
                        <span>Compressione: <strong className="text-white">Brotli/Gzip</strong></span>
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'sources' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">Gestione Sorgenti News</h5>
                        <p className="text-[10px] text-white/40">Attiva o disattiva i feed per personalizzare il flusso in tempo reale</p>
                      </div>
                      <button 
                        onClick={() => {
                          const allOn: Record<string, boolean> = {};
                          Object.keys(activeSources).forEach(k => allOn[k] = true);
                          setActiveSources(allOn);
                        }}
                        className="px-3 py-1.5 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                      >
                        Attiva Tutte
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {[
                        { key: "MULTIPLAYER", name: "Multiplayer.it", cat: "Gaming", url: "https://multiplayer.it/feed/" },
                        { key: "EVERYEYE", name: "Everyeye.it", cat: "Gaming", url: "https://www.everyeye.it/feed/" },
                        { key: "SPAZIOGAMES", name: "SpazioGames", cat: "Gaming", url: "https://www.spaziogames.it/feed/" },
                        { key: "GAMESOURCE", name: "GameSource", cat: "Gaming", url: "https://www.gamesource.it/feed/" },
                        { key: "ANIMECLICK", name: "AnimeClick.it", cat: "Manga & Anime", url: "https://www.animeclick.it/rss.xml" },
                        { key: "CRUNCHYROLL", name: "Crunchyroll Italia", cat: "Manga & Anime", url: "https://www.crunchyroll.com/newsrss?lang=itIT" },
                        { key: "DRCOMMODORE", name: "DrCommodore", cat: "Pop Culture", url: "https://drcommodore.it/feed/" },
                        { key: "GAMERCLICK", name: "GamerClick.it", cat: "Geek", url: "https://www.gamerclick.it/rss.xml" },
                        { key: "IGN_IT", name: "IGN Italia", cat: "Gaming", url: "https://it.ign.com/feed.xml" },
                        { key: "EUROGAMER", name: "Eurogamer.it", cat: "Gaming", url: "https://www.eurogamer.it/feed" },
                        { key: "IGN", name: "IGN Global", cat: "Intl", url: "https://feeds.feedburner.com/ign/all" },
                        { key: "GAMESPOT", name: "GameSpot", cat: "Intl", url: "https://www.gamespot.com/feeds/mashup/" },
                        { key: "HDBLOG", name: "HD Blog", cat: "Tech", url: "https://www.hdblog.it/feed/" },
                        { key: "THEVERGE", name: "The Verge", cat: "Tech", url: "https://www.theverge.com/rss/index.xml" }
                      ].map((src) => {
                        const isEnabled = activeSources[src.key] !== false;
                        return (
                          <div key={src.key} className={`p-3 bg-zinc-900/40 border transition-colors rounded-xl flex items-center justify-between gap-4 ${isEnabled ? 'border-white/5' : 'border-red-500/20 opacity-60'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isEnabled ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-white truncate">{src.name}</p>
                                <p className="text-[9px] text-white/40 truncate">{src.url}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-white/60 uppercase tracking-wider">
                                {src.cat}
                              </span>
                              <button
                                onClick={() => {
                                  setActiveSources(prev => ({
                                    ...prev,
                                    [src.key]: !isEnabled
                                  }));
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? 'bg-neon-blue' : 'bg-zinc-700'}`}
                              >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {showNewEditorialForm ? (
                      <form onSubmit={handlePublishEditorial} className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">Crea Articolo Editoriale Originale</h5>
                          <button 
                            type="button"
                            onClick={() => setShowNewEditorialForm(false)}
                            className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold tracking-widest"
                          >
                            Annulla
                          </button>
                        </div>

                        {/* Generazione IA Assistita con Gemini */}
                        <div className="p-4 bg-neon-blue/5 border border-neon-blue/20 rounded-2xl space-y-3">
                          <div className="flex items-center gap-2 text-neon-blue">
                            <Brain size={16} className="animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest">Generatore Editoriali Gemini AI</span>
                          </div>
                          <p className="text-[10px] text-zinc-400">
                            Seleziona una notizia calda dal feed RSS di GamesPulse per far scrivere a Gemini un articolo originale completo ed approfondito di 800+ parole in italiano!
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <select
                              value={selectedRssForEditorial}
                              onChange={(e) => setSelectedRssForEditorial(e.target.value)}
                              className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none"
                            >
                              <option value="">-- Seleziona una notizia RSS --</option>
                              {news.filter(n => !n.isEditorial).slice(0, 30).map(n => (
                                <option key={n.id} value={n.id}>{n.source}: {n.title.substring(0, 50)}...</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleGenerateEditorial}
                              disabled={isGeneratingEditorial}
                              className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 disabled:opacity-50 text-black rounded-xl font-bold text-xs uppercase tracking-widest shrink-0 transition-all flex items-center justify-center gap-2"
                            >
                              {isGeneratingEditorial ? "Generazione..." : "Scrivi con Gemini"}
                              <Sparkles size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Titolo */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Titolo Editoriale</label>
                          <input
                            type="text"
                            value={editorialTitle}
                            onChange={(e) => setEditorialTitle(e.target.value)}
                            placeholder="Inserisci un titolo accattivante..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-neon-blue"
                            required
                          />
                        </div>

                        {/* Categoria e Immagine */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Categoria</label>
                            <select
                              value={editorialCategory}
                              onChange={(e) => setEditorialCategory(e.target.value)}
                              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-neon-blue"
                            >
                              <option value="playstation">PlayStation</option>
                              <option value="xbox">Xbox</option>
                              <option value="nintendo">Nintendo</option>
                              <option value="pc">PC</option>
                              <option value="tech">Tech</option>
                              <option value="mobile">Mobile</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">URL Immagine</label>
                            <input
                              type="text"
                              value={editorialImage}
                              onChange={(e) => setEditorialImage(e.target.value)}
                              placeholder="URL immagine copertina (opzionale)..."
                              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-neon-blue"
                            />
                          </div>
                        </div>

                        {/* AI Summary Card */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quick AI Summary (Una frase da visualizzare nella card)</label>
                          <textarea
                            value={editorialAiSummary}
                            onChange={(e) => setEditorialAiSummary(e.target.value)}
                            placeholder="Una frase riassuntiva di massimo 25 parole..."
                            rows={2}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-neon-blue resize-none"
                            required
                          />
                        </div>

                        {/* Contenuto dell'articolo */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Contenuto Editoriale (Supporta Markdown)</label>
                          <textarea
                            value={editorialContent}
                            onChange={(e) => setEditorialContent(e.target.value)}
                            placeholder="Scrivi qui l'articolo di approfondimento (almeno 800 parole)..."
                            rows={12}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-neon-blue custom-scrollbar"
                            required
                          />
                        </div>

                        {/* Azioni Form */}
                        <div className="flex gap-3 pt-3 border-t border-white/5 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowNewEditorialForm(false)}
                            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                          >
                            Annulla
                          </button>
                          <button
                            type="submit"
                            disabled={isPublishingEditorial}
                            className="px-6 py-2.5 bg-neon-blue hover:bg-neon-blue/80 disabled:opacity-50 text-black rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
                          >
                            {isPublishingEditorial ? "Pubblicazione..." : "Pubblica Editoriale"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Editoriali Originali Pubblicati</h5>
                            <p className="text-[10px] text-zinc-500">I tuoi contenuti esclusivi conformi alle linee guida Google AdSense</p>
                          </div>
                          <button 
                            onClick={() => setShowNewEditorialForm(true)}
                            className="px-4 py-2 bg-neon-blue text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-neon-blue/80 transition-colors"
                          >
                            + Scrivi Nuovo Editoriale
                          </button>
                        </div>

                        {/* Lista Editoriali */}
                        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                          {news.filter(n => n.isEditorial).length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-zinc-900/10">
                              <p className="text-xs text-zinc-500">Nessun articolo editoriale originale pubblicato finora.</p>
                              <button 
                                onClick={() => setShowNewEditorialForm(true)}
                                className="mt-3 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-white/10"
                              >
                                Scrivi Ora il Primo Articolo
                              </button>
                            </div>
                          ) : (
                            news.filter(n => n.isEditorial).map(item => (
                              <div key={item.id} className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  {item.image && (
                                    <img 
                                      src={item.image} 
                                      alt="" 
                                      className="w-10 h-10 rounded-lg object-cover bg-zinc-950 shrink-0" 
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                                    <p className="text-[9px] text-zinc-500">
                                      Categoria: <span className="text-neon-blue uppercase">{item.category}</span> • Pubblicato il {new Date(item.pubDate).toLocaleDateString("it-IT")}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a 
                                    href={`/article/${item.slug}`} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors border border-white/5"
                                  >
                                    Vedi
                                  </a>
                                  <button
                                    onClick={() => handleDeleteEditorial(item.id)}
                                    className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors border border-red-500/10"
                                  >
                                    Elimina
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
