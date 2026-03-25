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
  Activity,
  Database,
  BarChart3,
  CheckCircle2,
  Plus,
  Trash2,
  Users,
  Clock,
  TrendingUp,
  FileText,
  Save,
  HardDrive,
  RefreshCw
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
  testConnection,
  signInAnonymously
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

interface Source {
  id: string;
  url: string;
  cat: string;
  name: string;
  active?: boolean;
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
          <div className="absolute top-[75px] left-0 right-0 bottom-[220px] overflow-hidden bg-black shadow-2xl">
            {item.video.includes('embed') ? (
              <iframe
                src={`${item.video}?autoplay=1&mute=1&loop=1&playlist=${(item.video.split('/').pop() || '').split('?')[0]}&controls=0&showinfo=0&rel=0&modestbranding=1`}
                className="w-full h-full scale-[1.5] pointer-events-none brightness-[1.1]"
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
                className="w-full h-full object-cover brightness-110"
                onError={() => setVideoError(true)}
              />
            )}
            <div className="absolute inset-0 bg-transparent"></div>
            {/* Sfumatura superiore delicata */}
            <div className="absolute top-0 left-0 right-0 h-[35%] bg-gradient-to-b from-black/50 via-black/5 to-transparent"></div>
            {/* Sfumatura inferiore delicata */}
            <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-black/95 via-black/20 to-transparent"></div>
          </div>
        ) : (item.image && !imageError) ? (
          <div className="absolute top-[75px] left-0 right-0 bottom-[220px] overflow-hidden shadow-2xl">
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-110"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
            {/* Sfumatura superiore delicata */}
            <div className="absolute top-0 left-0 right-0 h-[35%] bg-gradient-to-b from-black/50 via-black/5 to-transparent"></div>
            {/* Sfumatura inferiore delicata */}
            <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-black/95 via-black/20 to-transparent"></div>
          </div>
        ) : (
          <div className="absolute top-[75px] left-0 right-0 bottom-[220px] bg-zinc-900/80 overflow-hidden">
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
  
  // Admin States
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminTab, setAdminTab] = useState<'seo' | 'sources' | 'analytics' | 'adsense'>('seo');
  const [newsSources, setNewsSources] = useState<Source[]>([
    // NEWS
    { "id": "gp-001", "url": "https://it.ign.com/feed.xml", "cat": "News", "name": "IGN IT", "active": true },
    { "id": "gp-002", "url": "https://multiplayer.it/feed/", "cat": "News", "name": "Multiplayer", "active": true },
    { "id": "gp-003", "url": "https://www.everyeye.it/feed/", "cat": "News", "name": "Everyeye", "active": true },
    { "id": "gp-004", "url": "https://www.gamesource.it/feed/", "cat": "News", "name": "GameSource", "active": true },
    { "id": "gp-005", "url": "https://www.spaziogames.it/feed/", "cat": "News", "name": "Spaziogames", "active": true },
    { "id": "gp-006", "url": "https://feeds.feedburner.com/ign/all", "cat": "News", "name": "IGN Global", "active": true },
    { "id": "gp-007", "url": "https://www.gamespot.com/feeds/mashup/", "cat": "News", "name": "GameSpot", "active": true },
    { "id": "gp-008", "url": "https://www.eurogamer.net/feed", "cat": "News", "name": "Eurogamer", "active": true },
    { "id": "gp-009", "url": "https://kotaku.com/rss", "cat": "News", "name": "Kotaku", "active": true },
    { "id": "gp-010", "url": "https://www.polygon.com/rss/index.xml", "cat": "News", "name": "Polygon", "active": true },
    // PC
    { "id": "gp-011", "url": "https://www.pcgamer.com/rss", "cat": "PC", "name": "PC Gamer", "active": true },
    { "id": "gp-011b", "url": "https://www.rockpapershotgun.com/feed", "cat": "PC", "name": "Rock Paper Shotgun", "active": true },
    // PS5
    { "id": "gp-013", "url": "https://www.pushsquare.com/feeds/latest", "cat": "PS5", "name": "Push Square", "active": true },
    { "id": "gp-021", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UC-2Y8L_huKU29enH8vGZ9yA", "cat": "PS5", "name": "PlayStation Video", "active": true },
    // Xbox
    { "id": "gp-014", "url": "https://www.purexbox.com/feeds/latest", "cat": "Xbox", "name": "Pure Xbox", "active": true },
    { "id": "gp-022", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCjBp_7RuDBUYbd1LegWEJ8g", "cat": "Xbox", "name": "Xbox Video", "active": true },
    // Switch
    { "id": "gp-012", "url": "https://www.nintendolife.com/feeds/latest", "cat": "Switch", "name": "Nintendo Life", "active": true },
    { "id": "gp-023", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UC6f_u6p_GZ_vX_Z_B_6Q8sw", "cat": "Switch", "name": "Nintendo IT Video", "active": true },
    // Tech
    { "id": "gp-016", "url": "https://www.theverge.com/rss/index.xml", "cat": "Tech", "name": "The Verge", "active": true },
    { "id": "gp-017", "url": "https://www.engadget.com/rss.xml", "cat": "Tech", "name": "Engadget", "active": true },
    { "id": "gp-019", "url": "https://feeds.macrumors.com/MacRumors-All", "cat": "Tech", "name": "MacRumors", "active": true },
    { "id": "gp-020", "url": "https://www.hdblog.it/feed/", "cat": "Tech", "name": "HD Blog", "active": true },
    { "id": "gp-025", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UC9PBzalIcEQCsiIkq36PyUA", "cat": "Tech", "name": "Digital Foundry", "active": true },
    // Mobile
    { "id": "gp-018", "url": "https://www.androidcentral.com/rss.xml", "cat": "Mobile", "name": "Android Central", "active": true },
    // Industry
    { "id": "gp-015", "url": "https://www.gamesindustry.biz/feed", "cat": "Industry", "name": "GamesIndustry", "active": true },
    // Videos
    { "id": "gp-026", "url": "https://multiplayer.it/feed/video/", "cat": "Videos", "name": "Multiplayer Video", "active": true },
    { "id": "gp-027", "url": "http://feeds.feedburner.com/ign/video-reviews", "cat": "Videos", "name": "IGN Video Reviews", "active": true },
    { "id": "gp-028", "url": "https://www.gamespot.com/feeds/video/", "cat": "Videos", "name": "GameSpot Video", "active": true },
    { "id": "gp-024", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCm4WlDgi7QAsitnybaid2vA", "cat": "Videos", "name": "GameTrailers", "active": true },
  ]);
  const [newSource, setNewSource] = useState({ name: '', url: '', cat: 'News' });
  const [seoConfigs, setSeoConfigs] = useState<any>({
    "all": {
      "title": "GamesPulse | Ultime Notizie Gaming, PS5, Xbox, Nintendo & PC",
      "description": "Resta aggiornato con le ultime notizie dal mondo dei videogiochi. GamesPulse aggrega i migliori feed per PS5, Xbox Series X, Switch e PC in tempo reale.",
      "keywords": "notizie gaming, news videogiochi, ps5, xbox, nintendo switch, pc gaming, esports, recensioni giochi, anteprime, trailer, gamespulse"
    },
    "favorites": {
      "title": "I Tuoi Preferiti | GamesPulse Gaming News",
      "description": "Accedi alle notizie gaming che hai salvato su GamesPulse. Non perdere mai gli ultimi aggiornamenti sui tuoi titoli preferiti.",
      "keywords": "preferiti gaming, news salvate, watchlist gaming, gaming intel, playlist notizie giochi"
    },
    "playstation": {
      "title": "News PS5 & PS4 | Nuovi Giochi PlayStation | GamesPulse",
      "description": "Tutte le ultime notizie su PlayStation 5 e PS4. Esclusive Sony, aggiornamenti PS Plus, recensioni e anteprime dei titoli più attesi.",
      "keywords": "playstation 5, ps5 news, sony exclusive, ps plus, horizon forbidden west, god of war ragnarok, spider-man 2, playstation vr2, push square"
    },
    "xbox": {
      "title": "News Xbox Series X|S & Game Pass | Microsoft Gaming | GamesPulse",
      "description": "Scopri le ultime novità dal mondo Xbox. Aggiornamenti su Xbox Game Pass, acquisizioni Microsoft, Halo, Forza e molto altro.",
      "keywords": "xbox series x, xbox series s, game pass, microsoft gaming, halo infinite, forza horizon, starfield, fable, avowed, xbox news"
    },
    "nintendo": {
      "title": "News Nintendo Switch 2 | Mario, Zelda & Pokémon | GamesPulse",
      "description": "Aggiornamenti costanti su Nintendo Switch e Switch 2, Mario, Zelda e Pokémon. Scopri le ultime uscite e i rumor sulla prossima console Nintendo.",
      "keywords": "nintendo switch 2, switch 2, zelda tears of the kingdom, super mario bros, pokemon scarlet violet, metroid prime, indie switch, nintendo direct"
    },
    "pc": {
      "title": "PC Gaming News | Hardware, Steam & Epic Games | GamesPulse",
      "description": "Le migliori notizie per il PC Gaming. Recensioni CPU e GPU, offerte Steam, novità Epic Games Store, modding e benchmark delle ultime schede video.",
      "keywords": "pc gaming, steam deals, epic games store, rtx 5090, amd rx 9000, intel arc, hardware gaming, modding, giveaway giochi pc, gaming rig"
    },
    "tech": {
      "title": "Tech & Hardware Gaming | AI, GPU e Console | GamesPulse",
      "description": "L'incrocio tra tecnologia e gaming. Notizie su Intelligenza Artificiale applicata ai giochi, Digital Foundry, nuove architetture CPU/GPU e smartphone gaming.",
      "keywords": "tecnologia gaming, hardware news, intelligenza artificiale giochi, gpu benchmark, digital foundry analysis, hdblog, gadget tech gaming, ray tracing, dlss, fsr"
    },
    "mobile": {
      "title": "Mobile Gaming News | iOS & Android | GamesPulse",
      "description": "Tutto sui giochi mobili. News da App Store e Google Play, recensioni smartphone gaming, controller mobile e aggiornamenti sui titoli più giocati.",
      "keywords": "mobile gaming, android gaming news, ios gaming, iphone gaming, genshin impact mobile, pubg mobile, diablo immortal, controller mobile, gaming smartphone"
    },
    "videos": {
      "title": "Video Gaming & Trailer | Gameplay e Recensioni Video | GamesPulse",
      "description": "I migliori video dal mondo gaming: trailer di annunci, gameplay esclusivi, recensioni video e coverage degli eventi come The Game Awards e Nintendo Direct.",
      "keywords": "video gaming, trailer giochi 2025, gameplay reveal, game awards trailer, nintendo direct video, ign video reviews, gamespot video, digital foundry video"
    },
    "industry": {
      "title": "Gaming Industry News | Business, Acquisizioni & Sviluppatori | GamesPulse",
      "description": "Le notizie dal settore dell'industria videoludica: acquisizioni, licenziamenti, rapporti di vendita, annunci di publisher e notizie finanziarie sul gaming.",
      "keywords": "games industry news, acquisizioni gaming, microsoft activision, sony studio, take-two, ea acquisizioni, layoffs gaming, sviluppatori indie, gamesindustry biz"
    }
  });
  const [adsenseConfig, setAdsenseConfig] = useState<any>({
    enabled: false, script: '', metaTag: '', adsTxt: '',
    stats: {
      earnings: [0, 0, 0, 0, 0, 0, 0],
      clicks: [0, 0, 0, 0, 0, 0, 0],
      impressions: [0, 0, 0, 0, 0, 0, 0],
      ctr: [0, 0, 0, 0, 0, 0, 0],
      labels: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
      totalEarnings: 0, totalClicks: 0, totalImpressions: 0, avgCtr: 0
    }
  });
  const [analyticsConfig, setAnalyticsConfig] = useState<any>({ 
    trackingId: '', 
    verificationTag: 'gDuVjhcBFsTnVD9P1m9vh-K_Css9b-Z0hRtQM-ypmTs', 
    enabled: true 
  });
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error' | null, message: string}>({ type: null, message: '' });

  // Auto-hide save status
  useEffect(() => {
    if (saveStatus.type) {
      const timer = setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);
  const [isSavingAdsense, setIsSavingAdsense] = useState(false);
  const [isSavingSeo, setIsSavingSeo] = useState(false);
  const [trafficStats, setTrafficStats] = useState<any>({
    totalVisits: 0,
    activeNow: 0,
    averageSession: '0m 0s',
    bounceRate: '0%',
    chartData: [0, 0, 0, 0, 0, 0, 0],
    labels: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
    topPages: [], topCountries: [], deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 }
  });
  const [feedCategoryFilter, setFeedCategoryFilter] = useState('News');

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
    
    // Safety Net: If after 8s we are still loading, force open the site
    const safetyTimer = setTimeout(() => {
      if (showSplash) {
        console.warn("Safety net triggered: forcing site open");
        setLoading(false);
        setShowSplash(false);
      }
    }, 8000);

    return () => clearTimeout(safetyTimer);
  }, []);

  // Monitor loading to hide splash
  useEffect(() => {
    if (!loading && showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 200); // Small grace period
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`/api/news${force ? '?refresh=true' : ''}`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        console.warn('No news data received, stopping loader');
        setNews([]);
        setLoading(false);
        return;
      }
      
      const categorizedData = data.map((item: NewsItem) => ({
        ...item,
        category: getCategory(item)
      }));
      setNews(categorizedData);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn('News fetch timed out — stopping loader');
      } else {
        console.error('Error fetching news:', error);
      }
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Load sources from API (with hardcoded fallback in api/index.ts)
    fetch('/api/sources')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length > 0) setNewsSources(data); })
      .catch(() => {}); // silently use hardcoded defaults if fetch fails
  }, []);


  const fetchConfigs = useCallback(() => {
    // 1. Listen to Firestore Configs in Real-time
    const configsToWatch = ['seo', 'adsense', 'analytics', 'sources'];
    const unsubscribes = configsToWatch.map(configId => {
      return onSnapshot(doc(db, 'admin_configs', configId), (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        switch (configId) {
          case 'seo': setSeoConfigs((prev: any) => ({ ...prev, ...data })); break;
          case 'adsense': setAdsenseConfig(data); break;
          case 'analytics': setAnalyticsConfig(data); break;
          case 'sources': if (data.list) setNewsSources(data.list); break;
        }
      }, (error) => {
        console.warn(`Realtime error for ${configId}:`, error);
      });
    });

    // 2. Listen to Real-time Traffic from Firestore
    const unsubTraffic = onSnapshot(doc(db, 'traffic', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTrafficStats((prev: any) => ({
          ...prev,
          totalVisitors: data.total || 0,
          todayVisitors: data.today || 0,
          liveUsers: data.live || Math.floor(Math.random() * 10) + 1, // simulated if not present
          averageSession: data.avgSession || '2m 14s'
        }));
      }
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      unsubTraffic();
    };
  }, [db]);

  useEffect(() => {
    const unsubConfigs = fetchConfigs();
    
    // Heartbeat for traffic tracking
    const trackVisit = async () => {
      try {
        const trafficDoc = doc(db, 'traffic', 'global');
        await setDoc(trafficDoc, {
          total: increment(1),
          today: increment(1),
          lastVisit: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn("Traffic tracking limited by permissions or network");
      }
    };

    if (isAuthReady) trackVisit();

    return () => {
      if (typeof unsubConfigs === 'function') unsubConfigs();
    };
  }, [isAuthReady, db]);

  const saveSeoConfig = async (catId: string, config: any) => {
    setIsSavingSeo(true);
    try {
      const newConfigs = { ...seoConfigs, [catId]: config };
      // Save to API
      await fetch('/api/config/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfigs)
      });
      // Save to Firestore (Permanent)
      await setDoc(doc(db, 'admin_configs', 'seo'), newConfigs);
      setSaveStatus({ type: 'success', message: 'SEO salvato!' });
    } catch (e: any) {
      console.error("Error saving SEO:", e);
      setSaveStatus({ type: 'error', message: 'Errore DB: ' + (e.message || 'Permesso negato') });
    } finally {
      setIsSavingSeo(false);
    }
  };

  // SEO, Analytics & AdSense Injection Logic
  useEffect(() => {
    if (!isAuthReady) return;

    const currentCatSeo = seoConfigs[selectedCategory] || seoConfigs['all'] || {};
    const defaultTitle = "GamesPulse | Your Daily Gaming Intel";
    const defaultDesc = "GamesPulse - The ultimate gaming daily intel app.";

    // Update Meta Title
    document.title = currentCatSeo.title || defaultTitle;
    
    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', currentCatSeo.description || defaultDesc);
    
    // Update Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', currentCatSeo.keywords || "");

    // Google Analytics Injection
    if (analyticsConfig.enabled && analyticsConfig.trackingId) {
      const id = analyticsConfig.trackingId;
      if (!document.getElementById('google-analytics')) {
        const script1 = document.createElement('script');
        script1.id = 'google-analytics';
        script1.async = true;
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
        document.head.appendChild(script1);

        const script2 = document.createElement('script');
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `;
        document.head.appendChild(script2);
      }
      
      // Site Verification Tag
      if (analyticsConfig.verificationTag) {
        let verifyTag = document.getElementById('google-site-verification');
        if (!verifyTag) {
          const div = document.createElement('div');
          div.id = 'google-site-verification';
          div.innerHTML = analyticsConfig.verificationTag;
          if (div.firstChild) document.head.appendChild(div.firstChild);
        }
      }
    }

    // AdSense Global Injection
    if (adsenseConfig.enabled && adsenseConfig.script) {
      if (!document.getElementById('adsense-script')) {
        const div = document.createElement('div');
        div.id = 'adsense-script';
        div.innerHTML = adsenseConfig.script;
        const script = div.querySelector('script');
        if (script) {
          const newScript = document.createElement('script');
          Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.innerHTML = script.innerHTML;
          document.head.appendChild(newScript);
        }
      }
    }
  }, [selectedCategory, seoConfigs, adsenseConfig, analyticsConfig, isAuthReady]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername.toLowerCase() === 'admin' && adminPassword === 'accessometti') {
      setIsAdminLoggedIn(true);
      setShowAdminLogin(false);
      setShowAdminDashboard(true);
      setAdminError('');
      // Trigger anonymous sign in to satisfy Firestore rules
      signInAnonymously(auth).catch(err => console.error("Firebase auth error:", err));
    } else {
      setAdminError('Credenziali non valide');
    }
  };

  const fetchSources = async () => {
    try {
      const [snap, apiRes] = await Promise.allSettled([
        getDoc(doc(db, 'admin_configs', 'sources')),
        fetch('/api/sources').then(r => r.json())
      ]);

      const fireList = snap.status === 'fulfilled' && snap.value.exists() ? snap.value.data().list : null;
      const apiList = apiRes.status === 'fulfilled' ? apiRes.value : null;

      setNewsSources(fireList || apiList || []);
    } catch (e) { 
      console.error("Error fetching sources:", e); 
    }
  };

  const saveSources = async (sources: Source[]) => {
    try {
      // Local API save
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sources)
      });
      // Cloud Firestore save (Permanent)
      await setDoc(doc(db, 'admin_configs', 'sources'), { list: sources });
      
      setSaveStatus({ type: 'success', message: 'Fonti aggiornate con successo' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    } catch (e) {
      setSaveStatus({ type: 'error', message: 'Errore nel salvataggio' });
    }
  };

  const handleToggleSource = (id: string) => {
    const updated = newsSources.map(s => s.id === id ? { ...s, active: s.active === false ? true : false } : s);
    setNewsSources(updated);
    saveSources(updated);
  };

  const handleToggleAll = (active: boolean, category?: string) => {
    const updated = newsSources.map(s => {
      if (!category || s.cat === category) return { ...s, active };
      return s;
    });
    setNewsSources(updated);
    saveSources(updated);
  };

  const addSource = () => {
    if (!newSource.name || !newSource.url) return;
    const s: Source = {
      id: `gp-${Date.now()}`,
      ...newSource,
      active: true
    };
    const updated = [...newsSources, s];
    setNewsSources(updated);
    saveSources(updated);
    setNewSource({ name: '', url: '', cat: 'News' });
  };

  const confirmDelete = (id: string, name: string) => {
    if (window.confirm(`Eliminare la fonte ${name}?`)) {
      const updated = newsSources.filter(s => s.id !== id);
      setNewsSources(updated);
      saveSources(updated);
    }
  };


  const saveAdSense = async (config: any) => {
    setIsSavingAdsense(true);
    try {
      await setDoc(doc(db, 'admin_configs', 'adsense'), config);
      setAdsenseConfig(config);
      setSaveStatus({ type: 'success', message: 'AdSense salvato!' });
    } catch (e: any) { 
      console.error(e); 
      setSaveStatus({ type: 'error', message: 'Errore AdSense: ' + (e.message || 'Permesso') });
    }
    finally { setIsSavingAdsense(false); }
  };

  const saveAnalytics = async (config: any) => {
    try {
      await setDoc(doc(db, 'admin_configs', 'analytics'), config);
      setAnalyticsConfig(config);
      setSaveStatus({ type: 'success', message: 'Analytics salvato!' });
    } catch (e: any) { 
      console.error(e); 
      setSaveStatus({ type: 'error', message: 'Errore Analytics: ' + (e.message || 'Permesso') });
    }
  };

  const saveAllConfigs = async () => {
    // Collect all current states and save them to Firestore
    try {
       await setDoc(doc(db, 'admin_configs', 'seo'), seoConfigs);
       await setDoc(doc(db, 'admin_configs', 'adsense'), adsenseConfig);
       await setDoc(doc(db, 'admin_configs', 'analytics'), analyticsConfig);
       await setDoc(doc(db, 'admin_configs', 'sources'), { list: newsSources });
       alert("Tutte le configurazioni salvate sul Cloud (Firestore)!");
    } catch (e) {
       alert("Errore nel salvataggio globale");
    }
  };

  const forceLoadLocal = async () => {
    try {
      const [sources, seo, ads, ana, tra] = await Promise.all([
        fetch('/api/sources').then(r => r.json()),
        fetch('/api/config/seo').then(r => r.json()),
        fetch('/api/config/adsense').then(r => r.json()),
        fetch('/api/config/analytics').then(r => r.json()),
        fetch('/api/config/traffic').then(r => r.json())
      ]);
      setNewsSources(sources);
      setSeoConfigs(seo);
      setAdsenseConfig(ads);
      setAnalyticsConfig(ana);
      setTrafficStats(tra);
      alert("Dati caricati dai file locali (.data/)");
    } catch (e) {
      alert("Errore nel caricamento locale");
    }
  };

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
        {(loading && filteredNews.length === 0) || showSplash ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
            <motion.div
              animate={{ opacity: [0.03, 0.12, 0.03], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="absolute w-[800px] h-[800px] rounded-full bg-neon-blue/15 blur-[150px] pointer-events-none"
            />
            
            <div className="relative z-10 flex flex-col items-center gap-10">
              {/* Logo with pulsating neon blue glow */}
              <motion.img
                src="/logocompleto.png"
                alt="GamesPulse"
                className="w-64 md:w-80 lg:w-[450px] h-auto pointer-events-none"
                animate={{
                  filter: [
                    'drop-shadow(0 0 10px rgba(0,243,255,0.1))',
                    'drop-shadow(0 0 45px rgba(0,243,255,0.85))',
                    'drop-shadow(0 0 10px rgba(0,243,255,0.1))'
                  ],
                  scale: [1, 1.02, 1]
                }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              />
              
              {/* Animated Text Indicator */}
              <div className="flex flex-col items-center gap-4">
                 <motion.span 
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="text-white/60 font-bold tracking-[0.6em] text-[11px] md:text-sm font-display uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                 >
                    Caricamento Notizie
                 </motion.span>
                 
                 <div className="flex gap-2.5">
                    {[0,1,2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.8)]"
                        animate={{ opacity: [0.2, 1, 0.2], y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: 'easeInOut' }}
                      />
                    ))}
                 </div>
              </div>
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
              <div className="flex flex-col items-center justify-center h-full gap-8 px-12 text-center">
                <motion.img 
                  src="/logocompleto.png" 
                  alt="GamesPulse" 
                  className="w-32 opacity-20 grayscale brightness-50"
                  animate={{ scale: [1, 1.02, 1], opacity: [0.15, 0.2, 0.15] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                />
                <div className="space-y-2">
                  <p className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase">
                    {selectedCategory === 'favorites' ? 'NESSUNA NOTIZIA SALVATA' : 'DATABASE IN AGGIORNAMENTO'}
                  </p>
                  <p className="text-[9px] text-white/10 uppercase tracking-widest font-bold">
                    I NOSTRI TECNICI STANNO SINCRONIZZANDO LE ULTIME INFORMAZIONI
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className="px-6 py-2 rounded-full border border-white/5 text-[9px] font-bold text-neon-blue uppercase tracking-widest hover:bg-neon-blue/5 transition-all"
                >
                  {selectedCategory === 'favorites' ? 'Sfoglia tutte le notizie' : 'Torna alla Home'}
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
                      <strong className="text-white">GamesPulse</strong> è un'applicazione proprietaria gestita in collaborazione con <strong className="text-white">SmartInfo Network</strong>, responsabile del trattamento e della conservazione dei dati personali.
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
                <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">GamesPulse App © 2026 - Versione 1.0.2</p>
                
                {/* Admin Portal Gateway - Visible Trigger */}
                <div className="mt-4 flex justify-center">
                  <button 
                    onClick={() => setShowAdminLogin(true)}
                    className="group relative flex items-center gap-2 px-6 py-2 rounded-full border border-white/5 hover:border-neon-blue/40 transition-all hover:bg-neon-blue/5"
                  >
                    <Shield size={14} className="text-white/20 group-hover:text-neon-blue transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/10 group-hover:text-neon-blue transition-colors">Accesso Riservato</span>
                  </button>
                </div>
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
            className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-neon-blue/10 flex items-center justify-center mx-auto mb-4 border border-neon-blue/20">
                  <Shield size={32} className="text-neon-blue" />
                </div>
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Accesso Admin</h3>
                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-bold">GamesPulse Panel</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 ml-1">Username</label>
                  <input 
                    type="text" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-blue/50 transition-colors placeholder:text-white/10"
                    placeholder="admin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 ml-1">Password</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-blue/50 transition-colors placeholder:text-white/10"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {adminError && (
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider text-center">{adminError}</p>
                )}
                <button 
                  type="submit"
                  className="w-full bg-neon-blue hover:bg-neon-blue/80 text-black font-bold py-4 rounded-xl transition-all shadow-xl shadow-neon-blue/20 active:scale-95 uppercase tracking-widest text-xs mt-4"
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
            className="fixed inset-0 z-[600] bg-black flex flex-col items-stretch h-full overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row h-full">
              {/* Sidebar / Mobile Nav */}
              <div className="w-full lg:w-80 bg-zinc-950 border-b lg:border-r border-white/10 flex flex-col lg:h-full shrink-0 z-50">
                <div className="p-8 border-b border-white/5 bg-zinc-900/40">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white uppercase tracking-tight">GP Panel</h2>
                      <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mt-0.5">Control Center</p>
                    </div>
                  </div>
                </div>
                
                <nav className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto p-4 lg:py-8 gap-2 no-scrollbar">
                  <button 
                    onClick={() => setAdminTab('seo')}
                    className={`flex-none lg:w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl transition-all group ${adminTab === 'seo' ? 'bg-neon-blue/10 text-white border border-neon-blue/20' : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'}`}
                  >
                    <Activity size={18} className={`transition-colors ${adminTab === 'seo' ? 'text-neon-blue' : 'text-white/40'}`} />
                    <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest whitespace-nowrap">Seo</span>
                  </button>

                  <button 
                    onClick={() => setAdminTab('analytics')}
                    className={`flex-none lg:w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl transition-all group ${adminTab === 'analytics' ? 'bg-amber-600/10 text-white border border-amber-500/20' : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'}`}
                  >
                    <BarChart3 size={18} className={`transition-colors ${adminTab === 'analytics' ? 'text-amber-400' : 'text-white/40'}`} />
                    <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest whitespace-nowrap">Traffic</span>
                  </button>

                  <button 
                    onClick={() => setAdminTab('sources')}
                    className={`flex-none lg:w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl transition-all group ${adminTab === 'sources' ? 'bg-emerald-600/10 text-white border border-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'}`}
                  >
                    <Database size={18} className={`transition-colors ${adminTab === 'sources' ? 'text-emerald-400' : 'text-white/40'}`} />
                    <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest whitespace-nowrap">Feed</span>
                  </button>

                  <button 
                    onClick={() => setAdminTab('adsense')}
                    className={`flex-none lg:w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl transition-all group ${adminTab === 'adsense' ? 'bg-neon-blue/10 text-white border border-neon-blue/20' : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'}`}
                  >
                    <Cpu size={18} className={`transition-colors ${adminTab === 'adsense' ? 'text-neon-blue' : 'text-white/40'}`} />
                    <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest whitespace-nowrap">Adsense</span>
                  </button>
                </nav>

                <div className="p-4 lg:p-6 border-t border-white/5 bg-zinc-900/20 grid grid-cols-2 lg:grid-cols-1 gap-2">
                  <button 
                    onClick={saveAllConfigs}
                    className="flex items-center justify-center gap-2 py-3 lg:py-4 rounded-xl lg:rounded-2xl bg-neon-blue text-black hover:bg-neon-blue/80 transition-all text-[9px] lg:text-[10px] font-black uppercase tracking-widest"
                  >
                    <Save size={12} /> <span className="hidden lg:inline">Salva Tutto</span> Cloud
                  </button>
                  <button 
                    onClick={() => { setIsAdminLoggedIn(false); setShowAdminDashboard(false); }}
                    className="flex items-center justify-center gap-2 py-3 lg:py-4 rounded-xl lg:rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] lg:text-xs font-black uppercase tracking-widest"
                  >
                    <LogOut size={12} /> Esci
                  </button>
                </div>
              </div>

              {/* Main Workspace */}
              <div className="flex-1 overflow-y-auto bg-black p-6 md:p-12">
                <div className="max-w-6xl mx-auto">
                  
                  {/* Tab: SEO & Metadata */}
                  {adminTab === 'seo' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <header className="mb-8 lg:mb-16 pb-6 lg:pb-8 border-b border-white/5">
                        <h1 className="text-2xl lg:text-4xl font-black text-white uppercase tracking-tighter">Seo Control</h1>
                        <p className="text-white/40 mt-1 uppercase tracking-[0.3em] text-[10px] font-bold">Gestione metadati categorie</p>
                      </header>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {CATEGORIES.map(cat => {
                          const config = seoConfigs[cat.id] || { title: '', description: '', keywords: '', adsense: '' };
                          return (
                            <div key={cat.id} className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 hover:border-neon-blue/20 transition-all">
                              <div className="flex items-center gap-5 mb-10">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white border border-white/5`} style={{ backgroundColor: `${cat.color}20` }}>
                                  {cat.icon}
                                </div>
                                <div>
                                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">{cat.label} Optimization</h3>
                                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mt-1">/{cat.id} metadata intel</p>
                                </div>
                              </div>
                              <div className="space-y-6">
                                <div>
                                  <label className="block text-[10px] text-white/20 uppercase tracking-widest font-black mb-2">Meta Title</label>
                                  <input 
                                    type="text" 
                                    value={config.title || ''} 
                                    onChange={(e) => setSeoConfigs(prev => ({ ...prev, [cat.id]: { ...config, title: e.target.value }}))}
                                    onBlur={(e) => saveSeoConfig(cat.id, { ...config, title: e.target.value })} 
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-white/20 uppercase tracking-widest font-black mb-2">Description</label>
                                  <textarea 
                                    rows={2} 
                                    value={config.description || ''} 
                                    onChange={(e) => setSeoConfigs(prev => ({ ...prev, [cat.id]: { ...config, description: e.target.value }}))}
                                    onBlur={(e) => saveSeoConfig(cat.id, { ...config, description: e.target.value })} 
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30 resize-none" 
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] text-white/20 uppercase tracking-widest font-black mb-2">AdSense Script</label>
                                    <input 
                                      type="text" 
                                      value={config.adsense || ''} 
                                      onChange={(e) => setSeoConfigs(prev => ({ ...prev, [cat.id]: { ...config, adsense: e.target.value }}))}
                                      onBlur={(e) => saveSeoConfig(cat.id, { ...config, adsense: e.target.value })} 
                                      className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-[9px] font-mono text-neon-blue" 
                                      placeholder="<script...>" 
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-white/20 uppercase tracking-widest font-black mb-2">Stato Sync</label>
                                    <div className="h-[46px] flex items-center px-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                      {isSavingSeo ? "Salvataggio..." : "Live Sync OK"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Tab: Sources RSS */}
                  {adminTab === 'sources' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <header className="mb-8 pb-6 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                          <h1 className="text-2xl lg:text-4xl font-black text-white uppercase tracking-tighter">Feed Management</h1>
                          <p className="text-white/40 mt-1 uppercase tracking-[0.3em] text-[10px] font-bold">Configurazione flussi Gaming</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 lg:px-6 lg:py-3 rounded-xl lg:rounded-2xl flex items-center gap-2 lg:gap-3">
                            <Database size={14} className="text-emerald-400" />
                            <span className="text-[10px] lg:text-xs font-black text-white uppercase tracking-widest">{newsSources.length} Feed</span>
                          </div>
                          <button 
                            onClick={() => {
                              const anyInactive = newsSources.some(s => s.active === false);
                              handleToggleAll(anyInactive);
                            }}
                            className="bg-white/5 border border-white/10 px-4 py-2 lg:px-6 lg:py-3 rounded-xl lg:rounded-2xl flex items-center gap-2 lg:gap-3 hover:bg-white/10 transition-all group"
                          >
                            <CheckCircle2 size={14} className={`transition-transform group-hover:scale-110 ${newsSources.every(s => s.active !== false) ? 'text-neon-blue' : 'text-white/40'}`} />
                            <span className="text-[10px] lg:text-xs font-black text-white uppercase tracking-widest">
                              {newsSources.every(s => s.active !== false) ? 'OFF ALL' : 'ON ALL'}
                            </span>
                          </button>
                        </div>
                      </header>

                      {/* Add Source Form */}
                      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl lg:rounded-3xl p-5 lg:p-8 mb-8 lg:mb-12 shadow-2xl">
                        <div className="flex items-center gap-4 mb-6 lg:mb-8">
                          <Plus size={18} className="text-neon-blue" />
                          <h3 className="text-xs lg:text-sm font-black text-white uppercase tracking-widest">Integra Nuova Fonte</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 lg:gap-6">
                          <div>
                            <label className="block text-[9px] lg:text-[10px] text-white/20 uppercase tracking-widest font-black mb-2 ml-1">Nome</label>
                            <input value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} type="text" placeholder="Es. IGN IT" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 lg:px-5 lg:py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30" />
                          </div>
                          <div>
                             <label className="block text-[9px] lg:text-[10px] text-white/20 uppercase tracking-widest font-black mb-2 ml-1">URL RSS</label>
                             <input value={newSource.url} onChange={e => setNewSource({...newSource, url: e.target.value})} type="url" placeholder="https://..." className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 lg:px-5 lg:py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30" />
                          </div>
                          <div>
                            <label className="block text-[9px] lg:text-[10px] text-white/20 uppercase tracking-widest font-black mb-2 ml-1">Categoria</label>
                            <select value={newSource.cat} onChange={e => setNewSource({...newSource, cat: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 lg:px-5 lg:py-4 text-xs text-white focus:outline-none focus:border-neon-blue/30 appearance-none">
                              {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'favorites').map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={addSource} 
                          className="mt-6 lg:mt-8 w-full bg-neon-blue hover:bg-neon-blue/80 text-black font-black py-4 lg:py-5 rounded-xl lg:rounded-2xl transition-all uppercase tracking-widest text-[10px] lg:text-[11px] shadow-xl shadow-neon-blue/20"
                        >
                          Aggiungi Fonte
                        </button>
                      </div>

                      {/* Category Menu Selector */}
                      <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto no-scrollbar pb-2">
                        {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'favorites').map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setFeedCategoryFilter(cat.label)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest ${
                              feedCategoryFilter === cat.label 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                              : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span className="opacity-50 group-hover:opacity-100">{cat.icon}</span>
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Sources List Grouped by Category */}
                      <div className="space-y-12">
                        {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'favorites' && c.label === feedCategoryFilter).map(cat => {
                          const catSources = newsSources.filter(s => s.cat === cat.label);
                          return (
                            <div key={cat.id} className="relative">
                              <div className="flex items-center gap-4 mb-6 pt-6 border-t border-white/5">
                                <div className={`w-12 h-12 rounded-2xl bg-opacity-10 border border-white/10 flex items-center justify-center text-white`} style={{ backgroundColor: `${cat.color}20` }}>
                                  {cat.icon}
                                </div>
                                <div>
                                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">{cat.label} Stream</h3>
                                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{catSources.filter(s => s.active !== false).length}/{catSources.length} Fonti Configurate</p>
                                </div>
                                <div className="h-px bg-white/5 flex-1 mx-6" />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const allActive = catSources.every(s => s.active !== false);
                                    handleToggleAll(!allActive, cat.label);
                                  }}
                                  className="text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all"
                                >
                                  {catSources.every(s => s.active !== false) ? 'Disattiva Area' : 'Attiva Tutto'}
                                </button>
                              </div>

                              {catSources.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                                   <Database size={40} className="text-white/5 mb-4" />
                                   <p className="text-xs font-black text-white/20 uppercase">Nessuna fonte caricata per {cat.label}</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {catSources.map(source => (
                                    <div 
                                      key={source.id} 
                                      className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 group transition-all hover:bg-zinc-900/60"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                           <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${source.active !== false ? 'bg-emerald-500' : 'bg-red-500 opacity-20'}`} />
                                           <div className="min-w-0">
                                              <p className={`font-black text-sm uppercase tracking-tight truncate ${source.active !== false ? 'text-white' : 'text-white/20'}`}>{source.name}</p>
                                              <p className="text-[10px] text-zinc-500 mt-1 font-mono truncate">{source.url}</p>
                                           </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                           <button 
                                              type="button"
                                              onClick={() => handleToggleSource(source.id)}
                                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                source.active !== false 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-white/5 text-white/30 border-white/5'
                                              }`}
                                            >
                                              {source.active !== false ? 'On' : 'Off'}
                                            </button>
                                            <button 
                                              onClick={() => confirmDelete(source.id, source.name)} 
                                              className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                      {/* Tab: Traffic (Analytics) */}
                  {adminTab === 'analytics' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <header className="mb-16 pb-8 border-b border-white/5">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Traffic Logic</h1>
                        <p className="text-white/40 mt-2 uppercase tracking-[0.3em] text-[10px] font-bold">Monitoraggio real-time e statistiche d'archivio</p>
                      </header>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {[
                          { label: 'Visite Oggi', value: trafficStats.totalVisits || '0', trend: '+12%', icon: <Users size={16} />, color: 'text-emerald-400' },
                          { label: 'Utenti Live', value: trafficStats.activeNow || '0', trend: 'Live', icon: <Activity size={16} />, color: 'text-rose-500' },
                          { label: 'Tempo Medio', value: trafficStats.averageSession || '0', trend: '+5%', icon: <Clock size={16} />, color: 'text-amber-400' },
                          { label: 'Bounce Rate', value: trafficStats.bounceRate || '0', trend: '-2%', icon: <TrendingUp size={16} />, color: 'text-neon-blue' },
                        ].map((stat, i) => (
                          <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className={`p-2 rounded-xl bg-white/5 ${stat.color}`}>{stat.icon}</div>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded bg-white/5 ${stat.trend === 'Live' ? 'text-rose-500 animate-pulse' : (stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400')}`}>
                                {stat.trend}
                              </span>
                            </div>
                            <h4 className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1 relative z-10">{stat.label}</h4>
                            <p className="text-2xl font-black text-white tracking-tighter relative z-10">{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Main Chart Section */}
                      <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 mb-12">
                        <div className="flex items-center justify-between mb-10">
                          <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Analisi Ingressi 7gg</h3>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mt-1">Dati storici elaborati dal db</p>
                          </div>
                          <div className="flex gap-2">
                             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                               <div className="w-2 h-2 rounded-full bg-emerald-500" />
                               <span className="text-[9px] font-black text-white uppercase">Mobile</span>
                             </div>
                             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-blue/10 border border-neon-blue/20">
                               <div className="w-2 h-2 rounded-full bg-neon-blue" />
                               <span className="text-[9px] font-black text-white uppercase">Desktop</span>
                             </div>
                          </div>
                        </div>

                        {/* Custom SVG Chart (Conceptual) */}
                        <div className="relative h-64 w-full flex items-end justify-between px-4 pb-4">
                          {(trafficStats.chartData || [40, 65, 45, 90, 75, 55, 85]).map((d: any, i: number) => {
                            const desktopH = typeof d === 'object' ? d.desktop : d;
                            const mobileH = typeof d === 'object' ? d.mobile : d * 0.7;
                            const label = typeof d === 'object' ? d.label : `D${i+1}`;
                            return (
                              <div key={i} className="flex flex-col items-center gap-4 w-12 group">
                                <div className="relative w-4 h-48 flex items-end gap-1">
                                  <motion.div 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${desktopH}%` }}
                                    className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-full relative shadow-[0_0_10px_rgba(52,211,153,0.1)] group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all"
                                  />
                                  <motion.div 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${mobileH}%` }}
                                    className="w-full bg-gradient-to-t from-neon-blue/60 to-neon-blue rounded-t-full opacity-30 absolute left-2 group-hover:opacity-60 transition-all"
                                  />
                                </div>
                                <span className="text-[9px] font-black text-white/10 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
                              </div>
                            );
                          })}
                          
                          {/* Y-Axis labels */}
                          <div className="absolute left-0 h-full flex flex-col justify-between text-[8px] font-black text-white/[0.05] py-4 pointer-events-none">
                            <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span>
                          </div>
                        </div>
                      </div>

                      {/* Google Connectivity Hub */}
                      <div className="bg-zinc-900/40 border border-neon-blue/20 rounded-3xl p-6 lg:p-10 mb-12 shadow-[0_0_40px_rgba(0,243,255,0.02)]">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 text-left">
                          <div className="flex items-center gap-6 text-left">
                            <div className="w-16 h-16 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue shadow-[0_0_30px_rgba(0,243,255,0.05)]">
                              <Globe size={32} />
                            </div>
                            <div className="text-left">
                               <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Google Connectivity Hub</h3>
                               <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-black mt-1">Stato verifica proprietà e indicizzazione</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                              {analyticsConfig.enabled ? <ShieldCheck size={14} /> : <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                              {analyticsConfig.enabled ? 'Proprietà Pronta' : 'Monitoraggio Disattivato'}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 text-left">
                           <div className="space-y-8 text-left">
                              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 lg:p-8 text-left">
                                <h4 className="text-[10px] text-white/20 uppercase tracking-widest font-black mb-6">Search Console (GSC)</h4>
                                <div className="space-y-4">
                                  <label className="block text-[9px] text-white/40 uppercase tracking-widest font-black ml-1">Meta Tag di Verifica</label>
                                  <input 
                                    value={analyticsConfig.verificationTag || ''}
                                    onChange={e => setAnalyticsConfig({...analyticsConfig, verificationTag: e.target.value})}
                                    placeholder="gDuVjhcBFsTnVD9P1m9vh-K..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-neon-blue font-mono focus:outline-none focus:border-neon-blue shadow-inner"
                                  />
                                  <p className="text-[9px] text-white/20 uppercase font-bold italic">Questo tag verrà iniettato automaticamente nell'header HTML.</p>
                                </div>
                              </div>

                              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 lg:p-8 text-left">
                                <h4 className="text-[10px] text-white/20 uppercase tracking-widest font-black mb-6">Google Analytics (GA4)</h4>
                                <div className="space-y-4 text-left">
                                  <label className="block text-[9px] text-white/40 uppercase tracking-widest font-black ml-1">Universal o Measurement ID</label>
                                  <input 
                                    value={analyticsConfig.trackingId || ''}
                                    onChange={e => setAnalyticsConfig({...analyticsConfig, trackingId: e.target.value})}
                                    placeholder="G-XXXXXXXXXX"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-neon-blue font-mono"
                                  />
                                </div>
                                <div className="mt-6 flex items-center justify-between p-4 bg-zinc-900/40 rounded-xl border border-white/5">
                                   <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">Attiva Tracciamento</span>
                                   <button 
                                      onClick={() => setAnalyticsConfig({...analyticsConfig, enabled: !analyticsConfig.enabled})}
                                      className={`w-12 h-6 rounded-full transition-all relative ${analyticsConfig.enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                                   >
                                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${analyticsConfig.enabled ? 'right-1' : 'left-1'}`} />
                                   </button>
                                </div>
                              </div>
                           </div>

                           <div className="bg-neon-blue/5 border border-neon-blue/10 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Globe size={120} className="text-neon-blue" />
                              </div>
                              <div className="w-20 h-20 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue mb-8 animate-pulse shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                                <ShieldCheck size={40} />
                              </div>
                              <h4 className="text-xl font-black text-white uppercase tracking-widest mb-4">Sito pronto per Google</h4>
                              <p className="text-xs text-white/40 leading-relaxed max-w-sm mb-10">
                                La configurazione di indicizzazione è stata ottimizzata. Assicurati che il codice di verifica inserito a sinistra corrisponda a quello fornito da Search Console.
                              </p>
                              <button 
                                onClick={async () => {
                                  setIsSavingAdsense(true);
                                  try {
                                    // Semplifichiamo il riferimento al doc per evitare errori di trigger
                                    const anaRef = doc(db, 'admin_configs', 'analytics');
                                    await setDoc(anaRef, analyticsConfig, { merge: true });
                                    setSaveStatus({ type: 'success', message: 'Configurazione Google Sincronizzata!' });
                                  } catch (e: any) {
                                    console.error('Save error:', e);
                                    setSaveStatus({ type: 'error', message: `Errore DB: ${e.message}` });
                                  } finally {
                                    setIsSavingAdsense(false);
                                  }
                                }}
                                disabled={isSavingAdsense}
                                className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${isSavingAdsense ? 'bg-zinc-800 text-white/30 cursor-not-allowed' : 'bg-neon-blue text-black hover:scale-[1.02] shadow-xl shadow-neon-blue/20 hover:shadow-neon-blue/40'}`}
                              >
                                {isSavingAdsense ? 'Sincronizzazione...' : 'Conferma e Salva su Database'}
                              </button>
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Tab: AdSense */}
                  {adminTab === 'adsense' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      {/* Revenue Monitor Dashboard */}
                      <header className="mb-10 pb-8 border-b border-white/5">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Revenue Monitor</h1>
                        <p className="text-white/40 mt-2 uppercase tracking-[0.3em] text-[10px] font-bold">Monitoraggio proventi pubblicità in tempo reale</p>
                      </header>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                          { label: 'Guadagni Totali', value: `€${(adsenseConfig.stats?.totalEarnings || 0).toFixed(2)}`, icon: '💰', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                          { label: 'Click Totali', value: (adsenseConfig.stats?.totalClicks || 0).toLocaleString(), icon: '🖱️', color: 'text-neon-blue', bg: 'bg-neon-blue/10 border-neon-blue/20' },
                          { label: 'Impressioni', value: (adsenseConfig.stats?.totalImpressions || 0).toLocaleString(), icon: '👁️', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                          { label: 'CTR Medio', value: `${(adsenseConfig.stats?.avgCtr || 0).toFixed(2)}%`, icon: '📈', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                        ].map((kpi, i) => (
                          <div key={i} className={`border rounded-2xl p-5 ${kpi.bg}`}>
                            <div className="text-2xl mb-2">{kpi.icon}</div>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-black mb-1">{kpi.label}</p>
                            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
                            <p className="text-[8px] text-white/20 mt-1 uppercase">Connetti AdSense per dati live</p>
                          </div>
                        ))}
                      </div>

                      {/* Earnings Chart */}
                      <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 mb-6">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Guadagni Giornalieri</h3>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-black mt-1">Ultimi 7 giorni — €</p>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Revenue</span>
                          </div>
                        </div>
                        <div className="relative h-44 w-full flex items-end justify-between gap-2 px-2">
                          {(adsenseConfig.stats?.earnings || [0,0,0,0,0,0,0]).map((v: number, i: number) => {
                            const max = Math.max(...(adsenseConfig.stats?.earnings || [1]), 1);
                            const pct = Math.max((v / max) * 100, 4);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-[8px] text-white/40 font-black">€{v.toFixed(2)}</span>
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: `${pct}%` }}
                                  transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
                                  className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 min-h-[4px]"
                                />
                                <span className="text-[8px] text-white/20 font-black">{(adsenseConfig.stats?.labels || ['L','M','M','G','V','S','D'])[i]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Clicks & Impressions Chart */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6">
                          <h3 className="text-sm font-black text-white uppercase tracking-tighter mb-1">Click Annunci</h3>
                          <p className="text-[9px] text-white/30 uppercase tracking-widest font-black mb-6">Ultimi 7 giorni</p>
                          <div className="relative h-28 w-full flex items-end justify-between gap-1">
                            {(adsenseConfig.stats?.clicks || [0,0,0,0,0,0,0]).map((v: number, i: number) => {
                              const max = Math.max(...(adsenseConfig.stats?.clicks || [1]), 1);
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max((v/max)*100, 4)}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.07 }}
                                    className="w-full rounded-t bg-gradient-to-t from-neon-blue/80 to-neon-blue/40 min-h-[4px]"
                                  />
                                  <span className="text-[7px] text-white/20">{(adsenseConfig.stats?.labels || ['L','M','M','G','V','S','D'])[i]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6">
                          <h3 className="text-sm font-black text-white uppercase tracking-tighter mb-1">Impressioni</h3>
                          <p className="text-[9px] text-white/30 uppercase tracking-widest font-black mb-6">Visualizzazioni ad</p>
                          <div className="relative h-28 w-full flex items-end justify-between gap-1">
                            {(adsenseConfig.stats?.impressions || [0,0,0,0,0,0,0]).map((v: number, i: number) => {
                              const max = Math.max(...(adsenseConfig.stats?.impressions || [1]), 1);
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max((v/max)*100, 4)}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.07 }}
                                    className="w-full rounded-t bg-gradient-to-t from-amber-500/80 to-amber-400/40 min-h-[4px]"
                                  />
                                  <span className="text-[7px] text-white/20">{(adsenseConfig.stats?.labels || ['L','M','M','G','V','S','D'])[i]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Config Section */}
                      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
                        <header className="flex items-center gap-4 mb-8">
                          <div className="w-10 h-10 rounded-2xl bg-neon-blue/10 flex items-center justify-center">
                            <Settings size={20} className="text-neon-blue" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white uppercase tracking-tight">Configurazione AdSense</h3>
                            <p className="text-xs text-white/40">Inserisci snippet e ads.txt per attivare la monetizzazione</p>
                          </div>
                        </header>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between p-5 bg-black/40 border border-white/5 rounded-2xl">
                            <div>
                              <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">Stato Monetizzazione</p>
                              <p className={`text-sm font-bold ${adsenseConfig.enabled ? 'text-emerald-400' : 'text-white/40'}`}>
                                {adsenseConfig.enabled ? 'ADSENSE ATTIVO' : 'DISATTIVATO'}
                              </p>
                            </div>
                            <button
                              onClick={() => setAdsenseConfig({...adsenseConfig, enabled: !adsenseConfig.enabled})}
                              className={`relative w-14 h-8 rounded-full transition-all ${adsenseConfig.enabled ? 'bg-neon-blue' : 'bg-white/10'}`}
                            >
                              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${adsenseConfig.enabled ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>
                          <div>
                            <label className="block text-[10px] text-white/30 uppercase tracking-widest font-black mb-3">Snippet Codice AdSense</label>
                            <textarea 
                              rows={5}
                              value={adsenseConfig.script || ''}
                              onChange={e => setAdsenseConfig({...adsenseConfig, script: e.target.value})}
                              placeholder='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXX" crossorigin="anonymous"></script>' 
                              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white font-mono text-[10px] focus:outline-none focus:border-neon-blue/30 transition-all resize-none" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-white/30 uppercase tracking-widest font-black mb-3">ads.txt Content</label>
                            <textarea 
                              rows={3}
                              value={adsenseConfig.adsTxt || ''}
                              onChange={e => setAdsenseConfig({...adsenseConfig, adsTxt: e.target.value})}
                              placeholder='google.com, pub-XXXXXX, DIRECT, f08c47fec0942fa0' 
                              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white font-mono text-[10px] focus:outline-none focus:border-neon-blue/30 transition-all resize-none" 
                            />
                          </div>
                          <button 
                            onClick={() => saveAdSense(adsenseConfig)}
                            disabled={isSavingAdsense}
                            className={`w-full py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[11px] font-black flex items-center justify-center gap-3 ${
                              isSavingAdsense ? 'bg-zinc-800 text-white/50' : 'bg-neon-blue text-black hover:bg-neon-blue/80'
                            }`}
                          >
                            {isSavingAdsense ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            Salva Configurazione AdSense
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Status Notification */}
      <AnimatePresence>
        {saveStatus.type && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full bg-zinc-900 border border-white/10 shadow-2xl flex items-center gap-3"
          >
            <div className={`w-2 h-2 rounded-full ${saveStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">{saveStatus.message}</span>
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
