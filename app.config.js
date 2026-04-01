// Expo config (dynamic) - required for config plugins that need build-time values.
// We keep most fields in `app.json` and inject secrets via env vars here.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require('./app.json');

// Kakao native app key is required for Kakao SDK prebuild steps.
// We use a non-empty placeholder to avoid config evaluation failures in local tooling;
// for real builds, set `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` in EAS env.
const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY || '0000000000';

module.exports = () => {
  const expo = appJson.expo || {};
  const basePlugins = Array.isArray(expo.plugins) ? expo.plugins : [];

  return {
    ...expo,
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'],
          },
        },
      ],
      [
        '@react-native-kakao/core',
        {
          nativeAppKey: KAKAO_NATIVE_APP_KEY,
          android: {
            forwardKakaoLinkIntentFilterToMainActivity: true,
          },
        },
      ],
      ...basePlugins,
    ],
  };
};

