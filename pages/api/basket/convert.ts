import type { NextApiRequest, NextApiResponse } from "next";
import { fetchAPI } from "@/lib/strapi";
import { parsePrice } from "@/functions/parsePrice";

/**
 * Re-prices a basket into the other language's catalogue.
 *
 * There is no exchange rate anywhere in this system: Czech and English prices are
 * set independently per product in Strapi. So "convert to EUR" means looking up
 * the same product's price in the other locale - which is also the price the
 * server will actually charge, so the basket cannot show one number and the order
 * be computed from another.
 *
 * In Strapi 5 a document keeps one documentId across locales, so the same ids
 * fetch both versions.
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

    const strapiLocale = (l: string) => (l === "cz" ? "cs" : l);
    const ids = [...new Set(items.map((item) => item.id).filter(Boolean))];

    const [sourceRes, targetRes] = await Promise.all([
      fetchAPI("products", {
        locale: strapiLocale(fromLang),
        filters: { documentId: { $in: ids } },
        populate: { variants: true },
        pagination: { pageSize: MAX_ITEMS },
      }),
      fetchAPI("products", {
        locale: strapiLocale(toLang),
        filters: { documentId: { $in: ids } },
        populate: { variants: true },
        pagination: { pageSize: MAX_ITEMS },
      }),
    ]);

    const sourceById = new Map(
      ((sourceRes.data as any[]) || []).map((p) => [p.documentId, p]),
    );
    const targetById = new Map(
      ((targetRes.data as any[]) || []).map((p) => [p.documentId, p]),
    );

    const converted: any[] = [];
    const dropped: string[] = [];

    for (const item of items) {
      const target = targetById.get(item.id);

      // Seven products exist only in Czech. The line is kept, flagged and shown
      // greyed out, so switching back restores it - but it carries no valid price
      // in this language, so every total and the order payload must skip it.
      if (!target) {
        dropped.push(item.nameProduct || item.id);
        converted.push({ ...item, unavailable: true });
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

        if (!variant?.price) {
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
