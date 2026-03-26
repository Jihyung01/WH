import { View, Text, StyleSheet } from 'react-native';

export default function CustomizeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🎨</Text>
      <Text style={styles.title}>캐릭터 꾸미기</Text>
      <Text style={styles.subtitle}>외모를 변경하고 아이템을 장착하세요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8E8E93' },
});
