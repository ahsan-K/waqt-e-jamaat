import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Touchable } from '@/components/Pressable';
import { RadiusSlider } from '@/components/RadiusSlider';
import { clusterItems, type MapRegion } from '@/features/map/clusters';
import { MasjidPin } from '@/features/map/MasjidPin';
import { NearbySheet } from '@/features/map/NearbySheet';
import { useNearby } from '@/features/map/useNearby';
import { DEFAULT_CENTER, geocodeArea, useUserLocation } from '@/features/map/useUserLocation';
import { useUnreadCount } from '@/features/notifications/useUnreadCount';
import { formatKm, masjidName, nextShortLabel } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { useDebounced } from '@/hooks/useDebounced';
import { useNow } from '@/hooks/useNow';
import { localizeDigits } from '@/lib/digits';
import { distanceKm, regionForRadius } from '@/lib/geo';
import { useLastLocation } from '@/store/location';
import { useSettings } from '@/store/settings';
import { colors, radii, TOUCH } from '@/theme/tokens';
import { fontFamilyFor } from '@/theme/typography';
import type { LatLng } from '@/types/masjid';

export default function MapScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const mapRef = useRef<MapView>(null);
  const defaultRadius = useSettings((s) => s.defaultRadiusKm);
  const [radiusKm, setRadiusKm] = useState(Math.min(5, Math.max(1, defaultRadius)));
  const queryRadius = useDebounced(radiusKm, 300);
  const loc = useUserLocation();
  const [searchOrigin, setSearchOrigin] = useState<LatLng | null>(null);
  const origin: LatLng | null =
    searchOrigin ?? loc.location ?? (loc.status === 'loading' ? null : DEFAULT_CENTER);
  const [region, setRegion] = useState<MapRegion | null>(null);
  const [query, setQuery] = useState('');
  const [searchFailed, setSearchFailed] = useState(false);
  const unread = useUnreadCount();
  const setLastLocation = useLastLocation((s) => s.set);
  useEffect(() => {
    if (loc.location) setLastLocation(loc.location);
  }, [loc.location, setLastLocation]);

  const nearby = useNearby(origin, queryRadius, now);
  const visible = useMemo(
    () => nearby.items.filter((i) => i.distanceKm <= radiusKm),
    [nearby.items, radiusKm],
  );
  const points = useMemo(() => (region ? clusterItems(visible, region) : []), [visible, region]);

  const fit = (center: LatLng, r: number) =>
    mapRef.current?.animateToRegion(regionForRadius(center, r), 400);

  const onRadius = (v: number) => {
    setRadiusKm(v);
    if (origin) fit(origin, v);
  };

  const recenter = async () => {
    setSearchOrigin(null);
    const p = loc.location ?? (await loc.requestAgain());
    if (p) fit(p, radiusKm);
  };

  const onSearch = async () => {
    const text = query.trim();
    if (!text) return;
    setSearchFailed(false);
    const lower = text.toLowerCase();
    const match = nearby.items.find((i) =>
      i.masjid
        ? [i.masjid.name.en, i.masjid.name.ur].some((n) => n?.toLowerCase().includes(lower))
        : false,
    );
    if (match) {
      router.push({ pathname: '/masjid/[id]', params: { id: match.id } });
      return;
    }
    const p = await geocodeArea(text);
    if (!p) {
      setSearchFailed(true);
      return;
    }
    setSearchOrigin(p);
    fit(p, radiusKm);
  };

  // Offer "search this area" when the map centre drifts outside the radius.
  const drifted =
    region && origin
      ? distanceKm({ lat: region.latitude, lng: region.longitude }, origin) > radiusKm
      : false;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {origin ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={regionForRadius(origin, radiusKm)}
          onRegionChangeComplete={setRegion}
          onMapReady={() => setRegion(regionForRadius(origin, radiusKm))}
          showsUserLocation={loc.status === 'granted'}
          showsMyLocationButton={false}
          showsPointsOfInterests={false}
          toolbarEnabled={false}
          mapPadding={{ top: 170, bottom: 300, left: 0, right: 0 }}
        >
          <Circle
            center={{ latitude: origin.lat, longitude: origin.lng }}
            radius={radiusKm * 1000}
            strokeColor={colors.primary}
            strokeWidth={2}
            fillColor="rgba(15,92,74,0.08)"
            lineDashPattern={[8, 6]}
          />
          {points.map((p) =>
            p.kind === 'cluster' ? (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                onPress={() =>
                  mapRef.current?.animateToRegion(
                    {
                      latitude: p.lat,
                      longitude: p.lng,
                      latitudeDelta: (region?.latitudeDelta ?? 0.05) / 2.5,
                      longitudeDelta: (region?.longitudeDelta ?? 0.05) / 2.5,
                    },
                    350,
                  )
                }
                tracksViewChanges={false}
              >
                <MasjidPin estimated={false} count={p.count} />
              </Marker>
            ) : (
              <Marker
                key={p.id}
                testID={`pin-${p.id}`}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                anchor={{ x: 0.05, y: 0.5 }}
                onPress={() => router.push({ pathname: '/masjid/[id]', params: { id: p.id } })}
                accessibilityLabel={`${p.item.masjid ? masjidName(p.item.masjid, language) : ''}, ${formatKm(p.item.distanceKm, language, t)}`}
                tracksViewChanges={false}
              >
                <MasjidPin
                  estimated={p.item.estimated}
                  label={
                    p.id === visible.find((v) => !v.estimated)?.id ||
                    (p.item.estimated && p.id === nearby.nearestId)
                      ? nextShortLabel(p.item.next, language, t)
                      : null
                  }
                />
              </Marker>
            ),
          )}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.mapBase }]} />
      )}

      <View style={[styles.top, { top: insets.top + 8 }]}>
        <View style={styles.searchRow}>
          <Glass style={styles.search}>
            <Icon name="search" size={18} color={colors.muted} />
            <TextInput
              testID="map-search"
              value={query}
              onChangeText={(v) => {
                setQuery(v);
                setSearchFailed(false);
              }}
              onSubmitEditing={onSearch}
              returnKeyType="search"
              placeholder={t('map.search')}
              placeholderTextColor={colors.muted}
              accessibilityLabel={t('map.search')}
              style={[styles.input, { fontFamily: fontFamilyFor(language) }]}
            />
          </Glass>
          <Touchable onPress={recenter} accessibilityLabel={t('map.myLocation')}>
            <Glass style={styles.circleBtn}>
              <Icon name="locate" color={colors.primary} />
            </Glass>
          </Touchable>
          <Touchable
            onPress={() => router.push('/notifications')}
            accessibilityLabel={
              unread > 0 ? t('map.notifications', { count: unread }) : t('map.notificationsNone')
            }
          >
            <Glass style={styles.circleBtn}>
              <Icon name="bell" color={colors.primary} />
              {unread > 0 && (
                <View style={styles.badge}>
                  <AppText size={11} weight="extrabold" color="white" script="latin">
                    {unread > 9 ? '9+' : unread}
                  </AppText>
                </View>
              )}
            </Glass>
          </Touchable>
        </View>
        {searchFailed && (
          <Glass style={styles.notice}>
            <AppText size={13} weight="semibold" color="muted">
              {t('map.noResults')}
            </AppText>
          </Glass>
        )}
        <Glass style={styles.radiusCard}>
          <View style={styles.radiusHead}>
            <AppText size={13} weight="semibold" color="muted">
              {t('map.radius')}
            </AppText>
            <AppText size={18} weight="extrabold" color="primary" testID="radius-value">
              {t('map.km', { km: localizeDigits(radiusKm, language) })}
            </AppText>
          </View>
          <RadiusSlider
            value={radiusKm}
            onChange={onRadius}
            accessibilityLabel={t('map.radius')}
            formatValue={(v) => t('map.km', { km: localizeDigits(v, language) })}
          />
          <View style={styles.radiusHead}>
            <AppText size={11} weight="semibold" color="muted">
              {t('map.km', { km: localizeDigits(1, language) })}
            </AppText>
            <AppText size={11} weight="semibold" color="muted">
              {t('map.km', { km: localizeDigits(5, language) })}
            </AppText>
          </View>
        </Glass>
        {(loc.status === 'denied' || loc.status === 'unavailable') && !searchOrigin && (
          <Glass style={styles.notice}>
            <AppText size={14} weight="bold">
              {t('location.deniedTitle')}
            </AppText>
            <AppText size={13} color="muted">
              {t('location.deniedBody')}
            </AppText>
            <Button
              size="sm"
              variant="secondary"
              label={loc.canAskAgain ? t('location.allow') : t('location.openSettings')}
              onPress={() => void loc.requestAgain()}
            />
          </Glass>
        )}
        {drifted && region && (
          <Button
            size="sm"
            variant="outline"
            style={styles.areaBtn}
            label={t('map.searchArea')}
            onPress={() => setSearchOrigin({ lat: region.latitude, lng: region.longitude })}
          />
        )}
      </View>

      <View style={[styles.bottom, { bottom: insets.bottom + 8 }]}>
        <NearbySheet
          items={visible}
          radiusKm={radiusKm}
          loading={nearby.isLoading || !origin}
          error={nearby.isError}
          onRetry={() => void nearby.refetch()}
        />
      </View>
    </View>
  );
}

const shadow = {
  shadowColor: colors.ink,
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mapBase },
  top: { position: 'absolute', start: 16, end: 16, gap: 10 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  search: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow,
  },
  input: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 0, textAlign: 'auto' },
  circleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  badge: {
    position: 'absolute',
    top: 6,
    end: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusCard: {
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 4,
    ...shadow,
  },
  radiusHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  notice: { borderRadius: 20, padding: 14, gap: 8, ...shadow },
  areaBtn: { alignSelf: 'center', minHeight: TOUCH },
  bottom: { position: 'absolute', start: 10, end: 10 },
});
