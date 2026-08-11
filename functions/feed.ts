import { fetchAPI, urlFor } from '../lib/strapi';
import fs from 'fs';
import toXmlProduct from './toXmlProductFeed';
import toXmlHeureka from './toXmlHeurekaFeed';
import toXmlZbozi from './toXmlZboziFeed';
import { FeedItem } from './types';

const feedModel = (lang: string, products: any[]): FeedItem[] => {
  const arr: FeedItem[] = [];

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const variants = prod.variants || [];

    if (variants.length > 0) {
      for (let a = 0; a < variants.length; a++) {
        arr.push({
          id: `${prod.documentId.slice(0, 10)}_${lang}${variants[a].id}_${lang}`,
          title: `${prod.title} - ${variants[a].title}`,
          description: prod.SEOdescription || '',
          parametrs: prod.parametrs || [],
          link: `https://pellwood.com/${lang === 'cz' ? '' : 'en/'}produkt/${prod.slug}?${variants[a].title.toLowerCase().replace(/\s+/g, '-')}`,
          image_link: urlFor(prod.image).url(),
          mpn: String(variants[a].id).replace(/-/g, '') + i + a,
          availability: 'in_stock',
          price: `${variants[a].price} ${lang === 'cz' ? 'CZK' : 'EUR'}`
        });
      }
    } else if (prod.price) {
      arr.push({
        id: `${prod.documentId}_${lang}`,
        title: prod.title,
        description: prod.SEOdescription || '',
        link: `https://pellwood.com/${lang === 'cz' ? '' : 'en/'}produkt/${prod.slug}`,
        image_link: urlFor(prod.image).url(),
        parametrs: prod.parametrs || [],
        availability: 'in_stock',
        mpn: prod.documentId.replace(/-/g, '') + lang + (i + 3),
        price: `${prod.price} ${lang === 'cz' ? 'CZK' : 'EUR'}`
      });
    }
  }

  return arr;
}

const generateFeed = async () => {
  try {
    const [czRes, enRes] = await Promise.all([
      fetchAPI('products', { locale: 'cs', populate: ['image', 'variants', 'parametrs'], pagination: { limit: 1000 } }),
      fetchAPI('products', { locale: 'en', populate: ['image', 'variants', 'parametrs'], pagination: { limit: 1000 } })
    ]);

    const czProducts = czRes.data || [];
    const enProducts = enRes.data || [];

    const czArr = feedModel('cz', czProducts);
    const enArr = feedModel('en', enProducts);

    fs.writeFileSync('./public/google-feed-cz.xml', toXmlProduct(czArr));
    console.log(`Xml write in --> ./public/google-feed-cz.xml`);

    fs.writeFileSync('./public/google-feed-en.xml', toXmlProduct(enArr));
    console.log(`Xml write in --> ./public/google-feed-en.xml`);

    fs.writeFileSync('./public/heureka-feed-cz.xml', toXmlHeureka(czArr));
    console.log(`Xml write in --> ./public/heureka-feed-cz.xml`);

    fs.writeFileSync('./public/zbozi-feed-cz.xml', toXmlZbozi(czArr));
    console.log(`Xml write in --> ./public/zbozi-feed-cz.xml`);

  } catch (e) {
    console.error(e);
  }
}

generateFeed();
