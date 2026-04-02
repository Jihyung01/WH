let kakaoInitPromise: Promise<void> | null = null;

export function ensureKakaoInitialized(): Promise<void> {
  if (kakaoInitPromise) return kakaoInitPromise;

  kakaoInitPromise = (async () => {
    const appKey = (process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? '').trim();
    if (!appKey) {
      throw new Error('EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY is missing');
    }

    const KakaoCore = require('@react-native-kakao/core').default;
    await KakaoCore.initializeKakaoSDK(appKey);
  })();

  return kakaoInitPromise;
}

