import * as Updates from 'expo-updates';
import { flush } from '@sentry/react-native';
import { Sentry } from '../config/sentry';

/** True when EXPO_PUBLIC_SENTRY_DSN was set at bundle time (Sentry actually runs in release). */
function sentryActive(): boolean {
  return !!(process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
}

export function startupBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!sentryActive()) return;
  try {
    Sentry.addBreadcrumb({
      category: 'startup',
      message,
      level: 'info',
      data,
    });
  } catch {
    /* ignore */
  }
}

/** Non-fatal “still here” signal — use when there is no thrown error (e.g. stuck splash). */
export async function startupWatchdog(
  label: string,
  extra: Record<string, unknown>,
): Promise<void> {
  if (!sentryActive()) return;
  try {
    const updates = {
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      isEmergencyLaunch: Updates.isEmergencyLaunch,
      emergencyLaunchReason: Updates.emergencyLaunchReason ?? null,
      launchDuration: Updates.launchDuration ?? null,
      updateId: Updates.updateId ?? null,
      runtimeVersion: Updates.runtimeVersion ?? null,
      channel: Updates.channel ?? null,
    };
    Sentry.captureMessage(`startup_watchdog:${label}`, {
      level: 'warning',
      extra: { ...extra, updates },
    });
    await flush().catch(() => {});
  } catch {
    /* ignore */
  }
}
