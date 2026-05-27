import { ArrowRight } from 'lucide-react';
import type { WordResonance } from '@dosfilos/domain';

interface Props {
    resonance: WordResonance;
}

/**
 * Pastoral Fidelity Phase 1.5 — renders one canonical resonance: bible
 * reference + pastoral "how related" note. Designed to be readable in a
 * dense panel; reference style mirrors the wizard's parallels list.
 */
export function ResonanceCard({ resonance }: Props) {
    return (
        <article className="rounded-md border border-border bg-card p-3 space-y-1">
            <header className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>{resonance.reference}</span>
            </header>
            <p className="text-xs leading-snug text-muted-foreground">{resonance.howRelated}</p>
        </article>
    );
}
