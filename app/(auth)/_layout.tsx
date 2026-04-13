import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F172A' },
        animation: 'fade_from_bottom',
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="personality-quiz" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
