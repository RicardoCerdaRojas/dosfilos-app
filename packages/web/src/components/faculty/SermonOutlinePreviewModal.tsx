import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, BookOpen, Sparkles, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase } from '@/context/firebase-context';
import { useCreateSermon } from '@/hooks/use-sermons';

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
    onGenerateFullSermon: (approvedOutline: SermonOutline) => Promise<string>;
}

type Phase = 'preview' | 'generating';

export function SermonOutlinePreviewModal({
    outline,
    sessionId,
    onClose,
    onGenerateFullSermon,
}: SermonOutlinePreviewModalProps) {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { createSermon } = useCreateSermon();

    const [phase, setPhase] = useState<Phase>('preview');
    const [edited, setEdited] = useState<SermonOutline>({
        title: '', passage: '', proposition: '', points: []
    });

    // Sync edited state whenever the outline prop changes (e.g., when it arrives from AI)
    useEffect(() => {
        if (outline) {
            setEdited(outline);
            setPhase('preview');
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

    const handleGenerate = async () => {
        if (!user) return;
        setPhase('generating');
        try {
            const fullMarkdown = await onGenerateFullSermon(edited);

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
            onClose();
            navigate(`/dashboard/sermons/${sermon.id}`);
        } catch (error) {
            console.error('Error generating sermon:', error);
            setPhase('preview');
        }
    };

    const canGenerate = edited.title.trim() && edited.proposition.trim() && edited.points.length > 0;

    return (
        <Dialog open={!!outline} onOpenChange={handleOpen}>
            <DialogContent className="max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden" style={{ maxWidth: '680px', width: '95vw' }}>
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-900 dark:text-emerald-100">
                        {phase === 'preview'
                            ? <><FileText className="h-4 w-4" /> Revisa tu Bosquejo</>
                            : <><Sparkles className="h-4 w-4 animate-pulse" /> Generando Sermón...</>
                        }
                    </DialogTitle>
                    {phase === 'preview' && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                            Edita la proposición y los puntos antes de generar el sermón completo.
                        </p>
                    )}
                </DialogHeader>

                {phase === 'preview' ? (
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
                ) : (
                    /* Generating phase */
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

                {phase === 'preview' && (
                    <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
                            Cancelar
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
