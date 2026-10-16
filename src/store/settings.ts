import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { initI18n } from '@/i18n';
import { getDeviceLocales } from '@/i18n/deviceLocale';
import { pickDefaultLanguage, type Language } from '@/i18n/languages';

export type ReminderMinutes = 5 | 10 | 15 | 20;
export const REMINDER_OPTIONS: readonly ReminderMinutes[] = [5, 10, 15, 20];
export const RADIUS_OPTIONS = [1, 2, 3, 5] as const;
export type CalcMethod = 'karachi' | 'mwl' | 'ummAlQura' | 'isna';
export type AsrSchool = 'hanafi' | 'shafi';

export type SettingsState = {
  language: Language;
  /** True once the user has picked a language / passed welcome on first launch. */
  onboarded: boolean;
  defaultRadiusKm: number;
  reminderMinutes: ReminderMinutes;
  changeAlerts: boolean;
  calcMethod: CalcMethod | null;
  asrSchool: AsrSchool | null;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
  setOnboarded: (onboarded: boolean) => void;
  update: (
    patch: Partial<
      Pick<
        SettingsState,
        'defaultRadiusKm' | 'reminderMinutes' | 'changeAlerts' | 'calcMethod' | 'asrSchool'
      >
    >,
  ) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: pickDefaultLanguage(getDeviceLocales()),
      onboarded: false,
      defaultRadiusKm: 2,
      reminderMinutes: 10,
      changeAlerts: true,
      calcMethod: null,
      asrSchool: null,
      hydrated: false,
      setLanguage: (language) => set({ language }),
      setOnboarded: (onboarded) => set({ onboarded }),
      update: (patch) => set(patch),
    }),
    {
      name: 'settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated: _h, setLanguage: _s, setOnboarded: _o, update: _u, ...rest }) =>
        rest,
      onRehydrateStorage: () => () => {
        useSettings.setState({ hydrated: true });
      },
    },
  ),
);

// Keep i18next in sync with the persisted language (outside React render).
initI18n(useSettings.getState().language);
useSettings.subscribe((state, prev) => {
  if (state.language !== prev.language && i18n.language !== state.language) {
    void i18n.changeLanguage(state.language);
  }
});
