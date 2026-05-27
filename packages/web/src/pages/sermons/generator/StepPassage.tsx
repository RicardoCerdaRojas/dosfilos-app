import { useEffect, useMemo, useRef, useState } from 'react';
import { useWizard } from './WizardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowRight,
    Book,
    BookOpen,
    Check,
    GraduationCap,
    HelpCircle,
    History,
    Lightbulb,
    Search,
    Sparkles,
    Sprout,
    X,
} from 'lucide-react';
import { sermonService } from '@dosfilos/application';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { DerivedContextBanner } from './DerivedContextBanner';
import { usePastoralFidelityGate } from '@/hooks/usePastoralFidelityGate';
import { LocalBibleService } from '@/services/LocalBibleService';
import { cn } from '@/lib/utils';

const STEP_PREVIEW = [
    {
        n: 1,
        icon: BookOpen,
        title: 'Lectura',
        time: '2-3 min',
        hint: 'Primera impresión del pasaje.',
    },
    {
        n: 2,
        icon: Book,
        title: 'Sintaxis',
        time: '5 min',
        hint: 'Identifica la oración principal. SBLGNT disponible.',
    },
    {
        n: 3,
        icon: GraduationCap,
        title: 'Morfología',
        time: '10 min',
        hint: '2+ estudios de palabras. Tutor griego/hebreo on-demand.',
    },
    {
        n: 4,
        icon: Search,
        title: 'Reconocimiento',
        time: '5 min',
        hint: 'Paralelos canónicos + motor de cross-ref.',
    },
    {
        n: 5,
        icon: History,
        title: 'Función',
        time: '5 min',
        hint: '¿Qué hizo el texto a su audiencia original?',
    },
    {
        n: 6,
        icon: Sprout,
        title: 'Insight',
        time: '10 min',
        hint: 'Tu voz pastoral. Sin asistencia AI.',
        starred: true,
    },
] as const;

/**
 * StepPassage — entry point of the sermon wizard.
 *
 * Two-column layout on desktop (Bundle 2): LEFT holds the actual
 * passage entry + suggestion chips + recent passages; RIGHT renders
 * a static preview of the upcoming six-step spine so the pastor knows
 * what they're about to do. Single column on mobile.
 *
 * Compact header + inline chips (Bundle 1) + keyboard-first focus +
 * inline passage validation via `LocalBibleService.parseReference`
 * (Bundle 3).
 */
export function StepPassage() {
    const { t } = useTranslation('generator');
    const { passage, setPassage, setStep } = useWizard();
    const [searchParams] = useSearchParams();
    const [localPassage, setLocalPassage] = useState(passage);
    const [isLoading, setIsLoading] = useState(false);
    const pastoralGate = usePastoralFidelityGate();
    const inputRef = useRef<HTMLInputElement>(null);

    const sermonId = searchParams.get('id');
    const [sermonTitle, setSermonTitle] = useState<string | null>(null);
    const [sermonDescription, setSermonDescription] = useState<string | null>(null);

    useEffect(() => {
        if (!sermonId) return;
        sermonService.getSermon(sermonId).then((sermon) => {
            if (sermon) {
                setSermonTitle(sermon.title);
                setSermonDescription(sermon.content || '');
            }
        });
    }, [sermonId]);

    // Bundle 3 — M9: focus the input on mount so the pastor can start
    // typing immediately. `setTimeout` defers focus past the wizard's
    // layout shift so the cursor doesn't get yanked mid-paint.
    useEffect(() => {
        const id = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(id);
    }, []);

    const handleContinue = async () => {
        if (!localPassage.trim()) return;
        setIsLoading(true);
        try {
            setPassage(localPassage.trim());
            if (sermonId) {
                await sermonService.updateSermon(sermonId, {
                    bibleReferences: [localPassage.trim()],
                    wizardProgress: {
                        currentStep: 1,
                        passage: localPassage.trim(),
                        lastSaved: new Date(),
                    },
                });
            }
            setStep(1);
        } catch (error) {
            console.error('Error setting passage:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Bundle 3 — M10: parse-as-you-type. Returns {ok, label?, error?}
    // so the UI surfaces a green "✓ reconocido" or red "✗ no
    // reconocido" hint without blocking submit (pastor may know better
    // than the parser, especially for obscure book name spellings).
    const parseFeedback = useMemo(() => {
        const trimmed = localPassage.trim();
        if (trimmed.length < 3) return null;
        try {
            const ref = LocalBibleService.parseReference(trimmed);
            if (ref) {
                const verseRange = ref.verseEnd && ref.verseEnd !== ref.verseStart
                    ? `${ref.verseStart}-${ref.verseEnd}`
                    : `${ref.verseStart}`;
                return {
                    ok: true,
                    label: `${ref.book} ${ref.chapter}:${verseRange}`,
                } as const;
            }
        } catch {
            // Fall through to "no reconocido" feedback below.
        }
        return { ok: false } as const;
    }, [localPassage]);

    const suggestions = t('passage.suggestions', { returnObjects: true }) as Array<{ book: string; ref: string; topic: string }>;

    return (
        <div className="max-w-6xl mx-auto py-4 px-4">
            <DerivedContextBanner stepHintKey="passageHint" />

            {/* Compact header (Bundle 1 — M3) */}
            <header className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-md bg-primary/10 mt-1">
                    <Book className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h1 className="text-xl font-semibold font-serif">
                            Pasaje del sermón
                        </h1>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {pastoralGate.allowed ? 'Paso 0 de 3' : 'Inicio'}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {sermonTitle
                            ? t('passage.descWithTitle')
                            : 'Texto base que vas a estudiar antes de generar el borrador.'}
                    </p>
                </div>
            </header>

            {sermonTitle && (
                <div className="bg-muted/50 rounded-lg p-3 text-left mb-4 text-sm">
                    <p className="text-xs text-muted-foreground mb-0.5">
                        {t('passage.developingSermon')}
                    </p>
                    <p className="font-medium">{sermonTitle}</p>
                    {sermonDescription && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {sermonDescription}
                        </p>
                    )}
                </div>
            )}

            {/* Bundle 2 — M2: 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* LEFT — entry + suggestions */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                        <label className="text-sm font-medium block">
                            Pasaje bíblico
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Ingresa una referencia como{' '}
                            <span className="font-mono">Juan 3:16</span> o{' '}
                            <span className="font-mono">Romanos 8:28-39</span>.
                        </p>

                        <div className="relative">
                            <Input
                                ref={inputRef}
                                value={localPassage}
                                onChange={(e) => setLocalPassage(e.target.value)}
                                placeholder="Ej: Juan 3:16, Salmos 23, Mateo 5:1-12"
                                className="text-base py-5 pr-10"
                                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                                aria-invalid={parseFeedback?.ok === false}
                            />
                            {parseFeedback && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocalPassage('');
                                        inputRef.current?.focus();
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Limpiar"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Bundle 3 — M10: parse feedback inline */}
                        {parseFeedback && (
                            <div
                                className={cn(
                                    'text-xs flex items-center gap-1.5',
                                    parseFeedback.ok
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {parseFeedback.ok ? (
                                    <>
                                        <Check className="h-3 w-3" />
                                        Reconocido como{' '}
                                        <span className="font-medium">{parseFeedback.label}</span>
                                    </>
                                ) : (
                                    <>
                                        <HelpCircle className="h-3 w-3" />
                                        Aún no reconocemos esta referencia — puedes continuar igual.
                                    </>
                                )}
                            </div>
                        )}

                        <Button
                            onClick={handleContinue}
                            disabled={!localPassage.trim() || isLoading}
                            className="w-full"
                            size="lg"
                        >
                            {isLoading
                                ? t('passage.loading')
                                : pastoralGate.allowed
                                    ? 'Continuar al estudio en 6 pasos'
                                    : t('passage.continueBtn')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>

                    {/* Bundle 1 — M4: inline chip suggestions */}
                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            <p className="text-sm font-medium">Sugerencias rápidas</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                                <button
                                    key={s.ref}
                                    type="button"
                                    onClick={() => {
                                        setLocalPassage(s.ref);
                                        inputRef.current?.focus();
                                    }}
                                    className={cn(
                                        'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
                                        'border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary',
                                        'transition-colors',
                                    )}
                                    title={s.topic}
                                >
                                    <span className="font-medium">{s.ref}</span>
                                    <span className="text-[10px] text-muted-foreground group-hover:text-primary/80">
                                        · {s.topic}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT — flow preview (Bundle 2 — M7), pastoral-only */}
                {pastoralGate.allowed ? (
                    <aside className="lg:col-span-2">
                        <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-4 sticky top-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-4 w-4 text-emerald-600" />
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                    Tu camino — 6 pasos
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">
                                Después del pasaje harás el estudio personal. Tú estudias; el sistema desarrolla.
                            </p>
                            <ol className="space-y-2.5">
                                {STEP_PREVIEW.map((s) => {
                                    const Icon = s.icon;
                                    return (
                                        <li key={s.n} className="flex items-start gap-2.5">
                                            <div
                                                className={cn(
                                                    'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold',
                                                    s.starred
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                                                )}
                                            >
                                                {s.n}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium flex items-center gap-1.5">
                                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {s.title}
                                                    <span className="text-[10px] text-muted-foreground font-normal">
                                                        · {s.time}
                                                    </span>
                                                    {s.starred && (
                                                        <span className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                                            tu voz
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{s.hint}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                            <div className="mt-4 pt-3 border-t border-emerald-500/20 text-xs text-muted-foreground">
                                Luego: <span className="font-medium text-foreground">Homilética</span>{' '}
                                → <span className="font-medium text-foreground">Borrador</span>
                            </div>
                        </div>
                    </aside>
                ) : (
                    <aside className="lg:col-span-2">
                        <div className="rounded-lg border bg-muted/20 p-4 sticky top-4">
                            <p className="text-sm font-medium mb-2">¿Qué sigue?</p>
                            <p className="text-xs text-muted-foreground">
                                Luego de elegir el pasaje, generamos la exégesis, la homilética y el borrador del sermón.
                            </p>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
