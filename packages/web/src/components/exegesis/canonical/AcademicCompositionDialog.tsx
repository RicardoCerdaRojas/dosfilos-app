import { useState } from 'react';
import { Copy, Download, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import type { ComposeAcademicPaperOutput } from '@dosfilos/domain';

interface AcademicCompositionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paperId: string;
    /** File-name stem suggested for the .md download (e.g., "hebreos-1-1-4"). */
    suggestedFilename: string;
}

/**
 * Modal that orchestrates an academic-paper composition run and
 * renders the resulting markdown. Triggered from the paper detail
 * page's overflow menu.
 *
 * Flow inside the dialog:
 *   1. Idle — "Componer" CTA visible, explanatory copy.
 *   2. Composing — spinner + status text.
 *   3. Success — formatter status banner + tabs to switch between
 *      rendered markdown preview and raw markdown + copy/download
 *      buttons.
 *   4. Error — error banner + retry CTA.
 *
 * The composition is NOT auto-persisted — see the use case docstring
 * for the rationale (multi-format reuse). The user copies or
 * downloads from here; if they want the markdown saved on the paper
 * itself, they paste it into the assembled-markdown surface (a
 * future feature).
 */
export function AcademicCompositionDialog({
    open,
    onOpenChange,
    paperId,
    suggestedFilename,
}: AcademicCompositionDialogProps) {
    const { t } = useTranslation('exegesis');
    const { composeAcademicPaper } = useExegesisPapers();
    const [result, setResult] = useState<ComposeAcademicPaperOutput | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [view, setView] = useState<'rendered' | 'raw'>('rendered');

    const handleCompose = async (persist = false) => {
        setErrorMessage(null);
        setResult(null);
        try {
            const output = await composeAcademicPaper.mutateAsync({ paperId, persist });
            setResult(output);
            setView('rendered');
            if (persist) {
                toast.success(t('canonical.compose.savedToast', { defaultValue: 'Composición guardada en el paper (assembledMarkdown).' }));
            }
        } catch (err) {
            console.error('[exegesis] composeAcademicPaper failed:', err);
            // The use case throws ComposeAcademicPaperPersistError when
            // composition succeeded but saving to the paper failed.
            // We still surface the markdown so the user can copy/download.
            const persistErr = err as { isPersistError?: boolean; output?: ComposeAcademicPaperOutput };
            if (persistErr?.isPersistError && persistErr.output) {
                setResult(persistErr.output);
                setView('rendered');
                toast.warning(t('canonical.compose.persistWarning', {
                    defaultValue: 'La composición se generó pero no se pudo guardar en el paper. Copiá o descargá el markdown antes de cerrar.',
                }));
                return;
            }
            setErrorMessage((err as Error).message ?? t('canonical.compose.errorGeneric', { defaultValue: 'Error inesperado durante la composición.' }));
        }
    };

    const handleSaveToPaper = async () => {
        if (!result) return;
        await handleCompose(true);
    };

    const handleCopy = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.markdown);
            toast.success(t('canonical.compose.copied', { defaultValue: 'Markdown copiado al portapapeles.' }));
        } catch (err) {
            console.error('[exegesis] clipboard copy failed:', err);
            toast.error(t('canonical.compose.copyFailed', { defaultValue: 'No se pudo copiar al portapapeles.' }));
        }
    };

    const handleDownload = () => {
        if (!result) return;
        const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${suggestedFilename}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClose = (next: boolean) => {
        if (!next) {
            // Reset composition when the user closes — opening again
            // gives a fresh run, not a stale cached output. The hook's
            // mutation cache is per-paperId so this is purely local.
            setResult(null);
            setErrorMessage(null);
            setView('rendered');
        }
        onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-success" aria-hidden />
                        {t('canonical.compose.title', { defaultValue: 'Componer paper académico' })}
                    </DialogTitle>
                    <DialogDescription>
                        {t('canonical.compose.subtitle', {
                            defaultValue: 'Generamos prosa académica TMS desde los análisis canónicos aceptados de cada verso. La guía de estilo configurada se aplica obligatoriamente.',
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {!result && !composeAcademicPaper.isPending && !errorMessage && (
                        <IdleState onCompose={handleCompose} />
                    )}

                    {composeAcademicPaper.isPending && <ComposingState />}

                    {errorMessage && !composeAcademicPaper.isPending && (
                        <ErrorState message={errorMessage} onRetry={handleCompose} />
                    )}

                    {result && !composeAcademicPaper.isPending && (
                        <SuccessView
                            result={result}
                            view={view}
                            onViewChange={setView}
                            onCopy={handleCopy}
                            onDownload={handleDownload}
                            onRecompose={() => handleCompose(false)}
                            onSaveToPaper={handleSaveToPaper}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────

function IdleState({ onCompose }: { onCompose: (persist?: boolean) => void }) {
    const { t } = useTranslation('exegesis');
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
            <div className="rounded-full bg-success/10 p-3">
                <Sparkles className="h-6 w-6 text-success" aria-hidden />
            </div>
            <p className="text-sm text-foreground max-w-md leading-relaxed">
                {t('canonical.compose.idleBody', {
                    defaultValue: 'Los análisis canónicos de cada verso se transforman en un paper académico continuo: introducción + análisis verso por verso + conclusión + bibliografía. Las citas se aplican según la guía de estilo configurada.',
                })}
            </p>
            <Button onClick={() => onCompose(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Sparkles className="h-4 w-4 mr-1.5" />
                {t('canonical.compose.cta', { defaultValue: 'Componer paper' })}
            </Button>
            <p className="text-[11px] text-muted-foreground italic max-w-md">
                {t('canonical.compose.cost', {
                    defaultValue: 'Cada composición consume una llamada de Gemini Pro 2.5 con contexto extenso. La salida no se persiste automáticamente — copiá o descargá el markdown.',
                })}
            </p>
        </div>
    );
}

function ComposingState() {
    const { t } = useTranslation('exegesis');
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-foreground">
                {t('canonical.compose.composingTitle', { defaultValue: 'Componiendo paper académico…' })}
            </p>
            <p className="text-[11px] text-muted-foreground italic max-w-md text-center">
                {t('canonical.compose.composingBody', {
                    defaultValue: 'Esto puede tardar entre 30 y 120 segundos según la cantidad de versos y la densidad del análisis.',
                })}
            </p>
        </div>
    );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    const { t } = useTranslation('exegesis');
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 space-y-3 text-center">
            <p className="text-sm font-semibold text-destructive">
                {t('canonical.compose.errorTitle', { defaultValue: 'No se pudo componer el paper' })}
            </p>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                {message}
            </p>
            <Button onClick={onRetry} variant="outline">
                {t('canonical.compose.retry', { defaultValue: 'Reintentar' })}
            </Button>
        </div>
    );
}

function SuccessView({
    result,
    view,
    onViewChange,
    onCopy,
    onDownload,
    onRecompose,
    onSaveToPaper,
}: {
    result: ComposeAcademicPaperOutput;
    view: 'rendered' | 'raw';
    onViewChange: (v: 'rendered' | 'raw') => void;
    onCopy: () => void;
    onDownload: () => void;
    onRecompose: () => void;
    onSaveToPaper: () => void;
}) {
    const { t } = useTranslation('exegesis');
    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <FormatterStatusBanner status={result.formatterStatus} />

            <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-[11px]">
                    <button
                        type="button"
                        onClick={() => onViewChange('rendered')}
                        className={[
                            'px-2.5 py-1 rounded transition-colors',
                            view === 'rendered'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                    >
                        {t('canonical.compose.viewRendered', { defaultValue: 'Renderizado' })}
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewChange('raw')}
                        className={[
                            'px-2.5 py-1 rounded transition-colors',
                            view === 'raw'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                    >
                        {t('canonical.compose.viewRaw', { defaultValue: 'Markdown' })}
                    </button>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={onCopy}>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        {t('canonical.compose.copy', { defaultValue: 'Copiar' })}
                    </Button>
                    <Button size="sm" variant="outline" onClick={onDownload}>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        {t('canonical.compose.download', { defaultValue: 'Descargar .md' })}
                    </Button>
                    <Button
                        size="sm"
                        onClick={onSaveToPaper}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        title={t('canonical.compose.saveToPaperTooltip', {
                            defaultValue: 'Guarda esta composición como assembledMarkdown del paper. Puedes recomponer en cualquier momento.',
                        })}
                    >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        {t('canonical.compose.saveToPaper', { defaultValue: 'Guardar al paper' })}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onRecompose}>
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        {t('canonical.compose.recompose', { defaultValue: 'Recomponer' })}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-md border border-border bg-card p-4">
                {view === 'rendered' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {result.markdown}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/90">
                        {result.markdown}
                    </pre>
                )}
            </div>

            {result.tokensUsed !== null && (
                <p className="text-[10px] text-muted-foreground italic text-right">
                    {t('canonical.compose.tokensUsed', {
                        defaultValue: '{{tokens}} tokens · modelo {{model}}',
                        tokens: result.tokensUsed.toLocaleString(),
                        model: result.modelId,
                    })}
                </p>
            )}
        </div>
    );
}

function FormatterStatusBanner({ status }: { status: ComposeAcademicPaperOutput['formatterStatus'] }) {
    const { t } = useTranslation('exegesis');
    if (status === 'applied') {
        return (
            <div className="rounded-md border border-success/30 bg-success-subtle/40 px-3 py-2 text-[11px] text-success-subtle-foreground">
                ✓ {t('canonical.compose.formatterApplied', {
                    defaultValue: 'Guía de estilo aplicada (capa 1: prompt, capa 2: formatter determinístico).',
                })}
            </div>
        );
    }
    if (status === 'skipped') {
        return (
            <div className="rounded-md border border-warning/30 bg-warning-subtle/40 px-3 py-2 text-[11px] text-warning-subtle-foreground">
                ⚠ {t('canonical.compose.formatterSkipped', {
                    defaultValue: 'Sin manifest de guía de estilo extraído. Solo aplicada la capa 1 (prompt). Extrae el manifest desde la pestaña "Guía de estilo" para activar la capa 2.',
                })}
            </div>
        );
    }
    return (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            ⚠ {t('canonical.compose.formatterError', {
                defaultValue: 'Hubo un error aplicando el formatter determinístico. La composición LLM (capa 1) sigue válida.',
            })}
        </div>
    );
}
