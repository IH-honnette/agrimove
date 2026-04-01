import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme';

export default function DriverCard({ driver, onPress }) {
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
        <Text style={styles.name} numberOfLines={1}>{driver.name}</Text>
        <Text style={styles.vehicle} numberOfLines={1}>{driver.vehicle} · {driver.capacity}</Text>
        <View style={styles.tags}>
          <View style={styles.tagBlue}>
            <Text style={styles.tagTextBlue}>{driver.type}</Text>
          </View>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={[styles.dot, driver.available ? styles.dotGreen : styles.dotRed]} />
        <Text style={styles.location} numberOfLines={1}>📍 {driver.location}</Text>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  initials: { fontSize: fontSize.sm, fontWeight: '700', color: '#0369a1' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: 2 },
  vehicle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  tags: { flexDirection: 'row', gap: spacing.xs },
  tagBlue: { backgroundColor: '#e0f2fe', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagTextBlue: { fontSize: fontSize.xs, fontWeight: '600', color: '#0369a1', textTransform: 'capitalize' },
  meta: { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: colors.success },
  dotRed: { backgroundColor: colors.error },
  location: { fontSize: fontSize.xs, color: colors.textMuted, maxWidth: 90 },
  rating: { fontSize: fontSize.xs, color: '#92400e' },
});
