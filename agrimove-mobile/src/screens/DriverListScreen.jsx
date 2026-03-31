import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchDrivers } from '../api/drivers';
import DriverCard from '../components/DriverCard';
import FilterChip from '../components/FilterChip';
import { colors, spacing, fontSize, radius } from '../theme';

const TYPE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Truck', value: 'truck' },
  { label: 'Pickup', value: 'pickup' },
  { label: 'Van', value: 'van' },
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function DriverListScreen({ navigation }) {
  const { user, token } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const loadDrivers = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchDrivers(
        { type: activeType || undefined, available: availableOnly || undefined },
        token
      );
      setDrivers(data);
    } catch {
      setError('Could not load drivers. Check your connection and make sure the server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeType, availableOnly, token]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  function onRefresh() {
    setRefreshing(true);
    loadDrivers();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🚛</Text>
          <Text style={styles.logoText}>AgriMove</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {TYPE_FILTERS.map(f => (
            <FilterChip
              key={f.label}
              label={f.label}
              active={activeType === f.value}
              onPress={() => setActiveType(f.value)}
            />
          ))}
          <FilterChip
            label="Available"
            active={availableOnly}
            onPress={() => setAvailableOnly(v => !v)}
          />
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadDrivers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <DriverCard
              driver={item}
              onPress={() => navigation.navigate('DriverProfile', { driver: item })}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.count}>
              {drivers.length} driver{drivers.length !== 1 ? 's' : ''} found
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No drivers match your filters.</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  filterWrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { padding: spacing.lg },
  count: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  retryText: { color: colors.white, fontWeight: '600' },
});
