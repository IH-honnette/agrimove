import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { signup as apiSignup } from '../api/auth';
import { colors, spacing, radius, fontSize } from '../theme';

const VEHICLE_TYPES = ['Truck', 'Pickup', 'Van'];

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [role, setRole] = useState('customer');

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Driver-only fields
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState('');
  const [rate, setRate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required');
      return;
    }
    if (role === 'driver' && (!phone.trim() || !vehicle.trim() || !capacity.trim() || !location.trim() || !rate.trim())) {
      setError('All driver fields are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload = { name: name.trim(), email: email.trim(), password, role };
      if (role === 'driver') {
        Object.assign(payload, {
          phone: phone.trim(),
          vehicle: vehicle.trim(),
          type: vehicleType,
          capacity: capacity.trim(),
          location: location.trim(),
          rate: rate.trim(),
        });
      }
      const { token, user } = await apiSignup(payload);
      await login(token, user);
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

          <Text style={styles.logo}>🚛</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>Join AgriMove and connect with drivers</Text>

          {/* Role selector */}
          <Text style={styles.label}>I am a *</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'customer' && styles.roleCardActive]}
              onPress={() => setRole('customer')}
            >
              <Text style={styles.roleIcon}>🌾</Text>
              <Text style={[styles.roleName, role === 'customer' && styles.roleNameActive]}>Customer</Text>
              <Text style={[styles.roleSub, role === 'customer' && styles.roleSubActive]}>Farmer / Buyer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleCard, role === 'driver' && styles.roleCardActive]}
              onPress={() => setRole('driver')}
            >
              <Text style={styles.roleIcon}>🚛</Text>
              <Text style={[styles.roleName, role === 'driver' && styles.roleNameActive]}>Driver</Text>
              <Text style={[styles.roleSub, role === 'driver' && styles.roleSubActive]}>Transport Provider</Text>
            </TouchableOpacity>
          </View>

          {/* Common fields */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password (min 8 chars)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          {/* Driver-only fields */}
          {role === 'driver' && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionHeader}>Vehicle Details</Text>

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+250 7XX XXX XXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Vehicle Name *</Text>
              <TextInput
                style={styles.input}
                value={vehicle}
                onChangeText={setVehicle}
                placeholder="e.g. Isuzu Truck"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Vehicle Type *</Text>
              <View style={styles.typeRow}>
                {VEHICLE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, vehicleType === t && styles.typeChipActive]}
                    onPress={() => setVehicleType(t)}
                  >
                    <Text style={[styles.typeText, vehicleType === t && styles.typeTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Capacity *</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="e.g. 5 tonnes"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Base Location *</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Kigali, Musanze, Huye"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Daily Rate (RWF) *</Text>
              <TextInput
                style={styles.input}
                value={rate}
                onChangeText={setRate}
                placeholder="e.g. 15000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSignup} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkWrap}>
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flexGrow: 1, padding: spacing.xxl },
  back: { marginBottom: spacing.xl },
  backText: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600' },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  sub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xxl },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, marginBottom: spacing.lg },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.lg, fontSize: fontSize.sm },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.xl },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  linkWrap: { alignItems: 'center' },
  link: { fontSize: fontSize.sm, color: colors.textMuted },
  linkBold: { color: colors.primary, fontWeight: '600' },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  roleCard: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleIcon: { fontSize: 28, marginBottom: spacing.xs },
  roleName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: 2 },
  roleNameActive: { color: colors.primary },
  roleSub: { fontSize: fontSize.xs, color: colors.textMuted },
  roleSubActive: { color: colors.primaryDark },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.xl },
  sectionHeader: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  typeChip: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  typeTextActive: { color: colors.primary },
});
