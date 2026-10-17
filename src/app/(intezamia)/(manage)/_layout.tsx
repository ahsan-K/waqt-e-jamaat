import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

/** Intezamia tabs: Dashboard | Schedule. */
export default function ManageTabs() {
  const { t } = useTranslation();
  return (
    <NativeTabs tintColor={colors.primary}>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Icon sf="house" md="home" />
        <NativeTabs.Trigger.Label>{t('dash.tabDashboard')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="schedule">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>{t('dash.tabSchedule')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
