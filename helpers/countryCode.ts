import { countries } from "@/data/country";

export function countryCode(input?: string): string {
  if (!input) return "";
  const needle = input.trim().toLowerCase();
  for (const country of countries) {
    if (country.name.toLowerCase() === needle) return country.name;
    // A country may arrive as its label in either language - an order placed on
    // the Czech site stores "Německo", the same country reads "Germany" in EN.
    for (const label of Object.values(country.label)) {
      if (label.toLowerCase() === needle) return country.name;
    }
  }
  return needle;
}

export function servesCountry(option: { countries?: string[] }, country?: string): boolean {
  if (!option.countries || !option.countries.length) return true;
  return option.countries.includes(countryCode(country));
}