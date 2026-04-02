// Expo config (dynamic) - required for config plugins that need build-time values.
// We keep most fields in `app.json` and inject secrets via env vars here.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require('./app.json');

// Kakao native app key is required for Kakao SDK prebuild steps.
// We use a non-empty placeholder to avoid config evaluation failures in local tooling;
// for real builds, set `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` in EAS env.
const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY || '0000000000';

/** Store/TestFlight production builds must not ship the dev-client native plugin. */
const isEasProduction = process.env.EAS_BUILD_PROFILE === 'production';

function withoutExpoDevClient(plugins) {
  if (!isEasProduction) return plugins;
  return plugins.filter((p) => {
    const name = Array.isArray(p) ? p[0] : p;
    return name !== 'expo-dev-client';
  });
}

module.exports = () => {
  const expo = appJson.expo || {};
  const basePlugins = withoutExpoDevClient(Array.isArray(expo.plugins) ? expo.plugins : []);

  return {
    ...expo,
    // Force old architecture — New Arch + some native modules (e.g. Kakao) is a common startup crash source.
    newArchEnabled: false,
    plugins: [
      [
        'expo-build-properties',
        {
          ios: {
            newArchEnabled: false,
          },
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

