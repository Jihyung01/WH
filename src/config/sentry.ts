import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    environment: __DEV__ ? 'development' : 'production',
    beforeSend(event) {
      if (__DEV__) return null;
      return event;
    },
  });
}

export { Sentry };
