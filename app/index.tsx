import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { COLORS } from '../src/config/theme';

export default function Index() {
  const { isAuthenticated, hasCompletedOnboarding, isLoading, pendingOnboardingCheck, initializeAuth } =
    useAuthStore();

  useEffect(() => {
    const failSafe = setTimeout(() => {
      useAuthStore.getState().forceAuthGateOpen();
    }, 8_000);
    void initializeAuth();
    return () => clearTimeout(failSafe);
  }, []);

  const showGate = isLoading || (isAuthenticated && pendingOnboardingCheck);

  if (showGate) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)/map" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
