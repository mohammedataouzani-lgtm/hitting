const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /\/functions\/.*/,
  ...config.resolver.blockList,
];


config.resolver.unstable_enablePackageExports = false;

module.exports = config;