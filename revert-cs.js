const locale = 'cs';
const articles = await strapi.documents('api::article.article').findMany({ locale, fields: ['slug'], limit: 200 });
for (const doc of articles) {
  const full = await strapi.documents('api::article.article').findOne({ documentId: doc.documentId, locale, populate: { chapters: true } });
  if (!full?.chapters) continue;
  const before = JSON.stringify(full.chapters);
  const after = before.split('/produkt/5a-maxi-medium').join('/produkt/5a-medium-maxi');
  if (after === before) continue;
  await strapi.documents('api::article.article').update({ documentId: doc.documentId, locale, data: { chapters: JSON.parse(after) } });
  await strapi.documents('api::article.article').publish({ documentId: doc.documentId, locale });
  console.log('reverted', locale, doc.slug);
}
