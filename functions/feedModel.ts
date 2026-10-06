import crypto from 'crypto';
import { urlFor } from '../lib/strapi';
import { FeedItem } from './types';
import { feedPrice, slugify } from '../helpers/feedPrice';
import { parsePrice } from './parsePrice';

/**
 * Short, stable identifier for a variant: same product and same variant title,
 * same id, however often the product is edited.
 *
 * The id used to include the variant's Strapi row id. Strapi 5 deletes and
 * recreates a product's components every time it is published, so any price
 * edit gave every variant a new id - and Heureka, Zbozi and Google saw brand-new
 * products and dropped their history. Hashed rather than spelled out to stay
 * inside Heureka's 36-character ITEM_ID limit.
 */
const variantKey = (title: string): string =>
  crypto.createHash('sha1').update(String(title)).digest('hex').slice(0, 8);

export const feedModel = (lang: string, products: any[]): FeedItem[] => {
  const arr: FeedItem[] = [];

  for (const prod of products) {
    const variants = prod.variants || [];

    if (variants.length > 0) {
      for (const variant of variants) {
        // An unpriced variant cannot be bought (the product page hides it), but it
        // was exported at 0.00 - a free product on every comparison site.
        if (!(parsePrice(variant.price) > 0)) continue;

        arr.push({
          id: `${prod.documentId.slice(0, 10)}_${lang}_${variantKey(variant.title)}`,
          title: `${prod.title} - ${variant.title}`,
          description: prod.SEOdescription || '',
          parametrs: prod.parametrs || [],
          link: `https://pellwood.com/${lang === 'cz' ? '' : 'en/'}produkt/${prod.slug}?variant=${slugify(variant.title)}`,
          image_link: urlFor(prod.image).url(),
          // Derived from the product and variant, not from loop indices - an
          // index-based identifier changed whenever product ordering changed in
          // Strapi, so the comparison sites saw every item as brand new each time
          // and lost its pairing history.
          mpn: `${prod.documentId}-${slugify(variant.title)}`,
          // Was 'in_stock' for everything, whatever the variant said.
          availability: variant.inStock === false ? 'out_of_stock' : 'in_stock',
          price: feedPrice(variant.price, lang),
        });
      }
    } else if (parsePrice(prod.price) > 0) {
      arr.push({
        id: `${prod.documentId}_${lang}`,
        title: prod.title,
        description: prod.SEOdescription || '',
        link: `https://pellwood.com/${lang === 'cz' ? '' : 'en/'}produkt/${prod.slug}`,
        image_link: urlFor(prod.image).url(),
        parametrs: prod.parametrs || [],
        availability: 'in_stock',
        mpn: prod.documentId,
        price: feedPrice(prod.price, lang),
      });
    }
  }

  return arr;
};

/**
 * Heureka and Zbozi have no "out of stock" value - DELIVERY_DATE 0 means
 * "available now" - so an unavailable item is left out of those feeds. Google's
 * feed keeps it and says out of stock, which is what Merchant Center expects.
 */
export const inStockOnly = (items: FeedItem[]): FeedItem[] =>
  items.filter((item) => item.availability === 'in_stock');
