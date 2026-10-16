import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Glass } from '@/components/Glass';
import { Input } from '@/components/Input';
import { Pill } from '@/components/Pill';
import { radii } from '@/theme/tokens';
import { PRAYERS, type PrayerKey } from '@/types/masjid';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { prayer?: PrayerKey; note?: string }) => Promise<void>;
};

/** "Time ghalat hai?" — pick prayer + optional actual time; board photo is phase 2 (OCR). */
export function ReportSheet({ visible, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [prayer, setPrayer] = useState<PrayerKey | undefined>();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const close = () => {
    setSent(false);
    setPrayer(undefined);
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('common.close')} />
      <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
        <Glass style={styles.sheet}>
          <AppText size={20} weight="extrabold" accessibilityRole="header">
            {t('report.title')}
          </AppText>
          {sent ? (
            <>
              <AppText size={15} color="primary" weight="bold">
                {t('report.sent')}
              </AppText>
              <Button label={t('common.done')} onPress={close} />
            </>
          ) : (
            <>
              <AppText size={14} weight="bold">
                {t('report.which')}
              </AppText>
              <View style={styles.pills}>
                {PRAYERS.map((p) => (
                  <Pill
                    key={p}
                    label={t(`prayer.${p}`)}
                    on={prayer === p}
                    onPress={() => setPrayer(p)}
                    style={styles.pill}
                  />
                ))}
              </View>
              <Input
                testID="report-note"
                placeholder={t('report.note')}
                value={note}
                onChangeText={setNote}
                maxLength={200}
              />
              <Button
                testID="report-send"
                label={t('report.send')}
                loading={busy}
                disabled={!prayer && !note.trim()}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await onSubmit({ prayer, note });
                    setSent(true);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <Button variant="accent" label={t('report.photoSoon')} disabled />
            </>
          )}
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
    padding: 20,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 14 },
});
