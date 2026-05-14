import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.gamespulse.it";
  const today = new Date();

  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: today,
      changeFrequency: 'always',
      priority: 1.0,
    },
  ];

  const categories = ['playstation', 'xbox', 'nintendo', 'pc', 'tech', 'mobile', 'favorites'];
  for (const cat of categories) {
    routes.push({
      url: `${baseUrl}/?category=${cat}`,
      lastModified: today,
      changeFrequency: 'hourly',
      priority: 0.8,
    });
  }

  try {
    // Tentativo di lettura in tempo reale dall'API loopback per popolare i singoli permalink dinamici
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const res = await fetch(`${protocol}://${host}/api/news`, { cache: 'no-store' });
    if (res.ok) {
      const news = await res.json();
      if (Array.isArray(news)) {
        for (const item of news) {
          if (item && item.slug) {
            routes.push({
              url: `${baseUrl}/?article=${encodeURIComponent(item.slug)}`,
              lastModified: item.pubDate ? new Date(item.pubDate) : today,
              changeFrequency: 'daily',
              priority: 0.9,
            });
          }
        }
      }
    }
  } catch (e) {
    // Fallback sicuro durante la fase di build o in assenza di rete locale
  }

  return routes;
}
