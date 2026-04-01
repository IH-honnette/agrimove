import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchDriverBookings } from '../api/bookings';
import { colors, spacing, radius, fontSize } from '../theme';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
  completed: { bg: '#e0f2fe', color: '#0369a1', label: 'Completed' },
  cancelled: { bg: '#fee2e2', color: '#be123c', label: 'Cancelled' },
};

function BookingCard({ item }) {
  const s = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
  const rawPhone = (item.customer_phone || '').replace(/\s/g, '');

  async function handleCall() {
    const url = `tel:${rawPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot call', `Call the customer at ${item.customer_phone}`);
    }
  }

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardTop}>
        <View style={styles.customerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.customer_name)}</Text>
          </View>
          <View>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <Text style={styles.customerPhone}>{item.customer_phone}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>📍</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup_location}</Text>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>🏁</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>

      {item.cargo_type ? (
        <Text style={styles.cargo}>📦 {item.cargo_type}</Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        {item.status === 'pending' && (
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <Text style={styles.callBtnText}>📞 Call Customer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function DriverDashboardScreen({ navigation }) {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchDriverBookings(token);
      setBookings(data);
    } catch {
      setError('Could not load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const pending = bookings.filter(b => b.status === 'pending');
  const others  = bookings.filter(b => b.status !== 'pending');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.headerSub}>Driver Dashboard</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarCircleText}>{getInitials(user?.name)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[...pending, ...others]}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <BookingCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{bookings.length}</Text>
                <Text style={styles.statLbl}>Total</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxAccent]}>
                <Text style={[styles.statNum, { color: '#854d0e' }]}>{pending.length}</Text>
                <Text style={styles.statLbl}>Pending</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{bookings.filter(b => b.status === 'completed').length}</Text>
                <Text style={styles.statLbl}>Completed</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySub}>Requests from customers will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  greeting: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarCircleText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  list: { padding: spacing.lg },
  statsRow: {
    flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  statBoxAccent: { backgroundColor: '#fef9c3' },
  statNum: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  statLbl: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  customerName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  customerPhone: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  route: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeIcon: { fontSize: 14 },
  routeText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  routeDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs, marginLeft: 22 },
  cargo: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  date: { fontSize: fontSize.xs, color: colors.textMuted },
  callBtn: { backgroundColor: colors.success, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  callBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.xs },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  retryText: { color: colors.white, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
