import { Button } from '@/components/ui/button';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from '@/i18n';

/**
 * Persistent welcome banner shown on the dashboard until the user dismisses it.
 * Aligned with the rest of the workspace surfaces — subtle primary-tinted card
 * (previously a full-bleed dark slate panel that felt grafted from the landing).
 */
export function ActivationBanner() {
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);
    const { t } = useTranslation('dashboard');

    if (dismissed) return null;

    return (
        <div className="mb-6 relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 md:p-6">
                <div className="flex items-start gap-3 max-w-xl">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-medium">
                            {t('welcomeModal.eyebrow')}
                        </div>
                        <h3 className="font-reading text-[20px] md:text-[22px] leading-[1.2] tracking-[-0.01em] text-foreground">
                            {t('welcomeModal.title')}
                        </h3>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                            {t('welcomeModal.subtitle')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={() => navigate('/dashboard/library')}
                        className="font-medium gap-1.5 h-9"
                    >
                        {t('welcomeModal.buttons.explore')}
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDismissed(true)}
                        className="text-muted-foreground hover:text-foreground shrink-0 h-9 w-9"
                        aria-label="Cerrar"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
