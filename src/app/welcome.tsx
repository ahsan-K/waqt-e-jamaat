import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { Touchable } from '@/components/Pressable';
import { useSettings } from '@/store/settings';
import { colors, TOUCH } from '@/theme/tokens';

function RoleCard({
  testID,
  icon,
  iconBg,
  iconColor,
  title,
  body,
  onPress,
}: {
  testID?: string;
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Touchable testID={testID} onPress={onPress} accessibilityLabel={`${title}. ${body}`}>
      <Glass variant="onPrimary" interactive style={styles.card}>
        <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.cardText}>
          <AppText size={19} weight="extrabold" color="white">
            {title}
          </AppText>
          <AppText size={13} weight="medium" color="onPrimarySoft">
            {body}
          </AppText>
        </View>
        <Icon name="chevron" color={colors.white} />
      </Glass>
    </Touchable>
  );
}

export default function Welcome() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettings((s) => s.language);
  const setOnboarded = useSettings((s) => s.setOnboarded);

  const go = (href: '/language' | '/map' | '/login' | '/auth/namazi') => {
    if (href === '/language') return router.push(href);
    setOnboarded(true);
    if (href === '/map') router.replace(href);
    else if (href === '/auth/namazi')
      router.push({ pathname: href, params: { mode: 'login', next: 'map' } });
    else router.push(href);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <Svg width={420} height={360} viewBox="0 0 420 360" fill="none" style={styles.arches}>
        {[
          'M40 360V200a80 80 0 0 1 160 0v160',
          'M70 360V210a50 50 0 0 1 100 0v150',
          'M220 360V150a90 90 0 0 1 180 0v210',
          'M255 360V165a55 55 0 0 1 110 0v195',
          'M310 60V20',
          'M120 120V90',
        ].map((d) => (
          <Path key={d} d={d} stroke="rgba(255,255,255,0.10)" strokeWidth={2} />
        ))}
      </Svg>

      <View style={styles.header}>
        <View style={styles.topRow}>
          <Touchable
            testID="welcome-logo"
            onPress={() => go('/map')}
            accessibilityLabel={t('tabs.map')}
            style={styles.logoBadge}
          >
            <Icon name="mosque" size={28} color={colors.white} strokeWidth={1.8} />
          </Touchable>
          <Touchable
            testID="lang-pill"
            onPress={() => go('/language')}
            style={styles.langPill}
            accessibilityLabel={t('welcome.changeLanguage')}
          >
            <Icon name="globe" size={16} color={colors.white} />
            <AppText size={13} weight="extrabold" color="white">
              {t(`language.name_${language}`)}
            </AppText>
          </Touchable>
        </View>
        <AppText script="latin" size={34} weight="extrabold" color="white" style={styles.title}>
          Waqt-e-Jamaat
        </AppText>
        <AppText size={16} weight="medium" color="onPrimaryMuted">
          {t('welcome.tagline')}
        </AppText>
      </View>

      <View style={styles.flex} />

      <View style={styles.actions}>
        <AppText size={15} weight="bold" color="onPrimaryMuted">
          {t('welcome.question')}
        </AppText>
        <RoleCard
          icon="pin"
          iconBg={colors.white}
          iconColor={colors.primary}
          title={t('welcome.namaziTitle')}
          body={t('welcome.namaziBody')}
          testID="welcome-namazi"
          onPress={() => go('/map')}
        />
        <RoleCard
          icon="home"
          iconBg={colors.accentBg}
          iconColor={colors.accentText}
          title={t('welcome.intezamiaTitle')}
          body={t('welcome.intezamiaBody')}
          testID="welcome-intezamia"
          onPress={() => go('/login')}
        />
        <Touchable
          onPress={() => go('/auth/namazi')}
          style={styles.loginLink}
          accessibilityRole="link"
        >
          <AppText size={14} weight="bold" color="white" style={styles.underline}>
            {t('welcome.namaziLogin')}
          </AppText>
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    gap: 28,
    overflow: 'hidden',
  },
  arches: { position: 'absolute', start: -15, top: 20 },
  header: { gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.glassOnPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPill: {
    minHeight: TOUCH,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.glassOnPrimary,
    borderWidth: 1,
    borderColor: colors.glassOnPrimaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { letterSpacing: -0.7 },
  flex: { flex: 1 },
  actions: { gap: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 30 },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 4 },
  loginLink: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  underline: { textDecorationLine: 'underline' },
});
