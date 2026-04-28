import { UserEntity } from '../entities/User';

export interface IAuthRepository {
    signIn(email: string, password: string): Promise<UserEntity>;
    signInWithGoogle(): Promise<UserEntity>;
    signUpWithEmailPassword(
        email: string,
        password: string,
        displayName: string,
    ): Promise<UserEntity>;
    resendVerificationEmail(): Promise<void>;
    signOut(): Promise<void>;
    getCurrentUser(): Promise<UserEntity | null>;
    updateProfile(displayName: string, photoURL?: string): Promise<UserEntity>;
    resetPassword(email: string): Promise<void>;
}
