import { Sentry } from '../config/sentry';

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } else {
    Sentry.captureMessage(String(error));
  }
}

export function setUserContext(userId: string, username?: string) {
  Sentry.setUser({ id: userId, username });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category: category ?? 'app',
    data,
    level: 'info',
  });
}
