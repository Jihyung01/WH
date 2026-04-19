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

/**
 * Kakao 네이티브 로그인 + OIDC `id_token` — Supabase `signInWithIdToken({ provider: 'kakao' })` 용.
 *
 * 카카오 개발자 콘솔에서 **OpenID Connect 활성화** 및 동의 항목에 맞는 **scope**(최소 `openid`)가 필요합니다.
 * @see https://supabase.com/docs/guides/auth/social-login/auth-kakao#using-kakao-login-js-sdk
 */
export async function loginWithKakaoForSupabaseOidc(): Promise<{
  idToken: string;
  accessToken: string;
}> {
  await ensureKakaoInitialized();
  const KakaoUser = require('@react-native-kakao/user').default;

  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

  /**
   * @react-native-kakao/user: `scopes` / `prompts`는 `useKakaoAccountLogin === false`(카카오톡 앱 로그인)일 때
   * 전달할 수 없음(kAssert). OIDC `openid` 스코프가 필요하므로 항상 카카오계정 웹 로그인 경로를 쓴다.
   * (카카오톡 설치 기기에서 이전 로직은 즉시 assertion 실패 → 웹 OAuth만 의존하는 상태가 됨)
   */
  const token = await KakaoUser.login({
    useKakaoAccountLogin: true,
    scopes: ['openid', 'profile_nickname', 'profile_image'],
  });

  if (!token.idToken) {
    throw new Error(
      'Kakao OIDC id_token이 없습니다. 카카오 콘솔에서 OpenID Connect를 켜고 openid 스코프 동의를 설정하세요.',
    );
  }

  return { idToken: token.idToken, accessToken: token.accessToken };
}
