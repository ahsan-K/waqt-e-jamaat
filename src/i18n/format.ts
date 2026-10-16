import type { TFunction } from 'i18next';

import type { NextCalculated } from '@/lib/calculated';
import { localizeDigits } from '@/lib/digits';
import type { NextJamaat, ScheduleRow } from '@/lib/schedule';
import { to12h } from '@/lib/time';
import type { HHmm, Masjid, SpecialPrayer } from '@/types/masjid';

import type { Language } from './languages';

/** "16:45" → "4:45" (optionally "4:45 PM"), with Urdu digits in Urdu. */
export function formatTime(
  time: HHmm,
  language: Language,
  t?: TFunction,
  meridiem = false,
): string {
  const { text, pm } = to12h(time);
  const base = localizeDigits(text, language);
  if (!meridiem || !t) return base;
  return `${base} ${t(pm ? 'time.pm' : 'time.am')}`;
}

export function formatMinutesLeft(min: number, language: Language, t: TFunction): string {
  if (min <= 0) return t('time.now');
  if (min < 60) return t('time.inMin', { min: localizeDigits(min, language) });
  return t('time.inHours', {
    h: localizeDigits(Math.floor(min / 60), language),
    m: localizeDigits(min % 60, language),
  });
}

export function formatKm(km: number, language: Language, t: TFunction): string {
  const v = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return t('map.km', { km: localizeDigits(v, language) });
}

export function masjidName(m: Pick<Masjid, 'name'>, language: Language): string {
  return language === 'ur' ? m.name.ur || m.name.en : m.name.en || m.name.ur;
}

export function specialName(
  s: Pick<SpecialPrayer, 'type' | 'customName'>,
  language: Language,
  t: TFunction,
): string {
  if (s.type === 'custom' && s.customName) {
    return language === 'ur'
      ? s.customName.ur || s.customName.en
      : s.customName.en || s.customName.ur;
  }
  return t(`special.${s.type}`);
}

export function rowLabel(row: ScheduleRow, language: Language, t: TFunction): string {
  return row.kind === 'prayer' ? t(`prayer.${row.key}`) : specialName(row.special, language, t);
}

/** Short "Asr 4:45" / "~Asr 4:20" label used on pins and lists. */
export function nextShortLabel(
  next: NextJamaat | NextCalculated | null,
  language: Language,
  t: TFunction,
): string | null {
  if (!next) return null;
  if (next.source === 'calculated') {
    return `~${t(`prayer.${next.prayer}`)} ${formatTime(next.time, language)}`;
  }
  return `${rowLabel(next.row, language, t)} ${formatTime(next.time, language)}`;
}

/** "6 Nov" in the given timezone (Urdu month names + digits in Urdu). */
export function formatShortDate(epochMs: number, timeZone: string, language: Language): string {
  const locale = language === 'ur' ? 'ur-PK' : 'en-GB';
  try {
    const text = new Date(epochMs).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      timeZone,
    });
    return localizeDigits(text, language);
  } catch {
    return new Date(epochMs).toDateString();
  }
}
