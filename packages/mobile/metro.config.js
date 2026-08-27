const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// El SDK JS de Firebase (dep transitoria hasta @react-native-firebase, F0 PR-2)
// no resuelve su build de React Native cuando Metro usa package exports:
// "Component auth has not been registered yet" al arrancar.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
