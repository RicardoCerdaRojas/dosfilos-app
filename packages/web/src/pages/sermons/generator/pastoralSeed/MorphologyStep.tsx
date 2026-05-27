import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { GraduationCap, Plus, Trash2, ExternalLink, BookOpen } from 'lucide-react';
import {
    MorphologyStepData,
    PASTORAL_SEED_THRESHOLDS,
    PastoralSeedTool,
    StepValidationResult,
    WordStudy,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';
import { GreekTutorOverlay } from '../exegesis/greek-tutor/GreekTutorOverlay';
import { GreekTutorProvider } from '../exegesis/greek-tutor/GreekTutorProvider';
import { PastoralWordStudyModal } from './wordStudy/PastoralWordStudyModal';
import { usePastoralWordStudyGate } from '@/hooks/usePastoralFidelityGate';

interface Props {
    passage: string;
    sermonId: string | null;
    data: MorphologyStepData;
    validation?: StepValidationResult;
    onAddWordStudy: (study: WordStudy) => Promise<void>;
    onChange: (patch: Partial<MorphologyStepData>) => void;
    onLogToolUsage: (tool: PastoralSeedTool) => void;
}

const T = PASTORAL_SEED_THRESHOLDS.morphology;

/**
 * Paso 3 — Morfología.
 *
 * Pastor records `≥2` word studies. Greek tutor opens in the existing
 * `GreekTutorOverlay` (extended with sermonId-aware context). Hebrew
 * tutor is linked out — overlay embed deferred per ADR-decision in
 * Phase 1 kickoff (2026-05-25 bitácora).
 *
 * Each word study captures the original-language form, where it
 * appears, and the pastor's own discovery (≥30 chars). The tutor's
 * `tutorInteractionId` is stamped onto the study when the pastor
 * accepts the tutor output as their study source.
 */
export function MorphologyStep({
    passage,
    sermonId,
    data,
    validation,
    onAddWordStudy,
    onChange,
    onLogToolUsage,
}: Props) {
    const { t } = useTranslation('wordStudy');
    const wordStudyGate = usePastoralWordStudyGate();
    const [greekOpen, setGreekOpen] = useState(false);
    const [wordStudyOpen, setWordStudyOpen] = useState(false);
    const [draft, setDraft] = useState<WordStudy>({
        word: '',
        reference: '',
        pastorDiscovery: '',
        language: 'greek',
    });

    useStepTimer({
        enabled: true,
        onFlush: (delta) => {
            if (delta > 0) onChange({ timeSpentSeconds: (data.timeSpentSeconds ?? 0) + delta });
        },
    });

    const studies = data.wordStudies ?? [];

    const handleAddDraft = async () => {
        if (!draft.word.trim() || !draft.reference.trim()) return;
        if ((draft.pastorDiscovery ?? '').trim().length < T.pastorDiscoveryMinChars) return;
        await onAddWordStudy({ ...draft });
        setDraft({ word: '', reference: '', pastorDiscovery: '', language: draft.language });
    };

    const removeStudy = (index: number) => {
        const next = [...studies];
        next.splice(index, 1);
        onChange({ wordStudies: next });
    };

    const openGreek = () => {
        if (!greekOpen) onLogToolUsage('greek-tutor');
        setGreekOpen(true);
    };

    const openHebrew = () => {
        onLogToolUsage('hebrew-tutor');
        const url = `/hebrew-tutor?passage=${encodeURIComponent(passage)}&returnTo=${encodeURIComponent(
            sermonId ? `/dashboard/sermons?id=${sermonId}` : '/dashboard/sermons',
        )}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const openWordStudy = () => {
        if (!wordStudyOpen) onLogToolUsage('pastoral-word-study');
        setWordStudyOpen(true);
    };

    return (
        <StepShell
            stepNumber={3}
            title="Morfología"
            subtitle={`Estudia ${T.minWordStudies}+ palabras clave del pasaje. Consulta el tutor cuando necesites.`}
            passage={passage}
            validation={validation}
        >
            <div className="space-y-5">
                <StepHelp
                    label="¿Qué es un estudio de palabra? Ver guía rápida"
                    examples={[
                        {
                            title: 'Ejemplo: δικαιοσύνη en Romanos',
                            body: (
                                <>
                                    <p><span className="text-foreground">Palabra:</span> δικαιοσύνη</p>
                                    <p><span className="text-foreground">Referencia:</span> Romanos 8:4</p>
                                    <p>
                                        <span className="text-foreground">Descubrimiento:</span> Pablo no usa la palabra en sentido legal romano (cumplir reglas) sino en sentido pactual hebreo (estar en relación correcta con Dios). El cumplimiento es del Espíritu, no del esfuerzo humano.
                                    </p>
                                </>
                            ),
                        },
                    ]}
                >
                    <p>
                        Selecciona <span className="font-medium">2-3 palabras clave</span> del pasaje (griego para NT, hebreo para AT) que carguen el peso teológico. Para cada una documenta:
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                        <li><span className="text-foreground">Palabra original</span>: transliteración + grafía.</li>
                        <li><span className="text-foreground">Referencia</span>: dónde aparece en el pasaje.</li>
                        <li><span className="text-foreground">Descubrimiento</span>: qué APRENDISTE estudiándola — no copia del lexicón, tu lectura pastoral del peso de la palabra.</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                        Usa el tutor de griego (botón abajo) para análisis morfológico y semántico ayudado por AI. El descubrimiento final es tuyo.
                    </p>
                </StepHelp>

                <div className="flex flex-wrap gap-2">
                    {wordStudyGate.enabled ? (
                        <Button variant="outline" size="sm" onClick={openWordStudy} type="button">
                            <BookOpen className="h-4 w-4 mr-2" />
                            {t('modal.buttonOpen')}
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" onClick={openGreek} type="button">
                                <GraduationCap className="h-4 w-4 mr-2" />
                                Abrir tutor de griego
                            </Button>
                            <Button variant="outline" size="sm" onClick={openHebrew} type="button">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir tutor de hebreo (nueva pestaña)
                            </Button>
                        </>
                    )}
                </div>

                <div className="border rounded-md p-4 space-y-3 bg-muted/20">
                    <p className="text-sm font-medium">Agregar estudio de palabra</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                            placeholder="Palabra original (ej. δικαιοσύνη)"
                            value={draft.word}
                            onChange={(e) => setDraft((d) => ({ ...d, word: e.target.value }))}
                        />
                        <Input
                            placeholder="Referencia (ej. Rom 8:4)"
                            value={draft.reference}
                            onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))}
                        />
                        <select
                            value={draft.language ?? 'greek'}
                            onChange={(e) =>
                                setDraft((d) => ({ ...d, language: e.target.value as 'greek' | 'hebrew' }))
                            }
                            className="border rounded-md px-2 text-sm bg-background"
                        >
                            <option value="greek">Griego</option>
                            <option value="hebrew">Hebreo</option>
                        </select>
                    </div>
                    <Textarea
                        placeholder={`Tu descubrimiento personal sobre esta palabra. ¿Qué carga lleva? ¿Cómo se usa en otros lugares? (mínimo ${T.pastorDiscoveryMinChars} caracteres)`}
                        value={draft.pastorDiscovery}
                        onChange={(e) => setDraft((d) => ({ ...d, pastorDiscovery: e.target.value }))}
                        rows={3}
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                            {(draft.pastorDiscovery ?? '').trim().length} / {T.pastorDiscoveryMinChars}
                        </span>
                        <Button size="sm" onClick={handleAddDraft} type="button">
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar estudio
                        </Button>
                    </div>
                </div>

                {studies.length > 0 && (
                    <ul className="space-y-2">
                        {studies.map((s, i) => (
                            <li key={`${s.word}-${i}`} className="border rounded-md p-3 bg-card">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                            <span className="font-serif">{s.word}</span>{' '}
                                            <span className="text-xs text-muted-foreground">— {s.reference}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">{s.pastorDiscovery}</p>
                                        {s.tutorInteractionId && (
                                            <p className="text-[10px] text-muted-foreground">
                                                Vinculado al tutor: {s.tutorInteractionId.slice(0, 12)}…
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeStudy(i)}
                                        type="button"
                                        aria-label="Eliminar estudio"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <p className="text-xs text-muted-foreground">
                    Mínimo {T.minWordStudies} estudios. Actual: {studies.length}.
                </p>
            </div>

            {!wordStudyGate.enabled && greekOpen && (
                <GreekTutorProvider>
                    <GreekTutorOverlay
                        isOpen={greekOpen}
                        onClose={() => setGreekOpen(false)}
                        passage={passage}
                    />
                </GreekTutorProvider>
            )}
            {wordStudyGate.enabled && (
                <PastoralWordStudyModal
                    isOpen={wordStudyOpen}
                    onClose={() => setWordStudyOpen(false)}
                    passage={passage}
                    existingStudies={studies}
                    onAddWordStudy={onAddWordStudy}
                />
            )}
        </StepShell>
    );
}
