import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { HelpCenter } from './HelpCenter';
import { OnboardingWizard } from './OnboardingWizard';

/**
 * Floating help button (bottom-right FAB). Always-available re-entry to the
 * platform's tutorials. Click → opens HelpCenter with the list of storyboards
 * and a "Re-launch welcome wizard" affordance.
 *
 * Mounted once in DashboardLayout so it's available across the entire
 * authenticated surface. Owns the state for both HelpCenter and the
 * relaunched OnboardingWizard so the user can chain them seamlessly.
 */
export function FloatingHelpButton() {
    const { t } = useTranslation('dashboard');
    const { user } = useFirebase();
    const [helpOpen, setHelpOpen] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);

    if (!user) return null;

    return (
        <>
            <motion.button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label={t('onboarding.help.fabAria')}
                title={t('onboarding.help.fabAria')}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5, type: 'spring', stiffness: 200, damping: 18 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center print:hidden"
            >
                <HelpCircle className="h-5 w-5" />
            </motion.button>

            <HelpCenter
                isOpen={helpOpen}
                onClose={() => setHelpOpen(false)}
                onRelaunchWizard={() => setWizardOpen(true)}
            />

            <OnboardingWizard
                isOpen={wizardOpen}
                onClose={() => setWizardOpen(false)}
            />
        </>
    );
}
