/**
 * Maps a Firebase auth `error.code` (or our own synthetic codes) to the
 * i18n key under `auth.action.errors`. Keeping this in one place lets both
 * the error view and the reset form report the same canonical message for
 * the same failure.
 */
export function mapAuthErrorCodeToKey(code: string | null): string {
    switch (code) {
        case 'auth/expired-action-code':
            return 'action.errors.expired';
        case 'auth/invalid-action-code':
            return 'action.errors.invalid';
        case 'auth/user-disabled':
            return 'action.errors.disabled';
        case 'auth/user-not-found':
            return 'action.errors.notFound';
        case 'auth/weak-password':
            return 'action.errors.weakPassword';
        case 'auth/unsupported-mode':
            return 'action.errors.unsupported';
        default:
            return 'action.errors.generic';
    }
}
