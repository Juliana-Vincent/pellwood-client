import { fetchAPI } from '../lib/strapi';
import fs from 'fs';

const BASE_URL = 'https://pellwood.com';

const buildUrl = (path: string) => {
  // Ensure clean path
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  return `  <url>\n    <loc>${url}</loc>\n  </url>`;
};

async function generateSitemap() {
  try {
    const [productsRes, archivesRes, articlesRes] = await Promise.all([
      fetchAPI('products', { locale: 'cs', populate: ['localizations'] }),
      // The /kategorie/[category] route reads from the `archives` content type (which
      // has a slug), not `categories` (which doesn't) - use the same source here.
      fetchAPI('archives', { locale: 'cs', populate: ['localizations'] }),
      fetchAPI('articles', { locale: 'cs', populate: ['localizations', 'category', 'localizations.category'] })
    ]);

    const products = productsRes.data || [];
    const archives = archivesRes.data || [];
    const articles = articlesRes.data || [];

    const urls: string[] = [
      buildUrl('/'),
      buildUrl('/en'),
      buildUrl('/produkty'),
      buildUrl('/en/produkty')
    ];

    for (const p of products) {
      urls.push(buildUrl(`/produkt/${p.slug}`));
      const enLoc = p.localizations?.find((l: any) => l.locale === 'en');
      if (enLoc?.slug) {
        urls.push(buildUrl(`/en/produkt/${enLoc.slug}`));
      }
    }

    for (const a of archives) {
      urls.push(buildUrl(`/kategorie/${a.slug}`));
      const enLoc = a.localizations?.find((l: any) => l.locale === 'en');
      if (enLoc?.slug) {
        urls.push(buildUrl(`/en/kategorie/${enLoc.slug}`));
      }
    }

    for (const a of articles) {
      const csCat = a.category?.slug || 'archive';
      urls.push(buildUrl(`/clanek/${csCat}/${a.slug}`));
      
      const enLoc = a.localizations?.find((l: any) => l.locale === 'en');
      if (enLoc?.slug) {
        const enCat = enLoc.category?.slug || 'archive';
        urls.push(buildUrl(`/en/clanek/${enCat}/${enLoc.slug}`));
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
  }
}

generateSitemap();
