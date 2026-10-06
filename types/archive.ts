import type { BlocksContent } from '@strapi/blocks-react-renderer';

export interface Archive {
  documentId: string;
  title: string;
  slug: string;
  sort: number;
  description?: BlocksContent;
  /** Search-engine title and description, set per entry in Strapi. */
  SEOtitle?: string;
  SEOdescription?: string;
}