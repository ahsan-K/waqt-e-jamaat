export const PRAYERS = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerKey = (typeof PRAYERS)[number];

/** "HH:mm", 24h, in the masjid's timezone. */
export type HHmm = string;

export type PrayerTime = { azaan: HHmm; jamaat: HHmm };
export type DailyTimes = Record<PrayerKey, PrayerTime>;

export type DailyEntry = {
  effectiveFrom: number;
  times: DailyTimes;
  createdBy: string;
  /** Set when the change should alert favourites ("Namaziyon ko ittela bhejein"). */
  notify?: boolean;
};

export type SpecialType = 'jumma' | 'taraweeh' | 'eid_ul_fitr' | 'eid_ul_adha' | 'custom';
export type SpecialTimeLabel = 'khutba' | 'jamaat' | 'first_jamaat' | 'second_jamaat' | 'start';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SpecialRepeat =
  | { kind: 'once'; date: string }
  | { kind: 'daily'; from: string; until: string }
  | { kind: 'weekly'; weekday: Weekday; from: string; until?: string };

export type SpecialPrayer = {
  type: SpecialType;
  customName?: { en: string; ur: string };
  times: Partial<Record<SpecialTimeLabel, HHmm>>;
  repeat: SpecialRepeat;
  dateConfirmed: boolean;
  remindManagement: boolean;
  lastConfirmedFor?: string;
  replacesPrayer?: 'zuhr' | 'isha';
  updatedAt: number;
};

export type MasjidStatus = 'pending' | 'approved' | 'rejected';

export type Masjid = {
  name: { en: string; ur: string };
  address: string;
  lat: number;
  lng: number;
  geohash: string;
  timezone: string;
  status: MasjidStatus;
  ownerUid: string;
  daily?: Record<string, DailyEntry>;
  specials?: Record<string, SpecialPrayer>;
  timingsUpdatedAt?: number;
  createdAt: number;
};

export type GeoEntry = { g: string; lat: number; lng: number; hasTimings: boolean };

export type MasjidStats = { confirmations?: number; requests?: number; favourites?: number };

export type LatLng = { lat: number; lng: number };

export const DEFAULT_TIMEZONE = 'Asia/Karachi';
