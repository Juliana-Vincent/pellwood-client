/**
 * Length and diameter of a product, in millimetres.
 *
 * They used to be rows in the localized `parametrs` list, which meant typing
 * "Délka / 400 mm" in Czech and "Length / 400 mm" in English for every product -
 * the same number twice, and a typo in either one silently dropped the product out
 * of the catalogue filter. They are now two non-localized fields on the product,
 * filled once, with the label coming from the site translations.
 *
 * The parameter rows are still read as a fallback, so nothing breaks between
 * deploying this and running the migration.
 */
// The field is text, not a number: the editor types "14,4" or "14.4" or even
// "14,4 mm" and the site reads the number out of it, whatever language the admin
// happens to be in.
const LENGTH_TITLES = ["délka", "delka", "length"];
const DIAMETER_TITLES = ["průměr", "prumer", "diameter"];

export type Dimension = "length" | "diameter";

/** Titles are trimmed and compared without case: "Diameter " exists in the data. */
export const dimensionOf = (title: unknown): Dimension | null => {
  const key = String(title || "").trim().toLowerCase();
  if (LENGTH_TITLES.includes(key)) return "length";
  if (DIAMETER_TITLES.includes(key)) return "diameter";
  return null;
};

/** "400 mm", "14,4 mm", "58mm" -> 400, 14.4, 58. A range like "17-23 mm" is not a number. */
export const parseDimension = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const text = String(value ?? "").trim();
  if (!text || /\d\s*[-–]\s*\d/.test(text)) return null;
  const parsed = parseFloat(text.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const fromParams = (product: any, which: Dimension): number | null => {
  const rows = Array.isArray(product?.parametrs) ? product.parametrs : [];
  for (const row of rows) {
    if (dimensionOf(row?.title) === which) {
      const parsed = parseDimension(row?.value);
      if (parsed !== null) return parsed;
    }
  }
  return null;
};

export const productDimension = (product: any, which: Dimension): number | null =>
  parseDimension(product?.[which]) ?? fromParams(product, which);

/** Millimetres, with the decimal separator each language actually writes. */
export const formatDimension = (value: number, lang?: string): string => {
  const text = String(value);
  return `${lang === "en" ? text : text.replace(".", ",")} mm`;
};

/**
 * The rows the product page shows: the two dimensions first, under translated
 * labels, then whatever else the editor added - minus the old dimension rows, so
 * a product that has not been cleaned up yet does not list them twice.
 */
export const parameterRows = (
  product: any,
  labels: { length: string; diameter: string },
  lang?: string,
): Array<{ title: string; value: string }> => {
  const rows: Array<{ title: string; value: string }> = [];

  const length = productDimension(product, "length");
  if (length !== null) rows.push({ title: labels.length, value: formatDimension(length, lang) });

  const diameter = productDimension(product, "diameter");
  if (diameter !== null) rows.push({ title: labels.diameter, value: formatDimension(diameter, lang) });

  for (const row of Array.isArray(product?.parametrs) ? product.parametrs : []) {
    if (dimensionOf(row?.title)) continue;
    if (!row?.title && !row?.value) continue;
    rows.push({ title: row.title, value: row.value });
  }

  return rows;
};
