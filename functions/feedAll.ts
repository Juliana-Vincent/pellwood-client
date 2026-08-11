import { fetchAPI, urlFor } from '../lib/strapi';
import fs from 'fs';
import toXml from './toAllData';
import { FeedItem } from './types';

function toPlainText(blocks: any[] | string = []): string {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';
  return blocks.map(block => {
    if (block.children && Array.isArray(block.children)) {
      return block.children.map((child: any) => child.text || '').join('');
    }
    return '';
  }).join('\n\n');
}

const feedModel = (products: any[]): FeedItem[] => {
  const arr: FeedItem[] = [];

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const variants = prod.variants || [];
    const categoryName = prod.category?.title || prod.category?.name || '';
    const textContent = toPlainText(prod.text);

    if (variants.length > 0) {
      for (let a = 0; a < variants.length; a++) {
        arr.push({
          id: `${prod.documentId.slice(0, 10)}_cz${variants[a].id}_cz`,
          title: `${prod.title} - ${variants[a].title}`,
          description: prod.SEOdescription || '',
          titleHead: prod.title || '',
          parametrs: prod.parametrs || [],
          text: textContent,
          link: `https://pellwood.com/produkt/${prod.slug}?${variants[a].title.toLowerCase().replace(/\\s+/g, '-')}`,
          image_link: urlFor(prod.image).url(),
          mpn: String(variants[a].id).replace(/-/g, '') + i + a,
          availability: 'in_stock',
          price: `${variants[a].price} CZK`,
          category: categoryName,
          orientedImage: prod.orientedImage ? urlFor(prod.orientedImage).url() : ''
        });
      }
    } else if (prod.price) {
      arr.push({
        id: `${prod.documentId}_${i}`,
        title: prod.title,
        description: prod.SEOdescription || '',
        titleHead: prod.title || '',
        parametrs: prod.parametrs || [],
        text: textContent,
        link: `https://pellwood.com/produkt/${prod.slug}`,
        image_link: urlFor(prod.image).url(),
        mpn: prod.documentId.replace(/-/g, '') + (i + 3),
        availability: 'in_stock',
        price: `${prod.price} CZK`,
        category: categoryName,
        orientedImage: prod.orientedImage ? urlFor(prod.orientedImage).url() : ''
      });
    }
  }

  return arr;
}

const generateSitemap = async () => {
  try {
    const res = await fetchAPI('products', { 
      locale: 'cs', 
      populate: ['image', 'orientedImage', 'variants', 'parametrs', 'category'], 
      pagination: { limit: 1000 } 
    });

    const products = res.data || [];
    const czProducts = feedModel(products);

    const resultXml = toXml(czProducts);
    const path = './public/all-products.xml';

    fs.writeFileSync(path, resultXml);
    console.log(`Xml write in --> ${path}`);

  } catch (e) {
    console.error(e);
  }
}

generateSitemap();
