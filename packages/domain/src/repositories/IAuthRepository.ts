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
    /** Applies an action code (verifyEmail / recoverEmail). */
    applyActionCode(oobCode: string): Promise<void>;
    /** Validates a password-reset code and returns the email it belongs to. */
    verifyPasswordResetCode(oobCode: string): Promise<string>;
    /** Confirms a password reset, setting the new password. */
    confirmPasswordReset(oobCode: string, newPassword: string): Promise<void>;
    /** Inspects an action code (used as a fallback for unknown modes). */
    checkActionCode(oobCode: string): Promise<void>;
    /** Forces the cached current-user record to refresh against the server. */
    reloadCurrentUser(): Promise<void>;
}
