import * as Updates from 'expo-updates';

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Production: OTA를 받되, 네트워크가 멈춰도 앱 부팅을 막지 않도록 짧은 타임아웃을 둡니다.
 * 부트스트랩에서 await 하지 말고 void로만 호출하세요.
 */
export async function fetchOtaAndReloadIfNeeded(): Promise<void> {
  if (__DEV__) return;
  if (!Updates.isEnabled) {
    console.warn('[EAS] Updates disabled (embedded bundle only)');
    return;
  }

  try {
    console.warn(
      '[EAS] channel=',
      Updates.channel,
      'runtime=',
      Updates.runtimeVersion,
      'embedded=',
      Updates.isEmbeddedLaunch,
    );

    const fetched = await Promise.race([
      Updates.fetchUpdateAsync(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ota_fetch_timeout')), FETCH_TIMEOUT_MS),
      ),
    ]);

    if (fetched.isNew) {
      void Updates.reloadAsync();
    }
  } catch (e) {
    console.warn('[EAS] OTA fetch skipped:', e);
  }
}
