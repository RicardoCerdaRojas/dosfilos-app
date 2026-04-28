import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from '@/i18n';

/**
 * Persistent welcome banner shown on the dashboard until the user dismisses it.
 * Editorial dark slate panel — same family as the landing's CTA section.
 */
export function ActivationBanner() {
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);
    const { t } = useTranslation('dashboard');

    if (dismissed) return null;

    return (
        <div className="mb-8 relative overflow-hidden rounded-xl bg-slate-950 text-white border border-slate-900 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Subtle indigo glow */}
            <div
                aria-hidden
                className="absolute inset-0 opacity-50 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse 600px 200px at 20% 0%, rgba(99,102,241,0.18), transparent 60%)',
                }}
            />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5 p-6 md:p-7">
                <div className="space-y-1.5 max-w-xl">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-300 font-medium">
                        {t('welcomeModal.eyebrow')}
                    </div>
                    <h3 className="font-reading text-[22px] md:text-[24px] leading-[1.15] tracking-[-0.01em] text-white">
                        {t('welcomeModal.title')}
                    </h3>
                    <p className="text-[14px] leading-relaxed text-slate-400">
                        {t('welcomeModal.subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={() => navigate('/dashboard/library')}
                        className="bg-white text-slate-900 hover:bg-slate-200 font-medium gap-1.5 h-10"
                    >
                        {t('welcomeModal.buttons.explore')}
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDismissed(true)}
                        className="text-slate-400 hover:text-white hover:bg-white/5 shrink-0 h-10 w-10"
                        aria-label="Cerrar"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
