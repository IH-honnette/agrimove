import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { colors, spacing, radius, fontSize } from '../theme';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';
const DEFAULT_RATE_PER_KM = 60; // RWF per km when no driver selected
const ASSUMED_DAILY_KM = 250;   // km a driver covers per day (rate basis)

async function fetchDistance(originPlaceId, destinationPlaceId) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=place_id:${originPlaceId}&destinations=place_id:${destinationPlaceId}&units=metric&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  const element = json.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') throw new Error('Could not calculate distance');
  return {
    distanceText: element.distance.text,
    distanceKm: element.distance.value / 1000,
    durationText: element.duration.text,
  };
}

export default function PriceEstimatorScreen({ route, navigation }) {
  const driver = route.params?.driver || null;
  const ratePerKm = driver ? driver.rate / ASSUMED_DAILY_KM : DEFAULT_RATE_PER_KM;

  const pickupRef = useRef(null);
  const destRef = useRef(null);

  const [originPlaceId, setOriginPlaceId] = useState(null);
  const [destPlaceId, setDestPlaceId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCalculate() {
    if (!originPlaceId || !destPlaceId) {
      setError('Please select both pickup and destination from the suggestions');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const { distanceText, distanceKm, durationText } = await fetchDistance(originPlaceId, destPlaceId);
      const estimatedPrice = Math.round(ratePerKm * distanceKm);
      setResult({ distanceText, distanceKm, durationText, estimatedPrice });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const autocompleteProps = {
    fetchDetails: true,
    enablePoweredByContainer: false,
    query: { key: GOOGLE_KEY, language: 'en', components: 'country:rw' },
    styles: {
      textInput: styles.autocompleteInput,
      listView: styles.dropdown,
      row: styles.dropdownRow,
      description: styles.dropdownText,
    },
    textInputProps: { placeholderTextColor: colors.textMuted },
    keepResultsAfterBlur: true,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Price Estimator</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {driver ? (
            <View style={styles.driverBanner}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitials}>{driver.initials}</Text>
              </View>
              <View>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverRate}>RWF {Number(driver.rate).toLocaleString()}/day · ~RWF {Math.round(ratePerKm)}/km</Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>Estimate transport cost for any route</Text>
              <Text style={styles.infoSub}>Using standard rate of RWF {DEFAULT_RATE_PER_KM}/km</Text>
            </View>
          )}

          <Text style={styles.label}>Pickup Location</Text>
          <View style={styles.autocompleteWrap}>
            <GooglePlacesAutocomplete
              ref={pickupRef}
              placeholder="Search pickup location..."
              onPress={(data) => {
                setOriginPlaceId(data.place_id);
                setResult(null);
              }}
              {...autocompleteProps}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Destination</Text>
          <View style={styles.autocompleteWrap}>
            <GooglePlacesAutocomplete
              ref={destRef}
              placeholder="Search destination..."
              onPress={(data) => {
                setDestPlaceId(data.place_id);
                setResult(null);
              }}
              {...autocompleteProps}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.calcBtn, (!originPlaceId || !destPlaceId) && styles.calcBtnDisabled]}
            onPress={handleCalculate}
            disabled={loading || !originPlaceId || !destPlaceId}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.calcBtnText}>Calculate Distance & Price</Text>}
          </TouchableOpacity>

          {result ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Estimate</Text>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Distance</Text>
                <Text style={styles.resultValue}>{result.distanceText}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Driving time</Text>
                <Text style={styles.resultValue}>{result.durationText}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Estimated cost</Text>
                <Text style={styles.resultPrice}>RWF {result.estimatedPrice.toLocaleString()}</Text>
              </View>

              <Text style={styles.disclaimer}>
                * Estimate based on {driver ? `${driver.name}'s rate` : 'standard rate'}. Actual price is agreed with the driver.
              </Text>

              {driver ? (
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => navigation.navigate('BookingForm', { driver })}
                >
                  <Text style={styles.bookBtnText}>Book This Driver</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600', width: 60 },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  container: { padding: spacing.xl, paddingBottom: 80 },
  driverBanner: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.xl,
  },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#bae6fd', alignItems: 'center', justifyContent: 'center' },
  driverInitials: { fontSize: fontSize.base, fontWeight: '700', color: '#0369a1' },
  driverName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  driverRate: { fontSize: fontSize.xs, color: colors.primaryDark, marginTop: 2 },
  infoBanner: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.xl, alignItems: 'center',
  },
  infoText: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  infoSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  autocompleteWrap: { zIndex: 10, marginBottom: spacing.lg },
  autocompleteInput: {
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: fontSize.base,
    color: colors.text, height: 48,
  },
  dropdown: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: 2 },
  dropdownRow: { padding: spacing.md },
  dropdownText: { fontSize: fontSize.sm, color: colors.text },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.lg, fontSize: fontSize.sm },
  calcBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.xl },
  calcBtnDisabled: { backgroundColor: colors.border },
  calcBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  resultCard: {
    backgroundColor: colors.bg, borderRadius: radius.lg,
    padding: spacing.xl, borderWidth: 1.5, borderColor: colors.border,
  },
  resultTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  resultDivider: { height: 1, backgroundColor: colors.border },
  resultLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  resultValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '700' },
  resultPrice: { fontSize: fontSize.lg, color: colors.primary, fontWeight: '800' },
  disclaimer: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.lg, lineHeight: 16 },
  bookBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  bookBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
});
