import { localizeDigits, toUrduDigits } from '../digits';

describe('digits', () => {
  it('converts ASCII digits to Urdu digits', () => {
    expect(toUrduDigits('4:45')).toBe('۴:۴۵');
    expect(toUrduDigits('Asr 10:09')).toBe('Asr ۱۰:۰۹');
  });

  it('only localizes for Urdu', () => {
    expect(localizeDigits(18, 'ur')).toBe('۱۸');
    expect(localizeDigits(18, 'ur-Latn')).toBe('18');
    expect(localizeDigits('5:30', 'en')).toBe('5:30');
  });
});
