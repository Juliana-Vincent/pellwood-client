import countryData from "@/data/country";

export function countryCode(input?: string): string {
  if (!input) return "";
  const needle = input.trim().toLowerCase();
  for (const list of Object.values(countryData)) {
    for (const c of list) {
      if (c.name.toLowerCase() === needle || c.value.toLowerCase() === needle) {
        return c.name.toLowerCase();
      }
    }
  }
  return needle;
}

export function servesCountry(option: { countries?: string[] }, country?: string): boolean {
  if (!option.countries || !option.countries.length) return true;
  return option.countries.includes(countryCode(country));
}