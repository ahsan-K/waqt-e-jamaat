import en from '../locales/en.json';
import ur from '../locales/ur.json';
import urLatn from '../locales/ur-Latn.json';
import { parseLocaleTag } from '../deviceLocale';
import { isRTL, pickDefaultLanguage } from '../languages';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('languages', () => {
  it('picks a default from the device locale', () => {
    expect(pickDefaultLanguage([{ languageCode: 'ur', regionCode: 'PK' }])).toBe('ur');
    expect(pickDefaultLanguage([{ languageCode: 'en', regionCode: 'PK' }])).toBe('ur-Latn');
    expect(pickDefaultLanguage([{ languageCode: 'en', regionCode: 'GB' }])).toBe('en');
    expect(pickDefaultLanguage([])).toBe('en');
  });

  it('only Urdu is RTL', () => {
    expect(isRTL('ur')).toBe(true);
    expect(isRTL('ur-Latn')).toBe(false);
    expect(isRTL('en')).toBe(false);
  });

  it('all locales have the same keys', () => {
    const base = keys(en).sort();
    expect(keys(ur).sort()).toEqual(base);
    expect(keys(urLatn).sort()).toEqual(base);
  });
});

describe('parseLocaleTag', () => {
  it('parses common tag shapes', () => {
    expect(parseLocaleTag('ur-PK')).toEqual({ languageCode: 'ur', regionCode: 'PK' });
    expect(parseLocaleTag('en_GB')).toEqual({ languageCode: 'en', regionCode: 'GB' });
    expect(parseLocaleTag('ur-Arab-PK')).toEqual({ languageCode: 'ur', regionCode: 'PK' });
    expect(parseLocaleTag('en')).toEqual({ languageCode: 'en', regionCode: null });
    expect(parseLocaleTag(undefined)).toEqual({ languageCode: null, regionCode: null });
  });
});
