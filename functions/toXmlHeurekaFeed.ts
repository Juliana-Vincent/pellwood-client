import { FeedItem } from './types';
import { escapeXml } from '../helpers/escapeXml';

// EAN must be a real GTIN. This used to publish `mpn` - a Strapi documentId with
// its dashes stripped plus a couple of loop indices - which Heureka validates and
// rejects. PRODUCTNO is the field for a manufacturer's own part number.
const toXmlHeureka = (data: FeedItem[]): string => {
  const shopItems = data.map((item) => {
    const params = (item.parametrs || []).map(p => `
    <PARAM>
      <PARAM_NAME>${escapeXml(p.title)}</PARAM_NAME>
      <VAL>${escapeXml(p.value)}</VAL>
    </PARAM>`).join('');

    const priceNum = item.price.replace(/[^\d.,]/g, '').trim();

    return `
  <SHOPITEM>
    <ITEM_ID>${escapeXml(item.id)}</ITEM_ID>
    <PRODUCTNAME>PELLWOOD | ${escapeXml(item.title)}</PRODUCTNAME>
    <PRODUCT>PELLWOOD | ${escapeXml(item.title)}</PRODUCT>
    <DESCRIPTION>${escapeXml(item.description)}</DESCRIPTION>
    <URL>${escapeXml(item.link)}</URL>
    <IMGURL>${escapeXml(item.image_link)}</IMGURL>
    <PRICE_VAT>${priceNum}</PRICE_VAT>${params ? '\n' + params : ''}
    <MANUFACTURER>Pellwood</MANUFACTURER>
    <DELIVERY_DATE>0</DELIVERY_DATE>
    <PRODUCTNO>${escapeXml(item.mpn)}</PRODUCTNO>
    <CATEGORYTEXT>Paličky</CATEGORYTEXT>
    <CATEGORY>
      <CATEGORY_ID>1535</CATEGORY_ID>
      <CATEGORY_NAME>Paličky</CATEGORY_NAME>
      <CATEGORY_FULLNAME>Heureka.cz | Hobby | Hudební nástroje | Bicí nástroje | Paličky</CATEGORY_FULLNAME>
    </CATEGORY>
  </SHOPITEM>`;
  }).join('');

  return `<?xml version="1.0" encoding="utf-8"?>\n<SHOP>${shopItems}\n</SHOP>`;
};

export default toXmlHeureka;
