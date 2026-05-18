import type { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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
    {
      url: `${baseUrl}/about`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contacts`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cookie`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.5,
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

  // 1. Query Exclusive Editorials from Firestore
  try {
    const editorialsCol = collection(db, 'editorials');
    const snap = await getDocs(editorialsCol);
    snap.forEach(doc => {
      const data = doc.data();
      if (data && data.slug) {
        routes.push({
          url: `${baseUrl}/article/${data.slug}`,
          lastModified: data.pubDate ? new Date(data.pubDate) : today,
          changeFrequency: 'weekly',
          priority: 0.9,
        });
      }
    });
  } catch (firestoreErr) {
    console.error("Error populating editorials in sitemap:", firestoreErr);
  }

  // 2. Query RSS News Feed for dynamic crawlers
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || 'localhost:3015'; // Match port 3015
    const res = await fetch(`${protocol}://${host}/api/news`, { cache: 'no-store' });
    if (res.ok) {
      const news = await res.json();
      if (Array.isArray(news)) {
        for (const item of news) {
          if (item && item.slug) {
            routes.push({
              url: `${baseUrl}/article/${item.slug}`,
              lastModified: item.pubDate ? new Date(item.pubDate) : today,
              changeFrequency: 'daily',
              priority: 0.8,
            });
          }
        }
      }
    }
  } catch (e) {
    // Silent fallback
  }

  return routes;
}
