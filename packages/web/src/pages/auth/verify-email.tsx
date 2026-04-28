import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';
import { authService } from '@dosfilos/application';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, RefreshCcw, LogOut } from 'lucide-react';
import { useTranslation } from '@/i18n';

/**
 * Email-verification gate for newly-registered Free users.
 *
 * Flow:
 *   1. /register?plan=free → registerFree → sendEmailVerification fires
 *   2. /auth/verify-email → user sees "check your inbox"
 *   3. Polls auth.currentUser.reload() every 5s while open
 *   4. When emailVerified flips to true → redirect to /dashboard
 *   5. Resend button if the original email got lost
 *
 * Paid users skip this entirely — completeRegistration sets emailVerified=true
 * on the server because Stripe already verified the email by charging the card.
 */
export function VerifyEmailPage() {
    const navigate = useNavigate();
    const { user, loading } = useFirebase();
    const { t } = useTranslation('auth');
    const [resending, setResending] = useState(false);

    // Auto-detect verification: poll user.reload() so the moment they click
    // the verification link in their inbox we can navigate forward.
    useEffect(() => {
        if (!user) return;
        if (user.emailVerified) {
            navigate('/dashboard', { replace: true });
            return;
        }

        const interval = setInterval(async () => {
            try {
                await user.reload();
                if (user.emailVerified) {
                    clearInterval(interval);
                    toast.success(t('verifyEmail.successToast', { defaultValue: '¡Email verificado!' }));
                    navigate('/dashboard', { replace: true });
                }
            } catch (err) {
                console.warn('[VerifyEmail] reload failed:', err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [user, navigate, t]);

    if (loading) {
        return (
            <AuthLayout title={t('verifyEmail.title', { defaultValue: 'Confirma tu email' })} subtitle="">
                <div className="flex justify-center py-12">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </AuthLayout>
        );
    }

    if (!user) {
        navigate('/login', { replace: true });
        return null;
    }

    const handleResend = async () => {
        setResending(true);
        try {
            await authService.resendVerificationEmail();
            toast.success(
                t('verifyEmail.resendSuccess', { defaultValue: 'Correo enviado. Revisa tu bandeja.' }),
            );
        } catch (err: any) {
            console.error('[VerifyEmail] resend failed:', err);
            toast.error(
                err?.message ??
                    t('verifyEmail.resendError', { defaultValue: 'No pudimos reenviar. Intenta más tarde.' }),
            );
        } finally {
            setResending(false);
        }
    };

    const handleSignOut = async () => {
        await authService.logout();
        navigate('/login', { replace: true });
    };

    return (
        <AuthLayout
            title={t('verifyEmail.title', { defaultValue: 'Confirma tu email' })}
            subtitle={t('verifyEmail.subtitle', {
                defaultValue: 'Te enviamos un enlace para activar tu cuenta.',
            })}
        >
            <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-slate-600 mb-1">
                        {t('verifyEmail.sentTo', { defaultValue: 'Hemos enviado un correo a' })}
                    </p>
                    <p className="font-medium text-slate-900 break-all">{user.email}</p>
                </div>

                <div className="space-y-3 text-[13.5px] text-slate-600">
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-[2px] flex-shrink-0" />
                        <span>
                            {t('verifyEmail.step1', {
                                defaultValue: 'Abre el correo y haz click en el enlace de verificación.',
                            })}
                        </span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-[2px] flex-shrink-0" />
                        <span>
                            {t('verifyEmail.step2', {
                                defaultValue: 'Esta página detectará la confirmación automáticamente.',
                            })}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11"
                        onClick={handleResend}
                        disabled={resending}
                    >
                        <RefreshCcw className={resending ? 'h-4 w-4 mr-2 animate-spin' : 'h-4 w-4 mr-2'} />
                        {resending
                            ? t('verifyEmail.resending', { defaultValue: 'Reenviando...' })
                            : t('verifyEmail.resend', { defaultValue: 'Reenviar correo de verificación' })}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-10 text-slate-500 hover:text-slate-900"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('verifyEmail.signOut', { defaultValue: 'Cerrar sesión y usar otra cuenta' })}
                    </Button>
                </div>

                <p className="text-[12px] text-slate-500 text-center leading-relaxed">
                    {t('verifyEmail.spamHint', {
                        defaultValue:
                            '¿No ves el correo? Revisa tu carpeta de spam o "Promociones". Si registraste con un email equivocado, cierra sesión y vuelve a registrarte.',
                    })}
                </p>
            </div>
        </AuthLayout>
    );
}
