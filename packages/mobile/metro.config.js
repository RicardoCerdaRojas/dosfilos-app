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

// Herencia del SDK JS de Firebase: package exports queda apagado (ver historia
// en F0; el SDK nativo tampoco lo necesita).
config.resolver.unstable_enablePackageExports = false;

// `@dosfilos/domain` es TypeScript de fuente y algunos de sus imports internos
// llevan extensión `.js` (estilo NodeNext, válido para tsc y para el bundler de
// web). Metro los busca literalmente y no encuentra el archivo. Se resuelve
// reintentando sin la extensión SOLO para rutas relativas dentro de domain.
const domainSrc = path.join(workspaceRoot, "packages/domain/src");
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromDomain = context.originModulePath?.startsWith(domainSrc);
  if (fromDomain && moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    return context.resolveRequest(
      context,
      moduleName.slice(0, -".js".length),
      platform,
    );
  }
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
