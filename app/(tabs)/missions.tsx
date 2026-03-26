import { View, Text, StyleSheet } from 'react-native';

export default function MissionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>🎯</Text>
      <Text style={styles.title}>미션</Text>
      <Text style={styles.subtitle}>진행 중인 미션을 확인하세요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
