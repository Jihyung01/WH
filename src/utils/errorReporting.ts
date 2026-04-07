import { Sentry } from '../config/sentry';

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return new Error(m);
  }
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  const err = toError(error);
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
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
