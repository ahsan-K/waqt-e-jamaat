import { useTranslation } from 'react-i18next';

import { AppTabs } from '@/navigation/AppTabs';

/** Namazi tabs: Map | Meri masjidein | Profile. */
export default function NamaziTabs() {
  const { t } = useTranslation();
  return (
    <AppTabs
      tabs={[
        { name: 'map', label: t('tabs.map'), icon: 'map', sf: 'map', md: 'map' },
        { name: 'favourites', label: t('tabs.favourites'), icon: 'star', sf: 'star', md: 'star' },
        { name: 'profile', label: t('tabs.profile'), icon: 'user', sf: 'person', md: 'person' },
      ]}
    />
  );
}
