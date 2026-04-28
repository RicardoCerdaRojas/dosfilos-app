import { useAuthAction } from './hooks/useAuthAction';
import { ActionLoadingView } from './components/ActionLoadingView';
import { ActionSuccessView } from './components/ActionSuccessView';
import { ActionErrorView } from './components/ActionErrorView';
import { ActionResetForm } from './components/ActionResetForm';

/**
 * Custom Firebase Auth action handler — replaces the default
 * `__/auth/action` UI hosted on `<project>.firebaseapp.com`.
 *
 * Wired up by setting "Customize action URL" in Firebase Console for both
 * the email-verification and password-reset templates to:
 *     https://preach.dosfilos.com/auth/action
 *
 * Firebase appends `mode`, `oobCode`, and `continueUrl` to the URL when the
 * user clicks the link. `useAuthAction` validates / applies the code via
 * the auth service and exposes a discriminated state — this page is a thin
 * router that renders the matching branded view.
 */
export function ActionPage() {
    const { state, continueUrl, confirmReset } = useAuthAction();

    switch (state.kind) {
        case 'loading':
            return <ActionLoadingView />;
        case 'success':
            return <ActionSuccessView mode={state.mode} continueUrl={continueUrl} />;
        case 'error':
            return <ActionErrorView code={state.code} />;
        case 'reset-form':
            return <ActionResetForm email={state.email} onConfirm={confirmReset} />;
    }
}
