import { FeedItem } from './types';
import { escapeXml } from '../helpers/escapeXml';

const toXmlZbozi = (data: FeedItem[]): string => {
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
    <DELIVERY_DATE>0</DELIVERY_DATE>${item.gtin ? `\n    <EAN>${item.gtin}</EAN>` : ''}
    <CATEGORYTEXT>Kultura a zábava | Volný čas | Hudebniny | Hudební nástroje | Bicí nástroje | Příslušenství pro bicí nástroje | Paličky</CATEGORYTEXT>
  </SHOPITEM>`;
  }).join('');

  return `<?xml version="1.0" encoding="utf-8"?>\n<SHOP xmlns="http://www.zbozi.cz/ns/offer/1.0">${shopItems}\n</SHOP>`;
};

export default toXmlZbozi;
