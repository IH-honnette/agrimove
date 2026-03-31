import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, fontSize } from '../theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚛</Text>
      <Text style={styles.title}>AgriMove</Text>
      <Text style={styles.sub}>Agricultural Logistics</Text>
      <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  icon: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sub: { fontSize: fontSize.base, color: colors.textMuted, marginBottom: 32 },
  spinner: { marginTop: 8 },
});
