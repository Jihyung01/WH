import { View, Text, StyleSheet } from 'react-native';

export default function SubscriptionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⭐</Text>
      <Text style={styles.title}>프리미엄 구독</Text>
      <Text style={styles.subtitle}>₩4,900/월로 특별한 혜택을 누리세요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8E8E93' },
});
