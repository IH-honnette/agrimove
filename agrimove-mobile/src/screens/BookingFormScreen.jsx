import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useAuth } from '../context/AuthContext';
import { createBooking } from '../api/bookings';
import { colors, spacing, radius, fontSize } from '../theme';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

export default function BookingFormScreen({ route, navigation }) {
  const { driver } = route.params;
  const { user, token } = useAuth();

  const pickupRef = useRef(null);
  const destRef = useRef(null);

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

  function autocompleteStyles(zIndex) {
    return {
      container: { flex: 0 },
      textInputContainer: {
        backgroundColor: colors.bg,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 0,
      },
      textInput: {
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: fontSize.base,
        marginBottom: 0,
        height: 48,
      },
      listView: {
        position: 'absolute',
        top: 52,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        zIndex,
        elevation: zIndex,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      row: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
      description: { fontSize: fontSize.sm, color: colors.text },
      separator: { height: 1, backgroundColor: colors.border },
    };
  }

  const commonProps = {
    fetchDetails: false,
    enablePoweredByContainer: false,
    query: { key: GOOGLE_KEY, language: 'en', components: 'country:rw' },
    textInputProps: { placeholderTextColor: colors.textMuted },
    keepResultsAfterBlur: false,
    minLength: 2,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
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
              <Text style={styles.bannerSub}>{driver.vehicle} · {driver.capacity}</Text>
            </View>
          </View>

          <Text style={styles.label}>Pickup Location *</Text>
          <View style={[styles.acWrap, { zIndex: 20, elevation: 20 }]}>
            <GooglePlacesAutocomplete
              ref={pickupRef}
              placeholder="Where to pick up your cargo"
              onPress={(data) => setPickupLocation(data.description)}
              styles={autocompleteStyles(20)}
              {...commonProps}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.xl }]}>Destination *</Text>
          <View style={[styles.acWrap, { zIndex: 10, elevation: 10 }]}>
            <GooglePlacesAutocomplete
              ref={destRef}
              placeholder="Where to deliver"
              onPress={(data) => setDestination(data.description)}
              styles={autocompleteStyles(10)}
              {...commonProps}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.xl }]}>Cargo Type</Text>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, padding: spacing.xl },
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
  acWrap: { height: 48, marginBottom: spacing.sm },
  input: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, marginBottom: spacing.lg },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.lg, fontSize: fontSize.sm },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
});
