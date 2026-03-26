import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '페이지를 찾을 수 없습니다' }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.title}>길을 잃었나요?</Text>
        <Text style={styles.subtitle}>요청하신 페이지를 찾을 수 없습니다.</Text>
        <Link href="/(tabs)/map" style={styles.link}>
          <Text style={styles.linkText}>지도로 돌아가기</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  emoji: {
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
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
  },
  link: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2DD4A8',
    borderRadius: 12,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
