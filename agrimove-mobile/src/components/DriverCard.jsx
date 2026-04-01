import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme';

function isLive(updatedAt) {
  if (!updatedAt) return false;
  return (Date.now() - new Date(updatedAt).getTime()) < 10 * 60 * 1000; // 10 min
}

export default function DriverCard({ driver, onPress }) {
  const live = isLive(driver.location_updated_at);
  const displayLocation = driver.location_address || driver.location || '';

  return (
    <TouchableOpacity
      style={[styles.card, !driver.available && styles.cardDimmed]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.avatar}>
        <Text style={styles.initials}>{driver.initials}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{driver.name}</Text>
          {live && <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>}
        </View>
        <Text style={styles.vehicle} numberOfLines={1}>{driver.vehicle} · {driver.capacity}</Text>
        <View style={styles.locRow}>
          <Text style={styles.locIcon}>📍</Text>
          <Text style={styles.locText} numberOfLines={1}>{displayLocation || '—'}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={[styles.dot, driver.available ? styles.dotGreen : styles.dotRed]} />
        {driver.distance_km != null
          ? <Text style={styles.distance}>{driver.distance_km} km</Text>
          : null}
        <View style={styles.tagBlue}>
          <Text style={styles.tagTextBlue}>{driver.type}</Text>
        </View>
        <Text style={styles.rating}>⭐ {driver.rating}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardDimmed: { opacity: 0.55 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md, flexShrink: 0,
  },
  initials: { fontSize: fontSize.sm, fontWeight: '700', color: '#0369a1' },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flexShrink: 1 },
  liveBadge: { backgroundColor: colors.success, borderRadius: radius.full, paddingHorizontal: 5, paddingVertical: 1 },
  liveText: { fontSize: 9, fontWeight: '800', color: colors.white, letterSpacing: 0.5 },
  vehicle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locIcon: { fontSize: 11 },
  locText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  meta: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: colors.success },
  dotRed: { backgroundColor: colors.error },
  distance: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  tagBlue: { backgroundColor: '#e0f2fe', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagTextBlue: { fontSize: fontSize.xs, fontWeight: '600', color: '#0369a1', textTransform: 'capitalize' },
  rating: { fontSize: fontSize.xs, color: '#92400e' },
});
