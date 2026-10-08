import { productDimension } from '@/helpers/dimensions';

interface Parameter {
  title: string;
  value: string;
}

interface Product {
  parametrs?: Parameter[]; // Preserving original 'parametrs' typo likely originating from API
  [key: string]: any;
}

interface FilterParameters {
  lengthMin?: string | number;
  lengthMax?: string | number;
  diameterMin?: string | number;
  diameterMax?: string | number;
}

export interface RangeParameter {
  length: { min: number; max: number };
  diameter: { min: number; max: number };
}

export const getRangeParameter = (products: Product[], parameters?: FilterParameters | false): RangeParameter => {
  // If explicit parameters are provided via state/URL, return those immediately
  if (parameters && typeof parameters !== 'boolean' && parameters.lengthMin) {
    return {
      length: {
        min: parseInt(String(parameters.lengthMin), 10) || 0,
        max: parseInt(String(parameters.lengthMax), 10) || 0
      },
      diameter: {
        min: parseInt(String(parameters.diameterMin), 10) || 0,
        max: parseInt(String(parameters.diameterMax), 10) || 0
      }
    };
  }

  // Otherwise, dynamically calculate min/max available from the products array
  const lengthNumbers: number[] = [];
  const diameterNumbers: number[] = [];

  if (Array.isArray(products)) {
    for (const product of products) {
      const length = productDimension(product, 'length');
      if (length !== null) lengthNumbers.push(length);

      const diameter = productDimension(product, 'diameter');
      if (diameter !== null) diameterNumbers.push(diameter);
    }
  }

  // Fallbacks to 0 to prevent Math.min(...[]) resulting in fatal Infinity bugs
  const lMin = lengthNumbers.length > 0 ? Math.min(...lengthNumbers) : 0;
  const lMax = lengthNumbers.length > 0 ? Math.max(...lengthNumbers) : 0;
  
  const dMin = diameterNumbers.length > 0 ? Math.min(...diameterNumbers) : 0;
  const dMax = diameterNumbers.length > 0 ? Math.max(...diameterNumbers) : 0;

  return {
    length: {
      min: Math.floor(lMin),
      max: Math.ceil(lMax)
    },
    diameter: {
      min: Math.floor(dMin),
      max: Math.ceil(dMax)
    }
  };
};

export default getRangeParameter;
