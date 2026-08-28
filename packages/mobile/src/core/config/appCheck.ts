import { getApp } from '@react-native-firebase/app';
import {
    getToken,
    initializeAppCheck,
    ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';

/**
 * App Check desde el día 1 (M-04): la primera llamada real de la app
 * (getSermonsListSummary) lo exige.
 *
 * PROVEEDOR. En iOS va App Attest a secas, NO
 * `appAttestWithDeviceCheckFallback`. El fallback parecía prudente y es lo
 * contrario: si App Attest falla, cae a DeviceCheck — que no está registrado
 * en la consola— y entonces el SDK entrega su token de relleno. El servidor
 * recibe algo que no es un JWT y responde "Decoding App Check token failed",
 * un mensaje que describe el síntoma y esconde la causa. Sin fallback, App
 * Attest falla a la vista.
 *
 * ESCAPE PARA BUILDS INTERNOS. `EXPO_PUBLIC_APPCHECK_DEBUG=1` fuerza el
 * proveedor de debug también en builds firmados, para poder probar en un
 * dispositivo cuyo token de debug se registró a mano en la consola (M-09
 * previó esto para la BOOX, donde Play Integrity puede no estar disponible).
 * Viene APAGADO. Debilita App Check en el build que lo lleve, así que no se
 * activa para producción — sólo para distribución interna.
 */
export async function initAppCheck(): Promise<void> {
    const forceDebug = process.env.EXPO_PUBLIC_APPCHECK_DEBUG === '1';
    const useDebug = __DEV__ || forceDebug;

    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
        apple: { provider: useDebug ? 'debug' : 'appAttest' },
        android: { provider: useDebug ? 'debug' : 'playIntegrity' },
    });

    const appCheck = await initializeAppCheck(getApp(), {
        provider,
        isTokenAutoRefreshEnabled: true,
    });

    // El token se pide UNA vez al arrancar sólo para que su fallo quede en el
    // log. Sin esto, el error vive en el log nativo del SDK y desde el lado
    // del servidor todo lo que se ve es "el token no es un JWT".
    // Nunca se registra el token en sí: sólo si vino y, si no, por qué.
    try {
        const result = await getToken(appCheck, false);
        console.log(
            `[appCheck] proveedor=${useDebug ? 'debug' : 'attest'} token=${
                result?.token ? 'ok' : 'vacío'
            }`,
        );
    } catch (error) {
        console.error(`[appCheck] no se pudo emitir el token (${useDebug ? 'debug' : 'attest'}):`, error);
    }
}
