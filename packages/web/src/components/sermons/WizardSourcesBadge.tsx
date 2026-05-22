import { useMemo, useState } from 'react';
import { BookMarked } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import type { RAGSource } from '@dosfilos/domain';
import { useWizard } from '@/pages/sermons/generator/WizardContext';

/**
 * Persistent chip rendered in `WizardHeader` that shows the total
 * count of unique library sources the assistant has consulted across
 * any wizard step that has run so far (exegesis + homiletics + draft).
 *
 * Clicking the chip opens a side Sheet listing each source with
 * which step pulled it in, so the pastor can audit the provenance of
 * the work in progress without having to scroll to the bibliography
 * footer or wait until publish.
 *
 * Renders nothing when no step has produced sources yet — keeps the
 * header clean during the initial Step 1 setup before the first
 * generation finishes.
 */
export function WizardSourcesBadge() {
    const [open, setOpen] = useState(false);
    const { exegesis, homiletics, draft } = useWizard();

    const accumulated = useMemo(
        () => collectSources({ exegesis, homiletics, draft }),
        [exegesis, homiletics, draft],
    );

    if (accumulated.length === 0) return null;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    title="Ver fuentes consultadas por el asistente"
                >
                    <BookMarked className="h-3 w-3" />
                    <span>
                        {accumulated.length === 1
                            ? '1 fuente'
                            : `${accumulated.length} fuentes`}
                    </span>
                </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <BookMarked className="h-4 w-4 text-primary" />
                        Fuentes consultadas
                    </SheetTitle>
                    <SheetDescription>
                        Recursos de tu biblioteca que el asistente está usando para construir este sermón.
                    </SheetDescription>
                </SheetHeader>
                <ol className="px-4 pb-6 space-y-3 list-decimal pl-8 marker:text-muted-foreground">
                    {accumulated.map((entry, idx) => (
                        <li key={`${entry.source.title}-${idx}`} className="text-sm">
                            <div className="font-medium text-foreground">{entry.source.title}</div>
                            {entry.source.author && (
                                <div className="text-xs text-foreground/80">{entry.source.author}</div>
                            )}
                            {entry.source.page && (
                                <div className="text-xs text-muted-foreground">p. {entry.source.page}</div>
                            )}
                            {entry.source.usedFor && (
                                <p className="text-xs text-muted-foreground italic mt-1">
                                    {entry.source.usedFor}
                                </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                {entry.steps.map((step) => (
                                    <span
                                        key={step}
                                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                    >
                                        {stepLabel(step)}
                                    </span>
                                ))}
                            </div>
                        </li>
                    ))}
                </ol>
            </SheetContent>
        </Sheet>
    );
}

type WizardStep = 'exegesis' | 'homiletics' | 'draft';

interface AccumulatedEntry {
    source: RAGSource;
    steps: WizardStep[];
}

interface CollectInput {
    exegesis: { ragSources?: RAGSource[] } | null;
    homiletics: { ragSources?: RAGSource[] } | null;
    draft: { ragSources?: RAGSource[] } | null;
}

/**
 * Aggregates the per-step `ragSources` into a deduped list, tagging
 * each entry with the steps that contributed it. Dedup key is
 * `title|author` (case-insensitive, trimmed) so the same book cited at
 * different pages collapses into one entry — the page number, if it
 * varies, is taken from the first occurrence (later refinement could
 * surface a per-page list).
 */
function collectSources({ exegesis, homiletics, draft }: CollectInput): AccumulatedEntry[] {
    const byKey = new Map<string, AccumulatedEntry>();
    const pushAll = (sources: RAGSource[] | undefined, step: WizardStep) => {
        if (!sources) return;
        for (const s of sources) {
            if (!s?.title?.trim()) continue;
            const key = dedupKey(s);
            const existing = byKey.get(key);
            if (existing) {
                if (!existing.steps.includes(step)) existing.steps.push(step);
            } else {
                byKey.set(key, { source: s, steps: [step] });
            }
        }
    };
    pushAll(exegesis?.ragSources, 'exegesis');
    pushAll(homiletics?.ragSources, 'homiletics');
    pushAll(draft?.ragSources, 'draft');
    return Array.from(byKey.values());
}

function dedupKey(s: RAGSource): string {
    return [s.title?.trim().toLowerCase() ?? '', s.author?.trim().toLowerCase() ?? ''].join('|');
}

function stepLabel(step: WizardStep): string {
    switch (step) {
        case 'exegesis':
            return 'Exégesis';
        case 'homiletics':
            return 'Homilética';
        case 'draft':
            return 'Redacción';
    }
}
