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
import { FileDropzone } from '@/components/ui/file-dropzone';
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

/**
 * Subset of `UploadTierAvailability` consumed by this form. Mirrored
 * locally so the form can be rendered in stories/tests without the hook.
 */
export interface TierAvailabilityProp {
    premium: boolean;
    standard: boolean;
    bothUnavailable: boolean;
    premiumCapMB: number;
    standardCapMB: number;
    fileSizeMB: number;
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
    /**
     * Per-tier availability for the currently picked file. Drives the
     * disabled state on the Premium / Standard tiles and the
     * "se procesará con Básico" callout. Without this, users could
     * pick Premium for a 200MB file and silently get pdf-parse output.
     */
    tierAvailability: TierAvailabilityProp;
    /** File picker handler — caller validates type + sets file/warning. Pass `null` to clear. */
    onFileChange: (file: File | null) => void;
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
    tierAvailability,
    onFileChange,
    onMetadataChange,
    onSubmit,
}: LibraryUploadFormProps) {
    const { t, i18n } = useTranslation('library');
    const showTierCallout = file !== null && (!tierAvailability.premium || !tierAvailability.standard);

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
                        disabled={!tierAvailability.standard}
                        disabledHint={t('upload.tierUnavailableHint', { capMB: tierAvailability.standardCapMB })}
                        onClick={() => onMetadataChange({ extractionMode: 'standard' })}
                        icon={<Wand2 className="h-3.5 w-3.5" />}
                        title={t('upload.modeStandardTitle')}
                        description={t('upload.modeStandardDescription')}
                        tone="info"
                    />
                    <ModeTile
                        active={metadata.extractionMode === 'premium'}
                        disabled={!tierAvailability.premium}
                        disabledHint={t('upload.tierUnavailableHint', { capMB: tierAvailability.premiumCapMB })}
                        onClick={() => onMetadataChange({ extractionMode: 'premium' })}
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                        title={t('upload.modePremiumTitle')}
                        description={t('upload.modePremiumDescription')}
                        tone="success"
                    />
                </div>
                {showTierCallout && (
                    <TierCallout availability={tierAvailability} />
                )}
            </fieldset>

            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5 lg:col-span-1">
                    <Label htmlFor="file" className="text-[12.5px]">{t('upload.fileLabel')}</Label>
                    <FileDropzone
                        id="file"
                        accept=".pdf,.epub"
                        value={file}
                        onChange={onFileChange}
                        disabled={uploading}
                        size="compact"
                        hint="PDF o EPUB"
                        emptyLabel={t('common:fileDropzone.empty')}
                        clearLabel={t('common:fileDropzone.clear')}
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
    /** When true, click is suppressed and the tile renders dimmed. */
    disabled?: boolean;
    /** Tooltip shown when disabled. Explains why the tier isn't available. */
    disabledHint?: string;
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
 *
 * `disabled` mutes the tile when the file exceeds the tier's hard
 * cap (LlamaParse 100MB / Gemini 50MB). The disabled tile keeps its
 * label so the user understands what they CAN'T pick — hiding it
 * would just look broken.
 */
function ModeTile({ active, disabled = false, disabledHint, onClick, icon, title, description, tone }: ModeTileProps) {
    const activeBorder = tone === 'info'
        ? 'border-info bg-info-subtle'
        : 'border-success bg-success-subtle';
    const activeIcon = tone === 'info' ? 'text-info' : 'text-success';
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            aria-pressed={active}
            title={disabled ? disabledHint : undefined}
            className={cn(
                'text-left rounded-lg border px-3 py-2.5 transition-colors',
                disabled
                    ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                    : active
                        ? activeBorder
                        : 'border-border bg-card hover:border-foreground/30',
            )}
        >
            <div className={cn(
                'inline-flex items-center gap-1.5 text-[12px] font-semibold',
                disabled ? 'text-muted-foreground' : active ? activeIcon : 'text-foreground',
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

/**
 * Surfaces WHY a tier got disabled (or both did). Renders below the
 * mode tiles so the user understands "Premium is greyed out because
 * the file is 114MB (cap is 100MB)" instead of guessing.
 *
 * Three visual variants:
 *   - both unavailable → callout amber, "se procesará con Básico"
 *   - only premium unavailable → callout amber, suggest Standard
 *   - only standard unavailable → callout neutral, "Premium sí cubre"
 */
function TierCallout({ availability }: { availability: TierAvailabilityProp }) {
    const { t } = useTranslation('library');
    const sizeLabel = availability.fileSizeMB.toFixed(1);

    if (availability.bothUnavailable) {
        return (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-[11.5px] text-warning-subtle-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
                <span className="leading-snug">
                    {t('upload.tierCalloutBoth', {
                        sizeMB: sizeLabel,
                        premiumCapMB: availability.premiumCapMB,
                        standardCapMB: availability.standardCapMB,
                    })}
                </span>
            </div>
        );
    }
    if (!availability.premium) {
        return (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-[11.5px] text-warning-subtle-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
                <span className="leading-snug">
                    {t('upload.tierCalloutPremiumOnly', {
                        sizeMB: sizeLabel,
                        premiumCapMB: availability.premiumCapMB,
                    })}
                </span>
            </div>
        );
    }
    // Only standard unavailable — premium still works, less urgent.
    return (
        <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info-subtle px-3 py-2 text-[11.5px] text-info-subtle-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
            <span className="leading-snug">
                {t('upload.tierCalloutStandardOnly', {
                    sizeMB: sizeLabel,
                    standardCapMB: availability.standardCapMB,
                })}
            </span>
        </div>
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
