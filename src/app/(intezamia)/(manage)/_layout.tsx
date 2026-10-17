import { useTranslation } from 'react-i18next';

import { AppTabs } from '@/navigation/AppTabs';

/** Intezamia tabs: Dashboard | Schedule. */
export default function ManageTabs() {
  const { t } = useTranslation();
  return (
    <AppTabs
      tabs={[
        { name: 'dashboard', label: t('dash.tabDashboard'), icon: 'home', sf: 'house', md: 'home' },
        {
          name: 'schedule',
          label: t('dash.tabSchedule'),
          icon: 'calendar',
          sf: 'calendar',
          md: 'calendar_month',
        },
      ]}
    />
  );
}
