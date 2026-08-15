export interface BreadcrumbItem {
  name: string;
  /** Omit on the last item - it's the current page, which Google's own examples
   *  for BreadcrumbList leave without a url. */
  url?: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}
