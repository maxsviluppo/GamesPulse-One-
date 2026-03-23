import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Parser from "rss-parser";
import cors from "cors";
import * as cheerio from "cheerio";

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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.use(cors());
app.use(express.json());

// Gaming RSS Feeds
const FEEDS = {
  // Italian
  multiplayer: "https://multiplayer.it/feed/",
  ign_it: "https://it.ign.com/feed.xml",
  everyeye: "https://www.everyeye.it/feed/",
  gamesource: "https://www.gamesource.it/feed/",
  spaziogames: "https://www.spaziogames.it/feed/",
  
  // English
  ign: "https://feeds.feedburner.com/ign/all",
  gamespot: "https://www.gamespot.com/feeds/mashup/",
  eurogamer: "https://www.eurogamer.net/feed",
  kotaku: "https://kotaku.com/rss",
  polygon: "https://www.polygon.com/rss/index.xml",
  pcgamer: "https://www.pcgamer.com/rss",
  nintendolife: "https://www.nintendolife.com/feeds/latest",
  pushsquare: "https://www.pushsquare.com/feeds/latest",
  purexbox: "https://www.purexbox.com/feeds/latest",
  gamesindustry: "https://www.gamesindustry.biz/feed",
  
  // Tech & Mobile
  theverge: "https://www.theverge.com/rss/index.xml",
  engadget: "https://www.engadget.com/rss.xml",
  androidcentral: "https://www.androidcentral.com/rss.xml",
  macrumors: "https://feeds.macrumors.com/MacRumors-All",
  hdblog: "https://www.hdblog.it/feed/",
  
  // Video Feeds
  ps_global: "https://www.youtube.com/feeds/videos.xml?channel_id=UC-2Y8L_huKU29enH8vGZ9yA",
  xbox_global: "https://www.youtube.com/feeds/videos.xml?channel_id=UCjBp_7RuDBUYbd1LegWEJ8g",
  nintendo_it: "https://www.youtube.com/feeds/videos.xml?channel_id=UC6f_u6p_GZ_vX_Z_B_6Q8sw",
  gametrailers: "https://www.youtube.com/feeds/videos.xml?channel_id=UCm4WlDgi7QAsitnybaid2vA",
  digitalfoundry: "https://www.youtube.com/feeds/videos.xml?channel_id=UC9PBzalIcEQCsiIkq36PyUA",
  multiplayer_video: "https://multiplayer.it/feed/video/",
  ign_video: "http://feeds.feedburner.com/ign/video-reviews",
  gamespot_video: "https://www.gamespot.com/feeds/video/",
};

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
      // Handle array (like media:content)
      if (Array.isArray(content)) {
        const firstWithUrl = content.find((c: any) => {
          const url = c.$?.url || c.url || (typeof c === 'string' ? c : null);
          return url && url.match(/\.(jpg|jpeg|png|webp|gif)/i);
        });
        if (firstWithUrl) return firstWithUrl.$?.url || firstWithUrl.url || (typeof firstWithUrl === 'string' ? firstWithUrl : null);
      }
      
      // Handle object with $ (attributes)
      if (content.$ && content.$.url) {
        if (content.$.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content.$.url;
      }
      
      // Handle direct url property
      if (content.url && content.url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content.url;
      
      // Handle string
      if (typeof content === 'string' && content.match(/\.(jpg|jpeg|png|webp|gif)/i)) return content;
    }
  }
  
  // 3. Content/Description Regex (Improved)
  const content = item.content || item["content:encoded"] || item.description || "";
  const imgMatches = content.matchAll(/<img[^>]+(?:src|data-src|srcset)="([^"> ]+)"/g);
  for (const match of imgMatches) {
    const url = match[1];
    // Filter out small icons or trackers
    if (!url.includes('pixel') && !url.includes('analytics') && !url.includes('doubleclick') && !url.includes('spacer')) {
      return url;
    }
  }

  return null;
}

function extractVideo(item: any) {
  const content = item.content || item["content:encoded"] || item.description || "";
  
  // YouTube RSS specific (yt:videoId)
  if (item['yt:videoId']) return `https://www.youtube.com/embed/${item['yt:videoId']}`;
  if (item.id && item.id.startsWith('yt:video:')) return `https://www.youtube.com/embed/${item.id.replace('yt:video:', '')}`;

  // YouTube Embeds in content
  const ytMatch = content.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  
  // Vimeo Embeds
  const vimeoMatch = content.match(/https?:\/\/player\.vimeo\.com\/video\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // Direct MP4
  const mp4Match = content.match(/https?:\/\/[^"'>]+\.mp4/);
  if (mp4Match) return mp4Match[0];

  // Media:content with video type
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
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds
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
                  $('meta[name="thumbnail"]').attr('content') ||
                  $('link[rel="image_src"]').attr('href') ||
                  $('link[rel="apple-touch-icon"]').attr('href') ||
                  $('meta[name="msapplication-TileImage"]').attr('content');
    
    let video = $('meta[property="og:video:url"]').attr('content') ||
                $('meta[property="og:video:secure_url"]').attr('content') ||
                $('meta[property="og:video"]').attr('content') ||
                $('meta[name="twitter:player"]').attr('content') ||
                $('meta[property="og:video:iframe"]').attr('content');

    // Handle YouTube links in meta tags
    if (video && (video.includes('youtube.com') || video.includes('youtu.be'))) {
      const ytId = video.match(/(?:v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (ytId) video = `https://www.youtube.com/embed/${ytId}`;
    }

    let finalImage = image || null;
    if (finalImage && !finalImage.startsWith('http')) {
      try {
        finalImage = new URL(finalImage, url).href;
      } catch {
        finalImage = null;
      }
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
    
    // Inject <base> tag to fix relative links and images
    const baseUrl = new URL(url).origin;
    const baseTag = `<base href="${baseUrl}/">`;
    
    // Engadget and Yahoo sites often use Next.js/React which crashes when proxied due to CORS on their internal APIs
    // We strip their scripts and Next.js data to prevent the "Application error" crash
    if (url.includes('engadget.com') || url.includes('yahoo.com') || url.includes('techcrunch.com')) {
      // Remove all scripts and Next.js specific JSON data
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<link rel="preload" as="script" [^>]*>/gi, '');
      html = html.replace(/<next-route-announcer>[\s\S]*?<\/next-route-announcer>/gi, '');
    }

    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Proxy error:", error);
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
    const feedPromises = Object.entries(FEEDS).map(async ([source, url]) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased to 8s

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          }
        });

        clearTimeout(timeoutId);
        if (!response.ok) return [];
        
        let xml = await response.text();
        xml = xml.replace(/&(?!(?:[a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
        xml = xml.replace(/<([a-zA-Z0-9:_.-]+)\s+([^>]*?)\s*>/g, (match, tagName, attrs) => {
          const sanitizedAttrs = attrs.replace(/([a-zA-Z0-9:_.-]+)(?!=)(\s|$)/g, '$1=""$2');
          return `<${tagName} ${sanitizedAttrs}>`;
        });
        xml = xml.replace(/(\s)([0-9][a-zA-Z0-9:_.-]*=)/g, '$1attr_$2');
        xml = xml.replace(/(\s[a-zA-Z0-9:_.-]+)\s*=\s*(["'])/g, '$1=$2');
        xml = xml.replace(/<(title|description|content:encoded)>([\s\S]*?)<\/\1>/g, (match, tag, content) => {
          if (content.includes('<') && !content.trim().startsWith('<![CDATA[')) {
            return `<${tag}><![CDATA[${content}]]></${tag}>`;
          }
          return match;
        });

        try {
          const feed = await parser.parseString(xml);
          return feed.items.map(item => ({
            id: item.guid || item.link,
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.contentSnippet || item.content,
            source: source.toUpperCase(),
            image: extractImage(item),
            video: extractVideo(item),
          }));
        } catch (parseError) {
          const $ = cheerio.load(xml, { xmlMode: true });
          const items: any[] = [];
          $('item, entry').each((i, el) => {
            const $el = $(el);
            const title = $el.find('title').text();
            const link = $el.find('link').attr('href') || $el.find('link').text();
            const pubDate = $el.find('pubDate, published, updated').text();
            const content = $el.find('description, content\\:encoded, summary').text();
            const guid = $el.find('guid, id').text();
            let image = null;
            
            // Try to find image in various tags
            const enclosure = $el.find('enclosure').attr('url');
            const mediaContent = $el.find('media\\:content, content').attr('url');
            const mediaThumbnail = $el.find('media\\:thumbnail, thumbnail').attr('url');
            const ogImage = $el.find('og\\:image').text();
            
            if (enclosure) image = enclosure;
            else if (mediaContent) image = mediaContent;
            else if (mediaThumbnail) image = mediaThumbnail;
            else if (ogImage) image = ogImage;
            else {
              const imgMatch = content.match(/<img[^>]+(?:src|data-src|srcset)="([^"> ]+)"/);
              if (imgMatch) image = imgMatch[1];
            }
            
            if (title && link) {
              items.push({
                id: guid || link,
                title,
                link,
                pubDate,
                content: content.replace(/<[^>]*>?/gm, '').substring(0, 200),
                source: source.toUpperCase(),
                image,
                video: extractVideo({ content }),
              });
            }
          });
          return items;
        }
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(feedPromises);
    const allNews = results.flat().sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });
    
    const slicedNews = allNews.slice(0, 500);

    // ONLINE ON VERCEL: Disable slow metadata enhancement to prevent 504 Gateway Timeout (10s limit)
    const isVercel = process.env.VERCEL === '1';
    if (isVercel) {
      // Just return what we have quickly
      newsCache = slicedNews;
      lastFetchTime = Date.now();
      return res.json(slicedNews);
    }

    // Local only deep enhancement
    const newsToEnhance = slicedNews.filter(item => !item.image || !item.video).slice(0, 100);
    if (newsToEnhance.length > 0) {
      await Promise.all(newsToEnhance.map(async (item) => {
        const meta = await fetchMetaInfo(item.link);
        if (meta.image && !item.image) {
          item.image = meta.image;
        }
        if (meta.video && !item.video) {
          item.video = meta.video;
        }
        
        // Final fallback for images if still null
        if (!item.image) {
          const keywords = ['gaming', 'videogames', 'console', 'ps5', 'xbox', 'nintendo'];
          const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
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
