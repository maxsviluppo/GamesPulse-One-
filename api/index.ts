import express from "express";
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
    if (fs.existsSync(SOURCES_FILE)) {
      const data = fs.readFileSync(SOURCES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loading sources:", e);
  }
  
  // Default sources if file doesn't exist or is unreadable
  return [
    { "id": "gp-001", "url": "https://it.ign.com/feed.xml", "cat": "News", "name": "IGN IT", "active": true },
    { "id": "gp-002", "url": "https://multiplayer.it/feed/", "cat": "News", "name": "Multiplayer", "active": true },
    { "id": "gp-011", "url": "https://www.everyeye.it/feed/", "cat": "News", "name": "Everyeye", "active": true },
    { "id": "gp-013", "url": "https://www.pushsquare.com/feeds/latest", "cat": "PS5", "name": "Push Square", "active": true },
    { "id": "gp-014", "url": "https://www.purexbox.com/feeds/latest", "cat": "Xbox", "name": "Pure Xbox", "active": true },
    { "id": "gp-012", "url": "https://www.nintendolife.com/feeds/latest", "cat": "Switch", "name": "Nintendo Life", "active": true },
    { "id": "gp-016", "url": "https://www.theverge.com/rss/index.xml", "cat": "Tech", "name": "The Verge", "active": true }
  ];
}

// Endpoints for admin
app.get("/api/sources", (req, res) => {
  res.json(loadSources());
});

app.post("/api/sources", (req, res) => {
  try {
    const sources = req.body;
    // Only attempt to write if not in Vercel or if we're in a writable env (rare)
    if (process.env.VERCEL !== '1') {
      fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2));
    }
    lastFetchTime = 0;
    res.json({ success: true, warning: process.env.VERCEL === '1' ? 'Local saving not possible on Vercel' : undefined });
  } catch (e) {
    res.status(500).json({ error: "Failed to save sources" });
  }
});

function extractImage(item: any) {
  // 1. Enclosure
  if (item.enclosure && item.enclosure.url) {
    if (item.enclosure.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return item.enclosure.url;
  }
  
  // 2. Media Content / Thumbnail
  const mediaTags = ["media:content", "media:thumbnail", "media:group", "image", "enclosure", "thumb"];
  for (const tag of mediaTags) {
    const content = item[tag];
    if (content) {
      if (Array.isArray(content)) {
        const firstWithUrl = content.find((c: any) => {
          const url = c.$?.url || c.url || (typeof c === 'string' ? c : null);
          return url && url.match(/\.(jpg|jpeg|png|webp|gif)/i);
        });
        if (firstWithUrl) return firstWithUrl.$?.url || firstWithUrl.url || (typeof firstWithUrl === 'string' ? firstWithUrl : null);
      }
      if (content.$ && content.$.url) {
        if (content.$.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content.$.url;
      }
      if (content.url && content.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content.url;
      if (typeof content === 'string' && content.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content;
    }
  }
  
  // 3. Content/Description Regex
  const content = item.content || item["content:encoded"] || item.description || "";
  const imgMatches = content.matchAll(/<img[^>]+(?:src|data-src|srcset)="([^"> ]+)"/g);
  for (const match of imgMatches) {
    const url = match[1];
    if (!url.includes('pixel') && !url.includes('analytics') && !url.includes('doubleclick') && !url.includes('spacer')) {
      return url;
    }
  }
  return null;
}

function extractVideo(item: any) {
  const content = item.content || item["content:encoded"] || item.description || "";
  if (item['yt:videoId']) return `https://www.youtube.com/embed/${item['yt:videoId']}`;
  if (item.id && item.id.startsWith('yt:video:')) return `https://www.youtube.com/embed/${item.id.replace('yt:video:', '')}`;
  const ytMatch = content.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = content.match(/https?:\/\/player\.vimeo\.com\/video\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  const mp4Match = content.match(/https?:\/\/[^"'>]+\.mp4/);
  if (mp4Match) return mp4Match[0];
  if (item["media:content"]) {
    const media = Array.isArray(item["media:content"]) ? item["media:content"] : [item["media:content"]];
    const video = media.find((m: any) => m.$ && (m.$.type?.includes('video') || m.$.medium === 'video'));
    if (video && video.$.url) return video.$.url;
  }
  return null;
}

async function fetchMetaInfo(url: string) {
  if (!url) return { image: null, video: null };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
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
    const image = $('meta[property="og:image"]').attr('content') || 
                  $('meta[name="twitter:image"]').attr('content') ||
                  $('meta[property="og:image:secure_url"]').attr('content') ||
                  $('meta[name="thumbnail"]').attr('content');
    let video = $('meta[property="og:video:url"]').attr('content') ||
                $('meta[property="og:video:secure_url"]').attr('content') ||
                $('meta[property="og:video"]').attr('content') ||
                $('meta[name="twitter:player"]').attr('content');
    if (video && (video.includes('youtube.com') || video.includes('youtu.be'))) {
      const ytId = video.match(/(?:v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
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
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(source.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          }
        });
        clearTimeout(timeoutId);
        if (!response.ok) return [];
        let xml = await response.text();
        const feed = await parser.parseString(xml);
        return feed.items.map(item => ({
          id: item.guid || item.link,
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          content: item.contentSnippet || item.content,
          source: source.name,
          image: extractImage(item),
          video: extractVideo(item),
        }));
      } catch (e) { return []; }
    });

    const results = await Promise.all(feedPromises);
    const allNews = results.flat().sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });
    
    const slicedNews = allNews.slice(0, 500);
    if (process.env.VERCEL === '1') {
      newsCache = slicedNews;
      lastFetchTime = Date.now();
      return res.json(slicedNews);
    }

    const newsToEnhance = slicedNews.filter(item => !item.image || !item.video).slice(0, 100);
    if (newsToEnhance.length > 0) {
      await Promise.all(newsToEnhance.map(async (item) => {
        const meta = await fetchMetaInfo(item.link);
        if (meta.image && !item.image) item.image = meta.image;
        if (meta.video && !item.video) item.video = meta.video;
        if (!item.image) {
          item.image = `https://picsum.photos/seed/${encodeURIComponent(item.title.substring(0, 10))}/800/450`;
        }
      }));
    }

    newsCache = slicedNews;
    lastFetchTime = Date.now();
    res.json(slicedNews);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Admin config endpoints
app.get("/api/config/:type", (req, res) => {
  const { type } = req.params;
  const filePath = path.join(DATA_DIR, `${type}_configs.json`);
  if (fs.existsSync(filePath)) res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  else res.json({});
});

app.post("/api/config/:type", (req, res) => {
  const { type } = req.params;
  const filePath = path.join(DATA_DIR, `${type}_configs.json`);
  fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

export default app;

async function startServer() {
  const PORT = 3010;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}

