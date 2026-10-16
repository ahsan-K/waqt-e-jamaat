import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Segmented } from '@/components/Pill';
import { useNativeHeader } from '@/navigation/header';
import {
  appleAvailable,
  AuthError,
  googleConfigured,
  loginWithApple,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  resetPassword,
} from '@/services/firebase/auth';
import { upsertNamaziProfile } from '@/services/firebase/users';
import { useSettings } from '@/store/settings';
import { colors } from '@/theme/tokens';

type Mode = 'register' | 'login';

const schema = z.object({
  name: z.string().max(60).optional(),
  email: z.email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;

export default function NamaziAuth() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const header = useNativeHeader();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'login' ? 'login' : 'register');
  const [busy, setBusy] = useState<null | 'email' | 'apple' | 'google'>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  const settings = useSettings();

  useEffect(() => {
    void appleAvailable().then(setApple);
  }, []);

  const {
    control,
    handleSubmit,
    formState,
    getValues,
    setError: setFieldError,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const done = async (uid: string, name?: string | null, email?: string | null) => {
    await upsertNamaziProfile(uid, {
      name: name ?? undefined,
      email: email ?? undefined,
      language: settings.language,
      reminderMinutes: settings.reminderMinutes,
      defaultRadiusKm: settings.defaultRadiusKm,
      changeAlerts: settings.changeAlerts,
    }).catch(() => undefined);
    settings.setOnboarded(true);
    if (router.canGoBack()) router.back();
    else router.replace('/map');
  };

  const fail = (e: unknown) => {
    const code = e instanceof AuthError ? e.code : 'unknown';
    if (code !== 'cancelled') setError(t(`auth.err.${code}`));
    if (code === 'email-in-use') setMode('login');
  };

  const onEmail = handleSubmit(async (v) => {
    setError(null);
    if (mode === 'register' && !v.name?.trim()) {
      setFieldError('name', { message: t('auth.err.nameRequired') });
      return;
    }
    setBusy('email');
    try {
      const user =
        mode === 'register'
          ? await registerWithEmail(v.name ?? '', v.email, v.password)
          : await loginWithEmail(v.email, v.password);
      await done(user.uid, mode === 'register' ? v.name : user.displayName, user.email);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  });

  const onProvider = async (which: 'apple' | 'google') => {
    setError(null);
    setBusy(which);
    try {
      const { user } = which === 'apple' ? await loginWithApple() : await loginWithGoogle();
      await done(user.uid, user.displayName, user.email);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const onForgot = async () => {
    const email = getValues('email');
    if (!z.email().safeParse(email).success) {
      setFieldError('email', { message: t('auth.err.invalid-email') });
      return;
    }
    try {
      await resetPassword(email);
      setInfo(t('auth.resetSent'));
    } catch (e) {
      fail(e);
    }
  };

  const fieldError = (k: keyof Form) => {
    const e = formState.errors[k];
    if (!e) return undefined;
    if (k === 'email') return t('auth.err.invalid-email');
    if (k === 'password') return t('auth.err.weak-password');
    return e.message;
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <AppText size={12} weight="bold" color="primary" style={styles.kicker}>
            {t('auth.kicker')}
          </AppText>
          <AppText size={28} weight="extrabold" accessibilityRole="header">
            {mode === 'register' ? t('auth.registerTitle') : t('auth.loginTitle')}
          </AppText>
          <AppText size={14} color="muted">
            {t('auth.subtitle')}
          </AppText>
        </View>

        <Segmented<Mode>
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: 'register', label: t('auth.register'), testID: 'tab-register' },
            { value: 'login', label: t('auth.login'), testID: 'tab-login' },
          ]}
        />

        <View style={styles.group}>
          {apple && (
            <Button
              label={t('auth.apple')}
              onPress={() => void onProvider('apple')}
              loading={busy === 'apple'}
              style={styles.appleBtn}
            />
          )}
          {googleConfigured && (
            <Button
              label={t('auth.google')}
              variant="outline"
              onPress={() => void onProvider('google')}
              loading={busy === 'google'}
            />
          )}
        </View>

        {(apple || googleConfigured) && (
          <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no">
            <View style={styles.line} />
            <AppText size={12} weight="bold" color="muted">
              {t('auth.orEmail')}
            </AppText>
            <View style={styles.line} />
          </View>
        )}

        <View style={styles.group}>
          {mode === 'register' && (
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  testID="auth-name"
                  placeholder={t('auth.name')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="name"
                  textContentType="name"
                  error={fieldError('name')}
                />
              )}
            />
          )}
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                testID="auth-email"
                placeholder={t('auth.email')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                error={fieldError('email')}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                testID="auth-password"
                placeholder={t('auth.password')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureToggle
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                textContentType={mode === 'register' ? 'newPassword' : 'password'}
                error={fieldError('password')}
              />
            )}
          />
          {error && (
            <AppText size={13} weight="semibold" color="danger" accessibilityLiveRegion="assertive">
              {error}
            </AppText>
          )}
          {info && (
            <AppText size={13} weight="semibold" color="primary" accessibilityLiveRegion="polite">
              {info}
            </AppText>
          )}
          <Button
            testID="auth-submit"
            label={mode === 'register' ? t('auth.createAccount') : t('auth.login')}
            onPress={onEmail}
            loading={busy === 'email'}
          />
          {mode === 'login' && (
            <Button variant="ghost" size="sm" label={t('auth.forgot')} onPress={onForgot} />
          )}
        </View>

        <View style={styles.flex} />
        <Button
          variant="ghost"
          size="sm"
          label={t('auth.continueGuest')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/map'))}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, gap: 18 },
  heading: { gap: 6 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1 },
  group: { gap: 10 },
  appleBtn: { backgroundColor: colors.ink },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#DAD6CB' },
  flex: { flex: 1 },
});
