import { countryCode } from "@/helpers/countryCode";

export const validateName = (name: string): boolean => {
  const regex = /^[\p{L}\s,.'-]+$/u;
  return regex.test(name || '');
};

const POSTCODE_RULES: Record<string, RegExp> = {
  cz: /^\d{3}\s?\d{2}$/,
  sk: /^\d{3}\s?\d{2}$/,
  de: /^\d{5}$/,
  at: /^\d{4}$/,
};

export const validationCode = (code: string, country?: string): boolean => {
  const value = String(code || "").trim();
  if (!value) return false;
  const rule = POSTCODE_RULES[countryCode(country)];
  return rule ? rule.test(value) : /^[\p{L}0-9\s-]{3,10}$/u.test(value);
};

export const validationEmail = (email: string): boolean => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export const validationPhone = (phone: string): boolean => {
  const value = String(phone || "").trim();
  if (!/^\+?[\d\s\-./()]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};

// "/" is how Czech addresses write the descriptive/orientation number pair -
// "Vinohradska 1234/56" is the normal form, not an edge case - and it was the one
// character missing, so most real street addresses failed.
export const validationAddress = (address: string): boolean => {
  const re = /^[\p{L}0-9\s,.'\/-]*$/u;
  return re.test(address || '');
};

// Cities were checked with the person-name rule, which allows no digits - so
// "Praha 4" or "Brno 2" failed. Districts, "Frankfurt am Main", "Brno-sever".
export const validationCity = (city: string): boolean => {
  const re = /^[\p{L}0-9\s,.'\/-]+$/u;
  return re.test(city || '');
};

const CZ_ICO = /^\d{8}$/;

/** Czech IČO: 8 digits with the mod-11 check digit. Slovak: 8 digits.
 *  Elsewhere the formats differ too much to check more than the characters. */
export const validationIco = (ico: string, country?: string): boolean => {
  const value = String(ico || "").replace(/\s/g, "");
  if (!value) return true;
  const code = countryCode(country);
  if (code === "cz") {
    if (!CZ_ICO.test(value)) return false;
    const digits = value.split("").map(Number);
    const sum = digits.slice(0, 7).reduce((acc, d, i) => acc + d * (8 - i), 0);
    const check = (11 - (sum % 11)) % 10;
    return check === digits[7];
  }
  if (code === "sk") return CZ_ICO.test(value);
  return /^[\p{L}0-9.\-\/]{2,20}$/u.test(value);
};

/** DIČ / VAT ID: CZ + 8-10 digits; SK 10 digits with or without the SK prefix;
 *  other EU countries a two-letter prefix and 2-12 characters. */
export const validationDic = (dic: string, country?: string): boolean => {
  const value = String(dic || "").replace(/\s/g, "").toUpperCase();
  if (!value) return true;
  const code = countryCode(country);
  if (code === "cz") return /^CZ\d{8,10}$/.test(value);
  if (code === "sk") return /^(SK)?\d{10}$/.test(value);
  return /^[A-Z]{2}[0-9A-Z+*.]{2,12}$/.test(value);
};

type FormState = Record<string, any>;
type FormErrors = Record<string, any>;

const validationForm = (
  type: string,
  state: FormState,
  error: FormErrors,
  setError: (errors: FormErrors) => void
): boolean => {
  let isInvalid = false;
  const value = state[type] || '';

  if (type === 'email') {
    isInvalid = !validationEmail(value);
  } else if (type === 'name' || type === 'surname') {
    isInvalid = !validateName(value);
  } else if (type === 'city') {
    isInvalid = !validationCity(value);
  } else if (type === 'phone') {
    isInvalid = !validationPhone(value);
  } else if (type === 'address') {
    isInvalid = !validationAddress(value);
  } else if (type === 'code') {
    isInvalid = !validationCode(value, state.country);
  }

  if (isInvalid) {
    setError({ ...error, [type]: true });
    return true; 
  }

  return false;
};

export default validationForm;
