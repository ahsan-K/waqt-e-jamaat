export const LANGUAGES = ['ur-Latn', 'ur', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function isRTL(language: Language): boolean {
  return language === 'ur';
}

/** Device locale → `ur` if Urdu, `ur-Latn` for Pakistan region, else `en` (PLAN §10). */
export function pickDefaultLanguage(
  locales: readonly { languageCode: string | null; regionCode: string | null }[],
): Language {
  const first = locales[0];
  if (!first) return 'en';
  if (first.languageCode === 'ur') return 'ur';
  if (locales.some((l) => l.regionCode === 'PK')) return 'ur-Latn';
  return 'en';
}
