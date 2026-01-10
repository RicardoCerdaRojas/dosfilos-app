/**
 * Registration Success Page
 * 
 * Purpose: Handle post-payment registration completion
 * 
 * Flow:
 * 1. User redirected here from Stripe Checkout success
 * 2. Extract session_id from URL
 * 3. Call completeRegistration Cloud Function
 * 4. Auto-login with custom token
 * 5. Redirect to dashboard
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { functions, auth } from '@dosfilos/infrastructure';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface CompleteRegistrationResponse {
  success: boolean;
  userId: string;
  customToken: string;
  message: string;
}

export function RegistrationSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('auth');
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const completeRegistration = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setStatus('error');
        setErrorMessage(t('registrationSuccess.errors.noSession', {
          defaultValue: 'No se encontró información de pago'
        }));
        setTimeout(() => navigate('/register'), 3000);
        return;
      }

      try {
        setStatus('processing');
        
        // Call Cloud Function to create user
        const completeReg = httpsCallable<
          { sessionId: string; locale: string },
          CompleteRegistrationResponse
        >(functions, 'completeRegistration');
        
        const result = await completeReg({
          sessionId,
          locale: i18n.language as 'en' | 'es',
        });
        
        const { customToken, message } = result.data;
        
        // Sign in with custom token
        await signInWithCustomToken(auth, customToken);
        
        setStatus('success');
        toast.success(message);
        
        // Navigate to dashboard with welcome flag
        setTimeout(() => {
          navigate('/dashboard?welcome=true');
        }, 1500);
        
      } catch (error: any) {
        console.error('Registration completion error:', error);
        setStatus('error');
        
        const errorMsg = error.message || t('registrationSuccess.errors.generic', {
          defaultValue: 'Error al completar el registro'
        });
        
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        
        // Redirect to support after error
        setTimeout(() => {
          navigate('/contact?reason=registration-error');
        }, 5000);
      }
    };

    completeRegistration();
  }, [searchParams, navigate, t, i18n.language]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-pulse">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold">
              {t('registrationSuccess.processing.title', {
                defaultValue: 'Completando tu registro...'
              })}
            </h1>
            <p className="text-muted-foreground">
              {t('registrationSuccess.processing.message', {
                defaultValue: 'Estamos configurando tu cuenta. Esto tomará solo un momento.'
              })}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ {t('registrationSuccess.steps.payment', { defaultValue: 'Pago confirmado' })}</p>
              <p>⟳ {t('registrationSuccess.steps.account', { defaultValue: 'Creando tu cuenta...' })}</p>
              <p>○ {t('registrationSuccess.steps.email', { defaultValue: 'Enviando email de bienvenida...' })}</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-600">
              {t('registrationSuccess.success.title', {
                defaultValue: '¡Registro completado!'
              })}
            </h1>
            <p className="text-muted-foreground">
              {t('registrationSuccess.success.message', {
                defaultValue: 'Redirigiendo al dashboard...'
              })}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-destructive">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-destructive">
              {t('registrationSuccess.error.title', {
                defaultValue: 'Error al completar registro'
              })}
            </h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              {t('registrationSuccess.error.contact', {
                defaultValue: 'Contactaremos contigo pronto para resolver esto.'
              })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
