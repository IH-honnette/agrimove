import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize } from '../theme';

export default function BookingConfirmedScreen({ route, navigation }) {
  const { booking } = route.params;
  const rawPhone = (booking.driver_phone || '').replace(/\s/g, '');

  async function handleCall() {
    const url = `tel:${rawPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot call', `Call the driver directly at ${booking.driver_phone}`);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.sub}>
          Booking #{booking.id} saved. Call the driver to arrange pick-up details.
        </Text>

        <View style={styles.phoneBox}>
          <Text style={styles.driverLabel}>Driver</Text>
          <Text style={styles.driverName}>{booking.driver_name}</Text>
          <Text style={styles.phoneNumber}>{booking.driver_phone}</Text>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Text style={styles.callBtnText}>📞  Call Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Pickup: </Text>
            {booking.pickup_location}
          </Text>
          <Text style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Destination: </Text>
            {booking.destination}
          </Text>
          {booking.cargo_type ? (
            <Text style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Cargo: </Text>
              {booking.cargo_type}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverList' }] })}
        >
          <Text style={styles.btnOutlineText}>Back to Drivers</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, padding: spacing.xxl, justifyContent: 'center' },
  icon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.successLight, borderWidth: 2, borderColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.xl,
  },
  iconText: { fontSize: 28, color: colors.success },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  sub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xxl },
  phoneBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1.5, borderColor: colors.successBorder,
    borderRadius: radius.lg, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  driverLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  driverName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  phoneNumber: { fontSize: fontSize.xxl, fontWeight: '800', color: '#15803d', letterSpacing: 1, marginBottom: spacing.lg },
  callBtn: { backgroundColor: colors.success, borderRadius: radius.full, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md },
  callBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  summary: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl },
  summaryRow: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs, lineHeight: 18 },
  summaryKey: { fontWeight: '700', color: colors.text },
  btnOutline: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
});
