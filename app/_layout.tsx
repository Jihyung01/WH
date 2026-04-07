import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Alert } from 'react-native';
import * as Linking from 'expo-linking';

void SplashScreen.preventAutoHideAsync();

import { initAnalytics } from '../src/config/analytics';
import { initPurchases } from '../src/config/purchases';
import { ThemeProvider, useTheme, useThemeStore } from '../src/providers/ThemeProvider';
import { useNotificationStore } from '../src/stores/notificationStore';

function AppContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const responseListener = useRef<{ remove: () => void } | undefined>(undefined);
  const cancelled = useRef(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    cancelled.current = false;

    async function bootstrap() {
      try {
        await initAnalytics().catch(() => {});
        await initPurchases().catch(() => {});
        // Kakao: do NOT init on cold start — initializeKakaoSDK touches native TurboModules early and
        // can race Hermes / Sentry / display link (~20s crashes). First share/social/login path calls ensureKakaoInitialized().
        await useThemeStore.getState().loadOverride().catch(() => {});
        await useNotificationStore.getState().loadPrefs().catch(() => {});

        try {
          const notificationService = require('../src/services/notificationService').notificationService;
          notificationService.configure();
          await notificationService.registerPushToken().catch(() => {});
          await notificationService.scheduleDailyReminder().catch(() => {});
          await notificationService.scheduleStreakWarning(
            useNotificationStore.getState().prefs.streakWarning ? 7 : 0,
          ).catch(() => {});
        } catch {
          // notification module optional in some clients
        }

        try {
          require('../src/services/geofencing');
          const { backgroundLocationService } = require('../src/services/backgroundLocation');
          const { backgroundLocationEnabled, powerSaveMode } = useNotificationStore.getState();
          if (backgroundLocationEnabled && !powerSaveMode) {
            await backgroundLocationService.start().catch(() => {});
          }
        } catch {
          // background location optional
        }
      } catch (err) {
        console.warn('Bootstrap error:', err);
      }
    }

    void bootstrap();

    // Dynamic import: static `expo-notifications` breaks Expo Go SDK 53+ (projectId / push side effects)
    void (async () => {
      const Notifications = await import('expo-notifications').catch(() => null);
      if (!Notifications || cancelled.current) return;
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const ns = require('../src/services/notificationService').notificationService;
          const deepLink = ns.handleNotificationTap(response);
          if (deepLink) router.push(deepLink.replace('wherehere://', '/') as any);
        } catch {
          // ignore
        }
      });
    })();

    function handleDeepLink(event: { url: string }) {
      const parsed = Linking.parse(event.url);
      if (parsed.path === 'join' && parsed.queryParams?.code) {
        const code = String(parsed.queryParams.code);
        Alert.alert('크루 가입', `초대 코드 "${code}"로 크루에 가입하시겠어요?`, [
          { text: '취소', style: 'cancel' },
          {
            text: '가입',
            onPress: async () => {
              try {
                const { joinCrew } = require('../src/lib/api');
                await joinCrew(code);
                Alert.alert('가입 완료', '크루에 가입되었어요!');
                router.push('/(tabs)/social');
              } catch {
                Alert.alert('오류', '크루 가입에 실패했어요.');
              }
            },
          },
        ]);
      }
    }

    const linkingSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      cancelled.current = true;
      responseListener.current?.remove();
      linkingSub.remove();
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
        <Stack.Screen name="mission/ar-photo" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="reward/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="chat" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="create-event" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="journal" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="season" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="social" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="character-customize" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="shop" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="titles" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
  container: { flex: 1 },
});
