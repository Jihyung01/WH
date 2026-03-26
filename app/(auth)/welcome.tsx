import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>📍</Text>
        <Text style={styles.title}>WhereHere</Text>
        <Text style={styles.subtitle}>새로운 장소를 발견하고{'\n'}모험을 시작하세요</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.startButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.startButtonText}>시작하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 28,
  },
  footer: {
    paddingTop: 24,
  },
  startButton: {
    backgroundColor: '#2DD4A8',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
