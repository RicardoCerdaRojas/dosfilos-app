import { User } from '../entities/user';

export interface AuthRepository {
    signIn(email: string, password: string): Promise<User>;
    signUp(email: string, password: string, firstName: string, lastName: string): Promise<User>;
    signInWithGoogle(idToken: string): Promise<User>;
    /** Apple Sign-In — obligatorio en iOS si se ofrece Google (guideline 4.8). */
    signInWithApple(identityToken: string, rawNonce: string): Promise<User>;
    signOut(): Promise<void>;
    getCurrentUser(): Promise<User | null>;
    sendPasswordResetEmail(email: string): Promise<void>;
    onAuthStateChanged(callback: (user: User | null) => void): () => void;
}
