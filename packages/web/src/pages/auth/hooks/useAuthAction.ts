import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '@dosfilos/application';

export type AuthActionMode = 'verifyEmail' | 'resetPassword' | 'recoverEmail' | 'unknown';

export type AuthActionState =
    | { kind: 'loading' }
    | { kind: 'success'; mode: AuthActionMode }
    | { kind: 'error'; code: string | null }
    | { kind: 'reset-form'; email: string };

/**
 * Drives the /auth/action page state machine.
 *
 * Reads `mode`, `oobCode`, and `continueUrl` from the URL, then delegates to
 * the auth service to apply the action (verifyEmail / recoverEmail) or
 * pre-validate the reset code so the form can render with confidence.
 *
 * The `verify`/`recover` paths transition straight to `success`; the
 * `resetPassword` path transitions to `reset-form` and lets the page
 * collect the new password before calling `confirmReset`.
 */
export function useAuthAction(): {
    state: AuthActionState;
    mode: AuthActionMode;
    continueUrl: string | null;
    confirmReset: (newPassword: string) => Promise<void>;
} {
    const [params] = useSearchParams();
    const mode = (params.get('mode') ?? 'unknown') as AuthActionMode;
    const oobCode = params.get('oobCode') ?? '';
    const continueUrl = params.get('continueUrl');

    const [state, setState] = useState<AuthActionState>({ kind: 'loading' });

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (!oobCode) {
                setState({ kind: 'error', code: 'auth/invalid-action-code' });
                return;
            }

            try {
                if (mode === 'verifyEmail' || mode === 'recoverEmail') {
                    await authService.applyAuthActionCode(oobCode);
                    if (cancelled) return;
                    setState({ kind: 'success', mode });
                    return;
                }

                if (mode === 'resetPassword') {
                    const email = await authService.verifyPasswordResetCode(oobCode);
                    if (cancelled) return;
                    setState({ kind: 'reset-form', email });
                    return;
                }

                await authService.checkAuthActionCode(oobCode);
                setState({ kind: 'error', code: 'auth/unsupported-mode' });
            } catch (err: unknown) {
                if (cancelled) return;
                console.error('[useAuthAction] code application failed:', err);
                const code = (err as { code?: string })?.code ?? null;
                setState({ kind: 'error', code });
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [mode, oobCode]);

    const confirmReset = async (newPassword: string) => {
        await authService.confirmPasswordReset(oobCode, newPassword);
    };

    return { state, mode, continueUrl, confirmReset };
}
