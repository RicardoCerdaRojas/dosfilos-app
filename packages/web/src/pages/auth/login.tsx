import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '../../../../application/src/services/AuthService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { useTranslation } from '@/i18n';

import { useTrackActivity } from '@/hooks/useTrackActivity';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { trackLogin } = useTrackActivity();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const loginSchema = z.object({
    email: z.string().email(t('login.errors.invalidEmail')),
    password: z.string().min(6, t('login.errors.passwordMin')),
  });

  type LoginFormData = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const checkSubscriptionAndRedirect = async (userId: string) => {
    try {
      // Get user profile to check subscription
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      // If user has no subscription or free plan, redirect to welcome
      if (!userData?.subscription || userData.subscription.planId === 'free') {
        toast.info(t('login.subscriptionPrompt'), {
          duration: 5000,
        });
        navigate('/welcome');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Fallback to dashboard on error
      navigate('/dashboard');
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const user = await authService.login(data.email, data.password);
      trackLogin(); // Track login event
      toast.success(t('login.welcome'));
      await checkSubscriptionAndRedirect(user.id);
    } catch (error: any) {
      toast.error(error.message || t('login.errors.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const user = await authService.loginWithGoogle();
      trackLogin(); // Track login event
      toast.success(t('login.welcome'));
      await checkSubscriptionAndRedirect(user.id);
    } catch (error: any) {
      toast.error(error.message || t('login.errors.googleFailed'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('login.title')}
      subtitle={t('login.subtitle')}
    >
      <div className="space-y-6">
        {/* Google Sign-In Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            t('login.googleLoading')
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t('login.google')}
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('login.divider')}
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                {...register('email')}
                disabled={isLoading || isGoogleLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t('login.forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                {...register('password')}
                disabled={isLoading || isGoogleLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>

        {/* Register Link */}
        <p className="text-center text-sm text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
