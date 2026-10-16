import { useSettings } from '@/store/settings';

import { isRTL } from './languages';

export function useLanguage() {
  const language = useSettings((s) => s.language);
  return { language, rtl: isRTL(language) };
}
