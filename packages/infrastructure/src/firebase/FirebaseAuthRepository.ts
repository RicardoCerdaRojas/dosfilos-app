import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile as firebaseUpdateProfile,
    sendPasswordResetEmail,
    signInWithPopup,
    GoogleAuthProvider,
    User as FirebaseUser,
    applyActionCode as firebaseApplyActionCode,
    verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
    confirmPasswordReset as firebaseConfirmPasswordReset,
    checkActionCode as firebaseCheckActionCode,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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

        // Google is LOGIN-ONLY. Registration is strictly payment-first, so a Google
        // account with no matching Firestore profile means the user hasn't completed
        // the trial sign-up yet. Delete the Auth user we just created to keep the
        // system clean and throw a typed error so the UI can redirect to /pricing.
        const userRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(userRef);
        if (!profileSnap.exists()) {
            try {
                await user.delete();
            } catch {
                await firebaseSignOut(auth);
            }
            const err = new Error('GOOGLE_ACCOUNT_NOT_REGISTERED');
            (err as any).code = 'auth/not-registered';
            throw err;
        }

        // Existing user — refresh profile metadata.
        await setDoc(
            userRef,
            {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        this.trackLogin().catch(err => console.warn('[Auth] Failed to track login:', err));

        return this.mapFirebaseUserToEntity(user);
    }

    /**
     * Direct email+password signup — used by the public Free signup flow.
     *
     * Paid users go through Stripe Checkout → webhook → completeRegistration
     * (server-side admin SDK). Free users skip Stripe entirely, so we create
     * the Auth account client-side and let the caller (AuthService.registerFree)
     * write the Firestore profile and trigger the welcome email.
     *
     * Returns the created UserEntity. Caller is responsible for writing the
     * `users/{uid}` doc — this method only handles Auth.
     */
    async signUpWithEmailPassword(
        email: string,
        password: string,
        displayName: string,
    ): Promise<UserEntity> {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await firebaseUpdateProfile(credential.user, { displayName });
        // updateProfile mutates the in-memory user but `mapFirebaseUserToEntity`
        // reads the value at call time, so reload to be safe across SDK versions.
        await credential.user.reload();

        // The verification email is dispatched server-side by the
        // `sendWelcomeEmail` auth onCreate trigger, which embeds the branded
        // verify link inside the welcome email (Resend, not Firebase native).

        return this.mapFirebaseUserToEntity(credential.user);
    }

    /**
     * Resends the branded verification email to the currently signed-in user.
     * Routes through the `resendVerificationEmail` callable (Resend) instead
     * of Firebase's native `sendEmailVerification`, which has been failing
     * silently in this project.
     */
    async resendVerificationEmail(): Promise<void> {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }
        if (user.emailVerified) {
            throw new Error('Email already verified');
        }
        const fn = httpsCallable(functions, 'resendVerificationEmail');
        await fn();
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

    async applyActionCode(oobCode: string): Promise<void> {
        await firebaseApplyActionCode(auth, oobCode);
    }

    async verifyPasswordResetCode(oobCode: string): Promise<string> {
        return firebaseVerifyPasswordResetCode(auth, oobCode);
    }

    async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
        await firebaseConfirmPasswordReset(auth, oobCode, newPassword);
    }

    async checkActionCode(oobCode: string): Promise<void> {
        await firebaseCheckActionCode(auth, oobCode);
    }

    async reloadCurrentUser(): Promise<void> {
        if (auth.currentUser) {
            await auth.currentUser.reload();
        }
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
