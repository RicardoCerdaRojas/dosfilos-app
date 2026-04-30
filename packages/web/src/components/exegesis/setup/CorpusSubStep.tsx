import { useEffect, useRef, useState } from 'react';
import { FileStack, FileText, Loader2, Upload, X, BookOpenText } from 'lucide-react';
import { toast } from 'sonner';
import { libraryService } from '@dosfilos/application';
import {
    CITABLE_SOURCE_TYPES,
    type ExegeticalPaper,
    type ProjectSource,
    type SourceType,
} from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import { SourceTypePicker } from './SourceTypePicker';
import { RubricGapCard } from './RubricGapCard';

/**
 * Corpus sub-step — the main pedagogical surface of the rubric-driven
 * setup.
 *
 * Three sections, top to bottom:
 *   1. **Gap card** (`RubricGapCard`) — instant feedback on what the
 *      rubric needs vs. what's loaded. Re-renders on every source
 *      change.
 *   2. **Attached sources list** — what's already on the paper, with
 *      inline edit of `sourceType` (so the student can re-classify
 *      without re-uploading) and remove.
 *   3. **Upload form** — file → library_resource → addSource. Uses
 *      the granular `SourceTypePicker` grouped by academic family.
 *
 * Differs from the old wizard's `SourcesStep`: the paper already
 * exists when this sub-step runs, so uploads attach immediately
 * (`addSource.mutateAsync`). No "pending sources" buffer.
 */
interface CorpusSubStepProps {
    paper: ExegeticalPaper;
}

export function CorpusSubStep({ paper }: CorpusSubStepProps) {
    const { t } = useTranslation('exegesis');

    // Per-requirement upload coordination: when the student clicks
    // "Subir" on a missing requirement in the gap card, this state
    // pre-selects that type in the form below AND scrolls the form
    // into view. The token (timestamp) is part of the trigger so
    // clicking the same requirement twice still scrolls — without it
    // React would skip the effect because the type didn't change.
    const [pickedType, setPickedType] = useState<{ type: SourceType; token: number } | null>(null);
    const uploadFormRef = useRef<HTMLDivElement | null>(null);

    const handlePickType = (type: SourceType) => {
        setPickedType({ type, token: Date.now() });
        // Defer the scroll until after React has re-rendered the form
        // with the new initial type so the focus lands on the right
        // node visually.
        requestAnimationFrame(() => {
            uploadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    return (
        <div className="space-y-6">
            <header className="flex items-start gap-3">
                <FileStack className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        {t('paperSetup.subSteps.corpus.heading')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {t('paperSetup.subSteps.corpus.description')}
                    </p>
                </div>
            </header>

            <RubricGapCard paper={paper} onPickType={handlePickType} />

            <CorpusSourcesList paper={paper} />

            <div ref={uploadFormRef}>
                <CorpusUploadForm paper={paper} initialPickedType={pickedType} />
            </div>
        </div>
    );
}

// ── Sources list ────────────────────────────────────────────────────────

function CorpusSourcesList({ paper }: { paper: ExegeticalPaper }) {
    const { t } = useTranslation('exegesis');
    const sorted = [...paper.sources].sort((a, b) => a.order - b.order);

    return (
        <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
                {t('paperSetup.subSteps.corpus.list.title')} ({sorted.length})
            </h3>
            {sorted.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                    {t('paperSetup.subSteps.corpus.list.empty')}
                </p>
            ) : (
                <ul className="space-y-2">
                    {sorted.map(source => (
                        <SourceRow key={source.id} paperId={paper.id} source={source} />
                    ))}
                </ul>
            )}
        </section>
    );
}

function SourceRow({ paperId, source }: { paperId: string; source: ProjectSource }) {
    const { t } = useTranslation('exegesis');
    const { updateSource, removeSource } = useExegesisPapers();
    const isCitable = CITABLE_SOURCE_TYPES.has(source.sourceType);

    const handleTypeChange = async (next: SourceType) => {
        try {
            await updateSource.mutateAsync({
                paperId,
                sourceId: source.id,
                sourceType: next,
            });
            toast.success(t('paperSetup.subSteps.corpus.toast.typeUpdated'));
        } catch (err) {
            console.error('[exegesis] update source type failed:', err);
            toast.error(t('paperSetup.subSteps.corpus.toast.typeUpdateFailed'));
        }
    };

    const handleRemove = async () => {
        try {
            await removeSource.mutateAsync({ paperId, sourceId: source.id });
            toast.success(t('paperSetup.subSteps.corpus.toast.removed'));
        } catch (err) {
            console.error('[exegesis] remove source failed:', err);
            toast.error(t('paperSetup.subSteps.corpus.toast.removeFailed'));
        }
    };

    return (
        <li className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                        {source.displayLabel}
                    </p>
                    {source.citationKey && (
                        <p className="text-[11px] text-muted-foreground">
                            {t('paperSetup.subSteps.corpus.upload.citationKeyLabel')}: {source.citationKey}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleRemove}
                    disabled={removeSource.isPending}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors disabled:opacity-50"
                    aria-label={t('paperSetup.subSteps.corpus.list.remove')}
                    title={t('paperSetup.subSteps.corpus.list.remove')}
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
            <SourceTypePicker
                value={source.sourceType}
                onChange={handleTypeChange}
                disabled={updateSource.isPending}
                className="w-full text-xs"
            />
            {!isCitable && (
                <p className="text-[10px] text-warning-subtle-foreground inline-flex items-center gap-1">
                    <BookOpenText className="h-3 w-3" />
                    {t('paperSetup.subSteps.corpus.upload.modelPaperHint')}
                </p>
            )}
        </li>
    );
}

// ── Upload form ────────────────────────────────────────────────────────

function CorpusUploadForm({
    paper,
    initialPickedType,
}: {
    paper: ExegeticalPaper;
    initialPickedType: { type: SourceType; token: number } | null;
}) {
    const { t } = useTranslation('exegesis');
    const { user } = useFirebase();
    const { addSource } = useExegesisPapers();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [sourceType, setSourceType] = useState<SourceType>('commentary-critical');

    // Sync the picker when the parent points us at a specific type
    // (the gap card's "Subir" button). The token in the dependency
    // ensures repeated clicks on the same row still re-trigger the
    // sync — useful when the student clicks once, navigates away
    // mid-fill, and clicks again.
    useEffect(() => {
        if (initialPickedType) {
            setSourceType(initialPickedType.type);
        }
    }, [initialPickedType]);
    const [citationKey, setCitationKey] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);

    const labelOk = displayName.trim().length >= 3;
    const canSubmit = !!file && labelOk && !!user?.uid && !uploading;

    const handleFile = (f: File | null) => {
        setFile(f);
        if (f && !displayName) {
            setDisplayName(f.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || !file || !user?.uid) return;
        setUploading(true);
        setProgress(0);
        try {
            // Upload through the library pipeline. `type: 'other'` is a
            // pragmatic default; the real source-type signal lives on
            // the ProjectSource link, not on the library_resource.
            const resource = await libraryService.uploadResource(
                user.uid,
                file,
                {
                    title: displayName.trim(),
                    author: '',
                    type: 'other',
                },
                (p) => setProgress(p),
            );
            await addSource.mutateAsync({
                paperId: paper.id,
                corpusId: resource.id,
                sourceType,
                displayLabel: displayName.trim(),
                citationKey: citationKey.trim() || undefined,
            });
            // Reset form for "add another" loop.
            setFile(null);
            setDisplayName('');
            setCitationKey('');
            setSourceType('commentary-critical');
            if (fileInputRef.current) fileInputRef.current.value = '';
            toast.success(t('paperSetup.subSteps.corpus.toast.added'));
        } catch (err) {
            console.error('[exegesis] add source failed:', err);
            toast.error(t('paperSetup.subSteps.corpus.toast.addFailed'));
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const isCitable = CITABLE_SOURCE_TYPES.has(sourceType);

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-muted/40 p-4 space-y-3"
        >
            <h3 className="text-sm font-semibold text-foreground">
                {t('paperSetup.subSteps.corpus.upload.title')}
            </h3>

            <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                    {t('paperSetup.subSteps.corpus.upload.fileLabel')}
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf,application/epub+zip,.epub"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    disabled={uploading}
                    className="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-success-subtle file:text-success-subtle-foreground hover:file:bg-success/20"
                />
                {file && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                        {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2">
                <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                        {t('paperSetup.subSteps.corpus.upload.displayNameLabel')}
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={uploading}
                        placeholder={t('paperSetup.subSteps.corpus.upload.displayNamePlaceholder')}
                        className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                        {t('paperSetup.subSteps.corpus.upload.typeLabel')}
                    </label>
                    <SourceTypePicker
                        value={sourceType}
                        onChange={setSourceType}
                        disabled={uploading}
                        className="w-full"
                    />
                </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
                {t('paperSetup.subSteps.corpus.upload.typeDescription')}
            </p>

            {isCitable && (
                <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                        {t('paperSetup.subSteps.corpus.upload.citationKeyLabel')}
                    </label>
                    <input
                        type="text"
                        value={citationKey}
                        onChange={(e) => setCitationKey(e.target.value)}
                        disabled={uploading}
                        placeholder={t('paperSetup.subSteps.corpus.upload.citationKeyPlaceholder')}
                        className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                        {t('paperSetup.subSteps.corpus.upload.citationKeyHint')}
                    </p>
                </div>
            )}

            {!isCitable && (
                <p className="text-[11px] text-warning-subtle-foreground inline-flex items-start gap-1">
                    <BookOpenText className="h-3 w-3 mt-0.5 shrink-0" />
                    {t('paperSetup.subSteps.corpus.upload.modelPaperHint')}
                </p>
            )}

            {uploading && progress !== null && (
                <p className="text-xs text-muted-foreground">
                    {t('paperSetup.subSteps.corpus.upload.uploading', { progress })}
                </p>
            )}

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    {uploading ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4 mr-1.5" />
                    )}
                    {t('paperSetup.subSteps.corpus.upload.submit')}
                </Button>
            </div>
        </form>
    );
}
