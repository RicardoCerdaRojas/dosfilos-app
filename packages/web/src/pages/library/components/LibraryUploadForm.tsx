import { useTranslation } from '@/i18n';
import {
    LibraryCategory,
    ResourceType,
    type BibleBookId,
    type LibraryResourceScope,
    getBookById,
} from '@dosfilos/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, BookOpen, Loader2, Plus, Sparkles, Upload, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExtractionMode = 'standard' | 'premium';

export interface UploadFormMetadata {
    title: string;
    author: string;
    type: ResourceType;
    extractionMode: ExtractionMode;
}

/**
 * v1.7 smart-match autocomplete result. Mirrors the return shape of
 * `inferBibleBooksFromTitle` so the form can render the live preview
 * without re-importing the domain helper.
 */
export interface SmartMatchInferenceResult {
    books: ReadonlyArray<BibleBookId>;
    inferredScope: LibraryResourceScope | null;
}

interface LibraryUploadFormProps {
    /** Categories available in the dropdown — sourced from `categoryService`. */
    categories: LibraryCategory[];
    /** Selected file (or null if not yet picked). */
    file: File | null;
    /** Whether the picked file exceeds the soft size cap (50MB). */
    fileSizeWarning: boolean;
    /** Form state for title/author/category. */
    metadata: UploadFormMetadata;
    /** True while the upload request is in flight. */
    uploading: boolean;
    /** Upload progress percentage (0-100) or null if not started yet. */
    uploadProgress: number | null;
    /**
     * Live smart-match inference from the title. Drives the inline
     * preview ("✨ 2 libros detectados — 1 Pedro, 2 Pedro · libro").
     * Not editable from this form in v1.7 — the metadata editor on
     * the resource detail (A.3) is the canonical spot for adjustment.
     */
    smartMatchInference: SmartMatchInferenceResult;
    /** File input change handler — caller validates type + sets file/warning. */
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** Metadata patch — caller spreads over current state. */
    onMetadataChange: (updates: Partial<UploadFormMetadata>) => void;
    /** Submit handler. Caller checks consent gate, runs upload, hides form on success. */
    onSubmit: (e: React.FormEvent) => void;
}

/**
 * Collapsible upload form for adding a new resource. Displays file picker,
 * size warning, metadata fields (title/author/category), and submit button.
 *
 * Pure presentational — caller owns form state, validation, and the actual
 * upload call. Component just orchestrates the inputs and renders progress.
 */
export function LibraryUploadForm({
    categories,
    file,
    fileSizeWarning,
    metadata,
    uploading,
    uploadProgress,
    smartMatchInference,
    onFileChange,
    onMetadataChange,
    onSubmit,
}: LibraryUploadFormProps) {
    const { t, i18n } = useTranslation('library');

    return (
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary font-medium inline-flex items-center gap-1.5">
                <Plus className="h-3 w-3" />
                {t('upload.sectionLabel')}
            </div>

            {/* Extraction-mode toggle. Two radio-style tiles so the user
                explicitly picks which engine tier (and which balance
                bucket) to consume. Default `premium` since it's the
                best quality; user downgrades when they know the doc
                doesn't need it (narrative books, sermons, etc.). */}
            <fieldset className="space-y-1.5">
                <Label className="text-[12.5px]">{t('upload.modeLabel')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ModeTile
                        active={metadata.extractionMode === 'standard'}
                        onClick={() => onMetadataChange({ extractionMode: 'standard' })}
                        icon={<Wand2 className="h-3.5 w-3.5" />}
                        title={t('upload.modeStandardTitle')}
                        description={t('upload.modeStandardDescription')}
                        tone="info"
                    />
                    <ModeTile
                        active={metadata.extractionMode === 'premium'}
                        onClick={() => onMetadataChange({ extractionMode: 'premium' })}
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                        title={t('upload.modePremiumTitle')}
                        description={t('upload.modePremiumDescription')}
                        tone="success"
                    />
                </div>
            </fieldset>

            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5 lg:col-span-1">
                    <Label htmlFor="file" className="text-[12.5px]">{t('upload.fileLabel')}</Label>
                    <Input
                        id="file"
                        type="file"
                        accept=".pdf,.epub"
                        onChange={onFileChange}
                        required
                        className="text-[12.5px]"
                    />
                    {fileSizeWarning && (
                        <Alert variant="destructive" className="bg-warning-subtle border-warning/40 py-2">
                            <AlertTriangle className="h-3 w-3 text-warning-subtle-foreground" />
                            <AlertDescription className="text-warning-subtle-foreground text-[11px]">
                                {t('upload.fileSizeWarning')}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                    <Label htmlFor="title" className="text-[12.5px]">{t('upload.titleLabel')}</Label>
                    <Input
                        id="title"
                        value={metadata.title}
                        onChange={e => onMetadataChange({ title: e.target.value })}
                        placeholder={t('upload.titlePlaceholder')}
                        required
                    />
                    <SmartMatchPreview
                        inference={smartMatchInference}
                        language={i18n.language}
                        t={t}
                    />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                    <Label htmlFor="author" className="text-[12.5px]">{t('upload.authorLabel')}</Label>
                    <Input
                        id="author"
                        value={metadata.author}
                        onChange={e => onMetadataChange({ author: e.target.value })}
                        placeholder={t('upload.authorPlaceholder')}
                        required
                    />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                    <Label htmlFor="type" className="text-[12.5px]">{t('upload.categoryLabel')}</Label>
                    <Select
                        value={metadata.type}
                        onValueChange={(v: ResourceType) => onMetadataChange({ type: v })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end lg:col-span-1">
                    <Button type="submit" className="w-full gap-2" disabled={uploading || !file}>
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {uploadProgress !== null ? `${Math.round(uploadProgress)}%` : '…'}
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                {t('upload.uploadButton')}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}

interface ModeTileProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    tone: 'info' | 'success';
}

/**
 * Radio-style tile for the standard/premium extraction-mode toggle.
 * Click selects; `aria-pressed` exposes state to assistive tech.
 * Tone (`info` / `success`) drives the active border color so each
 * mode is visually distinct at a glance.
 */
function ModeTile({ active, onClick, icon, title, description, tone }: ModeTileProps) {
    const activeBorder = tone === 'info'
        ? 'border-info bg-info-subtle'
        : 'border-success bg-success-subtle';
    const activeIcon = tone === 'info' ? 'text-info' : 'text-success';
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'text-left rounded-lg border px-3 py-2.5 transition-colors',
                active
                    ? activeBorder
                    : 'border-border bg-card hover:border-foreground/30',
            )}
        >
            <div className={cn(
                'inline-flex items-center gap-1.5 text-[12px] font-semibold',
                active ? activeIcon : 'text-foreground',
            )}>
                {icon}
                {title}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                {description}
            </p>
        </button>
    );
}

interface SmartMatchPreviewProps {
    inference: SmartMatchInferenceResult;
    language: string;
    t: (key: string, opts?: Record<string, unknown>) => string;
}

/**
 * Inline preview of the v1.7 smart-match autocomplete. Renders only when
 * the title produced a confident inference — silent when the inferer
 * returned `null` scope (the user just hasn't typed enough title yet,
 * or it's a non-Bible work, in which case we don't promise anything).
 *
 * Read-only on purpose: the upload form stays lean. Adjustments live
 * on the metadata editor in the resource detail (A.3).
 */
function SmartMatchPreview({ inference, language, t }: SmartMatchPreviewProps) {
    if (inference.inferredScope === null) return null;

    const isSpanish = language?.toLowerCase().startsWith('es');
    const bookLabels = inference.books
        .map(id => {
            const book = getBookById(id);
            if (!book) return id;
            return isSpanish ? book.nameEs : book.nameEn;
        })
        .join(', ');

    return (
        <div className="flex items-start gap-1.5 text-[10.5px] text-muted-foreground">
            <Sparkles className="h-3 w-3 mt-0.5 text-info shrink-0" aria-hidden />
            <span className="leading-snug">
                <span className="text-foreground/80 font-medium">
                    {t('upload.smartMatchLabel')}:
                </span>{' '}
                {inference.books.length > 0 ? (
                    <>
                        <span className="inline-flex items-center gap-1">
                            <BookOpen className="h-2.5 w-2.5" aria-hidden />
                            {bookLabels}
                        </span>
                        {' · '}
                    </>
                ) : null}
                <span>{t(`upload.smartMatchScope.${inference.inferredScope}`)}</span>
            </span>
        </div>
    );
}
