import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { Touchable } from '@/components/Pressable';
import { Switch } from '@/components/Switch';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLanguage } from '@/i18n/useLanguage';
import { localizeDigits } from '@/lib/digits';
import { signOut } from '@/services/firebase/auth';
import { updateProfileFields } from '@/services/firebase/users';
import {
  RADIUS_OPTIONS,
  REMINDER_OPTIONS,
  useSettings,
  type AsrSchool,
  type CalcMethod,
} from '@/store/settings';
import { colors, radii } from '@/theme/tokens';

const METHODS: CalcMethod[] = ['karachi', 'mwl', 'ummAlQura', 'isna'];
const SCHOOLS: AsrSchool[] = ['hanafi', 'shafi'];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Profile() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user, isRegistered, profile } = useAuth();
  const s = useSettings();
  const name = profile?.name || user?.displayName || '';

  // Settings live locally and are mirrored to /users/{uid} for registered users.
  const save = (patch: Parameters<typeof s.update>[0]) => {
    s.update(patch);
    if (isRegistered && user) {
      const remote: Record<string, unknown> = {};
      if (patch.reminderMinutes) remote.reminderMinutes = patch.reminderMinutes;
      if (patch.defaultRadiusKm) remote.defaultRadiusKm = patch.defaultRadiusKm;
      if (patch.changeAlerts !== undefined) remote.changeAlerts = patch.changeAlerts;
      if (Object.keys(remote).length)
        void updateProfileFields(user.uid, remote).catch(() => undefined);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
      ]}
    >
      <AppText size={30} weight="extrabold" accessibilityRole="header" style={styles.pad}>
        {t('profile.title')}
      </AppText>

      <View style={[styles.card, styles.userCard]}>
        <View style={styles.avatar}>
          {isRegistered && name ? (
            <AppText size={18} weight="extrabold" color="white" script="latin">
              {initials(name)}
            </AppText>
          ) : (
            <Icon name="user" color={colors.white} />
          )}
        </View>
        <View style={styles.flex}>
          <AppText size={16} weight="extrabold">
            {isRegistered ? name || user?.email : t('profile.guest')}
          </AppText>
          <AppText size={13} color="muted">
            {isRegistered ? (user?.email ?? '') : t('profile.guestBody')}
          </AppText>
        </View>
      </View>
      {!isRegistered && (
        <Button
          testID="profile-login"
          label={t('profile.login')}
          onPress={() => router.push('/auth/namazi')}
        />
      )}

      <View style={styles.card}>
        <AppText size={14} weight="extrabold">
          {t('profile.reminderLead')}
        </AppText>
        <View style={styles.grid}>
          {REMINDER_OPTIONS.map((m) => (
            <Pill
              key={m}
              testID={`lead-${m}`}
              label={t('profile.minutes', { n: localizeDigits(m, language) })}
              on={s.reminderMinutes === m}
              onPress={() => save({ reminderMinutes: m })}
              style={styles.flex}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <AppText size={14} weight="extrabold">
          {t('profile.defaultRadius')}
        </AppText>
        <View style={styles.grid}>
          {RADIUS_OPTIONS.map((r) => (
            <Pill
              key={r}
              label={t('map.km', { km: localizeDigits(r, language) })}
              on={s.defaultRadiusKm === r}
              onPress={() => save({ defaultRadiusKm: r })}
              style={styles.flex}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <AppText size={14} weight="extrabold">
          {t('profile.calcMethod')}
        </AppText>
        <View style={styles.wrap}>
          {METHODS.map((m) => (
            <Pill
              key={m}
              label={t(`method.${m}`)}
              on={(s.calcMethod ?? 'karachi') === m}
              onPress={() => save({ calcMethod: m })}
            />
          ))}
        </View>
        <AppText size={14} weight="extrabold">
          {t('profile.asr')}
        </AppText>
        <View style={styles.grid}>
          {SCHOOLS.map((m) => (
            <Pill
              key={m}
              label={t(`school.${m}`)}
              on={(s.asrSchool ?? 'hanafi') === m}
              onPress={() => save({ asrSchool: m })}
              style={styles.flex}
            />
          ))}
        </View>
      </View>

      <View style={[styles.card, styles.list]}>
        <View style={[styles.row, styles.divider]}>
          <View style={styles.flex}>
            <AppText size={14} weight="bold">
              {t('profile.changeAlerts')}
            </AppText>
            <AppText size={12} color="muted">
              {t('profile.changeAlertsSub')}
            </AppText>
          </View>
          <Switch
            value={s.changeAlerts}
            onChange={(v) => save({ changeAlerts: v })}
            accessibilityLabel={t('profile.changeAlerts')}
          />
        </View>
        <Touchable
          style={[styles.row, styles.divider]}
          onPress={() => router.push('/language')}
          accessibilityRole="button"
        >
          <AppText size={14} weight="bold" style={styles.flex}>
            {t('profile.language', { lang: t(`language.name_${language}`) })}
          </AppText>
          <Icon name="chevron" color={colors.muted} />
        </Touchable>
        {isRegistered ? (
          <Touchable
            testID="logout"
            style={styles.row}
            onPress={async () => {
              await signOut();
              router.replace('/welcome');
            }}
          >
            <AppText size={14} weight="extrabold" color="danger">
              {t('profile.logout')}
            </AppText>
          </Touchable>
        ) : (
          <Touchable style={styles.row} onPress={() => router.push('/login')}>
            <AppText size={14} weight="bold" color="primary">
              {t('profile.switchRole')}
            </AppText>
          </Touchable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, gap: 14 },
  pad: { paddingHorizontal: 4 },
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.cardLg,
    padding: 16,
    gap: 12,
  },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', gap: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  list: { paddingVertical: 6, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
});
