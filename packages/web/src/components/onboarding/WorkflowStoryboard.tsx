import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n';
import { ACCENT_TONE, type OnboardingIntent } from './onboardingIntents';

interface WorkflowStoryboardProps {
    intent: OnboardingIntent;
    /** Force the vertical stack layout regardless of viewport. Use this inside
     *  dialogs / narrow containers where the 4-tile horizontal row gets cramped
     *  and text wraps one word per line. Wizard keeps the responsive default. */
    forceVertical?: boolean;
}

/**
 * Renders the step-by-step storyboard for an intent. Used both inside the
 * OnboardingWizard (as step 3) and standalone inside HelpCenter when the user
 * wants to re-watch a flow later.
 *
 * Default layout: horizontal row of step tiles on `md+`, vertical stack on
 * mobile. `forceVertical` overrides for cramped contexts.
 */
export function WorkflowStoryboard({ intent, forceVertical = false }: WorkflowStoryboardProps) {
    const { t } = useTranslation('dashboard');
    const tone = ACCENT_TONE[intent.accent];
    const steps = intent.workflow;

    return (
        <div className="w-full">
            {/* Desktop: horizontal flow with connectors (hidden when forceVertical) */}
            <div className={`${forceVertical ? 'hidden' : 'hidden md:flex'} items-start gap-2`}>
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isLast = index === steps.length - 1;
                    return (
                        <motion.div
                            key={step.stepKey}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.15, ease: 'easeOut' }}
                            className="flex-1 flex flex-col items-stretch"
                        >
                            <div className="flex items-center">
                                {/* Step tile */}
                                <div className="flex-1 flex flex-col items-center text-center px-2">
                                    <motion.div
                                        className={`relative w-14 h-14 rounded-2xl ${tone.iconBg} flex items-center justify-center mb-3`}
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Icon className={`h-6 w-6 ${tone.iconText}`} />
                                        {/* Step number badge */}
                                        <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border-2 ${tone.selectedBorder} text-[10px] font-bold ${tone.iconText} flex items-center justify-center`}>
                                            {index + 1}
                                        </span>
                                    </motion.div>
                                    <h4 className="text-sm font-semibold text-foreground mb-1">
                                        {t(`onboarding.intents.${intent.id}.workflow.${step.stepKey}.title`)}
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                                        {t(`onboarding.intents.${intent.id}.workflow.${step.stepKey}.description`)}
                                    </p>
                                </div>

                                {/* Connector line — animated grow */}
                                {!isLast && (
                                    <motion.div
                                        className={`h-0.5 ${tone.line} self-start mt-7 -mx-2 origin-left flex-1`}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: 0.4, delay: index * 0.15 + 0.2, ease: 'easeOut' }}
                                        aria-hidden
                                    />
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Vertical stack with left rail — used on mobile + forced contexts */}
            <div className={`${forceVertical ? 'block' : 'md:hidden'} space-y-3`}>
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isLast = index === steps.length - 1;
                    return (
                        <motion.div
                            key={step.stepKey}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.12, ease: 'easeOut' }}
                            className="flex gap-3"
                        >
                            <div className="flex flex-col items-center shrink-0">
                                <div className={`relative w-11 h-11 rounded-xl ${tone.iconBg} flex items-center justify-center`}>
                                    <Icon className={`h-5 w-5 ${tone.iconText}`} />
                                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background border ${tone.selectedBorder} text-[9px] font-bold ${tone.iconText} flex items-center justify-center`}>
                                        {index + 1}
                                    </span>
                                </div>
                                {!isLast && (
                                    <motion.div
                                        className={`w-0.5 ${tone.line} flex-1 mt-1 origin-top`}
                                        style={{ minHeight: 24 }}
                                        initial={{ scaleY: 0 }}
                                        animate={{ scaleY: 1 }}
                                        transition={{ duration: 0.3, delay: index * 0.12 + 0.2 }}
                                    />
                                )}
                            </div>
                            <div className="flex-1 pb-2">
                                <h4 className="text-sm font-semibold text-foreground mb-0.5">
                                    {t(`onboarding.intents.${intent.id}.workflow.${step.stepKey}.title`)}
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {t(`onboarding.intents.${intent.id}.workflow.${step.stepKey}.description`)}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
