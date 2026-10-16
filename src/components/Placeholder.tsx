import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

import { AppText } from './AppText';
import { BackButton } from './BackButton';

/** Temporary screen body for routes built in later phases. */
export function Placeholder({ title, back = true }: { title: string; back?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      {back && <BackButton />}
      <AppText size={24} weight="extrabold">
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, gap: 16 },
});
