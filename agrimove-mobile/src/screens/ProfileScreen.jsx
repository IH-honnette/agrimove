import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize } from '../theme';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    // AppNavigator automatically switches to AuthStack when user becomes null
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </View>

        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}

        <View style={styles.divider} />

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Member since</Text>
          <Text style={styles.infoValue}>
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
              : '—'}
          </Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.bookingsBtn} onPress={() => navigation.navigate('MyBookings')}>
          <Text style={styles.bookingsBtnText}>📋  My Bookings</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  container: { flex: 1, alignItems: 'center', padding: spacing.xxl },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xl, marginBottom: spacing.lg,
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  email: { fontSize: fontSize.base, color: colors.textMuted, marginBottom: spacing.xs },
  phone: { fontSize: fontSize.base, color: colors.textMuted },
  divider: { width: '100%', height: 1, backgroundColor: colors.border, marginVertical: spacing.xxl },
  infoCard: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  bookingsBtn: {
    borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  bookingsBtnText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
  logoutBtn: {
    borderWidth: 2, borderColor: colors.error,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: fontSize.base },
});
