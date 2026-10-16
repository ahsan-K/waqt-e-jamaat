import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useNativeHeader } from '@/navigation/header';
import { colors } from '@/theme/tokens';

import { AppText } from './AppText';

/** Temporary screen body for routes built in later phases. */
export function Placeholder({
  title,
  header: withHeader = true,
}: {
  title: string;
  header?: boolean;
}) {
  const header = useNativeHeader(title);
  return (
    <View style={styles.root}>
      {withHeader && <Stack.Screen options={header} />}
      <AppText size={withHeader ? 16 : 24} weight={withHeader ? 'medium' : 'extrabold'}>
        {withHeader ? '…' : title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 24 },
});
