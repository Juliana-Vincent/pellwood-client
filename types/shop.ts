import { ReactNode } from "react";
import type { BlocksContent } from '@strapi/blocks-react-renderer';
import type { StrapiImage } from "./image";
import type { ShippingOption } from "@/functions/shippingOptions";

export interface BasketItem {
  id?: string;
  documentId?: string;
  imgUrl?: string;
  nameProduct: string;
  variantName: string;
  variantPrice: string | number;
  countVariant: number;
}

export interface AddressState {
  email: string;
  phone: string;
  name: string;
  surname: string;
  country: string;
  city: string;
  address: string;
  code: string;
}

export interface CheckoutProps {
  state: CheckoutState;
  setState: React.Dispatch<React.SetStateAction<CheckoutState>>;
  error: CheckoutErrors;
  setError: React.Dispatch<React.SetStateAction<CheckoutErrors>>;
  sumBefore: number | string;
  user: any;
  anotherAdress: AddressState;
  setAnotherAdress: React.Dispatch<React.SetStateAction<AddressState>>;
  companyData: CompanyDataState;
  setCompanyData: React.Dispatch<React.SetStateAction<CompanyDataState>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  deliveryMethod: DeliveryMethodState;
  setDeliveryMethod: React.Dispatch<React.SetStateAction<DeliveryMethodState>>;
  errorAnother: CheckoutErrors;
  setErrorAnother: React.Dispatch<React.SetStateAction<CheckoutErrors>>;
  paymentMethod: PaymentMethodState;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethodState>>;
  onBlur: (e: any) => void;
  deliveryOptions?: ShippingOption[];
  paymentOptions?: ShippingOption[];
  deliveryFreeThreshold?: number;
}

export interface CheckoutState extends AddressState {
  anotherAddressCheck: boolean;
  companyDataCheck: boolean;
  registrationCheck: boolean;
  noteCheck: boolean;
}

export interface CompanyDataState {
  companyName: string;
  ico: string;
  dic: string;
}

// Shape of the "safe" user object the API returns after login/register/update -
// the Mongoose user doc minus password/resetToken fields (see the `safeUser`
// destructuring in src/pages/api/user/*). Optional throughout since the signed-out
// default in context is `{}`, and a freshly-registered account may not have filled
// in delivery/company details yet.
export interface SessionUser {
  _id?: string;
  id?: string;
  email?: string;
  phone?: string;
  name?: string;
  surname?: string;
  country?: string;
  city?: string;
  address?: string;
  code?: string;
  anotherAddressCheck?: boolean;
  companyDataCheck?: boolean;
  anotherAdress?: AddressState;
  companyData?: CompanyDataState;
}

export interface DeliveryMethodState {
  value: string;
  price: string | number;
  payOnline: boolean;
}

export interface PaymentMethodState {
  value: string;
  price: string | number;
  payOnline: boolean;
}

export interface CheckoutErrors {
  email: boolean;
  phone: boolean;
  name: boolean;
  surname: boolean;
  city: boolean;
  address: boolean;
  code: boolean;
  delivery?: boolean;
  payment?: boolean;
  submit?: boolean;
}

export interface RangeValue {
  min: number;
  max: number;
}

export interface CustomRangeSliderProps {
  minValue: number;
  maxValue: number;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
}

export interface OrderData {
  idOrder: string;
  payOnline?: boolean;
  status?: "PAID" | "PENDING" | "CANCELLED" | string;
  basket: any[];
  currency: string;
  deliveryMethod: string;
  deliveryPrice: string | number;
  paymentMethod: string;
  paymentPrice: string | number;
  sum: string | number;
  anotherAddressCheck?: boolean;
  anotherAdress?: {
    name: string;
    surname: string;
    address: string;
    code: string;
    city: string;
  };
  phone: string;
  note?: string;
  name: string;
  surname: string;
  address: string;
  code: string;
  city: string;
  companyDataCheck?: boolean;
  companyData?: {
    companyName: string;
    ico: string;
    dic: string;
  };
}


export interface PageProps {
  children?: ReactNode;
  id?: string;
  className?: string;
  title?: string;
  description?: string;
  image?: string;
  twitter?: string;
  contentType?: string;
  published?: string;
  category?: string;
  updated?: string;
  noCrawl?: boolean;
  tags?: string;
  purchase?: any;
}