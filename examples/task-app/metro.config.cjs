const { mergeConfig } = require('@react-native/metro-config');
const { getDefaultConfig } =
  process.env.CUSTOMITIN_WEB_BUILD === '1'
    ? require('expo/metro-config')
    : require('@react-native/metro-config');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [root],
  resolver: { nodeModulesPaths: [path.join(root, 'node_modules')] },
});
