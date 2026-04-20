import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, Plus, Trash2, BookOpen, Sparkles,
    FileText, ChevronRight, ChevronLeft, Mic
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase } from '@/context/firebase-context';
import { useCreateSermon } from '@/hooks/use-sermons';
import {
    type SermonPersonalization,
    type SermonTone,
    SERMON_TONE_LABELS,
} from '@dosfilos/domain';

export interface SermonOutline {
    title: string;
    passage: string;
    proposition: string;
    points: { title: string; verses: string }[];
}

/**
 * The SERMON prompt always generates a header block at the top:
 *   # Título
 *   **Pasaje:** ...
 *   **Proposición Homilética:** ...
 *   ---
 *
 * We strip everything up to (and including) the first `---` divider so the stored
 * content begins at the first H2 section (e.g., ## Introducción).
 * The title is already stored in the sermon's title field.
 */
function stripSermonHeader(markdown: string): string {
    // Find the first horizontal rule (---) that follows the title block
    const dividerIndex = markdown.indexOf('\n---\n');
    if (dividerIndex !== -1) {
        return markdown.slice(dividerIndex + 5).trimStart(); // skip '\n---\n'
    }
    // Fallback: remove any leading # H1 line
    return markdown.replace(/^#[^\n]*\n/, '').trimStart();
}

interface SermonOutlinePreviewModalProps {
    outline: SermonOutline | null;
    sessionId?: string;  // ID of the faculty session that originated this sermon
    onClose: () => void;
    onGenerateFullSermon: (approvedOutline: SermonOutline, personalization?: SermonPersonalization) => Promise<string>;
    onSuccess?: (sermonId: string, content: string, title: string) => void;
}

type Phase = 'preview' | 'personalize' | 'generating';

const TONE_OPTIONS: { value: SermonTone; emoji: string }[] = [
    { value: 'doxological', emoji: '🙌' },
    { value: 'pastoral', emoji: '🤝' },
    { value: 'confrontational', emoji: '⚡' },
    { value: 'didactic', emoji: '📖' },
    { value: 'evangelistic', emoji: '📢' },
];

export function SermonOutlinePreviewModal({
    outline,
    sessionId,
    onClose,
    onGenerateFullSermon,
    onSuccess,
}: SermonOutlinePreviewModalProps) {
    // Removed useNavigate since we use onSuccess now
    const { user } = useFirebase();
    const { createSermon } = useCreateSermon();

    const [phase, setPhase] = useState<Phase>('preview');
    const [edited, setEdited] = useState<SermonOutline>({
        title: '', passage: '', proposition: '', points: []
    });
    const [personalization, setPersonalization] = useState<SermonPersonalization>({});

    // Sync edited state whenever the outline prop changes (e.g., when it arrives from AI)
    useEffect(() => {
        if (outline) {
            setEdited(outline);
            setPhase('preview');
            setPersonalization({});
        }
    }, [outline]);

    const handleOpen = (open: boolean) => {
        if (!open && phase !== 'generating') onClose();
    };

    const updatePoint = (idx: number, field: 'title' | 'verses', value: string) => {
        setEdited(prev => ({
            ...prev,
            points: prev.points.map((p, i) => i === idx ? { ...p, [field]: value } : p)
        }));
    };

    const addPoint = () => {
        setEdited(prev => ({
            ...prev,
            points: [...prev.points, { title: '', verses: '' }]
        }));
    };

    const removePoint = (idx: number) => {
        setEdited(prev => ({
            ...prev,
            points: prev.points.filter((_, i) => i !== idx)
        }));
    };

    const updatePersonalization = <K extends keyof SermonPersonalization>(
        key: K, value: SermonPersonalization[K]
    ) => {
        setPersonalization(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerate = async () => {
        if (!user) return;
        setPhase('generating');
        try {
            // Only pass personalization if at least one field is populated
            const hasPersonalization = Object.values(personalization).some(
                v => v !== undefined && v !== ''
            );
            const fullMarkdown = await onGenerateFullSermon(
                edited,
                hasPersonalization ? personalization : undefined
            );

            // Strip the AI-generated header block (# Title, **Pasaje:**, **Proposición:**, ---)
            // so the content starts from the first ## section (Introducción)
            const cleanContent = stripSermonHeader(fullMarkdown);

            const sermon = await createSermon({
                title: edited.title || 'Sermón sin título',
                content: cleanContent,
                bibleReferences: edited.passage ? [edited.passage] : [],
                status: 'draft',
                sourceFacultySessionId: sessionId,
            });
            
            if (onSuccess) {
                onSuccess(sermon.id, cleanContent, edited.title || 'Sermón sin título');
            }
            onClose();
        } catch (error) {
            console.error('Error generating sermon:', error);
            setPhase('personalize');
        }
    };

    const canGenerate = edited.title.trim() && edited.proposition.trim() && edited.points.length > 0;

    return (
        <Dialog open={!!outline} onOpenChange={handleOpen}>
            <DialogContent className="max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden" style={{ maxWidth: '680px', width: '95vw' }}>
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-900 dark:text-emerald-100">
                        {phase === 'preview' && (
                            <><FileText className="h-4 w-4" /> Revisa tu Bosquejo</>
                        )}
                        {phase === 'personalize' && (
                            <><Mic className="h-4 w-4" /> Tu Voz Pastoral</>
                        )}
                        {phase === 'generating' && (
                            <><Sparkles className="h-4 w-4 animate-pulse" /> Generando Sermón...</>
                        )}
                    </DialogTitle>
                    {phase === 'preview' && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                            Edita la proposición y los puntos antes de continuar.
                        </p>
                    )}
                    {phase === 'personalize' && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                            Opcional: imprime tu estilo y contexto en el sermón.
                        </p>
                    )}

                    {/* Step indicator for preview & personalize */}
                    {phase !== 'generating' && (
                        <div className="flex items-center gap-2 mt-2">
                            <StepIndicator step={1} label="Bosquejo" active={phase === 'preview'} completed={phase === 'personalize'} />
                            <div className="h-px flex-1 bg-emerald-200 dark:bg-emerald-800" />
                            <StepIndicator step={2} label="Tu Voz" active={phase === 'personalize'} completed={false} />
                        </div>
                    )}
                </DialogHeader>

                {/* ===== Phase: Preview (Outline Editing) ===== */}
                {phase === 'preview' && (
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Título</Label>
                            <Input
                                value={edited.title}
                                onChange={e => setEdited(p => ({ ...p, title: e.target.value }))}
                                placeholder="Título del sermón"
                                className="font-semibold text-foreground"
                            />
                        </div>

                        {/* Passage */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> Pasaje
                            </Label>
                            <Input
                                value={edited.passage}
                                onChange={e => setEdited(p => ({ ...p, passage: e.target.value }))}
                                placeholder="ej: 1 Pedro 2:11-17"
                            />
                        </div>

                        {/* Proposition */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Proposición Homilética</Label>
                            <Textarea
                                value={edited.proposition}
                                onChange={e => setEdited(p => ({ ...p, proposition: e.target.value }))}
                                placeholder="En 📖 Pasaje, aprenderás..."
                                className="resize-none text-sm leading-relaxed"
                                rows={3}
                            />
                        </div>

                        {/* Points */}
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Puntos del Sermón ({edited.points.length})
                            </Label>
                            {edited.points.length === 0 && (
                                <p className="text-sm text-muted-foreground italic py-2">No hay puntos aún. Agrega uno.</p>
                            )}
                            {edited.points.map((point, idx) => (
                                <div key={idx} className="flex gap-2.5 items-start p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mt-0.5">
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                            {['I', 'II', 'III', 'IV', 'V'][idx] ?? idx + 1}
                                        </span>
                                    </div>
                                    <div className="flex-1 flex gap-2 min-w-0">
                                        <Input
                                            value={point.title}
                                            onChange={e => updatePoint(idx, 'title', e.target.value)}
                                            placeholder="Título del punto (verbo imperativo)"
                                            className="text-sm flex-1 min-w-0"
                                        />
                                        <Input
                                            value={point.verses}
                                            onChange={e => updatePoint(idx, 'verses', e.target.value)}
                                            placeholder="vv. XX-XX"
                                            className="text-sm text-muted-foreground shrink-0"
                                            style={{ width: '100px' }}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-0.5 shrink-0"
                                        onClick={() => removePoint(idx)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <button
                                onClick={addPoint}
                                className="w-full py-2 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" /> Agregar punto
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== Phase: Personalize (Co-Authoring) ===== */}
                {phase === 'personalize' && (
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                        {/* Tone selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Tono del Sermón
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {TONE_OPTIONS.map(({ value, emoji }) => {
                                    const isSelected = personalization.tone === value;
                                    return (
                                        <button
                                            key={value}
                                            onClick={() => updatePersonalization('tone', isSelected ? undefined : value)}
                                            className={`
                                                px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                                                ${isSelected
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 shadow-sm'
                                                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60 hover:border-muted-foreground/30'
                                                }
                                            `}
                                        >
                                            {emoji} {SERMON_TONE_LABELS[value].split(' — ')[0]}
                                        </button>
                                    );
                                })}
                            </div>
                            {personalization.tone && (
                                <p className="text-xs text-muted-foreground italic pl-1">
                                    {SERMON_TONE_LABELS[personalization.tone]}
                                </p>
                            )}
                        </div>

                        {/* Situational context */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Contexto Situacional
                            </Label>
                            <Textarea
                                value={personalization.situationalContext ?? ''}
                                onChange={e => updatePersonalization('situationalContext', e.target.value)}
                                placeholder="Ej: Será predicado en un culto de funeral, o después de una crisis en la comunidad..."
                                className="resize-none text-sm"
                                rows={2}
                            />
                        </div>

                        {/* Congregation description */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Congregación
                            </Label>
                            <Input
                                value={personalization.congregationDescription ?? ''}
                                onChange={e => updatePersonalization('congregationDescription', e.target.value)}
                                placeholder="Ej: 80 personas, reformados, nivel teológico medio-alto"
                                className="text-sm"
                            />
                        </div>

                        {/* Pastoral emphasis */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Énfasis Pastoral
                            </Label>
                            <Textarea
                                value={personalization.pastoralEmphasis ?? ''}
                                onChange={e => updatePersonalization('pastoralEmphasis', e.target.value)}
                                placeholder="¿Qué quieres que la congregación sienta, entienda o haga al terminar el sermón?"
                                className="resize-none text-sm"
                                rows={2}
                            />
                        </div>

                        {/* Illustrations */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Ilustraciones y Testimonios
                            </Label>
                            <Textarea
                                value={personalization.illustrations ?? ''}
                                onChange={e => updatePersonalization('illustrations', e.target.value)}
                                placeholder="Anécdotas personales, historias de la congregación, o testimonios que quieras incluir..."
                                className="resize-none text-sm"
                                rows={3}
                            />
                        </div>

                        {/* Preacher notes */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Notas del Predicador
                            </Label>
                            <Textarea
                                value={personalization.preacherNotes ?? ''}
                                onChange={e => updatePersonalization('preacherNotes', e.target.value)}
                                placeholder="Ideas sueltas, argumentos que quieras desarrollar, énfasis particulares..."
                                className="resize-none text-sm"
                                rows={3}
                            />
                        </div>

                        {/* Skip hint */}
                        <p className="text-xs text-muted-foreground text-center italic">
                            Todos los campos son opcionales. Puedes generar el sermón directamente.
                        </p>
                    </div>
                )}

                {/* ===== Phase: Generating ===== */}
                {phase === 'generating' && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 px-6 text-center">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            </div>
                            <Sparkles className="h-5 w-5 text-emerald-400 absolute -top-1 -right-1" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-foreground">Generando el sermón completo</p>
                            <p className="text-sm text-muted-foreground">
                                Esto tomará unos 20–30 segundos.<br />
                                Serás redirigido al editor automáticamente.
                            </p>
                        </div>
                        <div className="w-full p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 text-left">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wide">Proposición</p>
                            <p className="text-sm text-emerald-900 dark:text-emerald-200 italic leading-relaxed">&ldquo;{edited.proposition}&rdquo;</p>
                            <ul className="mt-3 space-y-1">
                                {edited.points.map((p, i) => (
                                    <li key={i} className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-1.5">
                                        <span className="font-bold shrink-0">{['I', 'II', 'III', 'IV', 'V'][i]}.</span>
                                        <span>{p.title} <span className="text-emerald-500">({p.verses})</span></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* ===== Footer ===== */}
                {phase === 'preview' && (
                    <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            onClick={() => setPhase('personalize')}
                            disabled={!canGenerate}
                        >
                            Continuar
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </DialogFooter>
                )}

                {phase === 'personalize' && (
                    <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setPhase('preview')}
                            className="text-muted-foreground gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Volver
                        </Button>
                        <Button
                            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                        >
                            <Sparkles className="h-4 w-4" />
                            Generar Sermón Completo
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ─── Step Indicator ─── */

function StepIndicator({ step, label, active, completed }: {
    step: number;
    label: string;
    active: boolean;
    completed: boolean;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={`
                w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors
                ${active
                    ? 'bg-emerald-600 text-white'
                    : completed
                        ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                }
            `}>
                {completed ? '✓' : step}
            </div>
            <span className={`text-xs font-medium ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                {label}
            </span>
        </div>
    );
}
