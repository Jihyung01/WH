import { useEffect, useLayoutEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Alert, InteractionManager } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

import { Sentry } from '../src/config/sentry';
import { initAnalytics } from '../src/config/analytics';
import { initPurchases } from '../src/config/purchases';
import { ThemeProvider, useTheme, useThemeStore } from '../src/providers/ThemeProvider';
import { useNotificationStore } from '../src/stores/notificationStore';
import { useAuthStore } from '../src/stores/authStore';
import { startupBreadcrumb, startupWatchdog } from '../src/utils/startupTelemetry';

/**
 * expo-router registers SplashScreen._internal_preventAutoHideAsync on a setTimeout(0)
 * and only dismisses via NavigationContainer onReady → _internal_maybeHideAsync. If that
 * path fails, users stay on the native launch image forever. We force-dismiss the native
 * layer here and repeat on a short schedule to win any race with expo-router's prevent.
 */
function useForceHideSplash() {
  useLayoutEffect(() => {
    startupBreadcrumb('splash_hide_layout');
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    startupBreadcrumb('splash_hide_effect');
    void SplashScreen.hideAsync();
    const run = () => void SplashScreen.hideAsync();
    const t0 = setTimeout(run, 0);
    const t1 = setTimeout(run, 32);
    const t2 = setTimeout(run, 120);
    const t3 = setTimeout(run, 500);
    const t4 = setTimeout(run, 1500);
    const ia = InteractionManager.runAfterInteractions(run);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      ia.cancel?.();
    };
  }, []);
}

function AppContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const responseListener = useRef<{ remove: () => void } | undefined>(undefined);

  useEffect(() => {
    startupBreadcrumb('app_content_mounted');
  }, []);

  useEffect(() => {
    const BOOTSTRAP_TIMEOUT_MS = 25_000;

    async function bootstrap() {
      try {
        let notificationService:
          | null
          | {
              configure: () => void;
              registerPushToken: () => Promise<string | null>;
              scheduleDailyReminder: () => Promise<void>;
              scheduleStreakWarning: (streakDays: number) => Promise<void>;
              handleNotificationTap: (response: unknown) => string | null;
            } = null;

        // Load background task modules defensively so startup doesn't crash
        // if a native task module is temporarily inconsistent on a given build.
        let backgroundLocationService:
          | { start: () => Promise<boolean> }
          | null = null;
        try {
          require('../src/services/geofencing');
          backgroundLocationService = require('../src/services/backgroundLocation').backgroundLocationService;
        } catch (taskLoadErr) {
          console.warn('Background task modules load failed (non-fatal):', taskLoadErr);
        }
        try {
          notificationService = require('../src/services/notificationService').notificationService;
        } catch (notifLoadErr) {
          console.warn('Notification service load failed (non-fatal):', notifLoadErr);
        }

        const stepMs = 6_000;
        await Promise.race([
          initAnalytics(),
          new Promise<void>((resolve) => setTimeout(resolve, stepMs)),
        ]);
        await Promise.race([
          initPurchases(),
          new Promise<void>((resolve) => setTimeout(resolve, stepMs)),
        ]);
        const prefsMs = 5_000;
        await Promise.race([
          useThemeStore.getState().loadOverride(),
          new Promise<void>((resolve) => setTimeout(resolve, prefsMs)),
        ]);
        await Promise.race([
          useNotificationStore.getState().loadPrefs(),
          new Promise<void>((resolve) => setTimeout(resolve, prefsMs)),
        ]);

        if (notificationService) {
          notificationService.configure();
          await notificationService.registerPushToken().catch(() => {});
          await notificationService.scheduleDailyReminder().catch(() => {});
          await notificationService.scheduleStreakWarning(
            useNotificationStore.getState().prefs.streakWarning ? 7 : 0,
          ).catch(() => {});
        }

        const { backgroundLocationEnabled, powerSaveMode } = useNotificationStore.getState();
        if (backgroundLocationEnabled && !powerSaveMode && backgroundLocationService) {
          await backgroundLocationService.start().catch(() => {});
        }

        // Dynamic import avoids SDK 53 Expo Go crash from static expo-notifications import
        const Notifications = await import('expo-notifications').catch(() => null);
        if (Notifications) {
          responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
              let deepLink: string | null = null;
              try {
                const svc = require('../src/services/notificationService').notificationService;
                deepLink = svc.handleNotificationTap(response);
              } catch {
                deepLink = null;
              }
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
        }
      } catch (err) {
        console.warn('Bootstrap error (non-fatal):', err);
      }
    }

    void Promise.race([
      bootstrap(),
      new Promise<void>((resolve) => setTimeout(resolve, BOOTSTRAP_TIMEOUT_MS)),
    ]);

    // Handle deep links (e.g. wherehere://join?code=XXX)
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
                Alert.alert('오류', '크루 가입에 실패했어요. 코드를 확인해주세요.');
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
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

function RootLayout() {
  useForceHideSplash();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    startupBreadcrumb('root_layout', { pathname: pathname ?? '' });
  }, [pathname]);

  useEffect(() => {
    const pulses = [2000, 5000, 10000].map((ms) =>
      setTimeout(() => {
        startupBreadcrumb(`js_alive_${ms}ms`, { pathname: pathnameRef.current ?? '' });
      }, ms),
    );
    return () => pulses.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const w15 = setTimeout(() => {
      const a = useAuthStore.getState();
      void startupWatchdog('15s', {
        pathname: pathnameRef.current ?? '',
        auth: {
          isAuthenticated: a.isAuthenticated,
          isLoading: a.isLoading,
          pendingOnboardingCheck: a.pendingOnboardingCheck,
          hasCompletedOnboarding: a.hasCompletedOnboarding,
        },
      });
    }, 15_000);
    const w30 = setTimeout(() => {
      const a = useAuthStore.getState();
      void startupWatchdog('30s', {
        pathname: pathnameRef.current ?? '',
        auth: {
          isAuthenticated: a.isAuthenticated,
          isLoading: a.isLoading,
          pendingOnboardingCheck: a.pendingOnboardingCheck,
          hasCompletedOnboarding: a.hasCompletedOnboarding,
        },
      });
    }, 30_000);
    return () => {
      clearTimeout(w15);
      clearTimeout(w30);
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
