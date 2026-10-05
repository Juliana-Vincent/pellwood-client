import 'dotenv/config';
import { fetchAllAPI, urlFor } from '../lib/strapi';
import fs from 'fs';
import toXmlProduct from './toXmlProductFeed';
import toXmlHeureka from './toXmlHeurekaFeed';
import toXmlZbozi from './toXmlZboziFeed';
import { FeedItem } from './types';
import { feedPrice, slugify } from '../helpers/feedPrice';

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
          link: `https://pellwood.com/${lang === 'cz' ? '' : 'en/'}produkt/${prod.slug}?variant=${slugify(variants[a].title)}`,
          image_link: urlFor(prod.image).url(),
          // Derived from the product and variant, not from loop indices - an
          // index-based identifier changed whenever product ordering changed in
          // Strapi, so the comparison sites saw every item as brand new each time
          // and lost its pairing history.
          mpn: `${prod.documentId}-${slugify(variants[a].title)}`,
          availability: 'in_stock',
          price: feedPrice(variants[a].price, lang)
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
        mpn: prod.documentId,
        price: feedPrice(prod.price, lang)
      });
    }
  }

  return arr;
}

const generateFeed = async () => {
  try {
    const [czProducts, enProducts] = await Promise.all([
      fetchAllAPI<any>('products', { locale: 'cs', populate: ['image', 'variants', 'parametrs'] }),
      fetchAllAPI<any>('products', { locale: 'en', populate: ['image', 'variants', 'parametrs'] })
    ]);

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
    // Must not exit 0. postbuild chains sitemap && feed && robots, so swallowing
    // this left robots.txt advertising a sitemap that may not exist and shipped
    // stale (or missing) feeds while the deploy reported success.
    console.error('Error generating feeds:', e);
    process.exitCode = 1;
  }
}

generateFeed();
