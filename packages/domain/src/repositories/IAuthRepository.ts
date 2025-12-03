import { UserEntity } from '../entities/User';

export interface IAuthRepository {
    signIn(email: string, password: string): Promise<UserEntity>;
    signInWithGoogle(): Promise<UserEntity>;
    signUp(email: string, password: string, displayName: string): Promise<UserEntity>;
    signOut(): Promise<void>;
    getCurrentUser(): Promise<UserEntity | null>;
    updateProfile(displayName: string, photoURL?: string): Promise<UserEntity>;
    resetPassword(email: string): Promise<void>;
}
