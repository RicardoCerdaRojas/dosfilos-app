import { Stack } from 'expo-router';

/**
 * La Biblia es UNA pantalla. Antes eran cuatro rutas —biblioteca, lector,
 * búsqueda— porque el selector de libro y el de versión eran destinos. Ahora
 * son controles del lector, así que el stack tiene una sola pantalla.
 */
export default function BibleLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
      <Stack.Screen name="index" />
    </Stack>
  );
}
