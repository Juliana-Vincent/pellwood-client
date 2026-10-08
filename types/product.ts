import type { StrapiImage } from "./image";
import type { Category } from "./category";
import type { BlocksContent } from '@strapi/blocks-react-renderer';

export interface Product {
  id?: string;
  documentId?: string;
  title: string;
  titleHead?: string;
  SEOtitle?: string;
  SEOdescription?: string;
  slug: string;
  text?: BlocksContent;
  image?: StrapiImage;
  orientedImage?: boolean;
  price?: number | string;
  variants?: Variant[];
  /** Millimetres, shared by both locales - see helpers/dimensions.ts. */
  length?: number | string | null;
  diameter?: number | string | null;
  parametrs?: Parameter[];
  category?: Category | null;
  linkedProducts?: Product[];
}

export interface Variant {
  id?: number;
  title: string;
  price: number;
  inStock?: boolean;
  weight?: string;
}

export interface Parameter {
  id?: number;
  title: string;
  value: string;
}