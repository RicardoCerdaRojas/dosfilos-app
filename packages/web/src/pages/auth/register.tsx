import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { authService } from '../../../../application/src/services/AuthService';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@dosfilos/infrastructure';
import { doc, getDoc } from 'firebase/firestore';
import { FirestorePlan, getPlanPriceId } from '@/hooks/usePlans';
import { useTranslation } from '@/i18n';
import { useTrackActivity } from '@/hooks/useTrackActivity';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FirestorePlan | null>(null);
  const { trackLogin, trackRegistration } = useTrackActivity();
  
  const registerSchema = z.object({
    displayName: z
      .string()
      .min(2, t('register.errors.nameMin'))
      .max(50, t('register.errors.nameMax')),
    email: z.string().email(t('register.errors.invalidEmail')),
    password: z
      .string()
      .min(8, t('register.errors.passwordMin'))
      .regex(/[A-Z]/, t('register.errors.passwordUppercase'))
      .regex(/[a-z]/, t('register.errors.passwordLowercase'))
      .regex(/[0-9]/, t('register.errors.passwordNumber')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('register.errors.passwordMismatch'),
    path: ['confirmPassword'],
  });

  type RegisterFormData = z.infer<typeof registerSchema>;

  // Get selected plan ID from URL parameter
  const selectedPlanId = searchParams.get('plan') || 'free';
  const needsCheckout = selectedPlanId !== 'free';

  // Load plan from Firestore
  useEffect(() => {
    const loadPlan = async () => {
      if (selectedPlanId === 'free') {
        setSelectedPlan({
          id: 'free',
          name: t('register.free'),
          description: t('register.free'),
          pricing: { currency: 'USD', monthly: 0 },
          stripeProductIds: [],
          features: [],
          isActive: true,
          isPublic: true,
          sortOrder: 0,
        });
        return;
      }

      try {
        const planDoc = await getDoc(doc(db, 'plans', selectedPlanId));
        if (planDoc.exists()) {
          setSelectedPlan({ id: planDoc.id, ...planDoc.data() } as FirestorePlan);
        } else {
          // Fallback to free if plan not found
          setSelectedPlan({
            id: 'free',
            name: t('register.free'),
            description: t('register.free'),
            pricing: { currency: 'USD', monthly: 0 },
            stripeProductIds: [],
            features: [],
            isActive: true,
            isPublic: true,
            sortOrder: 0,
          });
        }
      } catch (error) {
        console.error('Error loading plan:', error);
      }
    };

    loadPlan();
  }, [selectedPlanId]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const redirectToCheckout = async () => {
    if (!selectedPlan) return;
    
    const priceId = getPlanPriceId(selectedPlan);
    if (!priceId) {
      toast.error(t('register.errors.planNotAvailable'));
      navigate('/dashboard');
      return;
    }

    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/dashboard?welcome=true`,
        cancelUrl: `${window.location.origin}/pricing`,
      });
      
      const { url } = result.data as { url: string };
      window.location.href = url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(t('register.errors.checkoutFailed'));
      navigate('/dashboard');
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const user = await authService.register(data.email, data.password, data.displayName);
      
      // Track geographic registration event
      trackRegistration(user.id);
      
      // Track initial login
      trackLogin();
      
      toast.success(t('register.success'));
      
      // If paid plan selected from pricing page, redirect to checkout
      if (needsCheckout) {
        await redirectToCheckout();
      } else {
        // Navigate to welcome page for plan selection
        navigate('/welcome');
      }
    } catch (error: any) {
      // Smart error handling for existing email
      if (error.code === 'auth/email-already-in-use') {
        toast.error(
          t('register.errors.emailExists'),
          { 
            duration: 4000,
            description: t('register.errors.emailExistsDesc')
          }
        );
        setTimeout(() => {
          navigate('/login');
        }, 4000);
      } else {
        toast.error(error.message || t('register.errors.registerFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const user = await authService.loginWithGoogle();
      
      // Track geographic registration event (Google creates/logs in user)
      trackRegistration(user.id);
      
      // Track initial login
      trackLogin();
      
      toast.success(t('register.successGoogle'));
      
      // If paid plan selected from pricing page, redirect to checkout
      if (needsCheckout) {
        await redirectToCheckout();
      } else {
        // Navigate to welcome page for plan selection
        navigate('/welcome');
      }
    } catch (error: any) {
      // Smart error handling for existing Google account
      if (error.code === 'auth/account-exists-with-different-credential') {
        toast.error(
          t('register.errors.googleExists'),
          { duration: 4000 }
        );
        setTimeout(() => {
          navigate('/login');
        }, 4000);
      } else {
        toast.error(error.message || t('register.errors.googleFailed'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('register.title')}
      subtitle={t('register.subtitle')}
    >
      <div className="space-y-6">
        {/* Plan Selection Indicator */}
        {selectedPlan && selectedPlan.id !== 'free' && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('register.planSelected')}</p>
                <p className="text-lg font-bold text-primary">{selectedPlan.name}</p>
                <p className="text-sm text-muted-foreground">${selectedPlan.pricing.monthly}{t('register.perMonth')}</p>
              </div>
              <Badge variant="outline" className="bg-background">
                {needsCheckout ? t('register.checkoutAfter') : t('register.free')}
              </Badge>
            </div>
          </div>
        )}

        {/* Google Sign-In Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            t('register.googleLoading')
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
              {t('register.google')}
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
              {t('register.divider')}
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('register.displayName')}</Label>
              <Input
                id="displayName"
                type="text"
                placeholder={t('register.displayNamePlaceholder')}
                {...register('displayName')}
                disabled={isLoading || isGoogleLoading}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('register.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('register.emailPlaceholder')}
                {...register('email')}
                disabled={isLoading || isGoogleLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('register.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('register.passwordPlaceholder')}
                {...register('password')}
                disabled={isLoading || isGoogleLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('register.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('register.confirmPasswordPlaceholder')}
                {...register('confirmPassword')}
                disabled={isLoading || isGoogleLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading ? t('register.submitting') : t('register.submit')}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t('register.login')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
