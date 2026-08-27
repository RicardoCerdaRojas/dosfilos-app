// CI typechequea sin los tipos generados por Expo (expo-env.d.ts está
// gitignoreado y se crea al correr `expo start`). Esta declaración trackeada
// cubre el side-effect import de global.css en ambos entornos.
declare module '*.css';
