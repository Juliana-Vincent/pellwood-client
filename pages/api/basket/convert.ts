import type { NextApiRequest, NextApiResponse } from "next";
import { fetchAPI } from "@/lib/strapi";
import { parsePrice } from "@/functions/parsePrice";
import { convertPrice, fetchRate, otherLang, priceOf, strapiLocale, type Lang } from "@/functions/exchangeRate";

/**
 * Re-prices a basket into the other language's catalogue.
 *
 * Prices are set per locale in Strapi, so the same product's price in the target
 * locale is used. A product that exists in one locale only is priced from that
 * locale through Setting -> eurCzkRate (the same conversion validateOrder uses).
 * In Strapi 5 a document keeps one documentId across locales.
 */
const MAX_ITEMS = 100;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { items, fromLang, toLang } = req.body as {
      items?: any[];
      fromLang?: string;
      toLang?: string;
    };

    if (!Array.isArray(items) || !items.length) {
      return res.status(200).json({ items: [], dropped: [] });
    }
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ msg: "Too many items" });
    }
    if (fromLang !== "cz" && fromLang !== "en") {
      return res.status(400).json({ msg: "Invalid fromLang" });
    }
    if (toLang !== "cz" && toLang !== "en") {
      return res.status(400).json({ msg: "Invalid toLang" });
    }

    const to = toLang as Lang;
    const other = otherLang(to);
    const ids = [...new Set(items.map((item) => item.id).filter(Boolean))];

    const fetchLocale = (lang: Lang) =>
      fetchAPI("products", {
        locale: strapiLocale(lang),
        filters: { documentId: { $in: ids } },
        populate: { variants: true },
        pagination: { pageSize: MAX_ITEMS },
      }).then((r) => new Map(((r.data as any[]) || []).map((p) => [p.documentId, p])));

    const [targetById, otherById, rate] = await Promise.all([
      fetchLocale(to),
      fetchLocale(other),
      fetchRate(),
    ]);
    const sourceById = fromLang === toLang ? targetById : otherById;

    const converted: any[] = [];
    const dropped: string[] = [];

    for (const item of items) {
      const target = targetById.get(item.id);

      if (!target) {
        // Only in the other locale (seven Czech-only products): its own price,
        // converted. Without a rate it stays greyed out and is not orderable.
        const only = otherById.get(item.id);
        const priced = only && rate ? priceOf(only, item.variantName) : null;
        const unitPrice = priced ? convertPrice(priced.price, other, to, rate) : 0;
        if (!priced || !(unitPrice > 0)) {
          dropped.push(item.nameProduct || item.id);
          converted.push({ ...item, unavailable: true });
          continue;
        }
        converted.push({
          ...item,
          nameProduct: only.title,
          variantName: priced.variantName,
          variantPrice: unitPrice,
          unavailable: false,
        });
        continue;
      }

      let variantName = item.variantName;
      let unitPrice: number;

      if (target.variants?.length) {
        // Variant titles are translated, so matching by title alone fails across
        // locales. Fall back to the position of the variant in the source
        // product, which is how the editor keeps the two lists aligned.
        let variant = target.variants.find((v: any) => v.title === item.variantName);

        if (!variant) {
          const source = sourceById.get(item.id);
          const index = source?.variants?.findIndex(
            (v: any) => v.title === item.variantName,
          );
          if (index !== undefined && index >= 0) variant = target.variants[index];
        }

        // Out of stock counts as unavailable, the same rule the order API applies -
        // otherwise checkout would show a line it is about to refuse.
        if (!variant?.price || variant.inStock === false) {
          dropped.push(item.nameProduct || item.id);
          converted.push({ ...item, unavailable: true });
          continue;
        }

        variantName = variant.title;
        unitPrice = parsePrice(variant.price);
      } else {
        // A product with no variants is bought at its own price, and the basket
        // line is named after the product.
        variantName = target.title;
        unitPrice = parsePrice(target.price);
      }

      if (!(unitPrice > 0)) {
        dropped.push(item.nameProduct || item.id);
        converted.push({ ...item, unavailable: true });
        continue;
      }

      // `unavailable` is cleared here, so switching back to a language that does
      // have the product restores it to a normal line.
      converted.push({
        ...item,
        nameProduct: target.title,
        variantName,
        variantPrice: unitPrice,
        unavailable: false,
      });
    }

    return res.status(200).json({ items: converted, dropped });
  } catch (err) {
    console.error("basket.convert error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
}
