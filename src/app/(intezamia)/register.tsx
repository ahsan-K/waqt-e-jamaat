import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { PickerField } from '@/components/PickerField';
import { Pill } from '@/components/Pill';
import { Touchable } from '@/components/Pressable';
import { MasjidPin } from '@/features/map/MasjidPin';
import { MAP_PROVIDER } from '@/features/map/provider';
import { DEFAULT_CENTER } from '@/features/map/useUserLocation';
import { useDebounced } from '@/hooks/useDebounced';
import { formatTime, masjidName } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { localizeDigits } from '@/lib/digits';
import { addMinutes, dateKey, toMinutes } from '@/lib/time';
import { DEFAULT_DAILY_TIMES } from '@/lib/scheduleEdit';
import { useNativeHeader } from '@/navigation/header';
import { AuthError } from '@/services/firebase/auth';
import { findNearbyDuplicates, registerMasjid } from '@/services/firebase/intezamia';
import { fetchMasjid } from '@/services/firebase/masjids';
import type { RoleInMasjid } from '@/services/firebase/users';
import { useLastLocation } from '@/store/location';
import { useSettings } from '@/store/settings';
import { colors, radii } from '@/theme/tokens';
import {
  DEFAULT_TIMEZONE,
  PRAYERS,
  type DailyTimes,
  type LatLng,
  type PrayerKey,
} from '@/types/masjid';

type Step = 1 | 2 | 3 | 4;
const ROLES: RoleInMasjid[] = ['imam', 'muazzin', 'committee'];

/** Azaan default: keep the typical azaan→jamaat gap from the defaults. */
function azaanFor(p: PrayerKey, jamaat: string) {
  const d = DEFAULT_DAILY_TIMES[p];
  return addMinutes(jamaat, toMinutes(d.azaan) - toMinutes(d.jamaat));
}

export default function RegisterMasjid() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const header = useNativeHeader();
  const setOnboarded = useSettings((s) => s.setOnboarded);
  const lastLoc = useLastLocation((s) => s.location);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const mapRef = useRef<MapView>(null);

  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleInMasjid>('imam');
  // Step 2
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState<LatLng | null>(lastLoc);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  // Step 3
  const [jamaat, setJamaat] = useState<Record<PrayerKey, string>>(
    Object.fromEntries(PRAYERS.map((p) => [p, DEFAULT_DAILY_TIMES[p].jamaat])) as Record<
      PrayerKey,
      string
    >,
  );
  const [khutba, setKhutba] = useState('13:00');
  const [jummaJamaat, setJummaJamaat] = useState('13:30');

  const debouncedPin = useDebounced(pin, 500);
  useEffect(() => {
    if (!debouncedPin) return;
    let cancelled = false;
    void findNearbyDuplicates(debouncedPin)
      .then(async (hits) => {
        const first = hits[0];
        if (!first) return null;
        const m = await fetchMasjid(first.id);
        return m ? masjidName(m, language) : first.id;
      })
      .then((n) => !cancelled && setDuplicate(n))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [debouncedPin, language]);

  const useCurrentLocation = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return;
    const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const p = { lat: cur.coords.latitude, lng: cur.coords.longitude };
    setPin(p);
    mapRef.current?.animateToRegion(
      { latitude: p.lat, longitude: p.lng, latitudeDelta: 0.004, longitudeDelta: 0.004 },
      350,
    );
  };

  const validate = (s: Step): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!name.trim()) e.name = t('reg.err.required');
      if (!z.email().safeParse(email.trim()).success) e.email = t('auth.err.invalid-email');
      if (password.length < 8) e.password = t('reg.err.password8');
    }
    if (s === 2) {
      if (!nameEn.trim()) e.nameEn = t('reg.err.required');
      if (!address.trim()) e.address = t('reg.err.required');
      if (!pin) e.pin = t('reg.err.pin');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goto = (s: Step) => {
    setFormError(null);
    setStep(s);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const submit = async (withTimings: boolean) => {
    if (!pin) return;
    setBusy(true);
    setFormError(null);
    try {
      const daily = Object.fromEntries(
        PRAYERS.map((p) => [p, { azaan: azaanFor(p, jamaat[p]), jamaat: jamaat[p] }]),
      ) as DailyTimes;
      await registerMasjid({
        account: { name, email, password, roleInMasjid: role, language },
        masjid: { nameEn, nameUr, address, location: pin },
        timings: withTimings ? { daily, jumma: { khutba, jamaat: jummaJamaat } } : undefined,
        today: dateKey(Date.now(), DEFAULT_TIMEZONE),
      });
      setOnboarded(true);
      goto(4);
    } catch (e) {
      const code = e instanceof AuthError ? e.code : 'unknown';
      setFormError(t(`auth.err.${code}`));
      if (code === 'email-in-use' || code === 'invalid-email' || code === 'weak-password') goto(1);
    } finally {
      setBusy(false);
    }
  };

  const fmt = (v: string) => formatTime(v, language, t, true);
  const region = pin ?? lastLoc ?? DEFAULT_CENTER;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          ...header,
          title: step < 4 ? t('reg.step', { n: localizeDigits(step, language) }) : t('reg.done'),
          headerBackVisible: step < 4,
        }}
      />
      <StatusBar style="dark" />
      <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no">
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: step >= i ? colors.primary : '#DAD6CB' }]}
          />
        ))}
      </View>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
      >
        {step === 1 && (
          <>
            <View style={styles.heading}>
              <AppText size={26} weight="extrabold" accessibilityRole="header">
                {t('reg.s1Title')}
              </AppText>
              <AppText size={14} color="muted">
                {t('reg.s1Sub')}
              </AppText>
            </View>
            <Input
              testID="reg-name"
              label={t('reg.fullName')}
              placeholder={t('auth.name')}
              value={name}
              onChangeText={setName}
              error={errors.name}
              autoComplete="name"
            />
            <Input
              testID="reg-email"
              label={t('auth.email')}
              placeholder={t('iz.emailPh')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              error={errors.email}
            />
            <Input
              testID="reg-password"
              label={t('auth.password')}
              placeholder={t('reg.passwordPh')}
              value={password}
              onChangeText={setPassword}
              secureToggle
              textContentType="newPassword"
              autoComplete="new-password"
              error={errors.password}
            />
            <AppText size={13} weight="bold" color="#3E4A45">
              {t('reg.role')}
            </AppText>
            <View style={styles.row}>
              {ROLES.map((r) => (
                <Pill
                  key={r}
                  label={t(`reg.role_${r}`)}
                  on={role === r}
                  onPress={() => setRole(r)}
                  style={styles.flex}
                />
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.heading}>
              <AppText size={26} weight="extrabold" accessibilityRole="header">
                {t('reg.s2Title')}
              </AppText>
              <AppText size={14} color="muted">
                {t('reg.s2Sub')}
              </AppText>
            </View>
            <Input
              testID="reg-name-en"
              label={t('reg.nameEn')}
              placeholder={t('reg.nameEnPh')}
              value={nameEn}
              onChangeText={setNameEn}
              error={errors.nameEn}
            />
            <Input
              testID="reg-name-ur"
              label={t('reg.nameUr')}
              placeholder={t('reg.nameUrPh')}
              value={nameUr}
              onChangeText={setNameUr}
              style={styles.urdu}
            />
            <Input
              testID="reg-address"
              label={t('reg.address')}
              placeholder={t('reg.addressPh')}
              value={address}
              onChangeText={setAddress}
              error={errors.address}
            />
            <View style={styles.mapBox}>
              <MapView
                ref={mapRef}
                provider={MAP_PROVIDER}
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: region.lat,
                  longitude: region.lng,
                  latitudeDelta: 0.006,
                  longitudeDelta: 0.006,
                }}
                onPress={(e) =>
                  setPin({
                    lat: e.nativeEvent.coordinate.latitude,
                    lng: e.nativeEvent.coordinate.longitude,
                  })
                }
                showsUserLocation
                toolbarEnabled={false}
              >
                {pin && (
                  <Marker
                    draggable
                    coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                    onDragEnd={(e) =>
                      setPin({
                        lat: e.nativeEvent.coordinate.latitude,
                        lng: e.nativeEvent.coordinate.longitude,
                      })
                    }
                  >
                    <MasjidPin estimated={false} />
                  </Marker>
                )}
              </MapView>
              <Touchable
                testID="reg-use-location"
                onPress={useCurrentLocation}
                style={styles.locBtn}
              >
                <Icon name="locate" size={18} color={colors.primary} />
                <AppText size={13} weight="extrabold" color="primary">
                  {t('reg.useLocation')}
                </AppText>
              </Touchable>
            </View>
            <AppText size={12} weight="semibold" color={errors.pin ? 'danger' : 'muted'}>
              {pin
                ? t('reg.coords', {
                    lat: localizeDigits(pin.lat.toFixed(5), language),
                    lng: localizeDigits(pin.lng.toFixed(5), language),
                  })
                : (errors.pin ?? t('reg.err.pin'))}
            </AppText>
            {duplicate && (
              <View style={styles.warn}>
                <Icon name="alert" size={18} color={colors.accentText} />
                <AppText size={13} weight="bold" color="accentText" style={styles.flex}>
                  {t('reg.duplicate', { name: duplicate })}
                </AppText>
              </View>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.heading}>
              <AppText size={26} weight="extrabold" accessibilityRole="header">
                {t('reg.s3Title')}
              </AppText>
              <AppText size={14} color="muted">
                {t('reg.s3Sub')}
              </AppText>
            </View>
            <Button
              variant="accent"
              icon={<Icon name="camera" color={colors.accentText} />}
              label={t('reg.fromPhoto')}
              onPress={() => Alert.alert(t('common.comingSoon'))}
              style={styles.photoBtn}
            />
            <View style={styles.timesCard}>
              {PRAYERS.map((p) => (
                <View key={p} style={[styles.timeRow, styles.divider]}>
                  <AppText size={15} weight="bold" style={styles.flex}>
                    {t(`prayer.${p}`)}
                  </AppText>
                  <PickerField
                    testID={`reg-time-${p}`}
                    mode="time"
                    compact
                    value={jamaat[p]}
                    display={fmt(jamaat[p])}
                    onChange={(v) => setJamaat((j) => ({ ...j, [p]: v }))}
                    style={styles.timeField}
                  />
                </View>
              ))}
              <View style={[styles.timeRow, styles.divider]}>
                <AppText size={15} weight="bold" style={styles.flex}>
                  {t('reg.jummaKhutba')}
                </AppText>
                <PickerField
                  mode="time"
                  compact
                  value={khutba}
                  display={fmt(khutba)}
                  onChange={setKhutba}
                  style={styles.timeField}
                />
              </View>
              <View style={styles.timeRow}>
                <AppText size={15} weight="bold" style={styles.flex}>
                  {t('reg.jummaJamaat')}
                </AppText>
                <PickerField
                  mode="time"
                  compact
                  value={jummaJamaat}
                  display={fmt(jummaJamaat)}
                  onChange={setJummaJamaat}
                  style={styles.timeField}
                />
              </View>
            </View>
            <Button
              testID="reg-later"
              variant="ghost"
              size="sm"
              label={t('reg.later')}
              onPress={() => void submit(false)}
            />
          </>
        )}

        {step === 4 && (
          <View style={styles.done}>
            <View style={styles.doneIcon}>
              <Icon name="checkCircle" size={40} color={colors.primary} />
            </View>
            <AppText size={24} weight="extrabold" align="center" accessibilityRole="header">
              {t('reg.submittedTitle')}
            </AppText>
            <AppText size={14} color="muted" align="center">
              {t('reg.submittedBody')}
            </AppText>
            <Button
              testID="reg-dashboard"
              label={t('reg.toDashboard')}
              onPress={() => router.replace('/dashboard')}
              style={styles.stretch}
            />
          </View>
        )}

        {formError && (
          <AppText size={13} weight="semibold" color="danger" accessibilityLiveRegion="assertive">
            {formError}
          </AppText>
        )}
      </ScrollView>

      {step < 4 && (
        <View style={[styles.nav, { paddingBottom: insets.bottom + 12 }]}>
          {step > 1 && (
            <Button
              variant="outline"
              label={t('reg.back')}
              onPress={() => goto((step - 1) as Step)}
              style={styles.flex}
            />
          )}
          <Button
            testID="reg-next"
            label={step === 3 ? t('reg.submit') : t('reg.next')}
            loading={busy}
            onPress={() => {
              if (step === 3) return void submit(true);
              if (validate(step)) goto((step + 1) as Step);
            }}
            style={styles.flex2}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 24, paddingVertical: 8 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  content: { paddingHorizontal: 24, paddingTop: 8, gap: 14 },
  heading: { gap: 6, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 6 },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  stretch: { alignSelf: 'stretch' },
  urdu: { writingDirection: 'rtl', textAlign: 'right' },
  mapBox: {
    height: 240,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.mapBase,
  },
  locBtn: {
    position: 'absolute',
    start: 10,
    end: 10,
    bottom: 10,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  warn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.accentBg,
    borderRadius: 16,
    padding: 12,
  },
  photoBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent },
  timesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  timeField: { width: 130 },
  done: { alignItems: 'center', gap: 12, paddingTop: 40 },
  doneIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
