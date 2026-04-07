import { InteractionManager } from 'react-native';

let kakaoInitPromise: Promise<void> | null = null;

/**
 * Initializes Kakao native SDK once. Lazy — not called from app bootstrap.
 * Uses runAfterInteractions so TurboModules + Hermes settle before native init (iOS crash mitigation).
 */
export function ensureKakaoInitialized(): Promise<void> {
  if (kakaoInitPromise) return kakaoInitPromise;

  kakaoInitPromise = (async () => {
    try {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });

      const appKey = (process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? '').trim();
      if (!appKey) {
        throw new Error('EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY is missing');
      }

      const KakaoCore = require('@react-native-kakao/core').default;
      await KakaoCore.initializeKakaoSDK(appKey);
    } catch (e) {
      kakaoInitPromise = null;
      throw e;
    }
  })();

  return kakaoInitPromise;
}

/**
 * Supabase 카카오 OAuth alone does not create a native SDK session. Talk Social (picker, send-to-friends)
 * needs KakaoUser.login — same Kakao account, SDK-only authorization (not your Supabase session).
 */
export async function ensureKakaoUserSessionForSocial(): Promise<void> {
  await ensureKakaoInitialized();
  const KakaoUser = require('@react-native-kakao/user').default;
  if (await KakaoUser.isLogined()) return;

  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

  // scopes/prompts require Kakao account login path (SDK assertion if false).
  await KakaoUser.login({
    useKakaoAccountLogin: true,
    scopes: ['profile_nickname', 'profile_image'],
  });
}
