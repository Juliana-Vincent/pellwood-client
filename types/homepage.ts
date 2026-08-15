import type { BlocksContent } from '@strapi/blocks-react-renderer';
import { Product } from './product';
import type { StrapiImage } from "./image";

export interface Homepage {
  title: string;
  image?: StrapiImage;
  content: BlocksContent;
  button: Button;
  recommendedProducts: Product[];
  banner?: Banner;
}

export interface Button {
  title: string;
  url: string;
}

export interface Banner {
  title: string;
  image: StrapiImage;
  url: string;
}