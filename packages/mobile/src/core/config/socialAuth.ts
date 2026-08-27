import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Google Sign-In NATIVO (M-08).
 *
 * El intento de febrero murió por el proxy de Expo Go + un clientId
 * hardcodeado de OTRO proyecto. Con dev builds (M-02) el proxy no existe:
 * el SDK nativo habla directo con Google y devuelve un idToken que
 * `@react-native-firebase/auth` canjea por la MISMA cuenta de la web.
 *
 * Los client ids NO son secretos: son identificadores públicos que ya viven
 * en `google-services.json` / `GoogleService-Info.plist` dentro del binario.
 * Se declaran aquí para que el origen sea legible, no por seguridad.
 */

/** OAuth client de tipo web del proyecto — el que Firebase usa para verificar. */
const WEB_CLIENT_ID = '194439024220-2285ib54j3cqju2ostfh89h490bihu7e.apps.googleusercontent.com';
/** OAuth client de iOS (coincide con CLIENT_ID de GoogleService-Info.plist). */
const IOS_CLIENT_ID = '194439024220-dim4gco9uvhl887p3174m6odccjaeb5p.apps.googleusercontent.com';

export function configureGoogleSignIn(): void {
    GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        iosClientId: Platform.OS === 'ios' ? IOS_CLIENT_ID : undefined,
        offlineAccess: false,
        scopes: ['profile', 'email'],
    });
}

/**
 * Abre el diálogo nativo y devuelve el idToken de Google.
 * `null` = el usuario canceló (no es error: no se muestra toast).
 */
export async function getGoogleIdToken(): Promise<string | null> {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (result.type === 'cancelled') return null;
    return result.data?.idToken ?? null;
}

/** Cierra la sesión del SDK de Google (aparte de la de Firebase). */
export async function signOutGoogle(): Promise<void> {
    try {
        await GoogleSignin.signOut();
    } catch {
        // Si no había sesión de Google, no hay nada que cerrar.
    }
}
