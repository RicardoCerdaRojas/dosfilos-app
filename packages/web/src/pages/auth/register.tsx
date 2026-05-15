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
import { authService } from '@dosfilos/application';
import { PlanService } from '@dosfilos/domain';
import { FirebasePlanRepository } from '@dosfilos/infrastructure';
import { FirestorePlan, getPlanPriceId } from '@/hooks/usePlans';
import { useTranslation } from '@/i18n';

const planService = new PlanService(new FirebasePlanRepository());

const ALLOWED_PLANS = ['free', 'basic', 'pro', 'team'] as const;

/**
 * Register page — two flows behind one URL, branched by `?plan=`.
 *
 * Paid (basic/pro/team):
 *   /pricing → /register?plan=<id> → Stripe Checkout (30-day trial)
 *     → webhook stores pending_registrations → /auth/registration-success
 *     → completeRegistration creates Auth + Firestore user → /dashboard
 *
 * Free:
 *   /pricing → /register?plan=free → registerFree (client-side Auth + Firestore)
 *     → /dashboard
 *
 * Google OAuth is intentionally absent: it's login-only for existing users.
 * New users come through one of the two paths above so we always have an
 * explicit plan choice + welcome-email trigger fires uniformly.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FirestorePlan | null>(null);

  const selectedPlanId = searchParams.get('plan');
  const isFree = selectedPlanId === 'free';

  const registerSchema = z
    .object({
      displayName: z
        .string()
        .min(2, t('register.errors.nameMin'))
        .max(50, t('register.errors.nameMax')),
      email: z.string().email(t('register.errors.invalidEmail')),
      password: isFree
        ? z.string().min(6, t('register.errors.passwordMin'))
        : z.string().optional(),
      passwordConfirm: isFree ? z.string() : z.string().optional(),
    })
    .refine((data) => !isFree || data.password === data.passwordConfirm, {
      message: t('register.errors.passwordMismatch'),
      path: ['passwordConfirm'],
    });

  type RegisterFormData = z.infer<typeof registerSchema>;

  useEffect(() => {
    const loadPlan = async () => {
      if (!selectedPlanId || !ALLOWED_PLANS.includes(selectedPlanId as any)) {
        toast.error(t('register.errors.invalidPlan'), {
          duration: 3000,
          description: t('register.errors.invalidPlanDesc'),
        });
        navigate('/pricing');
        return;
      }

      try {
        const plan = await planService.getPlanById(selectedPlanId);
        if (plan) {
          setSelectedPlan(plan as FirestorePlan);
        } else {
          toast.error(t('register.errors.planNotAvailable'));
          navigate('/pricing');
        }
      } catch (error) {
        console.error('Error loading plan:', error);
        toast.error(t('register.errors.planNotAvailable'));
        navigate('/pricing');
      }
    };

    loadPlan();
  }, [selectedPlanId, t, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (!selectedPlan) return;
    setIsLoading(true);

    // ── Free path: skip Stripe, then gate on email verification ──────────
    // Auth user gets created and a verification email is sent. The user
    // lands on /auth/verify-email and must click the link before
    // ProtectedRoute lets them into /dashboard. Closes the bot/typo loophole.
    if (isFree) {
      try {
        await authService.registerFree({
          email: data.email,
          password: data.password!,
          displayName: data.displayName,
          locale: i18n.language as 'en' | 'es',
        });
        toast.success(t('register.freeSuccess'));
        navigate('/auth/verify-email', { replace: true });
      } catch (error: any) {
        console.error('Free signup error:', error);
        toast.error(error?.message ?? t('register.errors.signupFailed'));
        setIsLoading(false);
      }
      return;
    }

    // ── Paid path: Stripe Checkout ───────────────────────────────────────
    const priceId = getPlanPriceId(selectedPlan);
    if (!priceId) {
      toast.error(t('register.errors.planNotAvailable'));
      setIsLoading(false);
      return;
    }

    try {
      const { url } = await authService.createCheckoutSession({
        priceId,
        isNewRegistration: true,
        email: data.email,
        displayName: data.displayName,
        locale: i18n.language as 'en' | 'es',
      });
      window.location.href = url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(t('register.errors.checkoutFailed'));
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow={selectedPlan ? t('register.eyebrow') : undefined}
      title={t('register.title')}
      subtitle={t('register.subtitle')}
    >
      <div className="space-y-6">
        {/* Plan card — minimal, editorial */}
        {selectedPlan && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.18em] uppercase text-slate-500 font-medium">
                  {t('register.planSelected')}
                </p>
                <p className="mt-1 font-reading text-xl text-slate-900">{selectedPlan.name}</p>
              </div>
              <div className="text-right">
                {isFree ? (
                  <div className="text-sm text-slate-900 font-medium">
                    {t('register.freeBadge', { defaultValue: 'Gratis · sin tarjeta' })}
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-slate-500">{t('register.trialBadge', { defaultValue: '30 días gratis' })}</div>
                    <div className="text-sm text-slate-900 font-medium">
                      ${selectedPlan.pricing.monthly}
                      <span className="text-slate-500">{t('register.perMonth')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-[13px] font-medium text-slate-700">
              {t('register.displayName')}
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder={t('register.displayNamePlaceholder')}
              autoComplete="name"
              {...register('displayName')}
              disabled={isLoading}
              className="h-11 border-slate-300 focus-visible:ring-indigo-600"
            />
            {errors.displayName && (
              <p className="text-xs text-red-600">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px] font-medium text-slate-700">
              {t('register.email')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t('register.emailPlaceholder')}
              autoComplete="email"
              {...register('email')}
              disabled={isLoading}
              className="h-11 border-slate-300 focus-visible:ring-indigo-600"
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {isFree && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-medium text-slate-700">
                  {t('register.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('register.passwordPlaceholder')}
                  autoComplete="new-password"
                  {...register('password')}
                  disabled={isLoading}
                  className="h-11 border-slate-300 focus-visible:ring-indigo-600"
                />
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm" className="text-[13px] font-medium text-slate-700">
                  {t('register.passwordConfirm')}
                </Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder={t('register.passwordConfirmPlaceholder')}
                  autoComplete="new-password"
                  {...register('passwordConfirm')}
                  disabled={isLoading}
                  className="h-11 border-slate-300 focus-visible:ring-indigo-600"
                />
                {errors.passwordConfirm && (
                  <p className="text-xs text-red-600">{errors.passwordConfirm.message}</p>
                )}
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium"
            disabled={isLoading || !selectedPlan}
          >
            {isLoading
              ? t('register.submitting')
              : isFree
                ? t('register.createFreeAccount')
                : t('register.continueToPayment')}
          </Button>

          <p className="text-[12px] leading-relaxed text-slate-500 text-center">
            {isFree
              ? t('register.freeDisclaimer')
              : t('register.trialDisclaimer')}
          </p>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-sm text-slate-500">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="text-slate-900 hover:text-indigo-600 font-medium">
            {t('register.login')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
