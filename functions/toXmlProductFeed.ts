import { FeedItem } from './types';
import { escapeXml } from '../helpers/escapeXml';

const toXmlProduct = (data: FeedItem[]): string => {
  const shopItems = data.map((item) => {
    return `
  <item>
    <g:id>${escapeXml(item.id)}</g:id>
    <title>${escapeXml(item.title)}</title>
    <description>${escapeXml(item.description)}</description>
    <link>${escapeXml(item.link)}</link>
    <g:image_link>${escapeXml(item.image_link)}</g:image_link>
    <g:availability>${item.availability === 'out_of_stock' ? 'out of stock' : 'in stock'}</g:availability>
    <g:price>${escapeXml(item.price)}</g:price>
    <g:mpn>${escapeXml(item.mpn)}</g:mpn>
    <g:brand>PELLWOOD</g:brand>
  </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>Produkty | Prémiové bubenické paličky s garantovanou váhou</title>
  <link>https://pellwood.com</link>
  <description>Padesátiletá zkušenost výroby paliček, nadšení pro práci se dřevem a láska k hudbě jsou koktejlem příčin, proč jsou paličky PELLWOOD stále oblíbenější a čím dál více bubeníků se na ně může spolehnout.</description>${shopItems}
</channel>
</rss>`;
};

export default toXmlProduct;
