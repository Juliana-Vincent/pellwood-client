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
