// Turning CMS content into <title> and meta description text.

/** Strapi rich-text blocks -> plain text. Anything else -> "". */
export function blocksToText(blocks: unknown): string {
  if (typeof blocks === "string") return blocks.replace(/\s+/g, " ").trim();
  if (!Array.isArray(blocks)) return "";
  const walk = (node: any): string => {
    if (!node) return "";
    if (typeof node.text === "string") return node.text;
    if (Array.isArray(node.children)) return node.children.map(walk).join("");
    return "";
  };
  return blocks.map(walk).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Shortens to at most `max` characters at a word boundary, with an ellipsis.
 * A plain substring cut words in half: product titles came out as
 * "... | PELLW" and descriptions stopped mid-word.
 */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  // Only back off to a space if it doesn't throw most of the text away.
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,.;:–-]+$/, "")}…`;
}

/** The first non-empty of the given candidates, as plain text. */
export function firstText(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const text = blocksToText(candidate);
    if (text) return text;
  }
  return "";
}
