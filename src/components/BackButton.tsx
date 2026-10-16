import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { colors, TOUCH } from '@/theme/tokens';

import { Icon } from './Icon';
import { Touchable } from './Pressable';

export function BackButton({ onPress }: { onPress?: () => void }) {
  const { t } = useTranslation();
  return (
    <Touchable
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      accessibilityLabel={t('common.back')}
      style={styles.btn}
    >
      <Icon name="back" />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
