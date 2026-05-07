import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://www.gamespulse.it';

async function generateSitemap() {
  const newsResponse = await fetch(`${BASE_URL}/api/news`);
  const news = await newsResponse.json();

  const urls = [
    { loc: '/', lastmod: new Date().toISOString().split('T')[0], priority: '1.0' },
  ];

  if (Array.isArray(news)) {
    news.forEach((item) => {
      // In a real app with routing, we would add specific URLs
      // For now, we list the main categories as well
      ['playstation', 'xbox', 'nintendo', 'pc', 'tech', 'mobile'].forEach(cat => {
        urls.push({ loc: `/?category=${cat}`, lastmod: new Date().toISOString().split('T')[0], priority: '0.8' });
      });
    });
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
  <url>
    <loc>${BASE_URL}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <priority>${url.priority}</priority>
  </url>`).join('')}
</urlset>`;

  fs.writeFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), sitemap);
  console.log('Sitemap generated successfully!');
}

generateSitemap().catch(console.error);
