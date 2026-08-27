import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';

/**
 * App Check desde el día 1 (M-04): la primera llamada real de la app
 * (getSermonsListSummary) lo exige. Producción: App Attest (iOS, con
 * fallback a DeviceCheck) + Play Integrity (Android). Desarrollo: provider
 * de debug — el token sale en el log nativo al arrancar y se registra en
 * Firebase console → App Check → Apps → Manage debug tokens.
 *
 * Riesgo abierto (M-09): Play Integrity puede fallar en la BOOX (e-ink,
 * certificación GMS variable). Verificar en F0 con el dispositivo real;
 * si falla, la BOOX interna corre con debug token provisionado.
 */
export async function initAppCheck(): Promise<void> {
  const provider = new ReactNativeFirebaseAppCheckProvider();
  provider.configure({
    apple: {
      provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
    },
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
    },
  });
  await initializeAppCheck(getApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}
