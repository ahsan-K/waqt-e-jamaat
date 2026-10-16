import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, I18nManager, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Touchable } from '@/components/Pressable';
import i18n from '@/i18n';
import { applyLanguage } from '@/i18n/applyLanguage';
import { LANGUAGES, type Language } from '@/i18n/languages';
import { localizeDigits } from '@/lib/digits';
import { useSettings } from '@/store/settings';
import { colors, radii } from '@/theme/tokens';
import { scriptFor } from '@/theme/typography';

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const current = useSettings((s) => s.language);
  const [picked, setPicked] = useState<Language>(current);
  const [restarting, setRestarting] = useState(false);

  // Live preview renders in the picked language before it is applied.
  const pt = i18n.getFixedT(picked);
  const script = scriptFor(picked);
  const previewDir = picked === 'ur' ? 'rtl' : 'ltr';

  const onContinue = async () => {
    const reloading = await applyLanguage(picked);
    if (reloading) {
      setRestarting(true);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  };

  if (restarting) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText size={16} weight="bold" script={script}>
          {pt('common.restarting')}
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />
      {router.canGoBack() && <BackButton />}

      <View style={styles.heading}>
        <AppText size={30} weight="extrabold" script={script} style={dirStyle(previewDir)}>
          {pt('language.title')}
        </AppText>
        <AppText
          size={15}
          weight="medium"
          color="muted"
          script={script}
          style={dirStyle(previewDir)}
        >
          {pt('language.subtitle')}
        </AppText>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('language.group')}
        style={styles.list}
      >
        {LANGUAGES.map((lang) => {
          const on = lang === picked;
          return (
            <Touchable
              key={lang}
              testID={`lang-option-${lang}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPicked(lang)}
              style={[styles.option, { borderColor: on ? colors.primary : colors.border }]}
            >
              <View style={[styles.radio, { borderColor: on ? colors.primary : colors.border }]}>
                {on && <View style={styles.radioDot} />}
              </View>
              <View style={styles.optionText}>
                <AppText size={18} weight="extrabold" script={scriptFor(lang)}>
                  {t(`language.name_${lang}`)}
                </AppText>
                <AppText size={12} weight="semibold" color="muted" script="latin">
                  {t(`language.hint_${lang}`)}
                </AppText>
              </View>
            </Touchable>
          );
        })}
      </View>

      <View style={styles.preview}>
        <AppText
          size={12}
          weight="bold"
          color="onPrimaryMuted"
          script={script}
          style={dirStyle(previewDir)}
        >
          {pt('language.previewLabel')}
        </AppText>
        <AppText
          size={22}
          weight="extrabold"
          color="white"
          script={script}
          style={dirStyle(previewDir)}
        >
          {pt('language.preview', { time: localizeDigits('4:45', picked) })}
        </AppText>
        <AppText
          size={13}
          weight="semibold"
          color="onPrimarySoft"
          script={script}
          style={dirStyle(previewDir)}
        >
          {pt('language.preview2', { min: localizeDigits(18, picked) })}
        </AppText>
      </View>

      <View style={styles.flex} />
      <Button testID="lang-continue" label={pt('common.continue')} onPress={onContinue} />
    </View>
  );
}

/** Preview text follows the picked language's direction even before the app flips. */
function dirStyle(dir: 'rtl' | 'ltr') {
  const appRtl = I18nManager.isRTL;
  const wantRtl = dir === 'rtl';
  return { textAlign: (wantRtl === appRtl ? 'left' : 'right') as 'left' | 'right' };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, gap: 22 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  heading: { gap: 8 },
  list: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 76,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radii.cardLg,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  optionText: { flex: 1, gap: 2 },
  preview: { backgroundColor: colors.primary, borderRadius: radii.cardLg, padding: 18, gap: 6 },
  flex: { flex: 1 },
});
