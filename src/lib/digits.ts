const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Replace ASCII digits with Extended Arabic-Indic (Urdu) digits. */
export function toUrduDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => URDU_DIGITS[Number(d)] ?? d);
}

/** Single numeral formatting helper used by the UI (PLAN §10). */
export function localizeDigits(input: string | number, language: string): string {
  const s = String(input);
  return language === 'ur' ? toUrduDigits(s) : s;
}
