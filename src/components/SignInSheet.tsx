import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Glass } from './Glass';
import { Icon } from './Icon';

export type GateReason = 'favourite' | 'reminder' | 'confirm';

type Props = { reason: GateReason | null; onClose: () => void };

/** Bottom sheet shown when a guest taps favourite / reminder / confirm (PLAN §3 sign-in-sheet). */
export function SignInSheet({ reason, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const title =
    reason === 'reminder'
      ? t('gate.remindTitle')
      : reason === 'confirm'
        ? t('gate.confirmTitle')
        : t('gate.favTitle');
  return (
    <Modal visible={!!reason} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('gate.notNow')} />
      <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
        <Glass style={styles.sheet}>
          <View accessibilityRole="none" style={styles.icon}>
            <Icon name="star" color={colors.primary} size={24} />
          </View>
          <AppText size={21} weight="extrabold" accessibilityRole="header">
            {title}
          </AppText>
          <AppText size={14} color="#4A5550">
            {t('gate.body')}
          </AppText>
          <Button
            testID="gate-cta"
            label={t('gate.cta')}
            onPress={() => {
              onClose();
              router.push('/auth/namazi');
            }}
          />
          <Button variant="ghost" label={t('gate.notNow')} onPress={onClose} />
        </Glass>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: 'rgba(20,32,28,0.45)',
  },
  wrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 10 },
  sheet: {
    borderRadius: radii.sheet,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
