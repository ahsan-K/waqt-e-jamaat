import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useNativeHeader } from '@/navigation/header';
import { AuthError, loginWithEmail, resetPassword, signOut } from '@/services/firebase/auth';
import { fetchProfile } from '@/services/firebase/users';
import { useSettings } from '@/store/settings';
import { colors, radii } from '@/theme/tokens';

export default function IntezamiaLogin() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const header = useNativeHeader();
  const setOnboarded = useSettings((s) => s.setOnboarded);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    setInfo(null);
    if (!z.email().safeParse(email.trim()).success) return setError(t('auth.err.invalid-email'));
    if (password.length < 6) return setError(t('auth.err.weak-password'));
    setBusy(true);
    try {
      const user = await loginWithEmail(email, password);
      const profile = await fetchProfile(user.uid).catch(() => null);
      if (profile?.role !== 'intezamia') {
        await signOut();
        setError(t('iz.notManager'));
        return;
      }
      setOnboarded(true);
      router.replace('/dashboard');
    } catch (e) {
      setError(t(`auth.err.${e instanceof AuthError ? e.code : 'unknown'}`));
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async () => {
    if (!z.email().safeParse(email.trim()).success) return setError(t('auth.err.invalid-email'));
    try {
      await resetPassword(email);
      setInfo(t('auth.resetSent'));
    } catch (e) {
      setError(t(`auth.err.${e instanceof AuthError ? e.code : 'unknown'}`));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={header} />
      <StatusBar style="dark" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.heading}>
          <AppText size={12} weight="bold" color="primary" style={styles.kicker}>
            {t('iz.kicker')}
          </AppText>
          <AppText size={28} weight="extrabold" accessibilityRole="header">
            {t('iz.loginTitle')}
          </AppText>
          <AppText size={14} color="muted">
            {t('iz.loginSub')}
          </AppText>
        </View>
        <View style={styles.group}>
          <Input
            testID="iz-email"
            label={t('auth.email')}
            placeholder={t('iz.emailPh')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="username"
          />
          <Input
            testID="iz-password"
            label={t('auth.password')}
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureToggle
            autoComplete="current-password"
            textContentType="password"
          />
          <Button
            variant="ghost"
            size="sm"
            label={t('auth.forgot')}
            onPress={onForgot}
            style={styles.start}
          />
          {error && (
            <AppText size={13} weight="semibold" color="danger" accessibilityLiveRegion="assertive">
              {error}
            </AppText>
          )}
          {info && (
            <AppText size={13} weight="semibold" color="primary">
              {info}
            </AppText>
          )}
          <Button testID="iz-login" label={t('auth.login')} onPress={onLogin} loading={busy} />
        </View>
        <View style={styles.flex} />
        <View style={styles.newCard}>
          <AppText size={15} weight="extrabold">
            {t('iz.notListedTitle')}
          </AppText>
          <AppText size={13} color="muted">
            {t('iz.notListedBody')}
          </AppText>
          <Button
            testID="iz-register"
            variant="accent"
            label={t('iz.registerNew')}
            onPress={() => router.push('/register')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, gap: 22 },
  heading: { gap: 6 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1 },
  group: { gap: 12 },
  start: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  flex: { flex: 1 },
  newCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.cardLg,
    padding: 18,
    gap: 10,
  },
});
