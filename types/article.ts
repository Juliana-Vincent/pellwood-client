import type { StrapiImage } from "./image";
import type { Archive } from "./archive";
import type { BlocksContent } from '@strapi/blocks-react-renderer';

export interface Article {
  documentId?: string;
  title: string;
  slug: string;
  image?: StrapiImage;
  category?: Archive | null;
  chapters?: Chapters[];
}

export interface Chapters {
  title: string;
  text: BlocksContent;
  image?: StrapiImage;
}