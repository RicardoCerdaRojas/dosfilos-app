import { User } from '@/domain/entities/user';
import { AuthRepository } from '@/domain/repositories/auth.repository';
import { getFirebaseAuth } from '@/data/sources/firebase.source';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, sendPasswordResetEmail, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';

export class AuthRepositoryImpl implements AuthRepository {
    async signIn(email: string, password: string): Promise<User> {
        try {
            const auth = getFirebaseAuth();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Map Firebase user to Domain User
            const fbUser = userCredential.user;
            return {
                id: fbUser.uid,
                email: fbUser.email || '',
                firstName: fbUser.displayName?.split(' ')[0] || '',
                lastName: fbUser.displayName?.split(' ').slice(1).join(' ') || '',
                photoUrl: fbUser.photoURL || undefined,
                role: 'viewer', // Default role, should fetch from Firestore claims or DB
            };
        } catch (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    }

    async signUp(email: string, password: string, firstName: string, lastName: string): Promise<User> {
        try {
            const auth = getFirebaseAuth();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const fbUser = userCredential.user;

            await updateProfile(fbUser, {
                displayName: `${firstName} ${lastName}`.trim()
            });

            return {
                id: fbUser.uid,
                email: fbUser.email || '',
                firstName: firstName,
                lastName: lastName,
                photoUrl: fbUser.photoURL || undefined,
                role: 'viewer',
            };
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    }

    async signInWithGoogle(idToken: string): Promise<User> {
        try {
            const auth = getFirebaseAuth();
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            const fbUser = userCredential.user;

            return {
                id: fbUser.uid,
                email: fbUser.email || '',
                firstName: fbUser.displayName?.split(' ')[0] || '',
                lastName: fbUser.displayName?.split(' ').slice(1).join(' ') || '',
                photoUrl: fbUser.photoURL || undefined,
                role: 'viewer',
            };
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        const auth = getFirebaseAuth();
        await signOut(auth);
    }

    async getCurrentUser(): Promise<User | null> {
        const auth = getFirebaseAuth();
        const fbUser = auth.currentUser;
        if (!fbUser) return null;
        return {
            id: fbUser.uid,
            email: fbUser.email || '',
            firstName: fbUser.displayName?.split(' ')[0] || '',
            lastName: fbUser.displayName?.split(' ').slice(1).join(' ') || '',
            photoUrl: fbUser.photoURL || undefined,
            role: 'viewer', // Default role, should fetch from Firestore claims or DB
        };
    }
    async sendPasswordResetEmail(email: string): Promise<void> {
        const auth = getFirebaseAuth();
        await sendPasswordResetEmail(auth, email);
    }

    onAuthStateChanged(callback: (user: User | null) => void): () => void {
        const auth = getFirebaseAuth();
        return onAuthStateChanged(auth, (fbUser) => {
            if (fbUser) {
                callback({
                    id: fbUser.uid,
                    email: fbUser.email || '',
                    firstName: fbUser.displayName?.split(' ')[0] || '',
                    lastName: fbUser.displayName?.split(' ').slice(1).join(' ') || '',
                    photoUrl: fbUser.photoURL || undefined,
                    role: 'viewer', // Default role
                });
            } else {
                callback(null);
            }
        });
    }
}
