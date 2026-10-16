import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

/** Namazi tabs: Map | Meri masjidein | Profile (native tabs, Liquid Glass on iOS 26). */
export default function NamaziTabs() {
  const { t } = useTranslation();
  return (
    <NativeTabs tintColor={colors.primary}>
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Icon sf="map" md="map" />
        <NativeTabs.Trigger.Label>{t('tabs.map')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favourites">
        <NativeTabs.Trigger.Icon sf="star" md="star" />
        <NativeTabs.Trigger.Label>{t('tabs.favourites')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person" md="person" />
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
