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
  Clock,
  Activity,
  Users,
  TrendingUp,
  BarChart3,
  Check,
  AlertCircle,
  Database,
  Plus,
  Trash2,
  Save,
  FileText
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
        className="absolute inset-0 group bg-zinc-950 overflow-hidden transition-all duration-500 flex flex-col cursor-pointer hover:scale-[1.01] z-10"
        onClick={handleFlip}
      >
        {/* Full Screen Background Image or Video */}
        {(item.video && !videoError) ? (
          <div className="absolute top-[10%] left-0 right-0 bottom-[230px] overflow-hidden bg-black">
            {item.video.includes('embed') || item.video.includes('youtube') || item.video.includes('vimeo') ? (
              (() => {
                const base = item.video || '';
                let finalUrl = base;
                if (base.includes('youtube.com') || base.includes('youtu.be')) {
                  let videoId = (base.split('/').pop() || '').split('?')[0];
                  if (base.includes('watch?v=')) {
                    videoId = new URL(base).searchParams.get('v') || videoId;
                  }
                  finalUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&origin=${window.location.origin}`;
                } else if (base.includes('vimeo.com')) {
                  finalUrl = `${base}?autoplay=1&muted=1&loop=1&background=1`;
                }
                
                return (
                  <iframe
                    src={finalUrl}
                    className="w-full h-full scale-[1.5] pointer-events-none brightness-[1.5] contrast-[1.2] saturate-[1.3]"
                    allow="autoplay; encrypted-media"
                    title={item.title}
                    onError={() => setVideoError(true)}
                  />
                );
              })()
            ) : (
              <video
                src={item.video}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover brightness-[1.5] contrast-[1.2] saturate-[1.3]"
                onError={() => setVideoError(true)}
              />
            )}
            <div className="absolute inset-0 bg-transparent"></div>
            {/* Vignette - Reduced bottom by 15% (80% top, 55% bottom) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 via-transparent to-black/55"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"></div>
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/55 to-transparent"></div>
          </div>
        ) : (item.image && !imageError) ? (
          <div className="absolute top-[10%] left-0 right-0 bottom-[230px] overflow-hidden">
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-100 brightness-[1.5] saturate-[1.3] contrast-[1.1]"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
            {/* Vignette Effect - Increased center brightness */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_0%,_transparent_45%,_rgba(0,0,0,0.65)_100%)]"></div>
            {/* Multi-layered gradient - Reduced bottom by 15% (80% top, 55% bottom) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 via-transparent to-black/55"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"></div>
            {/* Additional Top Vignette Edge */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/55 to-transparent"></div>
          </div>
        ) : (
            <div className="absolute top-[10%] left-0 right-0 bottom-[230px] bg-zinc-900/80">
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
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const [newsLoading, setNewsLoading] = useState(true);
  const [splashBg, setSplashBg] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [seoConfigs, setSeoConfigs] = useState<any>({});
  const [realTraffic, setRealTraffic] = useState<any>({ total: 0, today: 0 });
  const [newsSources, setNewsSources] = useState<any[]>([]);
  const [newSource, setNewSource] = useState({ name: '', url: '', cat: 'News' });
  const [adsenseConfig, setAdsenseConfig] = useState<any>({ enabled: false, script: '', adsTxt: '', metaTag: '' });
  const [isSavingAdsense, setIsSavingAdsense] = useState(false);
  const [adminTab, setAdminTab] = useState('seo');
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error' | null, message: string}>({ type: null, message: '' });

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
    // Ensure splash stays at least 3s
    const timer = setTimeout(() => {
      // Logic handled by combined loading effect
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Monitor loading to hide splash
  useEffect(() => {
    if (!loading && !newsLoading) {
      const timer = setTimeout(() => setShowSplash(false), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, newsLoading]);

  // Cookie Consent Check
  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      const timer = setTimeout(() => setShowCookieBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCookieConsent = (accepted: boolean) => {
    localStorage.setItem('cookieConsent', accepted ? 'accepted' : 'rejected');
    setShowCookieBanner(false);
  };

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

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === 'admin' && adminPassword === 'accessometti') {
      setIsAdminLoggedIn(true);
      setShowAdminLogin(false);
      setShowAdminDashboard(true);
      setAdminError('');
    } else {
      setAdminError('Access Denied: Incorrect Credentials');
    }
  };

  const saveSeoConfig = async (category: string, data: any) => {
    try {
      const response = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth: { username: 'admin', password: 'accessometti' },
          category,
          data
        })
      });
      if (response.ok) {
        setSaveStatus({ type: 'success', message: 'Configurazione SEO salvata con successo!' });
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
      }
    } catch (e) {
      setSaveStatus({ type: 'error', message: 'Errore durante il salvataggio.' });
    }
  };

  const fetchAdminData = async () => {
    try {
      const [seoRes, trafficRes, sourcesRes, adsRes] = await Promise.all([
        fetch('/api/admin/seo'),
        fetch('/api/admin/traffic'),
        fetch('/api/admin/sources'),
        fetch('/api/admin/adsense')
      ]);
      setSeoConfigs(await seoRes.json());
      setRealTraffic(await trafficRes.json());
      setNewsSources(await sourcesRes.json());
      setAdsenseConfig(await adsRes.json());
    } catch (e) {}
  };

  const saveSources = async (sources: any[]) => {
    try {
      await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: { username: 'admin', password: 'accessometti' }, sources })
      });
      setSaveStatus({ type: 'success', message: 'Fonti RSS aggiornate!' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    } catch (e) {}
  };

  const saveAdSense = async (data: any) => {
    setIsSavingAdsense(true);
    try {
      await fetch('/api/admin/adsense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: { username: 'admin', password: 'accessometti' }, data })
      });
      setSaveStatus({ type: 'success', message: 'Configurazione AdSense salvata!' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    } catch (e) {}
    setIsSavingAdsense(false);
  };

  const addSource = () => {
    if (!newSource.name || !newSource.url) return;
    const updated = [...newsSources, { ...newSource, id: Math.random().toString() }];
    setNewsSources(updated);
    saveSources(updated);
    setNewSource({ name: '', url: '', cat: 'News' });
  };

  const deleteSource = (id: string) => {
    const updated = newsSources.filter(s => s.id !== id);
    setNewsSources(updated);
    saveSources(updated);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string, name: string} | null>(null);

  const confirmDelete = (id: string, name: string) => {
    setDeleteConfirm({ show: true, id, name });
  };

  const handleToggleSource = (id: string) => {
    const updated = newsSources.map(s => 
      s.id === id ? { ...s, active: s.active === false ? true : false } : s
    );
    setNewsSources(updated);
    saveSources(updated);
  };

  useEffect(() => {
    if (showAdminDashboard) fetchAdminData();
  }, [showAdminDashboard]);

  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.source.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Se è selezionato il filtro preferiti, mostriamo solo i preferiti indipendentemente dalla categoria selezionata prima
    if (selectedCategory === 'favorites') {
      return matchesSearch && favorites.includes(item.id);
    }
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
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
      label: 'Info & Privacy', 
      icon: <Info size={20} />, 
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
      setNewsLoading(false);
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
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/5 backdrop-blur-xl border-b border-white/10 px-6 py-4">
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
        ref={scrollRef}
        className="absolute inset-0 overflow-y-auto snap-y snap-mandatory hide-scrollbar h-full w-full z-0"
        onScroll={handleScroll}
      >
        {(showSplash || (loading && filteredNews.length === 0)) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black overflow-hidden font-header z-[100]">
            <motion.div 
              className="absolute inset-0 bg-cover bg-center brightness-[0.1] blur-xl scale-110"
              style={{ backgroundImage: `url(${splashBg})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <div className="relative z-10 flex flex-col items-center gap-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center gap-6"
              >
                <img 
                  src="/logocompleto.png" 
                  alt="GamesPulse Logo" 
                  className="w-72 md:w-96 drop-shadow-[0_0_30px_rgba(0,194,255,0.3)]"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse"></div>
                    <span className="text-neon-blue font-bold uppercase tracking-[0.4em] text-[12px]">caricamento notizie</span>
                    <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse [animation-delay:0.2s]"></div>
                  </div>
                  <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent mt-2"></div>
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {filteredNews.length > 0 ? (
              <>
                {filteredNews.slice(0, visibleCount).map((item, index) => (
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
                    {/* Inject AdCard every 6 items if enabled */}
                    {(index + 1) % 6 === 0 && adsenseConfig.enabled && (
                      <div className="h-full w-full snap-start flex-shrink-0 flex items-center justify-center p-6 md:p-12">
                        <AdCard 
                          id={`inline-ad-${index}`}
                          onNext={() => {
                            const container = scrollRef.current;
                            if (container) {
                              container.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
                            }
                          }} 
                        />
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
                    <Info className="w-5 h-5 text-neon-blue" />
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

              <div className="p-6 bg-zinc-900/50 text-center border-t border-white/5 relative">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">GamesPulse App © 2026 - Versione 1.0.0</p>
                
                {/* Admin Shield Icon */}
                <button 
                  onClick={() => {
                    setIsInfoOpen(false);
                    if (isAdminLoggedIn) setShowAdminDashboard(true);
                    else setShowAdminLogin(true);
                  }}
                  className="mt-4 p-2 text-white/10 hover:text-neon-blue transition-colors"
                >
                  <Shield size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[35px] p-10 shadow-[0_0_100px_rgba(0,243,255,0.1)]"
            >
              <div className="flex flex-col items-center mb-10">
                <div className="w-20 h-20 rounded-3xl bg-neon-blue/10 flex items-center justify-center border border-neon-blue/20 mb-6 font-bold text-neon-blue">
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Admin Access</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] mt-2">Restricted Area</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-widest font-black mb-3 ml-2">Username</label>
                  <input 
                    type="text" value={adminUsername} onChange={e => setAdminUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-neon-blue/40"
                    placeholder="Enter admin ID"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 uppercase tracking-widest font-black mb-3 ml-2">Password</label>
                  <input 
                    type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-neon-blue/40"
                    placeholder="••••••••"
                  />
                </div>
                {adminError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">{adminError}</p>}
                
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-neon-blue text-black font-black py-5 rounded-2xl uppercase tracking-widest text-[11px] shadow-lg shadow-neon-blue/20 active:scale-95 transition-all">
                    Sign In
                  </button>
                  <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 bg-white/5 text-white/40 font-black py-5 rounded-2xl border border-white/10 uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Dashboard */}
      <AnimatePresence>
        {showAdminDashboard && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-zinc-950 flex flex-col items-center justify-center p-6 overflow-hidden"
          >
            <div className="w-full h-full max-w-6xl bg-zinc-900/50 border border-white/10 rounded-[40px] flex overflow-hidden shadow-2xl">
              {/* Sidebar */}
              <div className="w-72 bg-black/40 border-r border-white/5 flex flex-col p-8">
                <div className="flex items-center gap-3 mb-16">
                  <div className="w-10 h-10 rounded-xl bg-neon-blue text-black flex items-center justify-center font-black">GP</div>
                  <div>
                    <h2 className="text-sm font-black text-white tracking-widest">DASHBOARD</h2>
                    <p className="text-[9px] text-white/20 uppercase font-bold">Admin Management</p>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {[
                    { id: 'seo', label: 'SEO & Metadata', icon: Search },
                    { id: 'sources', label: 'Fonti RSS', icon: Database },
                    { id: 'adsense', label: 'AdSense Pub', icon: Globe },
                    { id: 'analytics', label: 'Traffico', icon: Activity }
                  ].map(tab => (
                    <button 
                      key={tab.id} onClick={() => setAdminTab(tab.id)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${adminTab === tab.id ? 'bg-neon-blue text-black shadow-lg shadow-neon-blue/20' : 'text-white/40 hover:bg-white/5'}`}
                    >
                      <tab.icon size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-8 border-t border-white/5 space-y-3">
                   <button 
                     onClick={() => setShowAdminDashboard(false)}
                     className="w-full py-4 text-[10px] font-black uppercase text-white/30 hover:text-white transition-colors"
                   >
                     Torna all'App
                   </button>
                   <button 
                     onClick={() => { setIsAdminLoggedIn(false); setShowAdminDashboard(false); }}
                     className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                   >
                     Log Out
                   </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 bg-black/40 overflow-y-auto p-12 custom-scrollbar">
                {adminTab === 'seo' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <header className="mb-12 border-b border-white/5 pb-8 flex justify-between items-end">
                      <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">SEO Optimization</h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold mt-2">Gestione Metadati per Categorie</p>
                      </div>
                      <div className="bg-neon-blue/10 border border-neon-blue/20 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <Database size={16} className="text-neon-blue" />
                        <span className="text-[10px] font-black uppercase text-neon-blue">Database GP Sync</span>
                      </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {CATEGORIES.map(cat => {
                        const config = seoConfigs[cat.id] || { title: '', description: '', keywords: '' };
                        return (
                          <div key={cat.id} className="bg-zinc-900/40 border border-white/5 rounded-[30px] p-8 hover:border-neon-blue/20 transition-all group">
                            <div className="flex items-center gap-4 mb-8">
                               <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/10" style={{backgroundColor: `${cat.color}20`}}>
                                  {cat.icon}
                               </div>
                               <div>
                                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">{cat.label}</h3>
                                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">/{cat.id} endpoint</p>
                               </div>
                            </div>
                            
                            <div className="space-y-6">
                               <div>
                                  <label className="block text-[9px] text-white/20 uppercase tracking-widest font-black mb-3">Meta Title</label>
                                  <input 
                                    type="text" value={config.title} 
                                    onChange={e => setSeoConfigs({...seoConfigs, [cat.id]: {...config, title: e.target.value}})}
                                    onBlur={() => saveSeoConfig(cat.id, seoConfigs[cat.id])}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30"
                                  />
                               </div>
                               <div>
                                  <label className="block text-[9px] text-white/20 uppercase tracking-widest font-black mb-3">Meta Description</label>
                                  <textarea 
                                    rows={2} value={config.description}
                                    onChange={e => setSeoConfigs({...seoConfigs, [cat.id]: {...config, description: e.target.value}})}
                                    onBlur={() => saveSeoConfig(cat.id, seoConfigs[cat.id])}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30 resize-none"
                                  />
                               </div>
                               <div>
                                  <label className="block text-[9px] text-white/20 uppercase tracking-widest font-black mb-3">Keywords</label>
                                  <input 
                                    type="text" value={config.keywords}
                                    onChange={e => setSeoConfigs({...seoConfigs, [cat.id]: {...config, keywords: e.target.value}})}
                                    onBlur={() => saveSeoConfig(cat.id, seoConfigs[cat.id])}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-xs text-neon-blue/60 focus:outline-none focus:border-neon-blue/40"
                                  />
                               </div>
                               <div className="flex items-center gap-2 pt-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60">Live Cloud Cache Sync Enabled</span>
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {adminTab === 'sources' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <header className="mb-12 border-b border-white/5 pb-8 flex justify-between items-end">
                      <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Fonti Feed RSS</h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold mt-2">Configurazione flussi di notizie nazionali ed internazionali</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <Database size={16} className="text-emerald-400" />
                        <span className="text-[10px] font-black uppercase text-white">{newsSources.length} Fonti Attive</span>
                      </div>
                    </header>

                    {/* Add Source Form */}
                    <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 mb-12">
                      <div className="flex items-center gap-4 mb-8">
                        <Plus className="w-5 h-5 text-neon-blue" />
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Integra Nuova Fonte</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] text-white/20 uppercase tracking-widest font-black mb-3">Nome Testata</label>
                          <input value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} type="text" placeholder="Es. IGN IT" className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30" />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-[10px] text-white/20 uppercase tracking-widest font-black mb-3">URL RSS Feed</label>
                           <input value={newSource.url} onChange={e => setNewSource({...newSource, url: e.target.value})} type="url" placeholder="https://testata.it/rss.xml" className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-white/20 uppercase tracking-widest font-black mb-3">Categoria</label>
                          <select value={newSource.cat} onChange={e => setNewSource({...newSource, cat: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30 appearance-none">
                            {CATEGORIES.filter(c => c.id !== 'favorites').map(c => <option key={c.id} value={c.label === 'Home' ? 'News' : c.label}>{c.label === 'Home' ? 'News Generali' : c.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={addSource} className="mt-8 w-full bg-neon-blue text-black font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-[11px] shadow-xl shadow-neon-blue/20 active:scale-95">
                        Aggiungi Fonte al Database
                      </button>
                    </div>

                    <div className="space-y-12">
                       {CATEGORIES.filter(c => c.id !== 'favorites').map(cat => {
                        const targetCat = cat.label === 'Home' ? 'News' : cat.label;
                        const catSources = newsSources.filter(s => s.cat === targetCat);
                        if (catSources.length === 0 && cat.label !== 'Home') return null;
                        
                        // Prevent rendering totally empty section if News/Home is strictly empty
                        if (catSources.length === 0) return null;

                        return (
                          <div key={cat.id}>
                            <div className="flex items-center gap-4 mb-6">
                              <h3 className="text-lg font-black text-white uppercase tracking-tighter">{cat.label === 'Home' ? 'News Generali' : cat.label}</h3>
                              <div className="h-px bg-white/5 flex-1" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {catSources.map(source => (
                                <div key={source.id} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 group flex justify-between items-center hover:bg-zinc-900/50 transition-all">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <button 
                                      onClick={() => handleToggleSource(source.id)}
                                      className={`relative w-10 h-6 rounded-full transition-all shrink-0 ${source.active !== false ? 'bg-neon-blue' : 'bg-white/10'}`}
                                    >
                                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${source.active !== false ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <div className="truncate pr-4">
                                      <p className={`font-bold text-sm truncate uppercase tracking-tight transition-opacity ${source.active !== false ? 'text-white' : 'text-white/20'}`}>{source.name}</p>
                                      <p className="text-[10px] text-white/20 truncate font-mono mt-1">{source.url}</p>
                                    </div>
                                  </div>
                                  <button onClick={() => confirmDelete(source.id, source.name)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                       })}
                    </div>
                  </motion.div>
                )}

                {adminTab === 'adsense' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-zinc-900 border border-white/10 rounded-[40px] p-10">
                          <header className="flex items-center gap-4 mb-10">
                             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                               <Settings className="w-6 h-6 text-indigo-400" />
                             </div>
                             <div>
                               <h3 className="text-xl font-bold text-white uppercase tracking-tight">Impostazioni Annunci</h3>
                               <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Sincronizzazione Gaming Ads</p>
                             </div>
                          </header>

                          <div className="space-y-8">
                            <div className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-2xl">
                              <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">Stato Monetizzazione</p>
                                <p className={`text-sm font-bold ${adsenseConfig.enabled ? 'text-emerald-400' : 'text-white/40'}`}>
                                  {adsenseConfig.enabled ? 'PIATTAFORMA ATTIVA' : 'SISTEMA DISABILITATO'}
                                </p>
                              </div>
                              <button onClick={() => setAdsenseConfig({...adsenseConfig, enabled: !adsenseConfig.enabled})} className={`relative w-14 h-8 rounded-full transition-all duration-500 ${adsenseConfig.enabled ? 'bg-indigo-600' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${adsenseConfig.enabled ? 'right-1' : 'left-1'}`} />
                              </button>
                            </div>

                            <div>
                              <label className="block text-[9px] text-white/30 uppercase tracking-widest font-black mb-3">Snippet Google AdSense (Head)</label>
                              <textarea rows={6} value={adsenseConfig.script} onChange={e => setAdsenseConfig({...adsenseConfig, script: e.target.value})} placeholder="Incolla qui lo script di AdSense" className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white font-mono text-[10px] focus:outline-none focus:border-indigo-500/30 resize-none" />
                            </div>

                            <div>
                              <label className="block text-[9px] text-white/30 uppercase tracking-widest font-black mb-3">Meta Tag Verifica</label>
                              <input type="text" value={adsenseConfig.metaTag} onChange={e => setAdsenseConfig({...adsenseConfig, metaTag: e.target.value})} placeholder='<meta name="google-adsense-account" content="..." />' className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white font-mono text-[10px] focus:outline-none focus:border-indigo-500/30" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-[40px] p-10">
                           <header className="flex items-center gap-4 mb-10">
                              <FileText className="w-6 h-6 text-amber-400" />
                              <h3 className="text-lg font-bold text-white uppercase tracking-tight">ads.txt Content</h3>
                           </header>
                           <div className="space-y-6">
                              <p className="text-[9px] text-white/30 uppercase tracking-widest leading-relaxed">Inserisci qui le righe per il file ads.txt. Sarà servito automaticamente all'indirizzo gamespulse.it/ads.txt</p>
                              <textarea rows={10} value={adsenseConfig.adsTxt} onChange={e => setAdsenseConfig({...adsenseConfig, adsTxt: e.target.value})} placeholder="google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0" className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white font-mono text-[10px] focus:outline-none focus:border-amber-500/30 resize-none" />
                              
                              <button onClick={() => saveAdSense(adsenseConfig)} disabled={isSavingAdsense} className={`w-full py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[11px] font-black flex items-center justify-center gap-3 ${isSavingAdsense ? 'bg-indigo-900 text-white/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95'}`}>
                                 {isSavingAdsense ? <><RefreshCw className="animate-spin" size={16} /> Salvataggio...</> : <><Save size={16} /> Salva Configurazione</>}
                              </button>
                           </div>
                        </div>
                     </div>
                  </motion.div>
                )}

                {adminTab === 'analytics' && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <header className="mb-12 border-b border-white/5 pb-8">
                       <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Traffico & Tracking</h2>
                       <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold mt-2">Monitoraggio Sessioni e Utenti Real-Time</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                       <div className="bg-zinc-900 border border-white/10 rounded-[35px] p-8 group">
                          <header className="flex justify-between items-center mb-4">
                             <TrendingUp className="text-emerald-400" size={20} />
                             <span className="text-[9px] font-black text-white/20 tracking-widest uppercase">Visitatori Totali</span>
                          </header>
                          <p className="text-4xl font-black text-white tracking-tighter">{realTraffic.total}</p>
                          <div className="h-2 w-full bg-white/5 rounded-full mt-6 overflow-hidden">
                             <motion.div initial={{ width: 0 }} animate={{ width: '65%' }} className="h-full bg-emerald-400" />
                          </div>
                       </div>
                       
                       <div className="bg-zinc-900 border border-white/10 rounded-[35px] p-8 group">
                          <header className="flex justify-between items-center mb-4">
                             <Activity className="text-neon-blue" size={20} />
                             <span className="text-[9px] font-black text-white/20 tracking-widest uppercase">Oggi (Real-Time)</span>
                          </header>
                          <p className="text-4xl font-black text-white tracking-tighter">{realTraffic.today}</p>
                          <div className="h-2 w-full bg-white/5 rounded-full mt-6 overflow-hidden">
                             <motion.div initial={{ width: 0 }} animate={{ width: '40%' }} className="h-full bg-neon-blue" />
                          </div>
                       </div>

                       <div className="bg-zinc-900 border border-white/10 rounded-[35px] p-8 group">
                          <header className="flex justify-between items-center mb-4">
                             <Users className="text-purple-500" size={20} />
                             <span className="text-[9px] font-black text-white/20 tracking-widest uppercase">Stima Sessioni</span>
                          </header>
                          <p className="text-4xl font-black text-white tracking-tighter">{Math.floor(realTraffic.total * 0.82)}</p>
                          <div className="h-2 w-full bg-white/5 rounded-full mt-6 overflow-hidden">
                             <motion.div initial={{ width: 0 }} animate={{ width: '82%' }} className="h-full bg-purple-500" />
                          </div>
                       </div>
                    </div>

                    <div className="bg-zinc-900 border border-white/10 rounded-[40px] p-10">
                       <h3 className="text-sm font-black text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                          <BarChart3 className="text-neon-blue" size={20} />
                          Andamento Storico Settimanale
                       </h3>
                       <div className="h-64 flex items-end gap-3 px-2">
                          {[40, 65, 45, 90, 55, 100, 75].map((val, i) => (
                            <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
                               <motion.div 
                                 initial={{ height: 0 }} animate={{ height: `${val}%` }}
                                 className="w-full bg-gradient-to-t from-neon-blue/20 to-neon-blue rounded-t-xl opacity-60 group-hover:opacity-100 transition-all border-t border-white/20"
                               />
                               <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/20 uppercase tracking-widest">Giorno {i+1}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                   </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Notification */}
      <AnimatePresence>
        {saveStatus.type && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-10 left-10 z-[1000] px-8 py-5 rounded-[25px] flex items-center gap-4 bg-zinc-950 border border-white/10 shadow-2xl"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saveStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
              {saveStatus.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">{saveStatus.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCookieBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 z-[2000] bg-zinc-950 border border-white/10 p-8 rounded-[35px] shadow-2xl backdrop-blur-3xl"
          >
            <div className="flex items-center gap-4 mb-6">
               <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                 <ShieldCheck size={24} />
               </div>
               <div>
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">Privacy Intel</h4>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Security Protocol</p>
               </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-8 font-medium">
              Utilizziamo i cookie per ottimizzare la tua esperienza di gioco e analizzare il traffico. Accettando, acconsenti al nostro protocollo di dati.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => handleCookieConsent(false)}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                title="Rifiuta protocollo cookie"
              >
                Rifiuta
              </button>
              <button 
                onClick={() => handleCookieConsent(true)}
                className="flex-2 py-4 px-8 bg-neon-blue text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white transition-all shadow-lg shadow-neon-blue/20"
                title="Accetta protocollo cookie"
              >
                Accetta Protocollo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <DeleteConfirmModal 
            show={deleteConfirm.show}
            name={deleteConfirm.name}
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={() => {
              deleteSource(deleteConfirm.id);
              setDeleteConfirm(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-component for Google AdSense
const AdCard = ({ id, onNext }: { id: string; onNext?: () => void }) => {
  const [adsenseConfig] = useState(() => {
    const saved = localStorage.getItem('adsense_config');
    return saved ? JSON.parse(saved) : { enabled: false, client: '', slot: '' };
  });

  useEffect(() => {
    if (adsenseConfig.enabled) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, [adsenseConfig.enabled]);

  if (!adsenseConfig.enabled) return null;

  return (
    <div className="w-full flex flex-col items-center justify-center py-10 px-6">
      <div className="w-full max-w-4xl bg-zinc-950 border border-white/5 rounded-[40px] p-1 overflow-hidden relative group">
        <div className="absolute top-4 right-8 flex items-center gap-2 z-10">
           {onNext && (
             <button 
               onClick={onNext}
               className="mr-4 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest rounded-full border border-white/10 transition-all flex items-center gap-2"
             >
               Skip ad <ChevronRight size={10} />
             </button>
           )}
           <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Sponsored Intel</span>
           <div className="w-1 h-1 rounded-full bg-neon-blue animate-pulse" />
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-[38px] p-8 min-h-[250px] flex items-center justify-center border border-white/5">
           <ins className="adsbygoogle"
                style={{ display: 'block', width: '100%', minHeight: '200px' }}
                data-ad-client={adsenseConfig.client}
                data-ad-slot={adsenseConfig.slot}
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        </div>
      </div>
    </div>
  );
};

export { App };

// Sub-component for Delete Confirmation Modal
const DeleteConfirmModal = ({ show, name, onCancel, onConfirm }: { show: boolean, name: string, onCancel: () => void, onConfirm: () => void }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[40px] p-12 text-center shadow-[0_0_100px_rgba(0,0,0,1)]"
      >
        <div className="w-24 h-24 rounded-[30px] bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto mb-10">
          <Trash2 size={40} />
        </div>
        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-5 text-balance leading-none">ELIMINA INTEL?</h3>
        <p className="text-sm text-white/40 mb-12 font-medium leading-relaxed px-6">
          Sei sicuro di voler eliminare <span className="text-white font-bold">{name}</span>?<br/>Questa azione rimuoverà permanentemente la fonte dal database.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-5 bg-white/5 text-white/60 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-all font-mono"
          >
            Annulla Protocollo
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-5 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-700 shadow-xl shadow-red-600/30 transition-all font-mono"
          >
            Conferma Elimina
          </button>
        </div>
      </motion.div>
    </div>
  );
};
