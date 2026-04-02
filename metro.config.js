const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Metro on some Windows setups looks for lib/module/package.json and fails to resolve react-native-mmkv.
let mmkvModulePath;
try {
  mmkvModulePath = require.resolve('react-native-mmkv/lib/module/index.js');
} catch {
  mmkvModulePath = null;
}

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (mmkvModulePath && moduleName === 'react-native-mmkv') {
    return {
      filePath: mmkvModulePath,
      type: 'sourceFile',
    };
  }
  if (typeof upstreamResolveRequest === 'function') {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
