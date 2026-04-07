import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, skipping initialization');
    return;
  }

  try {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Verbose TouchEvents / integration logs only when explicitly debugging Sentry
    debug: process.env.EXPO_PUBLIC_SENTRY_DEBUG === '1',
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    /**
     * Do NOT set replays*SampleRate to 0 — @sentry/react-native treats any numeric rate as "replay enabled"
     * and still registers `mobileReplayIntegration()` + native RNSentryReplay* views. Omit both keys to skip replay entirely.
     */
    environment: __DEV__ ? 'development' : 'production',
    /** iOS: reduces extra threads / native hooks seen in crash stacks (app-hang-tracker). */
    enableAppHangTracking: false,
    /** Less JS loop instrumentation when tracing is on (stall integration + Hermes interaction). */
    enableStallTracking: false,
    beforeSend(event) {
      if (__DEV__) return null;
      return event;
    },
  });
  } catch (e) {
    console.warn('Sentry init failed:', e);
  }
}

export { Sentry };
