import * as Haptics from 'expo-haptics';

/**
 * Fire-and-forget haptics. Catches promise rejections so a bad haptic call
 * does not surface as an unhandled JS error (native crash paths are unchanged).
 */
export function fireNotificationSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function fireImpactMedium(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function fireImpactHeavy(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}
