import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
    ONBOARDING_INTENTS,
    ACCENT_TONE,
    type OnboardingIntent,
} from './onboardingIntents';
import { WorkflowStoryboard } from './WorkflowStoryboard';

interface HelpCenterProps {
    isOpen: boolean;
    onClose: () => void;
    /** Optional callback to re-launch the full onboarding wizard from scratch. */
    onRelaunchWizard?: () => void;
}

type View = 'list' | 'detail';

/**
 * In-app help / tutorials hub. Two views:
 *   - list: card grid of every intent's storyboard
 *   - detail: a single storyboard rendered in-place
 *
 * Triggered from `FloatingHelpButton` and from the user menu in the sidebar
 * footer. Acts as the permanent re-access path to the onboarding storyboards
 * — the wizard is a one-shot, this is the manual.
 */
export function HelpCenter({ isOpen, onClose, onRelaunchWizard }: HelpCenterProps) {
    const { t } = useTranslation('dashboard');
    const [view, setView] = useState<View>('list');
    const [selectedIntent, setSelectedIntent] = useState<OnboardingIntent | null>(null);

    const handleOpenDetail = (intent: OnboardingIntent) => {
        setSelectedIntent(intent);
        setView('detail');
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedIntent(null);
    };

    const handleClose = () => {
        // Reset state for the next open so we always land on the list.
        setView('list');
        setSelectedIntent(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(next) => { if (!next) handleClose(); }}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        {t('onboarding.help.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {view === 'list'
                            ? t('onboarding.help.subtitle')
                            : selectedIntent
                                ? t(`onboarding.intents.${selectedIntent.id}.title`)
                                : ''}
                    </DialogDescription>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {view === 'list' && (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4 mt-2"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {ONBOARDING_INTENTS.map((intent) => {
                                    const Icon = intent.icon;
                                    const tone = ACCENT_TONE[intent.accent];
                                    return (
                                        <motion.button
                                            key={intent.id}
                                            type="button"
                                            onClick={() => handleOpenDetail(intent)}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className="text-left p-4 rounded-lg border bg-card hover:border-foreground/20 transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`shrink-0 w-9 h-9 rounded-lg ${tone.iconBg} flex items-center justify-center`}>
                                                    <Icon className={`h-4 w-4 ${tone.iconText}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-sm truncate">
                                                            {t(`onboarding.intents.${intent.id}.title`)}
                                                        </h3>
                                                        {!intent.available && (
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted border shrink-0">
                                                                {t('onboarding.intent.comingSoonBadge')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {t(`onboarding.intents.${intent.id}.description`)}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {onRelaunchWizard && (
                                <div className="pt-3 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            handleClose();
                                            onRelaunchWizard();
                                        }}
                                        className="w-full gap-2"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        {t('onboarding.help.relaunchWizard')}
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {view === 'detail' && selectedIntent && (
                        <motion.div
                            key="detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-5 mt-2"
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToList}
                                className="gap-1.5 -ml-2"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                {t('onboarding.help.backToList')}
                            </Button>

                            <div className="space-y-2">
                                <h3 className="font-reading text-xl text-foreground">
                                    {t(`onboarding.intents.${selectedIntent.id}.workflowTitle`)}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {t(`onboarding.intents.${selectedIntent.id}.workflowSubtitle`)}
                                </p>
                            </div>

                            <WorkflowStoryboard intent={selectedIntent} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
