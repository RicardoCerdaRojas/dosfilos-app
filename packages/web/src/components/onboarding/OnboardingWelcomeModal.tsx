import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Languages, MessageSquareQuote, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { markWelcomeCompleted } from '@/hooks/useOnboardingState';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';

interface OnboardingWelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Post-registration welcome modal.
 * Editorial monochromatic treatment aligned with landing/pricing voice:
 * presents the four pillars of the workshop and routes to the library as
 * the natural first action.
 */
export function OnboardingWelcomeModal({ isOpen, onClose }: OnboardingWelcomeModalProps) {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { t } = useTranslation('dashboard');

    const handleExplore = () => {
        if (user) markWelcomeCompleted(user.uid);
        onClose();
        navigate('/dashboard/library');
    };

    const handleSkip = () => {
        if (user) markWelcomeCompleted(user.uid);
        onClose();
    };

    const pillars = [
        { icon: BookOpen, key: 'library' as const },
        { icon: Languages, key: 'languages' as const },
        { icon: MessageSquareQuote, key: 'faculty' as const },
        { icon: FileText, key: 'production' as const },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-slate-200">
                <div className="px-8 pt-10 pb-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-3">
                        {t('welcomeModal.eyebrow')}
                    </div>
                    <h2 className="font-reading text-[28px] md:text-[32px] leading-[1.1] tracking-[-0.02em] text-slate-900 mb-3">
                        {t('welcomeModal.title')}
                    </h2>
                    <p className="text-[15px] leading-relaxed text-slate-500 max-w-xl">
                        {t('welcomeModal.subtitle')}
                    </p>
                </div>

                {/* Pillars grid */}
                <div className="px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                        {pillars.map(({ icon: Icon, key }) => (
                            <div key={key} className="bg-white p-5 flex flex-col gap-2">
                                <Icon className="h-4 w-4 text-indigo-600" />
                                <div className="font-reading text-[17px] leading-tight text-slate-900">
                                    {t(`welcomeModal.features.${key}.title`)}
                                </div>
                                <p className="text-[13px] leading-relaxed text-slate-500">
                                    {t(`welcomeModal.features.${key}.description`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-8 pb-8 flex flex-col-reverse md:flex-row md:justify-end gap-2 border-t border-slate-100 pt-6">
                    <Button
                        variant="ghost"
                        onClick={handleSkip}
                        className="text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    >
                        {t('welcomeModal.buttons.later')}
                    </Button>
                    <Button
                        onClick={handleExplore}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
                    >
                        {t('welcomeModal.buttons.explore')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
