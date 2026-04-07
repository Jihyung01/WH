import { Platform } from 'react-native';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

/** True after request completes on iOS; always true on Android (no ATT). */
let trackingAuthorized = Platform.OS !== 'ios';

export function isMixpanelTrackingAllowed(): boolean {
  return trackingAuthorized;
}

/**
 * iOS: shows the App Tracking Transparency prompt before analytics that Apple classifies as tracking.
 * Call once early in app bootstrap (before Mixpanel init).
 */
export async function requestAppTrackingTransparency(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    trackingAuthorized = true;
    return true;
  }
  try {
    const { status: existing } = await getTrackingPermissionsAsync();
    if (existing === 'granted') {
      trackingAuthorized = true;
      return true;
    }
    const { status } = await requestTrackingPermissionsAsync();
    trackingAuthorized = status === 'granted';
    return trackingAuthorized;
  } catch {
    trackingAuthorized = false;
    return false;
  }
}
