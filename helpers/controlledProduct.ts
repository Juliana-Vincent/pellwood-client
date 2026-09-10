export const controlledProduct = (lang: string, products: any[]) => {
  if (!products || !Array.isArray(products)) return [];

  return products
    .filter(item => item?.title)
    .map(item => {
      // Shallow clone to avoid mutating the original data
      const newItem = { ...item };

      if (lang === 'en') {
        if (typeof newItem.price === 'string') {
          newItem.price = newItem.price.replace(/,/g, '.');
        }

        if (newItem.variants?.length) {
          newItem.variants = newItem.variants.map((variant: any) => {
            const newVariant = { ...variant };
            if (typeof newVariant.price === 'string') {
              newVariant.price = newVariant.price.replace(/,/g, '.');
            }
            return newVariant;
          });
        }
      }

      return newItem;
    });
};

export default controlledProduct;
