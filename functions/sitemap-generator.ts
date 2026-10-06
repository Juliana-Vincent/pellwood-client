import 'dotenv/config';
import { fetchAllAPI } from '../lib/strapi';
import fs from 'fs';
import { sitemapEntry } from '../helpers/sitemap';

const BASE_URL = 'https://pellwood.com';

const buildUrl = (path: string, updatedAt?: unknown) => sitemapEntry(BASE_URL, path, updatedAt);

async function generateSitemap() {
  try {
    const [products, archives, articles, categories] = await Promise.all([
      fetchAllAPI<any>('products', { locale: 'cs', populate: ['localizations'] }),
      fetchAllAPI<any>('archives', { locale: 'cs', populate: ['localizations'] }),
      fetchAllAPI<any>('articles', { locale: 'cs', populate: ['localizations', 'category', 'localizations.category'] }),
      // Catalogue categories are their own pages now, so they belong in here -
      // as query strings they were never listed and never crawled.
      fetchAllAPI<any>('categories', { locale: 'cs', populate: ['localizations'] })
    ]);

    const urls: string[] = [
      buildUrl('/'),
      buildUrl('/en'),
      buildUrl('/produkty'),
      buildUrl('/en/produkty')
    ];

    for (const c of categories) {
      if (!c.slug) continue;
      urls.push(buildUrl(`/produkty/${c.slug}`, c.updatedAt));
      const enLoc = c.localizations?.find((l: any) => l.locale === 'en');
      if (enLoc?.slug) {
        urls.push(buildUrl(`/en/produkty/${enLoc.slug}`, enLoc.updatedAt));
      }
    }

    for (const p of products) {
      urls.push(buildUrl(`/produkt/${p.slug}`, p.updatedAt));
      const enLoc = p.localizations?.find((l: any) => l.locale === 'en');
      if (enLoc?.slug) {
        urls.push(buildUrl(`/en/produkt/${enLoc.slug}`, enLoc.updatedAt));
      }
    }

    for (const a of archives) {
      urls.push(buildUrl(`/kategorie/${a.slug}`, a.updatedAt));
      const enLoc = a.localizations?.find((l: any) => l.locale === 'en');
      if (enLoc?.slug) {
        urls.push(buildUrl(`/en/kategorie/${enLoc.slug}`, enLoc.updatedAt));
      }
    }

    for (const a of articles) {
      const csCat = a.category?.slug || 'archive';
      urls.push(buildUrl(`/clanek/${csCat}/${a.slug}`, a.updatedAt));
      
      const enLoc = a.localizations?.find((l: any) => l.locale === 'en');
      if (enLoc?.slug) {
        const enCat = enLoc.category?.slug || 'archive';
        urls.push(buildUrl(`/en/clanek/${enCat}/${enLoc.slug}`, enLoc.updatedAt));
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    const path = './public/sitemap.xml';
    fs.writeFileSync(path, xml);
    console.log(`Sitemap successfully written to --> ${path}`);

  } catch (e) {
    console.error('Error generating sitemap:', e);
    process.exitCode = 1;
  }
}

generateSitemap();
