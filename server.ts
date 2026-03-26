import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Parser from "rss-parser";
import cors from "cors";
import * as cheerio from "cheerio";

// Constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DATA_DIR = path.join(process.cwd(), ".data");
const SOURCES_FILE = path.join(DATA_DIR, "news_sources.json");

// Ensure .data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure news_sources.json exists with defaults if not present
if (!fs.existsSync(SOURCES_FILE)) {
  const DEFAULT_SOURCES = [
    { "id": "gp-001", "url": "https://it.ign.com/feed.xml", "cat": "News", "name": "IGN IT", "active": true },
    { "id": "gp-002", "url": "https://multiplayer.it/feed/", "cat": "News", "name": "Multiplayer", "active": true },
    { "id": "gp-003", "url": "https://www.everyeye.it/feed/", "cat": "News", "name": "Everyeye", "active": true },
    { "id": "gp-004", "url": "https://www.gamesource.it/feed/", "cat": "News", "name": "GameSource", "active": true },
    { "id": "gp-005", "url": "https://www.spaziogames.it/feed/", "cat": "News", "name": "Spaziogames", "active": true }
  ];
  fs.writeFileSync(SOURCES_FILE, JSON.stringify(DEFAULT_SOURCES, null, 2));
}

const app = express();
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail'],
      ['media:group', 'media:group'],
      ['image', 'image'],
      ['enclosure', 'enclosure'],
      ['thumb', 'thumb'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

// Cache mechanism
let newsCache: any[] = [];
let lastFetchTime = 0;

app.use(cors());
app.use(express.json());

// Helper to load sources
function loadSources() {
  try {
    const data = fs.readFileSync(SOURCES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("Error loading sources:", e);
    return [];
  }
}

// Endpoints for admin
app.get("/api/sources", (req, res) => {
  res.json(loadSources());
});

app.post("/api/sources", (req, res) => {
  try {
    const sources = req.body;
    fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2));
    lastFetchTime = 0; // Clear cache
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save sources" });
  }
});

function extractImage(item: any) {
  try {
    // 0. Specific for Gematsu - they often have nice high-res images in contentEncoded
    const isGematsu = item.link?.toLowerCase().includes('gematsu.com');
    const contentEncoded = item.contentEncoded || item.content || item.description || "";

    if (isGematsu && contentEncoded) {
       const gematsuImg = contentEncoded.match(/<img[^>]+(?:src|data-src)=["']([^"'> ]+)["']/i);
       if (gematsuImg && gematsuImg[1] && !gematsuImg[1].includes('pixel')) return gematsuImg[1];
    }

    if (item.enclosure && item.enclosure.url) {
      if (item.enclosure.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return item.enclosure.url;
    }
    const mediaTags = ["media:content", "media:thumbnail", "media:group", "image", "enclosure", "thumb"];
    for (const tag of mediaTags) {
      const content = item[tag];
      if (content) {
        if (Array.isArray(content)) {
          const firstWithUrl = content.find((c: any) => {
            const url = c.$?.url || c.url || (typeof c === 'string' ? c : null);
            return url && typeof url === 'string' && url.match(/\.(jpg|jpeg|png|webp|gif)/i);
          });
          if (firstWithUrl) return firstWithUrl.$?.url || firstWithUrl.url || (typeof firstWithUrl === 'string' ? firstWithUrl : null);
        }
        if (content.$ && content.$.url) {
          if (typeof content.$.url === 'string' && content.$.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content.$.url;
        }
        if (content.url && typeof content.url === 'string' && content.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content.url;
        if (typeof content === 'string' && content.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content;
      }
    }
    
    const imgMatches = contentEncoded.matchAll(/<img[^>]+(?:src|data-src|srcset)=["']([^"'> ]+)["']/gi);
    for (const match of imgMatches) {
      const url = match[1];
      if (!url.includes('pixel') && !url.includes('analytics') && !url.includes('doubleclick') && !url.includes('spacer')) {
        return url;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

function extractVideo(item: any) {
  try {
    const contentEncoded = item.contentEncoded || item.content || item.description || "";
    const content = contentEncoded.toLowerCase();
    
    if (item['yt:videoId']) return `https://www.youtube.com/embed/${item['yt:videoId']}`;
    if (item.id && item.id.startsWith('yt:video:')) return `https://www.youtube.com/embed/${item.id.replace('yt:video:', '')}`;
    
    // Improved YouTube regex patterns
    const ytPatterns = [
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
      /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
      /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/i,
      /https?:\/\/(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i
    ];

    for (const pattern of ytPatterns) {
      const match = contentEncoded.match(pattern);
      if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    const vimeoMatch = contentEncoded.match(/https?:\/\/vimeo\.com\/(\d+)/i) || contentEncoded.match(/player\.vimeo\.com\/video\/(\d+)/i);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    const iframeMatch = contentEncoded.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch) {
      const src = iframeMatch[1];
      if (src.includes('youtube.com') || src.includes('vimeo.com')) return src;
    }

    const videoFileMatch = contentEncoded.match(/https?:\/\/[^"'> \n]+\.(mp4|webm|ogg)/i);
    if (videoFileMatch) return videoFileMatch[0];
    
    if (item["media:content"]) {
      const media = Array.isArray(item["media:content"]) ? item["media:content"] : [item["media:content"]];
      const video = media.find((m: any) => m.$ && (m.$.type?.includes('video') || m.$.medium === 'video' || m.$.url?.match(/\.(mp4|webm|ogg)$/)));
      if (video && video.$.url) return video.$.url;
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function fetchMetaInfo(url: string) {
  if (!url) return { image: null, video: null };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 seconds timeout
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      } 
    });
    clearTimeout(timeoutId);
    if (!response.ok) return { image: null, video: null };
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let image = $('meta[property="og:image"]').attr('content') || 
                $('meta[name="twitter:image"]').attr('content') ||
                $('meta[property="og:image:secure_url"]').attr('content') ||
                $('meta[name="thumbnail"]').attr('content');
                  
    let video = $('meta[property="og:video:url"]').attr('content') ||
                $('meta[property="og:video:secure_url"]').attr('content') ||
                $('meta[property="og:video"]').attr('content') ||
                $('meta[name="twitter:player"]').attr('content');
    
    if (!video) {
        const ytEmbed = $('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').attr('src');
        if (ytEmbed) video = ytEmbed;
        else {
          const ytMatch = html.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
          if (ytMatch) video = `https://www.youtube.com/embed/${ytMatch[1]}`;
        }
    }

    if (video && (video.includes('youtube.com') || video.includes('youtu.be'))) {
      const ytId = video.match(/(?:v=|embed\/|youtu\.be\/|v\/)([a-zA-Z0-9_-]{11})/i)?.[1];
      if (ytId) video = `https://www.youtube.com/embed/${ytId}`;
    }
    
    let finalImage = image || null;
    if (finalImage && !finalImage.startsWith('http')) {
      try { finalImage = new URL(finalImage, url).href; } catch { finalImage = null; }
    }
    return { image: finalImage, video: video || null };
  } catch (e) {
    return { image: null, video: null };
  }
}

app.get("/api/proxy", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("URL is required");
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    let html = await response.text();
    const baseUrl = new URL(url).origin;
    const baseTag = `<base href="${baseUrl}/">`;
    if (url.includes('engadget.com') || url.includes('yahoo.com') || url.includes('techcrunch.com')) {
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    }
    html = html.includes("<head>") ? html.replace("<head>", `<head>${baseTag}`) : `${baseTag}${html}`;
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    res.status(500).send("Failed to load content");
  }
});

app.get("/api/news", async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();
  if (!forceRefresh && newsCache.length > 0 && (now - lastFetchTime < CACHE_DURATION)) {
    return res.json(newsCache);
  }
  try {
    const sources = loadSources().filter((s: any) => s.active !== false);
    const feedPromises = sources.map(async (source: any) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); 
      try {
        const fetchUrl = source.url + (source.url.includes('?') ? '&' : '?') + `_gp_refresh=${now}`;
        
        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Cache-Control': 'no-cache'
          }
        });
        clearTimeout(timeoutId);
        if (!response.ok) return [];
        let xml = await response.text();
        const feed = await parser.parseString(xml);
        
        return await Promise.all(feed.items.slice(0, 30).map(async (item) => {
          let image = extractImage(item);
          let video = extractVideo(item);
          
          const isGematsu = source.name.toLowerCase().includes('gematsu') || (item.link && item.link.includes('gematsu.com'));
          if ((!image || (isGematsu && !video)) && isGematsu && item.link) {
            const meta = await fetchMetaInfo(item.link);
            if (!image) image = meta.image;
            if (!video) video = meta.video;
          }

          return {
            id: item.guid || item.link || `${source.id}-${Math.random()}`,
            title: item.title,
            link: item.link,
            pubDate: item.pubDate || new Date().toISOString(),
            content: item.contentSnippet || item.content,
            source: source.name,
            category: source.cat || 'General',
            image,
            video,
          };
        }));
      } catch (e) { 
        clearTimeout(timeoutId);
        return []; 
      }
    });
    
    const results = await Promise.all(feedPromises);
    const allItems = results.flat().filter(item => item.title && item.link);
    const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const todayItems = allItems.filter(item => new Date(item.pubDate).getTime() >= todayTimestamp);
    const olderItems = allItems.filter(item => new Date(item.pubDate).getTime() < todayTimestamp);
    const shuffledToday = shuffleArray([...todayItems]);
    const sortedOlder = olderItems.sort((a, b) => {
      const dA = new Date(a.pubDate).getTime();
      const dB = new Date(b.pubDate).getTime();
      return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
    });
    const finalResult = [...shuffledToday, ...sortedOlder].slice(0, 1000);
    newsCache = finalResult;
    lastFetchTime = Date.now();
    res.json(finalResult);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Config endpoints
app.get("/api/config/:type", (req, res) => {
  const { type } = req.params;
  const pluralPath = path.join(DATA_DIR, `${type}_configs.json`);
  const singularPath = path.join(DATA_DIR, `${type}_config.json`);
  
  if (fs.existsSync(pluralPath)) {
    res.json(JSON.parse(fs.readFileSync(pluralPath, 'utf8')));
  } else if (fs.existsSync(singularPath)) {
    res.json(JSON.parse(fs.readFileSync(singularPath, 'utf8')));
  } else {
    res.json({});
  }
});

app.post("/api/config/:type", (req, res) => {
  const { type } = req.params;
  const filePath = path.join(DATA_DIR, `${type}_configs.json`);
  fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// Dynamic ads.txt route for Google AdSense
app.get("/ads.txt", (req, res) => {
  const pluralPath = path.join(DATA_DIR, "adsense_configs.json");
  const singularPath = path.join(DATA_DIR, "adsense_config.json");
  
  let adsenseData: any = {};
  if (fs.existsSync(pluralPath)) {
    adsenseData = JSON.parse(fs.readFileSync(pluralPath, 'utf8'));
  } else if (fs.existsSync(singularPath)) {
    adsenseData = JSON.parse(fs.readFileSync(singularPath, 'utf8'));
  }

  if (adsenseData && adsenseData.adsTxt) {
    res.setHeader("Content-Type", "text/plain");
    res.send(adsenseData.adsTxt);
  } else {
    // Fallback search in public folder
    const publicAdsTxt = path.join(process.cwd(), "public", "ads.txt");
    if (fs.existsSync(publicAdsTxt)) {
      res.setHeader("Content-Type", "text/plain");
      res.send(fs.readFileSync(publicAdsTxt, 'utf8'));
    } else {
      res.status(404).send("ads.txt not configured");
    }
  }
});

export default app;

async function startServer() {
  const PORT = 3010;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}

