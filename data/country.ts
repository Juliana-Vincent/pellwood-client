export interface Country {
  /** ISO-ish code stored on the order and matched against a delivery option's
   *  `countries` list. */
  name: string;
  label: Record<"cz" | "en", string>;
}

/**
 * One list for the whole site, not one per language.
 *
 * The lists used to be keyed by locale - Czech visitors saw only CZ and SK, English
 * ones only DE and AT - which meant the language someone reads the site in decided
 * where they were allowed to ship. Shipping destination and reading language are
 * different things: a Czech-speaking customer may well want a parcel sent to
 * Germany. Everyone now sees all four, named in the language they are reading.
 */
export const countries: Country[] = [
  { name: "cz", label: { cz: "Česko", en: "Czech Republic" } },
  { name: "sk", label: { cz: "Slovensko", en: "Slovakia" } },
  { name: "de", label: { cz: "Německo", en: "Germany" } },
  { name: "at", label: { cz: "Rakousko", en: "Austria" } },
];

/** The list as the form selects want it: { name, value } in the given language. */
export function getCountries(lang: string): { name: string; value: string }[] {
  const key = lang === "en" ? "en" : "cz";
  return countries.map((country) => ({
    name: country.name,
    value: country.label[key],
  }));
}

export default countries;
