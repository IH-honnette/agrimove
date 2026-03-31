import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createBooking } from '../api/bookings';
import { colors, spacing, radius, fontSize } from '../theme';

export default function BookingFormScreen({ route, navigation }) {
  const { driver } = route.params;
  const { user, token } = useAuth();
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoType, setCargoType] = useState('');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleBook() {
    if (!pickupLocation.trim() || !destination.trim() || !customerPhone.trim()) {
      setError('Pickup location, destination, and phone number are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const booking = await createBooking(
        {
          driver_id: driver.id,
          customer_name: user.name,
          customer_phone: customerPhone.trim(),
          cargo_type: cargoType.trim() || null,
          pickup_location: pickupLocation.trim(),
          destination: destination.trim(),
        },
        token
      );
      navigation.replace('BookingConfirmed', { booking });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Book Driver</Text>

          {/* Driver banner */}
          <View style={styles.banner}>
            <View style={styles.bannerAvatar}>
              <Text style={styles.bannerInitials}>{driver.initials}</Text>
            </View>
            <View>
              <Text style={styles.bannerName}>{driver.name}</Text>
              <Text style={styles.bannerSub}>{driver.vehicle} · RWF {Number(driver.rate).toLocaleString()}/day</Text>
            </View>
          </View>

          <Text style={styles.label}>Pickup Location *</Text>
          <TextInput
            style={styles.input}
            value={pickupLocation}
            onChangeText={setPickupLocation}
            placeholder="Where to pick up your cargo"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Destination *</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Where to deliver"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Cargo Type</Text>
          <TextInput
            style={styles.input}
            value={cargoType}
            onChangeText={setCargoType}
            placeholder="e.g. Maize, Vegetables (optional)"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Your Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="+250 7XX XXX XXX"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleBook} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnText}>Confirm Booking</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flexGrow: 1, padding: spacing.xl },
  back: { marginBottom: spacing.xl },
  backText: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600' },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.xl },
  banner: {
    flexDirection: 'row', gap: spacing.md,
    backgroundColor: colors.primaryLight, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.xl, alignItems: 'center',
  },
  bannerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#bae6fd', alignItems: 'center', justifyContent: 'center' },
  bannerInitials: { fontSize: fontSize.base, fontWeight: '700', color: '#0369a1' },
  bannerName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  bannerSub: { fontSize: fontSize.sm, color: colors.primaryDark, marginTop: 2 },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, marginBottom: spacing.lg },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.lg, fontSize: fontSize.sm },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
});
