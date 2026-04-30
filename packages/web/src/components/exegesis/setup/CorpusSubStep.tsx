import { useEffect, useMemo, useRef, useState } from 'react';
import {
    BookOpenText,
    CheckCircle2,
    FileStack,
    FileText,
    Library,
    Loader2,
    Search,
    Upload,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { libraryService } from '@dosfilos/application';
import {
    CITABLE_SOURCE_TYPES,
    type ExegeticalPaper,
    type LibraryResource,
    type ProjectSource,
    type SourceType,
} from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
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
    // pre-selects that type in the form below. The token
    // (timestamp) is part of the trigger so clicking the same
    // requirement twice still re-fires the sync effect — without
    // it React would skip the effect because the type didn't
    // change.
    //
    // We DELIBERATELY don't auto-scroll. Forcing the page to jump
    // away from the gap card was disorienting (user reported
    // losing their reading position). The pre-selection on its own
    // is a sufficient "next-step" cue; the student scrolls when
    // they're ready to fill the form.
    const [pickedType, setPickedType] = useState<{ type: SourceType; token: number } | null>(null);

    const handlePickType = (type: SourceType) => {
        setPickedType({ type, token: Date.now() });
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

            <CorpusUploadForm paper={paper} initialPickedType={pickedType} />
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

    // Two ways to add a source: upload a fresh file OR pick one
    // already in the user's library (e.g. they uploaded BDAG for a
    // previous paper and want to reuse it here).
    const [mode, setMode] = useState<'upload' | 'library'>('upload');

    const [file, setFile] = useState<File | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [sourceType, setSourceType] = useState<SourceType>('commentary-critical');
    const [citationKey, setCitationKey] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [pickedResourceId, setPickedResourceId] = useState<string | null>(null);
    const [librarySearch, setLibrarySearch] = useState('');

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

    // Lazy-load the user's library only when they switch to the
    // "library" mode — most students will use upload first time.
    const libraryQuery = useQuery({
        queryKey: ['library', 'resources', user?.uid],
        queryFn: async () => {
            if (!user?.uid) return [];
            return libraryService.getUserResources(user.uid);
        },
        enabled: !!user?.uid && mode === 'library',
    });

    const attachedCorpusIds = useMemo(
        () => new Set(paper.sources.map(s => s.corpusId)),
        [paper.sources],
    );

    const filteredResources = useMemo(() => {
        const all = libraryQuery.data ?? [];
        const searchLower = librarySearch.trim().toLowerCase();
        return all
            // Don't list resources already attached to THIS paper —
            // duplicating would create two ProjectSource entries to
            // the same corpus, which is meaningless and inflates the
            // gap card.
            .filter(r => !attachedCorpusIds.has(r.id))
            .filter(r => searchLower === ''
                || r.title.toLowerCase().includes(searchLower)
                || r.author.toLowerCase().includes(searchLower));
    }, [libraryQuery.data, attachedCorpusIds, librarySearch]);

    const labelOk = displayName.trim().length >= 3;
    const canSubmit = mode === 'upload'
        ? !!file && labelOk && !!user?.uid && !uploading
        : !!pickedResourceId && labelOk && !!user?.uid && !uploading;

    const handleFile = (f: File | null) => {
        setFile(f);
        if (f && !displayName) {
            setDisplayName(f.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handlePickResource = (resource: LibraryResource) => {
        setPickedResourceId(resource.id);
        // Pre-fill label with the library resource's title; the
        // student can still tweak before submit.
        setDisplayName(resource.title || resource.id);
    };

    const resetForm = () => {
        setFile(null);
        setDisplayName('');
        setCitationKey('');
        setSourceType('commentary-critical');
        setPickedResourceId(null);
        setLibrarySearch('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || !user?.uid) return;
        setUploading(true);
        setProgress(0);
        try {
            let corpusId: string;
            if (mode === 'upload') {
                if (!file) return;
                // Upload through the library pipeline. `type: 'other'`
                // is a pragmatic default; the real source-type signal
                // lives on the ProjectSource link, not on the
                // library_resource.
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
                corpusId = resource.id;
            } else {
                if (!pickedResourceId) return;
                corpusId = pickedResourceId;
            }

            await addSource.mutateAsync({
                paperId: paper.id,
                corpusId,
                sourceType,
                displayLabel: displayName.trim(),
                citationKey: citationKey.trim() || undefined,
            });
            resetForm();
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

            {/* Mode toggle: subir nuevo / elegir de mi biblioteca */}
            <div className="flex gap-2">
                <ModeOption
                    active={mode === 'upload'}
                    onClick={() => setMode('upload')}
                    icon={<Upload className="h-3.5 w-3.5" />}
                    label={t('paperSetup.subSteps.corpus.upload.modeUpload')}
                />
                <ModeOption
                    active={mode === 'library'}
                    onClick={() => setMode('library')}
                    icon={<Library className="h-3.5 w-3.5" />}
                    label={t('paperSetup.subSteps.corpus.upload.modeLibrary')}
                />
            </div>

            {mode === 'upload' && (
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
            )}

            {mode === 'library' && (
                <LibraryPicker
                    isLoading={libraryQuery.isLoading}
                    resources={filteredResources}
                    pickedResourceId={pickedResourceId}
                    onPick={handlePickResource}
                    searchTerm={librarySearch}
                    onSearchChange={setLibrarySearch}
                    totalAttached={attachedCorpusIds.size}
                    totalAvailable={(libraryQuery.data ?? []).length}
                />
            )}

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

            {uploading && progress !== null && mode === 'upload' && (
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
                    ) : mode === 'upload' ? (
                        <Upload className="h-4 w-4 mr-1.5" />
                    ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    )}
                    {mode === 'upload'
                        ? t('paperSetup.subSteps.corpus.upload.submit')
                        : t('paperSetup.subSteps.corpus.upload.submitFromLibrary')}
                </Button>
            </div>
        </form>
    );
}

// ── Mode toggle pill ────────────────────────────────────────────────────

function ModeOption({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                    ? 'border-success bg-success-subtle text-success-subtle-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent',
            ].join(' ')}
            aria-pressed={active}
        >
            {icon}
            {label}
        </button>
    );
}

// ── Library picker ─────────────────────────────────────────────────────

function LibraryPicker({
    isLoading,
    resources,
    pickedResourceId,
    onPick,
    searchTerm,
    onSearchChange,
    totalAttached,
    totalAvailable,
}: {
    isLoading: boolean;
    resources: ReadonlyArray<LibraryResource>;
    pickedResourceId: string | null;
    onPick: (resource: LibraryResource) => void;
    searchTerm: string;
    onSearchChange: (next: string) => void;
    totalAttached: number;
    totalAvailable: number;
}) {
    const { t } = useTranslation('exegesis');

    return (
        <div className="space-y-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('paperSetup.subSteps.corpus.upload.librarySearchPlaceholder')}
                    className="w-full rounded-md border border-border bg-card pl-8 pr-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
            </div>

            {isLoading ? (
                <p className="text-xs text-muted-foreground inline-flex items-center gap-2 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('paperSetup.subSteps.corpus.upload.libraryLoading')}
                </p>
            ) : resources.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                    {totalAvailable === 0
                        ? t('paperSetup.subSteps.corpus.upload.libraryEmpty')
                        : totalAttached >= totalAvailable
                            ? t('paperSetup.subSteps.corpus.upload.libraryAllAttached')
                            : t('paperSetup.subSteps.corpus.upload.librarySearchEmpty')}
                </p>
            ) : (
                <ul className="max-h-64 overflow-y-auto rounded-md border border-border bg-card divide-y divide-border">
                    {resources.map(r => (
                        <li key={r.id}>
                            <button
                                type="button"
                                onClick={() => onPick(r)}
                                className={[
                                    'w-full text-left px-3 py-2 flex items-start gap-2 transition-colors',
                                    pickedResourceId === r.id
                                        ? 'bg-success-subtle'
                                        : 'hover:bg-accent',
                                ].join(' ')}
                            >
                                <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">
                                        {r.title}
                                    </p>
                                    {r.author && (
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {r.author}
                                        </p>
                                    )}
                                </div>
                                {pickedResourceId === r.id && (
                                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
