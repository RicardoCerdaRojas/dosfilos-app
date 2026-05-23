import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, BookOpen, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useConfessionList } from '@/hooks/useConfessionList';
import { useDeclaredConfession } from '@/hooks/useDeclaredConfession';
import { NON_CONFESSIONAL, type DeclaredConfessionId } from '@dosfilos/domain';

interface ConfessionStepProps {
    userId: string;
    onCompleted: () => void;
    onBack: () => void;
}

/**
 * Onboarding step where the pastor declares the confessional tradition
 * that should anchor Testigo 3 of the three-witness mechanism
 * ([ADR-001](docs/pastoral-fidelity/decisions/ADR-001-confession-anchored-correction.md),
 * [ADR-007](docs/pastoral-fidelity/decisions/ADR-007-phase-0-policy-resolutions.md)).
 *
 * Mandatory for new users — the wizard advances only after a selection.
 * Existing users get the same UI surfaced as a non-blocking banner +
 * `/settings/confession` page in PR 0.7.
 *
 * "No-confesional declarado" is a first-class option: it skips Testigo 3
 * but doesn't disable the pastor from the rest of the platform. ADR-007
 * Q3 sets `confessionVisibility: 'private'` by default; the public
 * profile toggle ships once the public pastor profile feature lands.
 */
export function ConfessionStep({ userId, onCompleted, onBack }: ConfessionStepProps) {
    const { t } = useTranslation('dashboard');
    const { confessions, loading } = useConfessionList();
    const { declare, isLoading } = useDeclaredConfession();
    const [selected, setSelected] = useState<DeclaredConfessionId | null>(null);

    const handleContinue = async () => {
        if (!selected) return;
        const ok = await declare(userId, selected, 'private');
        if (ok) onCompleted();
    };

    return (
        <motion.div
            key="confession"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-4xl space-y-8"
        >
            <div className="text-center space-y-3 max-w-2xl mx-auto">
                <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                    {t('onboarding.confession.eyebrow')}
                </div>
                <h2 className="font-reading text-3xl md:text-4xl leading-tight tracking-[-0.01em] text-foreground">
                    {t('onboarding.confession.title')}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                    {t('onboarding.confession.subtitle')}
                </p>
            </div>

            <div className="rounded-xl border bg-card/50 p-4 max-w-2xl mx-auto flex gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('onboarding.confession.explainer')}
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
                    {confessions.map((c) => {
                        const isSelected = selected === c.id;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelected(c.id)}
                                className={`
                                    text-left p-4 rounded-xl border-2 bg-card transition-colors
                                    ${isSelected
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-border hover:border-foreground/20'}
                                `}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-sm">{c.shortTitle}</h3>
                                            {isSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {c.tradition} · {String(c.year)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setSelected(NON_CONFESSIONAL)}
                        className={`
                            text-left p-4 rounded-xl border-2 bg-card transition-colors sm:col-span-2
                            ${selected === NON_CONFESSIONAL
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-foreground/20'}
                        `}
                    >
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-sm">
                                        {t('onboarding.confession.nonConfessional.title')}
                                    </h3>
                                    {selected === NON_CONFESSIONAL && (
                                        <Check className="ml-auto h-4 w-4 text-primary" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t('onboarding.confession.nonConfessional.description')}
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between pt-2 max-w-3xl mx-auto w-full">
                <Button variant="ghost" onClick={onBack} className="gap-2" disabled={isLoading}>
                    <ArrowLeft className="h-4 w-4" />
                    {t('onboarding.nav.back')}
                </Button>
                <Button
                    size="lg"
                    onClick={handleContinue}
                    disabled={!selected || isLoading}
                    className="gap-2"
                >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('onboarding.nav.continue')}
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </motion.div>
    );
}
