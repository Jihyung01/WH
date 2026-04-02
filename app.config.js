// Expo config — merges `app.json` with native build plugins (Kakao, build-properties).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require('./app.json');

const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY || '0000000000';

module.exports = () => {
  const expo = appJson.expo || {};
  const basePlugins = Array.isArray(expo.plugins) ? expo.plugins : [];

  return {
    expo: {
      ...expo,
      newArchEnabled: true,
      plugins: [
        [
          'expo-build-properties',
          {
            ios: { newArchEnabled: true },
            android: {
              newArchEnabled: true,
              extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'],
            },
          },
        ],
        [
          '@react-native-kakao/core',
          {
            nativeAppKey: KAKAO_NATIVE_APP_KEY,
            android: { forwardKakaoLinkIntentFilterToMainActivity: true },
          },
        ],
        ...basePlugins,
      ],
    },
  };
};
