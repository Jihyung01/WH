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
    environment: __DEV__ ? 'development' : 'production',
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
