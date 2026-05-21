import { useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { detectIllustrationDuplicates, type SermonContent } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';

interface IllustrationDuplicateBannerProps {
    draft: SermonContent | null | undefined;
}

/**
 * Non-blocking warning shown above the draft viewer when post-gen
 * Jaccard analysis flags illustration pairs as suspiciously similar
 * (audit T2 #11). The prompt already tells the LLM to vary categories
 * across consecutive points — this surfaces the failure mode when the
 * model ignores it, so the preacher catches duplicate anecdotes
 * before publishing instead of mid-sermon.
 *
 * Dismissible per-render — once the preacher rewrites the offending
 * illustration the draft state changes and the banner re-evaluates
 * automatically. Hidden when no pairs cross the threshold.
 */
export function IllustrationDuplicateBanner({ draft }: IllustrationDuplicateBannerProps) {
    const [dismissed, setDismissed] = useState(false);
    const pairs = useMemo(() => detectIllustrationDuplicates(draft), [draft]);

    if (pairs.length === 0 || dismissed) return null;

    return (
        <div className="rounded-lg border border-warning/40 bg-warning-subtle/40 px-3 py-2 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium text-warning-subtle-foreground">
                    {pairs.length === 1
                        ? 'Ilustraciones similares detectadas'
                        : `${pairs.length} pares de ilustraciones similares detectados`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {pairs
                        .map((p) => `Punto ${romanize(p.indexA + 1)} ↔ Punto ${romanize(p.indexB + 1)}`)
                        .join(' · ')}
                    . El asistente repitió categoría o anécdota — considera variar antes de predicar.
                </p>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setDismissed(true)}
                title="Descartar aviso"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

function romanize(n: number): string {
    return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][n - 1] ?? String(n);
}
