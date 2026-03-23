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
  Info
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
} from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
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
    } else {
      if (main) {
        main.style.overflowY = 'auto';
        main.classList.add('snap-y', 'snap-mandatory');
      }
    }
    return () => {
      if (main) {
        main.style.overflowY = 'auto';
        main.classList.add('snap-y', 'snap-mandatory');
      }
    };
  }, [isFlipped]);

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
        className={`absolute inset-0 group bg-zinc-950 overflow-hidden transition-all duration-500 flex flex-col cursor-pointer hover:scale-[1.01] z-10 ${NEON_COLORS[index % NEON_COLORS.length]}`}
        onClick={handleFlip}
      >
        {/* Full Screen Background Image or Video */}
        {(item.video && !videoError) ? (
          <div className="absolute top-0 left-0 right-0 bottom-[130px] overflow-hidden bg-black">
            {item.video.includes('embed') ? (
              <iframe
                src={`${item.video}?autoplay=1&mute=1&loop=1&playlist=${(item.video.split('/').pop() || '').split('?')[0]}&controls=0&showinfo=0&rel=0&modestbranding=1`}
                className="w-full h-full scale-[1.5] pointer-events-none brightness-[1.3] contrast-[1.1]"
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
                className="w-full h-full object-cover brightness-[1.3] contrast-[1.1]"
                onError={() => setVideoError(true)}
              />
            )}
            <div className="absolute inset-0 bg-transparent"></div>
            {/* Vignette Effect - Reduced for videos */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_50%,_rgba(0,0,0,0.3)_100%)]"></div>
            {/* Multi-layered gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/95"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
          </div>
        ) : (item.image && !imageError) ? (
          <div className="absolute top-0 left-0 right-0 bottom-[130px] overflow-hidden">
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-100 brightness-125"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
            {/* Vignette Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(0,0,0,0.5)_100%)]"></div>
            {/* Multi-layered gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/95"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
          </div>
        ) : (
          <div className="absolute top-0 left-0 right-0 bottom-[130px] bg-zinc-900/80">
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
            <span className="px-3 py-1 bg-neon-blue/20 backdrop-blur-md border border-neon-blue/30 rounded-full text-[9px] font-bold tracking-widest uppercase text-neon-blue">
              {item.source}
            </span>
          </div>

          <div 
            className="overflow-y-auto custom-scrollbar pr-4 mb-8 max-h-[75vh] mt-[25px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[24px] md:text-[54px] font-bold leading-[1] mb-6 group-hover:text-neon-blue transition-colors tracking-tighter drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]">
              {item.title}
            </h3>
            
            <p className="text-[12px] md:text-[18px] text-zinc-100 font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-4">
              {item.content}
            </p>
          </div>
        </div>
      </div>

      {/* Back Side (The Article) */}
      <div 
        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)', pointerEvents: isFlipped ? 'auto' : 'none' }}
        className="absolute inset-0 bg-white overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Minimal Close Button - Positioned at the bottom right */}
        <button 
          onClick={handleFlip}
          className="absolute bottom-[42px] right-8 z-30 p-3.5 rounded-full bg-black/80 text-white backdrop-blur-xl hover:bg-red-500 transition-all active:scale-90 shadow-2xl border border-white/20"
        >
          <X size={23} />
        </button>

        <div className="flex-1 relative w-full h-full overflow-y-auto">
          {isFlipped && (
            <iframe 
              src={`/api/proxy?url=${encodeURIComponent(item.link)}`} 
              className="w-full h-full border-none"
              title={item.title}
              loading="lazy"
              style={{ overflow: 'auto' }}
            />
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
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('Invalid news data format:', data);
        setNews([]);
        return;
      }
      
      const categorizedData = data.map((item: NewsItem) => ({
        ...item,
        category: getCategory(item)
      }));
      setNews(categorizedData);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

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
                className="w-48 drop-shadow-[0_0_20px_rgba(0,194,255,0.4)]"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <span className="text-neon-blue font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Syncing Intel...</span>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {filteredNews.length > 0 ? (
              <>
                {filteredNews.slice(0, visibleCount).map((item: NewsItem, index: number) => (
                  <div 
                    key={item.id} 
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

              <div className="p-6 bg-zinc-900/50 text-center border-t border-white/5">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">GamesPulse App © 2026 - Versione 1.0.0</p>
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
