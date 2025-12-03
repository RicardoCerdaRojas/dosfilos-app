import { FirebaseAuthRepository } from '@dosfilos/infrastructure';
import { UserEntity } from '@dosfilos/domain';

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
            throw this.translateError(error);
        }
    }

    async register(email: string, password: string, displayName: string): Promise<UserEntity> {
        try {
            return await this.authRepository.signUp(email, password, displayName);
        } catch (error: any) {
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
