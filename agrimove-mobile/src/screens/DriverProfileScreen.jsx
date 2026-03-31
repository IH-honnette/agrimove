import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize } from '../theme';

export default function DriverProfileScreen({ route, navigation }) {
  const { driver } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Tap backdrop to dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={() => navigation.goBack()}
        activeOpacity={1}
      />

      {/* Bottom sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{driver.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{driver.name}</Text>
              <Text style={styles.vehicle}>{driver.vehicle}</Text>
              <View style={styles.tags}>
                <View style={styles.tagBlue}>
                  <Text style={[styles.tagText, { color: '#0369a1' }]}>{driver.type}</Text>
                </View>
                <View style={driver.available ? styles.tagGreen : styles.tagRed}>
                  <Text style={[styles.tagText, { color: driver.available ? '#15803d' : '#be123c' }]}>
                    {driver.available ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { val: String(driver.rating), lbl: 'Rating' },
              { val: String(driver.trips), lbl: 'Trips' },
              { val: driver.capacity, lbl: 'Capacity' },
              { val: `${Number(driver.rate).toLocaleString()}`, lbl: 'RWF/day' },
            ].map(s => (
              <View key={s.lbl} style={styles.stat}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLbl}>{s.lbl}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {driver.available ? (
            <>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => navigation.navigate('BookingForm', { driver })}
              >
                <Text style={styles.btnText}>Book This Driver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => navigation.navigate('PriceEstimator', { driver })}
              >
                <Text style={styles.btnOutlineText}>🧮  Estimate Cost</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.unavailable}>This driver is currently unavailable.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    maxHeight: '82%',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.xl },
  profileHeader: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl, alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  initials: { fontSize: fontSize.lg, fontWeight: '700', color: '#0369a1' },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: 2 },
  vehicle: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.sm },
  tags: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  tagBlue: { backgroundColor: '#e0f2fe', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagGreen: { backgroundColor: '#f0fdf4', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagRed: { backgroundColor: '#fff1f2', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xl },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginBottom: 2 },
  statLbl: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.xl },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  btnOutline: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  btnOutlineText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
  unavailable: { textAlign: 'center', color: colors.textMuted, padding: spacing.md, marginBottom: spacing.md },
});
