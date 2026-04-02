import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useLayoutEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../../src/stores/authStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const {
    isLoading,
    isAuthenticated,
    hasCompletedOnboarding,
    pendingOnboardingCheck,
    initializeAuth,
  } = useAuthStore();

  useLayoutEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    void initializeAuth();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      useAuthStore.getState().forceAuthGateOpen();
    }, 12_000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isLoading || pendingOnboardingCheck) return;
    if (isAuthenticated && hasCompletedOnboarding) {
      router.replace('/(tabs)/map');
    } else if (isAuthenticated && !hasCompletedOnboarding) {
      router.replace('/(auth)/onboarding');
    }
  }, [isLoading, isAuthenticated, hasCompletedOnboarding, pendingOnboardingCheck, router]);

  const busy = isLoading || (isAuthenticated && pendingOnboardingCheck);

  return (
    <View style={styles.container}>
      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color="#2DD4A8" />
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.logo}>📍</Text>
        <Text style={styles.title}>WhereHere</Text>
        <Text style={styles.subtitle}>새로운 장소를 발견하고{'\n'}모험을 시작하세요</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.startButton, busy && styles.startButtonDisabled]}
          onPress={() => router.push('/(auth)/login')}
          disabled={busy}
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
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
