import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Touchable } from '@/components/Pressable';
import { Switch } from '@/components/Switch';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMasjids } from '@/features/masjid/queries';
import { useNow } from '@/hooks/useNow';
import {
  formatKm,
  formatMinutesLeft,
  formatShortDate,
  formatTime,
  masjidName,
  nextShortLabel,
} from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { distanceKm } from '@/lib/geo';
import { getNextJamaat, upcomingChanges } from '@/lib/schedule';
import { setReminder } from '@/services/firebase/namazi';
import { ensurePermission } from '@/services/notifications';
import { useLastLocation } from '@/store/location';
import { colors, radii } from '@/theme/tokens';
import { DEFAULT_TIMEZONE } from '@/types/masjid';

export default function Favourites() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { user, isRegistered, favourites } = useAuth();
  const loc = useLastLocation((s) => s.location);
  const ids = useMemo(
    () =>
      Object.entries(favourites)
        .sort((a, b) => (a[1].createdAt ?? 0) - (b[1].createdAt ?? 0))
        .map(([id]) => id),
    [favourites],
  );
  const masjids = useMasjids(ids);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
      ]}
    >
      <View style={styles.heading}>
        <AppText size={30} weight="extrabold" accessibilityRole="header">
          {t('fav.title')}
        </AppText>
        {isRegistered && ids.length > 0 && (
          <AppText size={14} color="muted">
            {t('fav.subtitle')}
          </AppText>
        )}
      </View>

      <OfflineBanner />
      {!isRegistered ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="star" size={32} color={colors.primary} />
          </View>
          <AppText size={18} weight="extrabold" align="center">
            {t('fav.guestTitle')}
          </AppText>
          <AppText size={14} color="muted" align="center">
            {t('fav.guestBody')}
          </AppText>
          <Button
            testID="fav-login"
            label={t('gate.cta')}
            onPress={() => router.push('/auth/namazi')}
            style={styles.stretch}
          />
        </View>
      ) : ids.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="star" size={32} color={colors.primary} />
          </View>
          <AppText size={18} weight="extrabold" align="center">
            {t('fav.emptyTitle')}
          </AppText>
          <AppText size={14} color="muted" align="center">
            {t('fav.emptyBody')}
          </AppText>
          <Button
            variant="secondary"
            label={t('fav.openMap')}
            onPress={() => router.navigate('/map')}
          />
        </View>
      ) : (
        ids.map((id) => {
          const m = masjids[id];
          const fav = favourites[id]!;
          const next = m ? getNextJamaat(m, now) : null;
          const change = m ? upcomingChanges(m, now)[0] : undefined;
          const name = m ? masjidName(m, language) : '…';
          return (
            <View key={id} style={styles.card} testID={`fav-${id}`}>
              <Touchable
                style={styles.cardTop}
                onPress={() => router.push({ pathname: '/masjid/[id]', params: { id } })}
                accessibilityLabel={name}
              >
                <View style={styles.cardIcon}>
                  <Icon name="mosqueSimple" color={colors.primary} strokeWidth={1.8} />
                </View>
                <View style={styles.flex}>
                  <AppText size={16} weight="extrabold" numberOfLines={1}>
                    {name}
                  </AppText>
                  {m && loc && (
                    <AppText size={12} weight="semibold" color="muted">
                      {t('map.away', { dist: formatKm(distanceKm(loc, m), language, t) })}
                    </AppText>
                  )}
                </View>
                <View style={styles.end}>
                  <AppText size={16} weight="extrabold" color="primary">
                    {nextShortLabel(next, language, t) ?? t('map.noTimings')}
                  </AppText>
                  {next && (
                    <AppText size={11} weight="bold" color="accentText">
                      {formatMinutesLeft(next.minutesLeft, language, t)}
                    </AppText>
                  )}
                </View>
              </Touchable>
              {change && m && (
                <View style={styles.change}>
                  <Icon name="clock" size={16} color="#6E3A0A" />
                  <AppText size={12} weight="bold" color="#6E3A0A" style={styles.flex}>
                    {t('fav.change', {
                      date: formatShortDate(
                        change.effectiveFrom,
                        m.timezone || DEFAULT_TIMEZONE,
                        language,
                      ),
                      prayer: t(`prayer.${change.prayer}`),
                      time: formatTime(change.jamaat, language),
                    })}
                  </AppText>
                </View>
              )}
              <View style={styles.reminderRow}>
                <AppText size={13} weight="bold" color="#3E4A45">
                  {t('fav.reminder')}
                </AppText>
                <Switch
                  testID={`fav-reminder-${id}`}
                  value={fav.reminderOn}
                  accessibilityLabel={t('fav.reminderFor', { name })}
                  onChange={async (v) => {
                    if (!user) return;
                    await setReminder(user.uid, id, v);
                    if (v) await ensurePermission();
                  }}
                />
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, gap: 12 },
  heading: { gap: 6, paddingHorizontal: 4, marginBottom: 6 },
  flex: { flex: 1, minWidth: 0 },
  stretch: { alignSelf: 'stretch' },
  empty: { alignItems: 'center', gap: 10, paddingTop: 40, paddingHorizontal: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.cardLg,
    padding: 16,
    gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  end: { alignItems: 'flex-end', gap: 2 },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.accentBg,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ECEAE3',
    paddingTop: 10,
  },
});
