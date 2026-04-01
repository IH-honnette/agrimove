import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { updateDriverLocation, clearDriverLocation } from '../api/drivers';
import { colors, spacing, radius, fontSize } from '../theme';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function buildAddress(geo) {
  const parts = [geo.street, geo.district, geo.city || geo.subregion].filter(Boolean);
  return parts.join(', ') || geo.region || 'Unknown location';
}

export default function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const isDriver = user?.role === 'driver';

  const [sharing, setSharing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const watchRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  async function startSharing() {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enable it in Settings.');
        setLocationLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await sendLocation(pos.coords);

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
        async (pos) => { await sendLocation(pos.coords); }
      );

      setSharing(true);
    } catch (e) {
      setLocationError('Could not start location tracking.');
    } finally {
      setLocationLoading(false);
    }
  }

  async function sendLocation(coords) {
    try {
      const [geo] = await Location.reverseGeocodeAsync(
        { latitude: coords.latitude, longitude: coords.longitude }
      );
      const address = geo ? buildAddress(geo) : null;
      setCurrentAddress(address);
      await updateDriverLocation(coords.latitude, coords.longitude, address, token);
    } catch {
      // Non-fatal — keep watching even if one update fails
    }
  }

  async function stopSharing() {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    setSharing(false);
    setCurrentAddress(null);
    try { await clearDriverLocation(token); } catch { /* ignore */ }
  }

  async function handleToggle(value) {
    if (value) {
      await startSharing();
    } else {
      await stopSharing();
    }
  }

  async function handleLogout() {
    await stopSharing();
    await logout();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </View>

        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}

        <View style={styles.divider} />

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Member since</Text>
          <Text style={styles.infoValue}>
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
              : '—'}
          </Text>
        </View>

        {isDriver && (
          <>
            <View style={styles.divider} />

            <View style={styles.locationCard}>
              <View style={styles.locationTop}>
                <View style={styles.locationLeft}>
                  <Text style={styles.locationTitle}>Share My Location</Text>
                  <Text style={styles.locationSub}>
                    {sharing ? 'Customers can see you on the map' : 'Your location is hidden'}
                  </Text>
                </View>
                {locationLoading
                  ? <ActivityIndicator color={colors.primary} />
                  : <Switch
                      value={sharing}
                      onValueChange={handleToggle}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.white}
                    />
                }
              </View>

              {sharing && currentAddress ? (
                <View style={styles.liveAddress}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText} numberOfLines={2}>{currentAddress}</Text>
                </View>
              ) : null}

              {locationError ? (
                <Text style={styles.locationError}>{locationError}</Text>
              ) : null}
            </View>
          </>
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.bookingsBtn} onPress={() => navigation.navigate('MyBookings')}>
          <Text style={styles.bookingsBtnText}>📋  My Bookings</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  container: { flex: 1, alignItems: 'center', padding: spacing.xxl },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xl, marginBottom: spacing.lg,
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  email: { fontSize: fontSize.base, color: colors.textMuted, marginBottom: spacing.xs },
  phone: { fontSize: fontSize.base, color: colors.textMuted },
  divider: { width: '100%', height: 1, backgroundColor: colors.border, marginVertical: spacing.xxl },
  infoCard: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  locationCard: { width: '100%', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.lg },
  locationTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationLeft: { flex: 1, marginRight: spacing.md },
  locationTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  locationSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  liveAddress: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, flexShrink: 0 },
  liveText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  locationError: { marginTop: spacing.sm, fontSize: fontSize.xs, color: colors.error },
  bookingsBtn: {
    borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg, marginTop: spacing.md,
  },
  bookingsBtnText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
  logoutBtn: {
    borderWidth: 2, borderColor: colors.error, borderRadius: radius.md,
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg, marginTop: spacing.md,
  },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: fontSize.base },
});
