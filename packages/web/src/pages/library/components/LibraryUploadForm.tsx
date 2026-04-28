import { useTranslation } from '@/i18n';
import { LibraryCategory, ResourceType } from '@dosfilos/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Plus, Upload } from 'lucide-react';

export interface UploadFormMetadata {
    title: string;
    author: string;
    type: ResourceType;
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
    onFileChange,
    onMetadataChange,
    onSubmit,
}: LibraryUploadFormProps) {
    const { t } = useTranslation('library');

    return (
        <div className="bg-card border border-border/60 rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary font-medium mb-3 inline-flex items-center gap-1.5">
                <Plus className="h-3 w-3" />
                {t('upload.sectionLabel')}
            </div>
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
