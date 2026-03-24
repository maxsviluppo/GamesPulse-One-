import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Load Firebase Config for Cloud Sync
let db: any = null;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("[Firebase] initialized for backend sync");
} catch (e) {
  console.warn("[Firebase] Could not initialize sync, falling back to local files only:", e instanceof Error ? e.message : String(e));
}

const DATA_DIR = path.join(process.cwd(), ".data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const SEO_FILE = path.join(DATA_DIR, "seo_configs.json");
const SOURCES_FILE = path.join(DATA_DIR, "news_sources.json");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics_config.json");
const TRAFFIC_FILE = path.join(DATA_DIR, "traffic_stats.json");
const ADSENSE_FILE = path.join(DATA_DIR, "adsense_config.json");

// Default SEO data
const DEFAULT_SEO = {
  all: {
    title: "GamesPulse Live 2026 | Il Tuo Hub di Informazione Gaming",
    description: "GamesPulse 2026: Tutte le novità su PlayStation, Xbox, Nintendo e PC. Recensioni, anteprime e notizie in tempo reale.",
    keywords: "gaming news, videogiochi oggi, next-gen 2026, recensioni game, esports italia",
    url: "https://gamespulse.it/explore/all"
  }
};

// Default AdSense data
const DEFAULT_ADSENSE = {
  enabled: false,
  client: "",
  script: "",
  adsTxt: "",
  metaTag: ""
};

// Initialize files if missing
if (!fs.existsSync(SEO_FILE)) fs.writeFileSync(SEO_FILE, JSON.stringify(DEFAULT_SEO, null, 2));
if (!fs.existsSync(ANALYTICS_FILE)) fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ trackingId: "", enabled: true, verificationTag: "" }, null, 2));
if (!fs.existsSync(ADSENSE_FILE)) fs.writeFileSync(ADSENSE_FILE, JSON.stringify(DEFAULT_ADSENSE, null, 2));

let cachedSeo: any = null;
function getSeoConfigs() {
  if (cachedSeo) return cachedSeo;
  try { 
    cachedSeo = JSON.parse(fs.readFileSync(SEO_FILE, "utf-8")); 
    return cachedSeo;
  } catch (err) { return DEFAULT_SEO; }
}
function saveSeoConfigs(configs: any) { 
  cachedSeo = configs;
  fs.writeFileSync(SEO_FILE, JSON.stringify(configs, null, 2)); 
}

let cachedAdSense: any = null;
let cachedAnalytics: any = null;
let lastSync = 0;

async function syncCloudConfigs() {
  if (!db) return;
  const now = Date.now();
  if (now - lastSync < 60000 && cachedAdSense) return;

  try {
    const adsDoc = await getDoc(doc(db, 'configs', 'adsense'));
    if (adsDoc.exists()) cachedAdSense = adsDoc.data();
    
    const anaDoc = await getDoc(doc(db, 'configs', 'analytics'));
    if (anaDoc.exists()) cachedAnalytics = anaDoc.data();

    const seoDoc = await getDoc(doc(db, 'configs', 'seo'));
    if (seoDoc.exists()) cachedSeo = seoDoc.data();
    
    lastSync = now;
    console.log("[Cloud] All configs synced from Firestore");
  } catch (e) {
    console.warn("[Cloud] Sync failed, using local/cache fallback:", e);
  }
}

function getAnalytics() {
  if (cachedAnalytics) return cachedAnalytics;
  try { return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8")); } 
  catch (err) { return { trackingId: "", enabled: true, verificationTag: "" }; }
}
function saveAnalytics(data: any) { 
  try { fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2)); } catch(e) {}
}

function getAdSense() {
  if (cachedAdSense) return cachedAdSense;
  try { return JSON.parse(fs.readFileSync(ADSENSE_FILE, "utf-8")); } 
  catch (err) { return DEFAULT_ADSENSE; }
}
function saveAdSense(data: any) { 
  try { fs.writeFileSync(ADSENSE_FILE, JSON.stringify(data, null, 2)); } catch(e) {}
}

function getSources() {
  try { return JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8")); } catch (err) { return []; }
}
function saveSources(sources: any) { fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2)); }

let memoryTraffic = { total: 0, today: 0, lastUpdate: new Date().toDateString(), history: {} };
try {
  const data = JSON.parse(fs.readFileSync(TRAFFIC_FILE, "utf-8"));
  if (data.lastUpdate === memoryTraffic.lastUpdate) {
     memoryTraffic = data;
  } else {
     memoryTraffic = { ...data, today: 0, lastUpdate: memoryTraffic.lastUpdate };
  }
} catch (e) {}
let isTrafficDirty = false;

function recordVisit() {
  const today = new Date().toDateString();
  if (memoryTraffic.lastUpdate !== today) {
     memoryTraffic.today = 0;
     memoryTraffic.lastUpdate = today;
  }
  memoryTraffic.total += 1;
  memoryTraffic.today += 1;
  memoryTraffic.history[today] = (memoryTraffic.history[today] || 0) + 1;
  isTrafficDirty = true;
  return memoryTraffic;
}

setInterval(() => {
  if (isTrafficDirty) {
    try {
      fs.writeFileSync(TRAFFIC_FILE, JSON.stringify(memoryTraffic, null, 2));
      isTrafficDirty = false;
    } catch (e) {
      console.error("[Traffic] Failed to persist stats:", e);
    }
  }
}, 30000);

const app = express();
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail'],
      ['content:encoded', 'content:encoded'],
      ['image', 'image'],
      ['thumbnail', 'thumbnail']
    ]
  }
});

function extractImageUrl(item: any): string | null {
  if (item["media:content"]) {
    const media = Array.isArray(item["media:content"]) ? item["media:content"] : [item["media:content"]];
    const img = media.find((m: any) => m.$ && (m.$.type?.includes('image') || m.$.medium === 'image' || m.$.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)));
    if (img && img.$.url) return img.$.url;
  }
  if (item["media:thumbnail"] && item["media:thumbnail"].$ && item["media:thumbnail"].$.url) return item["media:thumbnail"].$.url;
  if (item.image && item.image.url) return item.image.url;
  if (item.thumbnail && item.thumbnail.url) return item.thumbnail.url;
  
  const content = (item["content:encoded"] || item.content || item.description || "");
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) return imgMatch[1];
  
  return null;
}

// RSS Fetching with filters logic
app.get("/api/news", async (req, res) => {
  const { url, category, source } = req.query;
  try {
    const response = await fetch(url as string, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} when fetching feed`);
    let rawXml = await response.text();
    const feed = await parser.parseString(rawXml);

    const items = feed.items.map((item) => ({
      id: item.guid || item.link || Math.random().toString(),
      title: item.title,
      url: item.link,
      summary: (item.contentSnippet || item.summary || "").substring(0, 200) + "...",
      category: category as string,
      source: source as string,
      imageUrl: extractImageUrl(item),
      time: item.pubDate ? new Date(item.pubDate).toLocaleTimeString() : new Date().toLocaleTimeString(),
      timestamp: item.pubDate ? new Date(item.pubDate).getTime() : Date.now()
    }));

    res.send(items);
  } catch (error) {
    console.error("RSS Fetch error:", error);
    res.status(500).send("Failed to fetch news feed");
  }
});

// All sources (Active only filtered on frontend, but kept here for backend Parity)
app.get("/api/admin/sources", (req, res) => res.json(getSources()));
app.post("/api/admin/sources", express.json(), (req, res) => {
  const { auth, sources } = req.body;
  if (auth?.username !== 'admin' || auth?.password !== 'accessometti') return res.status(401).send("Unauthorized");
  saveSources(sources);
  res.send("Saved");
});

app.get("/api/admin/adsense", async (req, res) => {
  await syncCloudConfigs();
  res.json(getAdSense());
});

app.post("/api/admin/adsense", express.json(), (req, res) => {
  const { auth, data } = req.body;
  if (auth?.username !== 'admin' || auth?.password !== 'accessometti') return res.status(401).send("Unauthorized");
  saveAdSense(data);
  res.send("Saved");
});

app.get("/api/admin/traffic", (req, res) => res.json(memoryTraffic));

async function start() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
  app.get("*", (req, res, next) => {
    recordVisit();
    next();
  });
  const port = 3010;
  app.listen(port, () => console.log(`GamesPulse running at http://localhost:${port}`));
}

start();
