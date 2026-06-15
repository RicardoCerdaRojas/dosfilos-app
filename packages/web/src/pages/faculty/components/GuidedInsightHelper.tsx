import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ClipboardList, ArrowDownToLine, Plus, X, Pin } from 'lucide-react';
import { PASTORAL_SEED_THRESHOLDS } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { useGuidedSeedDoubts } from '@/hooks/useGuidedSeedDoubts';

const T = PASTORAL_SEED_THRESHOLDS.insight;

/** Live char counter that turns green once the minimum is met. */
function Meter({ value, min }: { value: string; min: number }) {
    const n = value.trim().length;
    return (
        <span className={cn('text-[10px] tabular-nums shrink-0', n >= min ? 'text-success' : 'text-muted-foreground')}>
            {n}/{min}
        </span>
    );
}

interface Props {
    /**
     * Envía el Insight ESTRUCTURADO (campos del formulario, sin pasar por texto
     * + re-parseo). Devuelve el resultado de la validación determinista.
     */
    onSubmit: (args: {
        insight: {
            centralIdea: string;
            observations: string[];
            openQuestion: string;
            pastoralAnecdote: string;
            doxologicalApplication: string;
        };
        renderedInsightText: string;
    }) => Promise<{ accepted: boolean; reasons: string[]; sermonReady: boolean } | null>;
    /** True while a turn is being sent — collapses the helper out of the way. */
    busy?: boolean;
    /** Seed under study — used to resurface the doubts the pastor raised. */
    seedId?: string;
}

const MIN_OBSERVATIONS = 3;

/**
 * Inline form for guided Step 8 (Insight). The pastor fills five fields and the
 * helper assembles them into the exact labelled format the seed parser expects
 * (`Idea central:` / `Observaciones:` / `Pregunta abierta:` / `Anécdota:` /
 * `Aplicación doxológica:`), then drops it in the chat to review + send. The
 * content is 100% the pastor's — this only structures it (manifesto-safe).
 */
export function GuidedInsightHelper({ onSubmit, busy, seedId }: Props) {
    const { t } = useTranslation('guidedSermon');
    const { data: doubts = [] } = useGuidedSeedDoubts(seedId);
    const [open, setOpen] = useState(true);
    const [centralIdea, setCentralIdea] = useState('');
    const [observations, setObservations] = useState<string[]>(['', '', '']);
    const [openQuestion, setOpenQuestion] = useState('');
    const [anecdote, setAnecdote] = useState('');
    const [doxological, setDoxological] = useState('');
    const [reasons, setReasons] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (busy) setOpen(false);
    }, [busy]);

    const setObservation = (i: number, v: string) =>
        setObservations((prev) => prev.map((o, idx) => (idx === i ? v : o)));
    const addObservation = () => setObservations((prev) => [...prev, '']);
    const removeObservation = (i: number) =>
        setObservations((prev) => (prev.length > MIN_OBSERVATIONS ? prev.filter((_, idx) => idx !== i) : prev));

    const build = (): string => {
        const obs = observations.map((o) => o.trim()).filter(Boolean);
        return [
            `Idea central: ${centralIdea.trim()}`,
            'Observaciones:',
            ...obs,
            `Pregunta abierta: ${openQuestion.trim()}`,
            `Anécdota: ${anecdote.trim()}`,
            `Aplicación doxológica: ${doxological.trim()}`,
        ].join('\n');
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setReasons([]);
        try {
            const result = await onSubmit({
                insight: {
                    centralIdea: centralIdea.trim(),
                    observations: observations.map((o) => o.trim()).filter(Boolean),
                    openQuestion: openQuestion.trim(),
                    pastoralAnecdote: anecdote.trim(),
                    doxologicalApplication: doxological.trim(),
                },
                renderedInsightText: build(),
            });
            // Si la validación determinista rechaza, mostrar qué falta (no se envió).
            if (result && !result.accepted) setReasons(result.reasons);
        } finally {
            setSubmitting(false);
        }
    };

    const labelClass = 'text-[11px] font-semibold text-foreground';
    const hintClass = 'text-[10px] text-muted-foreground';

    return (
        <div className="rounded-lg border border-info/30 bg-info/5 overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-info hover:bg-info/10 transition-colors"
                aria-expanded={open}
            >
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <ClipboardList className="h-4 w-4" />
                {t('insight.helperTitle')}
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-3 max-h-[50vh] overflow-y-auto">
                    <p className="text-[11px] text-muted-foreground">{t('insight.helperHint')}</p>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <label className={labelClass}>{t('insight.centralIdea')}</label>
                            <Meter value={centralIdea} min={T.centralIdeaMinChars} />
                        </div>
                        <Input value={centralIdea} onChange={(e) => setCentralIdea(e.target.value)} placeholder={t('insight.centralIdeaPlaceholder')} />
                    </div>

                    <div className="space-y-1">
                        <label className={labelClass}>{t('insight.observations')}</label>
                        <p className={hintClass}>{t('insight.observationsHint')}</p>
                        {observations.map((o, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <Input value={o} onChange={(e) => setObservation(i, e.target.value)} placeholder={`${i + 1}.`} />
                                <Meter value={o} min={T.observationMinChars} />
                                {observations.length > MIN_OBSERVATIONS && (
                                    <button
                                        onClick={() => removeObservation(i)}
                                        className="text-muted-foreground hover:text-destructive shrink-0"
                                        aria-label={t('insight.removeObservation')}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-info" onClick={addObservation}>
                            <Plus className="h-3.5 w-3.5" />
                            {t('insight.addObservation')}
                        </Button>
                    </div>

                    {doubts.length > 0 && (
                        <div className="space-y-1 rounded-md border border-warning/30 bg-warning/5 p-2">
                            <label className={cn(labelClass, 'flex items-center gap-1 text-warning')}>
                                <Pin className="h-3 w-3" />
                                {t('insight.savedDoubtsTitle')}
                            </label>
                            <p className={hintClass}>{t('insight.savedDoubtsHint')}</p>
                            <div className="flex flex-col gap-1">
                                {doubts.map((d, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setOpenQuestion(d.text)}
                                        className="text-left text-[11px] text-foreground rounded border border-warning/20 bg-background px-2 py-1 hover:bg-warning/10 transition-colors"
                                    >
                                        {d.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <label className={labelClass}>{t('insight.openQuestion')}</label>
                            <Meter value={openQuestion} min={T.openQuestionMinChars} />
                        </div>
                        <Input value={openQuestion} onChange={(e) => setOpenQuestion(e.target.value)} placeholder={t('insight.openQuestionPlaceholder')} />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <label className={labelClass}>{t('insight.anecdote')}</label>
                            <Meter value={anecdote} min={T.pastoralAnecdoteMinChars} />
                        </div>
                        <textarea
                            value={anecdote}
                            onChange={(e) => setAnecdote(e.target.value)}
                            rows={2}
                            placeholder={t('insight.anecdotePlaceholder')}
                            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <label className={labelClass}>{t('insight.doxological')}</label>
                            <Meter value={doxological} min={T.doxologicalApplicationMinChars} />
                        </div>
                        <textarea
                            value={doxological}
                            onChange={(e) => setDoxological(e.target.value)}
                            rows={2}
                            placeholder={t('insight.doxologicalPlaceholder')}
                            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>

                    {reasons.length > 0 && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive space-y-0.5">
                            <p className="font-medium">{t('insight.missing')}</p>
                            <ul className="list-disc pl-4">
                                {reasons.map((r, i) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <Button
                        size="sm"
                        className="w-full h-8 gap-1.5 text-xs"
                        disabled={submitting || busy}
                        onClick={handleSubmit}
                    >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                        {submitting ? t('insight.submitting') : t('insight.submit')}
                    </Button>
                </div>
            )}
        </div>
    );
}
