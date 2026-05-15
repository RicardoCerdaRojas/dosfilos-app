import { Sparkles, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FreeStarterCardProps {
    onPickPrompt: (prompt: string) => void;
    disabled?: boolean;
}

const PROMPT_KEYS = ['expository', 'passage', 'firstSermon'] as const;

/**
 * Hito 5.1 — visible to Free users until they fire their first query.
 * Once `sessions.length > 0`, the parent stops rendering this card and the
 * existing chip row takes over as the steady-state nudge surface. No
 * localStorage flag — the absence/presence of a session is the source of truth.
 *
 * All copy lives in `faculty.json#freeStarter` so EN/ES users see the same
 * card translated. Adding a fourth prompt is a JSON edit + one entry in
 * PROMPT_KEYS.
 */
export function FreeStarterCard({ onPickPrompt, disabled }: FreeStarterCardProps) {
    const { t } = useTranslation('faculty');

    return (
        <div className="max-w-2xl mx-auto mt-6">
            {/* Theme-aware container — previously used dark-only
                slate-100/200 text + white/[0.06] surfaces that
                vanished against the new bg-card hero. Now everything
                uses semantic tokens (warning for the eyebrow accent,
                foreground/muted-foreground for text) so it reads
                cleanly in both light and dark modes. */}
            <div className="rounded-2xl border border-warning/30 bg-warning-subtle/40 p-5">
                <div className="flex items-center gap-2 mb-3 text-warning">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {t('freeStarter.eyebrow')}
                    </span>
                </div>
                <p className="text-sm text-foreground/90 mb-4">
                    {t('freeStarter.intro')}
                </p>
                <div className="space-y-1.5">
                    {PROMPT_KEYS.map((key) => {
                        const title = t(`freeStarter.prompts.${key}.title`);
                        const prompt = t(`freeStarter.prompts.${key}.prompt`);
                        return (
                            <button
                                key={key}
                                onClick={() => onPickPrompt(prompt)}
                                disabled={disabled}
                                className="group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-card hover:bg-muted border border-border hover:border-warning/40 text-left transition-all disabled:opacity-40"
                            >
                                <span className="text-sm text-foreground group-hover:text-foreground">
                                    {title}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-warning group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
