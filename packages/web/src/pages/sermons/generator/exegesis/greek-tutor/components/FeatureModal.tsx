import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface FeatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    screenshotPath?: string;
    details?: string[];
}

/**
 * Modal that introduces a Greek-tutor feature with optional screenshot and
 * bullet-list of characteristics. Used from the onboarding callouts.
 */
export const FeatureModal: React.FC<FeatureModalProps> = ({ isOpen, onClose, title, description, screenshotPath, details }) => {
    const { t } = useTranslation('greekTutor');
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                    <DialogDescription className="text-base">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {screenshotPath && (
                        <div className="rounded-lg border overflow-hidden shadow-lg">
                            <img
                                src={screenshotPath}
                                alt={title}
                                className="w-full h-auto"
                            />
                        </div>
                    )}

                    {details && details.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-lg">{t('modal.characteristics')}</h4>
                            <ul className="space-y-2">
                                {details.map((detail, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-primary mt-1">✓</span>
                                        <span className="text-muted-foreground">{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
