import type { BlocksContent } from '@strapi/blocks-react-renderer';

export interface Setting {
  title?: string;
  description: string;
  footer?: Footer[];
  [key: string]: any;
}

export interface Footer {
  title?: string;
  content: BlocksContent;
}