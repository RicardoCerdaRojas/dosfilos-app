const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Monorepo (M-01): @dosfilos/domain es TS puro consumible por la tablet.
// Metro no sigue symlinks de workspaces por sí solo: se vigila la raíz y se
// resuelve el paquete directo a su fuente. Los tipos van por paths en
// tsconfig.json (mismo patrón que packages/web).
const workspaceRoot = path.resolve(__dirname, "../..");
config.watchFolders = [path.join(workspaceRoot, "packages/domain")];
config.resolver.extraNodeModules = {
  "@dosfilos/domain": path.join(workspaceRoot, "packages/domain/src"),
};

// El SDK JS de Firebase (dep transitoria hasta @react-native-firebase, F0 PR-2)
// no resuelve su build de React Native cuando Metro usa package exports:
// "Component auth has not been registered yet" al arrancar.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
