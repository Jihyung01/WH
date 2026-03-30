import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import { ThemeProvider, useTheme, useThemeStore } from '../src/providers/ThemeProvider';
import { notificationService } from '../src/services/notificationService';
import { useNotificationStore } from '../src/stores/notificationStore';
import { backgroundLocationService } from '../src/services/backgroundLocation';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    async function bootstrap() {
      try {
        await useThemeStore.getState().loadOverride();
        await useNotificationStore.getState().loadPrefs();

        notificationService.configure();
        await notificationService.registerPushToken().catch(() => {});
        await notificationService.scheduleDailyReminder().catch(() => {});
        await notificationService.scheduleStreakWarning(
          useNotificationStore.getState().prefs.streakWarning ? 7 : 0,
        ).catch(() => {});

        const { backgroundLocationEnabled, powerSaveMode } = useNotificationStore.getState();
        if (backgroundLocationEnabled && !powerSaveMode) {
          await backgroundLocationService.start().catch(() => {});
        }
      } catch (err) {
        console.warn('Bootstrap error (non-fatal):', err);
      } finally {
        SplashScreen.hideAsync();
      }
    }

    bootstrap();

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const deepLink = notificationService.handleNotificationTap(response);
        if (deepLink) {
          const path = deepLink.replace('wherehere://', '/');
          try {
            router.push(path as any);
          } catch {
            // route not found
          }
        }
      },
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="event/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="event/checkin/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="mission/[id]" />
        <Stack.Screen name="mission/complete/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="reward/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="chat" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="create-event" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="journal" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
