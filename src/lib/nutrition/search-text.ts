const COMBINING_DIACRITIC_LOW = 0x0300;
const COMBINING_DIACRITIC_HIGH = 0x036f;

/** Lowercases and strips accents/diacritics so Portuguese search terms match
 * regardless of typed accents (e.g. "cafe" matches "Café"). Used both when
 * seeding the Food catalog's `searchName` column and when querying it.
 * Walks the NFD-decomposed string ("é" -> "e" + a combining acute accent)
 * and drops any character in the Unicode combining-diacritical-marks block,
 * rather than a regex literal, to avoid embedding literal combining
 * characters in source. */
export function normalizeSearchText(text: string): string {
  const decomposed = text.normalize("NFD");
  let result = "";
  for (const ch of decomposed) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= COMBINING_DIACRITIC_LOW && code <= COMBINING_DIACRITIC_HIGH) continue;
    result += ch;
  }
  return result.toLowerCase().trim();
}
