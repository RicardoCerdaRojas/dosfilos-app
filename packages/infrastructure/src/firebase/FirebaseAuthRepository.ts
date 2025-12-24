import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile as firebaseUpdateProfile,
    sendPasswordResetEmail,
    signInWithPopup,
    GoogleAuthProvider,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { IAuthRepository } from '@dosfilos/domain';
import { UserEntity } from '@dosfilos/domain';
import { auth, db, functions } from '../config/firebase';

export class FirebaseAuthRepository implements IAuthRepository {
    async signIn(email: string, password: string): Promise<UserEntity> {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Track login
        this.trackLogin().catch(err => console.warn('[Auth] Failed to track login:', err));

        return this.mapFirebaseUserToEntity(userCredential.user);
    }

    async signInWithGoogle(): Promise<UserEntity> {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account',
        });

        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;

        // Check if this is a new user by looking at metadata
        const isNewUser = userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime;

        // Create or update user document in Firestore
        const userData: any = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            updatedAt: serverTimestamp(),
        };

        // Only set createdAt for new users
        if (isNewUser) {
            userData.createdAt = serverTimestamp();
        }

        await setDoc(
            doc(db, 'users', user.uid),
            userData,
            { merge: true }
        );

        // Track login
        this.trackLogin().catch(err => console.warn('[Auth] Failed to track login:', err));

        return this.mapFirebaseUserToEntity(user);
    }

    async signUp(email: string, password: string, displayName: string): Promise<UserEntity> {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile with display name
        await firebaseUpdateProfile(user, { displayName });

        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName,
            photoURL: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Track login (first login for new user)
        this.trackLogin().catch(err => console.warn('[Auth] Failed to track login:', err));

        return this.mapFirebaseUserToEntity(user);
    }

    async signOut(): Promise<void> {
        await firebaseSignOut(auth);
    }

    async getCurrentUser(): Promise<UserEntity | null> {
        const user = auth.currentUser;
        if (!user) return null;

        return this.mapFirebaseUserToEntity(user);
    }

    async updateProfile(displayName: string, photoURL?: string): Promise<UserEntity> {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }

        await firebaseUpdateProfile(user, { displayName, photoURL });

        // Update user document in Firestore
        await setDoc(
            doc(db, 'users', user.uid),
            {
                displayName,
                photoURL: photoURL ?? null,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        return this.mapFirebaseUserToEntity(user);
    }

    async resetPassword(email: string): Promise<void> {
        await sendPasswordResetEmail(auth, email);
    }

    private mapFirebaseUserToEntity(firebaseUser: FirebaseUser): UserEntity {
        return UserEntity.create({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
        });
    }

    /**
     * Track user login via Cloud Function
     * Non-blocking - errors are logged but don't affect authentication flow
     */
    private async trackLogin(): Promise<void> {
        try {
            const trackLoginFn = httpsCallable(functions, 'onUserLogin');
            await trackLoginFn();
        } catch (error) {
            // Silently fail - analytics shouldn't break auth flow
            console.error('[Auth] Analytics tracking error:', error);
        }
    }
}
