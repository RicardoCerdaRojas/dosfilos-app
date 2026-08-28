import { create } from 'zustand';
import { User } from '@/domain/entities/user';
import { AuthRepositoryImpl } from '@/data/repositories/auth.repository.impl';

// Instantiate repository - in a reel app, this might be injected
const authRepository = new AuthRepositoryImpl();

interface AuthState {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
    signInWithGoogle: (idToken: string) => Promise<void>;
    signInWithApple: (identityToken: string, rawNonce: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    signIn: async (email, password) => {
        try {
            set({ isLoading: true });
            const user = await authRepository.signIn(email, password);
            set({ user, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            console.warn('Sign in failed', error);
            throw error;
        }
    },
    signUp: async (email, password, firstName, lastName) => {
        try {
            set({ isLoading: true });
            const user = await authRepository.signUp(email, password, firstName, lastName);
            set({ user, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            console.warn('Sign up failed', error);
            throw error;
        }
    },
    signInWithGoogle: async (idToken) => {
        try {
            set({ isLoading: true });
            const user = await authRepository.signInWithGoogle(idToken);
            set({ user, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            console.warn('Google sign in failed', error);
            throw error;
        }
    },
    signInWithApple: async (identityToken, rawNonce) => {
        try {
            set({ isLoading: true });
            const user = await authRepository.signInWithApple(identityToken, rawNonce);
            set({ user, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            console.warn('Apple sign in failed', error);
            throw error;
        }
    },
    signOut: async () => {
        await authRepository.signOut();
        set({ user: null });
    },
    resetPassword: async (email) => {
        await authRepository.sendPasswordResetEmail(email);
    },
    setUser: (user) => set({ user, isLoading: false }),
}));

// Initialize subscription
authRepository.onAuthStateChanged((user) => {
    useAuthStore.getState().setUser(user);
});
