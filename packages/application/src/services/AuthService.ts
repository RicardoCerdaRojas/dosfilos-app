import { FirebaseAuthRepository } from '@dosfilos/infrastructure';
import { UserEntity } from '@dosfilos/domain';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { signInWithCustomToken, getAuth } from 'firebase/auth';

interface CompleteRegistrationResult {
    success: boolean;
    userId: string;
    customToken: string;
    message: string;
}

interface CompleteRegistrationInput {
    sessionId: string;
    locale: 'en' | 'es';
}

interface CreateCheckoutSessionInput {
    /** Subscription price (ignored when `packId` is set). */
    priceId?: string;
    /** Credit-pack id for one-time purchase (drives Stripe mode=payment). */
    packId?: string;
    isNewRegistration?: boolean;
    email?: string;
    displayName?: string;
    locale?: 'en' | 'es';
    successUrl?: string;
    cancelUrl?: string;
}

export class AuthService {
    private authRepository: FirebaseAuthRepository;

    constructor() {
        this.authRepository = new FirebaseAuthRepository();
    }

    async login(email: string, password: string): Promise<UserEntity> {
        try {
            return await this.authRepository.signIn(email, password);
        } catch (error: any) {
            throw this.translateError(error);
        }
    }

    async loginWithGoogle(): Promise<UserEntity> {
        try {
            return await this.authRepository.signInWithGoogle();
        } catch (error: any) {
            // "Not registered" is a signal for the UI to redirect to /pricing — pass
            // it through unchanged so the caller can discriminate by code.
            if (error?.code === 'auth/not-registered') throw error;
            throw this.translateError(error);
        }
    }

    async logout(): Promise<void> {
        try {
            await this.authRepository.signOut();
        } catch (error: any) {
            throw this.translateError(error);
        }
    }

    async resetPassword(email: string): Promise<void> {
        try {
            await this.authRepository.resetPassword(email);
        } catch (error: any) {
            throw this.translateError(error);
        }
    }

    /**
     * Completes a Stripe-driven registration: invokes the `completeRegistration`
     * Cloud Function with the checkout session id, then signs the user in with
     * the returned custom token. Encapsulates the Firebase callable + auth so
     * UI code doesn't import `firebase/functions` or `firebase/auth` directly.
     */
    /**
     * Invokes the `createCheckoutSession` Cloud Function and returns the Stripe
     * hosted-checkout URL. Used by the register page (new subscription) and the
     * subscription page (plan upgrade). Encapsulates `httpsCallable` so UI code
     * doesn't import `firebase/functions` directly.
     */
    async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string }> {
        const functions = getFunctions();
        const callable = httpsCallable<CreateCheckoutSessionInput, { url: string }>(
            functions,
            'createCheckoutSession',
        );
        const result = await callable(input);
        return result.data;
    }

    async completeRegistration(input: CompleteRegistrationInput): Promise<{ userId: string; message: string }> {
        const functions = getFunctions();
        const callable = httpsCallable<CompleteRegistrationInput, CompleteRegistrationResult>(
            functions,
            'completeRegistration',
        );
        const result = await callable(input);
        const { customToken, userId, message } = result.data;
        await signInWithCustomToken(getAuth(), customToken);
        return { userId, message };
    }

    async getCurrentUser(): Promise<UserEntity | null> {
        try {
            return await this.authRepository.getCurrentUser();
        } catch (error: any) {
            throw this.translateError(error);
        }
    }

    private translateError(error: any): Error {
        const errorCode = error.code || '';
        const errorMessages: Record<string, string> = {
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/email-already-in-use': 'El email ya está registrado',
            'auth/weak-password': 'La contraseña es muy débil (mínimo 6 caracteres)',
            'auth/invalid-email': 'Email inválido',
            'auth/user-disabled': 'Usuario deshabilitado',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
            'auth/invalid-credential': 'Credenciales inválidas',
            'auth/popup-closed-by-user': 'Inicio de sesión cancelado',
            'auth/cancelled-popup-request': 'Inicio de sesión cancelado',
            'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este email usando otro método de inicio de sesión',
        };

        const message = errorMessages[errorCode] || error.message || 'Error desconocido';
        return new Error(message);
    }
}

// Singleton instance
export const authService = new AuthService();
