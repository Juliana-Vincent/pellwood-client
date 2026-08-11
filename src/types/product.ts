import type { StrapiImage } from "./image";
import type { Category } from "./category";
import type { BlocksContent } from '@strapi/blocks-react-renderer';

export interface Product {
  id?: string;
  title: string;
  titleHead?: string;
  SEOdescription?: string;
  description?: BlocksContent;
  slug: string;
  text?: BlocksContent;
  image?: StrapiImage;
  orientedImage?: boolean;
  price?: number | string;
  variants?: Variant[];
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