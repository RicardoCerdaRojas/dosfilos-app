import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { X, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';
import { markWelcomeCompleted } from '@/hooks/useOnboardingState';
import { toast } from 'sonner';
import {
    ONBOARDING_INTENTS,
    persistIntent,
    ACCENT_TONE,
    type OnboardingIntentId,
} from './onboardingIntents';
import { WelcomeIllustration } from './WelcomeIllustration';
import { WorkflowStoryboard } from './WorkflowStoryboard';
import { ConfessionStep } from './ConfessionStep';
import { useUserProfile } from '@/hooks/useUserProfile';

type Step = 'welcome' | 'intent' | 'confession' | 'workflow' | 'confirm';

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    /** Starting step. Default `'welcome'` for first-time users; `'intent'` when
     *  re-launched from the help FAB so the user skips the welcome step they've
     *  already seen and lands directly on the intent picker (tutorials list). */
    startStep?: Step;
}

const STEP_ORDER: Step[] = ['welcome', 'intent', 'confession', 'workflow', 'confirm'];

/**
 * Full-screen onboarding takeover. Replaces the old `OnboardingWelcomeModal`
 * (a flat 4-pillar dialog) with an intent-driven 3-step flow:
 *
 *   1. Welcome   — greeting + ambient illustration + CTA "Empezar"
 *   2. Intent    — pick "What brought you here?" from 5 cards
 *   3. Confirm   — preview + confetti + navigate to the intent's flow
 *
 * Intent selection persists per-user in localStorage so:
 *   - the dashboard can render contextual hints later ("continue your X")
 *   - we can analyze intent distribution to prioritize roadmap
 *
 * Unavailable intents (expository series, counseling course) still capture
 * the signal but route to /dashboard with a toast — feature wiring lands in
 * Sprints B/C from the roadmap.
 */
export function OnboardingWizard({ isOpen, onClose, startStep = 'welcome' }: OnboardingWizardProps) {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { t } = useTranslation('dashboard');
    const { profile } = useUserProfile();

    const [step, setStep] = useState<Step>(startStep);
    const [selectedIntent, setSelectedIntent] = useState<OnboardingIntentId | null>(null);

    /**
     * Skip the confession step when the user has already declared one
     * (returning from a help-FAB relaunch, mid-flow refresh, etc.). The
     * step is mandatory for new users but idempotent — once declared,
     * subsequent runs jump straight to workflow.
     */
    const hasDeclaredConfession = !!profile?.declaredConfession;

    // Sync internal state with the requested start step every time the wizard
    // opens. FAB re-launches set `startStep="intent"` to skip welcome.
    useEffect(() => {
        if (isOpen) {
            setStep(startStep);
            setSelectedIntent(null);
        }
    }, [isOpen, startStep]);

    const stepIndex = STEP_ORDER.indexOf(step);
    const progress = ((stepIndex + 1) / STEP_ORDER.length) * 100;

    const intent = useMemo(
        () => (selectedIntent ? ONBOARDING_INTENTS.find((i) => i.id === selectedIntent) ?? null : null),
        [selectedIntent],
    );

    const firstName = user?.displayName?.split(' ')[0] ?? '';

    const handleSkip = useCallback(() => {
        if (user) markWelcomeCompleted(user.uid);
        onClose();
    }, [user, onClose]);

    const handleComplete = useCallback(() => {
        if (!user || !intent) return;

        persistIntent(user.uid, intent.id);
        markWelcomeCompleted(user.uid);

        // Confetti burst — feels like a milestone, not a chore
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['hsl(244 76% 59%)', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)', 'hsl(199 89% 48%)'],
        });

        onClose();

        if (intent.available && intent.route) {
            // Tiny delay so the user sees the confetti before the route swap.
            setTimeout(() => navigate(intent.route!), 250);
        } else {
            // Unavailable intent — log the signal but stay on dashboard with a friendly toast.
            toast.info(t(`onboarding.intents.${intent.id}.comingSoon`));
        }
    }, [user, intent, navigate, onClose, t]);

    const goNext = () => {
        if (step === 'welcome') setStep('intent');
        else if (step === 'intent' && selectedIntent) {
            setStep(hasDeclaredConfession ? 'workflow' : 'confession');
        }
        else if (step === 'confession') setStep('workflow');
        else if (step === 'workflow') setStep('confirm');
        else if (step === 'confirm') handleComplete();
    };

    const goPrev = () => {
        if (step === 'intent') setStep('welcome');
        else if (step === 'confession') setStep('intent');
        else if (step === 'workflow') setStep(hasDeclaredConfession ? 'intent' : 'confession');
        else if (step === 'confirm') setStep('workflow');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[60] overflow-y-auto bg-background"
            >
                {/* Gradient overlay sits on top of the opaque base so the dashboard
                    behind doesn't bleed through. Translucent stops were leaving the
                    underlying page visible at the edges. */}
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/10 via-transparent to-info-subtle/30"
                />

                {/* Top bar: progress + skip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-muted/50">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                </div>

                <button
                    type="button"
                    onClick={handleSkip}
                    className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50"
                >
                    {t('onboarding.skip')}
                    <X className="h-3.5 w-3.5" />
                </button>

                {/* Step counter */}
                <div className="absolute top-4 left-4 text-xs text-muted-foreground tabular-nums">
                    {stepIndex + 1} / {STEP_ORDER.length}
                </div>

                {/* Content area */}
                <div className="min-h-screen flex items-center justify-center px-6 py-16">
                    <AnimatePresence mode="wait">
                        {step === 'welcome' && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center"
                            >
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        {t('onboarding.welcome.eyebrow')}
                                    </div>
                                    <h1 className="font-reading text-4xl md:text-5xl leading-[1.05] tracking-[-0.02em] text-foreground">
                                        {firstName
                                            ? t('onboarding.welcome.greetingNamed', { name: firstName })
                                            : t('onboarding.welcome.greeting')}
                                    </h1>
                                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                                        {t('onboarding.welcome.subtitle')}
                                    </p>
                                    <div className="flex items-center gap-3 pt-2">
                                        <Button size="lg" onClick={goNext} className="gap-2">
                                            {t('onboarding.welcome.cta')}
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="lg" onClick={handleSkip}>
                                            {t('onboarding.welcome.skipCta')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="hidden md:block h-[420px]">
                                    <WelcomeIllustration />
                                </div>
                            </motion.div>
                        )}

                        {step === 'intent' && (
                            <motion.div
                                key="intent"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="w-full max-w-4xl space-y-8"
                            >
                                <div className="text-center space-y-3 max-w-2xl mx-auto">
                                    <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                                        {t('onboarding.intent.eyebrow')}
                                    </div>
                                    <h2 className="font-reading text-3xl md:text-4xl leading-tight tracking-[-0.01em] text-foreground">
                                        {t('onboarding.intent.title')}
                                    </h2>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        {t('onboarding.intent.subtitle')}
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {ONBOARDING_INTENTS.map((intentDef) => {
                                        const Icon = intentDef.icon;
                                        const isSelected = selectedIntent === intentDef.id;
                                        const tone = ACCENT_TONE[intentDef.accent];
                                        return (
                                            <motion.button
                                                key={intentDef.id}
                                                type="button"
                                                onClick={() => setSelectedIntent(intentDef.id)}
                                                whileHover={{ scale: 1.015 }}
                                                whileTap={{ scale: 0.99 }}
                                                transition={{ duration: 0.15 }}
                                                className={`
                                                    text-left p-5 rounded-xl border-2 bg-card transition-colors
                                                    ${isSelected
                                                        ? `${tone.selectedBorder} ${tone.selectedBg} shadow-sm`
                                                        : 'border-border hover:border-foreground/20'}
                                                `}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`shrink-0 w-10 h-10 rounded-lg ${tone.iconBg} flex items-center justify-center`}>
                                                        <Icon className={`h-5 w-5 ${tone.iconText}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold text-sm">
                                                                {t(`onboarding.intents.${intentDef.id}.title`)}
                                                            </h3>
                                                            {!intentDef.available && (
                                                                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted border">
                                                                    {t('onboarding.intent.comingSoonBadge')}
                                                                </span>
                                                            )}
                                                            {isSelected && (
                                                                <Check className={`ml-auto h-4 w-4 ${tone.iconText}`} />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {t(`onboarding.intents.${intentDef.id}.description`)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <Button variant="ghost" onClick={goPrev} className="gap-2">
                                        <ArrowLeft className="h-4 w-4" />
                                        {t('onboarding.nav.back')}
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={goNext}
                                        disabled={!selectedIntent}
                                        className="gap-2"
                                    >
                                        {t('onboarding.nav.continue')}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'confession' && user && (
                            <ConfessionStep
                                userId={user.uid}
                                onCompleted={() => setStep('workflow')}
                                onBack={() => setStep('intent')}
                            />
                        )}

                        {step === 'workflow' && intent && (
                            <motion.div
                                key="workflow"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="w-full max-w-5xl space-y-10"
                            >
                                <div className="text-center space-y-3 max-w-2xl mx-auto">
                                    <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                                        {t('onboarding.workflow.eyebrow')}
                                    </div>
                                    <h2 className="font-reading text-3xl md:text-4xl leading-tight tracking-[-0.01em] text-foreground">
                                        {t(`onboarding.intents.${intent.id}.workflowTitle`)}
                                    </h2>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        {t(`onboarding.intents.${intent.id}.workflowSubtitle`)}
                                    </p>
                                </div>

                                <WorkflowStoryboard intent={intent} />

                                <div className="flex items-center justify-between pt-4 max-w-3xl mx-auto w-full">
                                    <Button variant="ghost" onClick={goPrev} className="gap-2">
                                        <ArrowLeft className="h-4 w-4" />
                                        {t('onboarding.nav.back')}
                                    </Button>
                                    <Button size="lg" onClick={goNext} className="gap-2">
                                        {t('onboarding.nav.continue')}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'confirm' && intent && (
                            <motion.div
                                key="confirm"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="w-full max-w-2xl text-center space-y-8"
                            >
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
                                    className={`mx-auto w-20 h-20 rounded-2xl ${ACCENT_TONE[intent.accent].iconBg} flex items-center justify-center`}
                                >
                                    <intent.icon className={`h-10 w-10 ${ACCENT_TONE[intent.accent].iconText}`} />
                                </motion.div>

                                <div className="space-y-3">
                                    <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                                        {t('onboarding.confirm.eyebrow')}
                                    </div>
                                    <h2 className="font-reading text-3xl md:text-4xl leading-tight tracking-[-0.01em] text-foreground">
                                        {t(`onboarding.intents.${intent.id}.confirmTitle`)}
                                    </h2>
                                    <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                        {t(`onboarding.intents.${intent.id}.confirmBody`)}
                                    </p>
                                </div>

                                <div className="flex items-center justify-center gap-3 pt-4">
                                    <Button variant="ghost" onClick={goPrev} className="gap-2">
                                        <ArrowLeft className="h-4 w-4" />
                                        {t('onboarding.nav.back')}
                                    </Button>
                                    <Button size="lg" onClick={handleComplete} className="gap-2">
                                        {t(`onboarding.intents.${intent.id}.cta`)}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
