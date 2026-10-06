import 'dotenv/config';
import { fetchAllAPI } from '../lib/strapi';
import fs from 'fs';
import toXmlProduct from './toXmlProductFeed';
import toXmlHeureka from './toXmlHeurekaFeed';
import toXmlZbozi from './toXmlZboziFeed';
import { feedModel, inStockOnly } from './feedModel';

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

    fs.writeFileSync('./public/heureka-feed-cz.xml', toXmlHeureka(inStockOnly(czArr)));
    console.log(`Xml write in --> ./public/heureka-feed-cz.xml`);

    fs.writeFileSync('./public/zbozi-feed-cz.xml', toXmlZbozi(inStockOnly(czArr)));
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
