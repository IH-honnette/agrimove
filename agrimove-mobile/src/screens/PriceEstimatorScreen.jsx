import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { colors, spacing, radius, fontSize } from '../theme';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';
const BASE_PRICE = 1000;
const RATE_PER_KM = 1500;

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
      const estimatedPrice = Math.max(BASE_PRICE, Math.round(BASE_PRICE + RATE_PER_KM * distanceKm));
      setResult({ distanceText, distanceKm, durationText, estimatedPrice });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Shared autocomplete style — dropdown is absolutely positioned so it
  // floats OVER the content below instead of pushing it down.
  function autocompleteStyles(zIndexValue) {
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
        zIndex: zIndexValue,
        elevation: zIndexValue,
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
    fetchDetails: true,
    enablePoweredByContainer: false,
    query: { key: GOOGLE_KEY, language: 'en', components: 'country:rw' },
    textInputProps: { placeholderTextColor: colors.textMuted },
    keepResultsAfterBlur: false,
    minLength: 2,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Price Estimator</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.container}>
          {/* Driver / generic banner */}
          {driver ? (
            <View style={styles.driverBanner}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitials}>{driver.initials}</Text>
              </View>
              <View>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>Estimate transport cost for any route</Text>
            </View>
          )}

          {/*
            Each autocomplete sits in its own View with a fixed height (input + room for dropdown).
            The dropdown uses position:'absolute' so it overlays content below — no layout pushing.
            zIndex 20 for pickup, 10 for destination so pickup dropdown always shows on top.
          */}
          <Text style={styles.label}>Pickup Location</Text>
          <View style={[styles.acWrap, { zIndex: 20, elevation: 20 }]}>
            <GooglePlacesAutocomplete
              ref={pickupRef}
              placeholder="Search pickup location..."
              onPress={(data) => {
                setOriginPlaceId(data.place_id);
                setResult(null);
              }}
              styles={autocompleteStyles(20)}
              {...commonProps}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.xl }]}>Destination</Text>
          <View style={[styles.acWrap, { zIndex: 10, elevation: 10 }]}>
            <GooglePlacesAutocomplete
              ref={destRef}
              placeholder="Search destination..."
              onPress={(data) => {
                setDestPlaceId(data.place_id);
                setResult(null);
              }}
              styles={autocompleteStyles(10)}
              {...commonProps}
            />
          </View>

          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Calculate button */}
          <TouchableOpacity
            style={[styles.calcBtn, (!originPlaceId || !destPlaceId) && styles.calcBtnDisabled]}
            onPress={handleCalculate}
            disabled={loading || !originPlaceId || !destPlaceId}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.calcBtnText}>Calculate Distance & Price</Text>}
          </TouchableOpacity>

          {/* Result card */}
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
                * Estimate only. Actual price is agreed with the driver.
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
        </View>
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
  container: { flex: 1, padding: spacing.xl },
  driverBanner: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.xl,
  },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#bae6fd', alignItems: 'center', justifyContent: 'center' },
  driverInitials: { fontSize: fontSize.base, fontWeight: '700', color: '#0369a1' },
  driverName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  driverVehicle: { fontSize: fontSize.xs, color: colors.primaryDark, marginTop: 2 },
  infoBanner: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.xl, alignItems: 'center',
  },
  infoText: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  label: {
    fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted,
    marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  // Fixed height: 48px input + up to ~200px for dropdown overlay
  acWrap: { height: 48, marginBottom: spacing.md },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginTop: spacing.xl, marginBottom: spacing.md, fontSize: fontSize.sm },
  calcBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.xl },
  calcBtnDisabled: { backgroundColor: colors.border },
  calcBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  resultCard: {
    marginTop: spacing.xl, backgroundColor: colors.bg, borderRadius: radius.lg,
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
