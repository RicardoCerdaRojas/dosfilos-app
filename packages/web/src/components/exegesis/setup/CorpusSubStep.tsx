import { useEffect, useMemo, useState } from 'react';
import {
    BookOpenText,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    FileStack,
    FileText,
    Library,
    Loader2,
    Quote,
    Search,
    Sparkles,
    Upload,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { libraryService } from '@dosfilos/application';
import {
    CITABLE_SOURCE_TYPES,
    type ExegeticalPaper,
    type LibraryResource,
    type ProjectSource,
    type ResourceIndexStatus,
    type SourceType,
} from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { useLibrary } from '@/hooks/library';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import { SourceTypePicker } from './SourceTypePicker';
import { RubricGapCard } from './RubricGapCard';
import { RubricRigorIndicator } from '@/components/exegesis/rubric/RubricRigorIndicator';
import { ExtractFromLibraryDialog } from './ExtractFromLibraryDialog';
import { PageBalanceHint } from './PageBalanceHint';
import { FileDropzone } from '@/components/ui/file-dropzone';

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

    // Add-source dialog state. A single dialog handles both:
    //   - "Agregar fuente" button at the top of the list (no
    //     pre-selected type — student picks it inside the dialog).
    //   - Per-requirement "Subir" buttons in the gap card
    //     (type pre-selected matching the missing requirement).
    // Replacing the always-visible inline form with a contextual
    // dialog gives clicks immediate visible feedback and avoids
    // the auto-scroll-to-bottom problem the inline form caused.
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogInitialType, setDialogInitialType] = useState<SourceType | null>(null);
    // v1.5: separate dialog for the library-extraction flow. Opens
    // independently from the upload dialog so the two paths don't
    // tangle their state — the upload dialog is "I'm bringing a new
    // file or picking ONE library doc as full-document"; the
    // extraction dialog is "I want curated excerpts from MULTIPLE
    // library docs at once."
    const [extractDialogOpen, setExtractDialogOpen] = useState(false);

    const openDialog = (preselect: SourceType | null) => {
        setDialogInitialType(preselect);
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <header className="flex items-start gap-3">
                <FileStack className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-foreground">
                        {t('paperSetup.subSteps.corpus.heading')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {t('paperSetup.subSteps.corpus.description')}
                    </p>
                </div>
                <PageBalanceHint />
            </header>

            {paper.rubric && <RubricRigorIndicator rubric={paper.rubric} />}

            <RubricGapCard paper={paper} onPickType={(type) => openDialog(type)} />

            <CorpusSourcesList
                paper={paper}
                onAdd={() => openDialog(null)}
                onExtract={() => setExtractDialogOpen(true)}
            />

            <AddSourceDialog
                paper={paper}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                initialType={dialogInitialType}
            />

            <ExtractFromLibraryDialog
                paper={paper}
                open={extractDialogOpen}
                onOpenChange={setExtractDialogOpen}
            />
        </div>
    );
}

// ── Sources list ────────────────────────────────────────────────────────

function CorpusSourcesList({
    paper,
    onAdd,
    onExtract,
}: {
    paper: ExegeticalPaper;
    onAdd: () => void;
    onExtract: () => void;
}) {
    const { t } = useTranslation('exegesis');
    const sorted = [...paper.sources].sort((a, b) => a.order - b.order);

    return (
        <section className="space-y-2">
            <header className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                    {t('paperSetup.subSteps.corpus.list.title')} ({sorted.length})
                </h3>
                <div className="flex items-center gap-1.5">
                    {/* Extract from library: secondary visual weight
                        (outline) because the primary path for new
                        users is still the direct upload. Veterans
                        with built-up libraries flip the priority
                        in their head naturally. */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onExtract}
                        className="text-xs"
                    >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {t('paperSetup.subSteps.corpus.list.extractCta')}
                    </Button>
                    <Button
                        type="button"
                        onClick={onAdd}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                    >
                        <Upload className="h-3 w-3 mr-1" />
                        {t('paperSetup.subSteps.corpus.list.addCta')}
                    </Button>
                </div>
            </header>
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
    const isExtracted = source.mode === 'extracted-excerpts';
    // Excerpts panel is collapsed by default — sources can have up to
    // 30 chunks each and unfolding them all by default would dwarf
    // everything else on the page. The user expands when they want
    // to review/edit.
    const [excerptsExpanded, setExcerptsExpanded] = useState(false);

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
                {isExtracted
                    ? <Quote className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    : <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate inline-flex items-center gap-1.5">
                        {source.displayLabel}
                        {isExtracted && (
                            <span className="text-[10px] font-medium rounded-full bg-success-subtle text-success-subtle-foreground border border-success/30 px-1.5 py-0 leading-tight">
                                {t('paperSetup.subSteps.corpus.list.excerptsBadge', { count: source.excerpts.length })}
                            </span>
                        )}
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

            {/* v1.5: when this source is in extracted-excerpts mode,
                expose a collapsible review panel with the curated
                chunks. Defaults collapsed because each source can
                carry up to 30 excerpts — opening them all by default
                would dwarf everything else on the setup page. */}
            {isExtracted && (
                <div>
                    <button
                        type="button"
                        onClick={() => setExcerptsExpanded(v => !v)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {excerptsExpanded
                            ? <ChevronDown className="h-3 w-3" />
                            : <ChevronRight className="h-3 w-3" />
                        }
                        {excerptsExpanded
                            ? t('paperSetup.subSteps.corpus.excerpts.collapse')
                            : t('paperSetup.subSteps.corpus.excerpts.expand')
                        }
                    </button>
                    {excerptsExpanded && (
                        <ExcerptsReviewPanel
                            paperId={paperId}
                            source={source}
                        />
                    )}
                </div>
            )}
        </li>
    );
}

// ── Excerpts review panel (v1.5) ─────────────────────────────────────────

/**
 * Inline editor for the curated excerpts of an `'extracted-excerpts'`
 * source. Shows each excerpt as a textarea with its source anchor,
 * lets the user edit text or delete entirely, and commits all
 * changes in one batch via `updateSource`.
 *
 * Local state holds the editing draft so unsaved keystrokes don't
 * fire mutation calls per character. "Save changes" commits; "Discard"
 * resets to the persisted state. The button row stays sticky-feeling
 * (within the row's flow) — for v1.5 we don't trap the user; if they
 * navigate away with unsaved changes, the local state is lost. The
 * roadmap's "stale banner" feature lands later; this commit ships
 * the editor only.
 */
function ExcerptsReviewPanel({
    paperId,
    source,
}: {
    paperId: string;
    source: ProjectSource;
}) {
    const { t } = useTranslation('exegesis');
    const { updateSource } = useExegesisPapers();
    // Local working copy. Re-syncs whenever the persisted source
    // identity changes (re-extraction lands new excerpts, another
    // tab edits, etc.) — drops in-flight unsaved edits, acceptable
    // tradeoff for the simple v1.5 editor.
    const [drafts, setDrafts] = useState(() => source.excerpts.map(e => ({ ...e })));
    useEffect(() => {
        setDrafts(source.excerpts.map(e => ({ ...e })));
    }, [source.excerpts]);

    const dirty = useMemo(() => {
        if (drafts.length !== source.excerpts.length) return true;
        return drafts.some((draft, idx) => {
            const original = source.excerpts[idx];
            if (!original) return true;
            return draft.text !== original.text;
        });
    }, [drafts, source.excerpts]);

    const updateText = (idx: number, text: string) => {
        setDrafts(prev => prev.map((d, i) => i === idx
            ? { ...d, text, userEdited: true, editedAt: new Date() }
            : d));
    };

    const removeAt = (idx: number) => {
        setDrafts(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        try {
            await updateSource.mutateAsync({
                paperId,
                sourceId: source.id,
                excerpts: drafts,
            });
            toast.success(t('paperSetup.subSteps.corpus.excerpts.toast.saved'));
        } catch (err) {
            console.error('[exegesis] save excerpts failed:', err);
            toast.error(t('paperSetup.subSteps.corpus.excerpts.toast.saveFailed'));
        }
    };

    const handleDiscard = () => {
        setDrafts(source.excerpts.map(e => ({ ...e })));
    };

    if (drafts.length === 0) {
        return (
            <div className="mt-2 rounded-lg border border-warning/30 bg-warning-subtle/40 px-3 py-2 text-[11px] text-warning-subtle-foreground">
                {t('paperSetup.subSteps.corpus.excerpts.emptyWarning')}
            </div>
        );
    }

    return (
        <div className="mt-2 space-y-2">
            <ul className="space-y-1.5">
                {drafts.map((excerpt, idx) => (
                    <li
                        key={idx}
                        className="rounded-md border border-border bg-muted/30 px-2.5 py-2 space-y-1"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-1.5">
                                <span>{excerpt.sourceLocation || t('paperSetup.subSteps.corpus.excerpts.noAnchor', { index: idx + 1 })}</span>
                                {excerpt.userEdited && (
                                    <span className="text-[9px] uppercase tracking-wide font-semibold rounded bg-info-subtle text-info-subtle-foreground border border-info/30 px-1 py-0">
                                        {t('paperSetup.subSteps.corpus.excerpts.editedBadge')}
                                    </span>
                                )}
                            </p>
                            <button
                                type="button"
                                onClick={() => removeAt(idx)}
                                className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
                                aria-label={t('paperSetup.subSteps.corpus.excerpts.delete')}
                                title={t('paperSetup.subSteps.corpus.excerpts.delete')}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                        <textarea
                            value={excerpt.text}
                            onChange={(e) => updateText(idx, e.target.value)}
                            rows={3}
                            className="w-full rounded border border-border bg-card px-2 py-1 text-[11px] leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
                        />
                    </li>
                ))}
            </ul>
            {dirty && (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDiscard}
                        disabled={updateSource.isPending}
                        className="text-[11px] h-7"
                    >
                        {t('paperSetup.subSteps.corpus.excerpts.discard')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={updateSource.isPending}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] h-7"
                    >
                        {updateSource.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {t('paperSetup.subSteps.corpus.excerpts.save')}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ── Upload form ────────────────────────────────────────────────────────

function AddSourceDialog({
    paper,
    open,
    onOpenChange,
    initialType,
}: {
    paper: ExegeticalPaper;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialType: SourceType | null;
}) {
    const { t } = useTranslation('exegesis');
    const { user } = useFirebase();
    const { addSource } = useExegesisPapers();

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

    // Reset / pre-select on every open. The dialog is one-shot per
    // open: closing always discards the form so reopening starts
    // fresh. When the parent passes a type via the gap card click,
    // we honor it as the initial selection.
    useEffect(() => {
        if (open) {
            setMode('upload');
            setFile(null);
            setDisplayName('');
            setSourceType(initialType ?? 'commentary-critical');
            setCitationKey('');
            setPickedResourceId(null);
            setLibrarySearch('');
        }
    }, [open, initialType]);

    // Reads from the globally synced library cache (`useLibrarySync`
    // mounted at the dashboard shell). First open is instant for any
    // user who's already loaded the dashboard — no per-modal fetch.
    const library = useLibrary();

    const attachedCorpusIds = useMemo(
        () => new Set(paper.sources.map(s => s.corpusId)),
        [paper.sources],
    );

    const filteredResources = useMemo(() => {
        const all = library.resources;
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
    }, [library.resources, attachedCorpusIds, librarySearch]);

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
        // Pre-fill citation key from the resource's author. The student
        // can still tweak — this is a starting point, not authoritative.
        // Empty author or empty derivation leaves the field blank so the
        // generation step's `deriveCitationKey` fallback (which works
        // off the displayLabel) takes over.
        if (resource.author) {
            const key = deriveCitationKeyFromAuthor(resource.author);
            if (key) setCitationKey(key);
        }
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
            toast.success(t('paperSetup.subSteps.corpus.toast.added'));
            // Close the dialog on success. The open-effect resets
            // the form on the next open, so we don't need to clear
            // state here.
            onOpenChange(false);
        } catch (err) {
            console.error('[exegesis] add source failed:', err);
            toast.error(t('paperSetup.subSteps.corpus.toast.addFailed'));
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const isCitable = CITABLE_SOURCE_TYPES.has(sourceType);

    const availableInLibrary = library.resources.length - attachedCorpusIds.size;

    return (
        <Dialog open={open} onOpenChange={(next) => {
            // Block closing while the upload is in flight so the
            // student can't accidentally cancel a half-finished
            // upload.
            if (uploading && !next) return;
            onOpenChange(next);
        }}>
            <DialogContent className="sm:max-w-5xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
                <DialogHeader className="px-6 py-4 border-b border-border">
                    <DialogTitle className="text-base">
                        {t('paperSetup.subSteps.corpus.upload.title')}
                    </DialogTitle>
                    <DialogDescription className="text-[12px] leading-snug">
                        {t('paperSetup.subSteps.corpus.upload.dialogSubtitle')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-0 overflow-hidden">
                        {/* Sidebar: mode tabs */}
                        <aside className="border-b md:border-b-0 md:border-r border-border bg-muted/20 p-3 space-y-2">
                            <SidebarTab
                                active={mode === 'upload'}
                                onClick={() => setMode('upload')}
                                icon={<Upload className="h-4 w-4" />}
                                label={t('paperSetup.subSteps.corpus.upload.modeUpload')}
                                helper="PDF o EPUB"
                            />
                            <SidebarTab
                                active={mode === 'library'}
                                onClick={() => setMode('library')}
                                icon={<Library className="h-4 w-4" />}
                                label={t('paperSetup.subSteps.corpus.upload.modeLibrary')}
                                helper={availableInLibrary > 0
                                    ? `${availableInLibrary} disponibles`
                                    : library.isLoading ? 'Cargando…' : 'Sin recursos'}
                            />
                        </aside>

                        {/* Main pane */}
                        <div className="overflow-y-auto px-6 py-5 space-y-5">
                            {mode === 'upload' ? (
                                <FileDropzone
                                    accept=".pdf,.epub"
                                    value={file}
                                    onChange={handleFile}
                                    disabled={uploading}
                                    hint="PDF o EPUB · hasta 250 MB"
                                    emptyLabel={t('common:fileDropzone.empty')}
                                    clearLabel={t('common:fileDropzone.clear')}
                                />
                            ) : (
                                <LibraryPicker
                                    isLoading={library.isLoading}
                                    resources={filteredResources}
                                    pickedResourceId={pickedResourceId}
                                    onPick={handlePickResource}
                                    searchTerm={librarySearch}
                                    onSearchChange={setLibrarySearch}
                                    totalAttached={attachedCorpusIds.size}
                                    totalAvailable={library.resources.length}
                                />
                            )}

                            <FieldGroup>
                                <FieldLabel htmlFor="addsource-label">
                                    {t('paperSetup.subSteps.corpus.upload.displayNameLabel')}
                                </FieldLabel>
                                <input
                                    id="addsource-label"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    disabled={uploading}
                                    placeholder={t('paperSetup.subSteps.corpus.upload.displayNamePlaceholder')}
                                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <FieldLabel htmlFor="addsource-type">
                                    {t('paperSetup.subSteps.corpus.upload.typeLabel')}
                                </FieldLabel>
                                <SourceTypePicker
                                    id="addsource-type"
                                    value={sourceType}
                                    onChange={setSourceType}
                                    disabled={uploading}
                                    className="w-full !py-2 !text-sm"
                                />
                                <FieldHint>
                                    {t('paperSetup.subSteps.corpus.upload.typeDescription')}
                                </FieldHint>
                                {!isCitable && (
                                    <p className="text-[11px] text-warning-subtle-foreground inline-flex items-start gap-1.5 mt-0.5">
                                        <BookOpenText className="h-3 w-3 mt-0.5 shrink-0" />
                                        {t('paperSetup.subSteps.corpus.upload.modelPaperHint')}
                                    </p>
                                )}
                            </FieldGroup>

                            {isCitable && (
                                <FieldGroup>
                                    <FieldLabel htmlFor="addsource-cite">
                                        {t('paperSetup.subSteps.corpus.upload.citationKeyLabel')}
                                        <span className="text-muted-foreground font-normal ml-1">· opcional</span>
                                    </FieldLabel>
                                    <input
                                        id="addsource-cite"
                                        type="text"
                                        value={citationKey}
                                        onChange={(e) => setCitationKey(e.target.value)}
                                        disabled={uploading}
                                        placeholder={t('paperSetup.subSteps.corpus.upload.citationKeyPlaceholder')}
                                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    />
                                    <FieldHint>
                                        {t('paperSetup.subSteps.corpus.upload.citationKeyHint')}
                                    </FieldHint>
                                </FieldGroup>
                            )}
                        </div>
                    </div>

                    {/* Sticky-feeling footer: separated by top border */}
                    <div className="border-t border-border px-6 py-3 flex items-center gap-3 bg-muted/20">
                        {uploading && progress !== null && mode === 'upload' && (
                            <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {t('paperSetup.subSteps.corpus.upload.uploading', { progress })}
                            </p>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                disabled={uploading}
                                className="text-sm"
                            >
                                {t('setup.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm gap-1.5"
                            >
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : mode === 'upload' ? (
                                    <Upload className="h-4 w-4" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                {mode === 'upload'
                                    ? t('paperSetup.subSteps.corpus.upload.submit')
                                    : t('paperSetup.subSteps.corpus.upload.submitFromLibrary')}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Field primitives ───────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
    return <div className="space-y-1.5">{children}</div>;
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
    return (
        <label
            htmlFor={htmlFor}
            className="block text-[12.5px] font-medium text-foreground"
        >
            {children}
        </label>
    );
}

function FieldHint({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] text-muted-foreground leading-snug">
            {children}
        </p>
    );
}

// ── Sidebar mode tab (vertical card) ───────────────────────────────────

function SidebarTab({
    active,
    onClick,
    icon,
    label,
    helper,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    helper: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={[
                'w-full text-left rounded-lg border px-3 py-2.5 transition-colors flex items-start gap-2.5',
                active
                    ? 'border-primary bg-primary/5 text-foreground shadow-sm'
                    : 'border-transparent bg-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground',
            ].join(' ')}
        >
            <span className={[
                'mt-0.5 shrink-0',
                active ? 'text-primary' : 'text-muted-foreground',
            ].join(' ')}>
                {icon}
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold leading-tight">
                    {label}
                </span>
                <span className="block text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {helper}
                </span>
            </span>
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
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('paperSetup.subSteps.corpus.upload.librarySearchPlaceholder')}
                    className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
            </div>

            {isLoading ? (
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-8 text-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">
                        {t('paperSetup.subSteps.corpus.upload.libraryLoading')}
                    </p>
                </div>
            ) : resources.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-8 text-center">
                    <p className="text-xs text-muted-foreground">
                        {totalAvailable === 0
                            ? t('paperSetup.subSteps.corpus.upload.libraryEmpty')
                            : totalAttached >= totalAvailable
                                ? t('paperSetup.subSteps.corpus.upload.libraryAllAttached')
                                : t('paperSetup.subSteps.corpus.upload.librarySearchEmpty')}
                    </p>
                </div>
            ) : (
                <ul className="max-h-[320px] overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border">
                    {resources.map(r => {
                        const status = libraryService.getResourceIndexStatus(r);
                        const picked = pickedResourceId === r.id;
                        return (
                            <li key={r.id}>
                                <button
                                    type="button"
                                    onClick={() => onPick(r)}
                                    className={[
                                        'w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors',
                                        picked
                                            ? 'bg-success-subtle/60'
                                            : 'hover:bg-accent/40',
                                    ].join(' ')}
                                >
                                    <FileText className={[
                                        'h-4 w-4 mt-0.5 shrink-0',
                                        picked ? 'text-success' : 'text-muted-foreground',
                                    ].join(' ')} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-foreground truncate">
                                            {r.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {r.author && (
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {r.author}
                                                </p>
                                            )}
                                            <ResourceReadinessBadge status={status} />
                                        </div>
                                    </div>
                                    {picked && (
                                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

/**
 * Compact pill that surfaces whether a library resource is ready to be
 * queried for excerpts (commit 3 of v1.5). Today the badge is purely
 * informational — the user can still pick any resource for the
 * `'full-document'` flow regardless of indexing state. Once the
 * extraction step lands, the same `status` will gate the "extract
 * excerpts" toggle: only `'indexed'` resources allow excerpt mode.
 *
 * Statuses follow the lifecycle:
 *   needs-extraction → extracting → needs-indexing|indexing → indexed
 *                                                          ↘ failed
 */
function ResourceReadinessBadge({ status }: { status: ResourceIndexStatus }) {
    const { t } = useTranslation('exegesis');
    const config: Record<ResourceIndexStatus, { label: string; cls: string }> = {
        'indexed': {
            label: t('paperSetup.subSteps.corpus.readiness.indexed'),
            cls: 'bg-success-subtle text-success-subtle-foreground border-success/30',
        },
        'extracting': {
            label: t('paperSetup.subSteps.corpus.readiness.extracting'),
            cls: 'bg-info-subtle text-info-subtle-foreground border-info/30',
        },
        'indexing': {
            label: t('paperSetup.subSteps.corpus.readiness.indexing'),
            cls: 'bg-info-subtle text-info-subtle-foreground border-info/30',
        },
        'needs-extraction': {
            label: t('paperSetup.subSteps.corpus.readiness.needsExtraction'),
            cls: 'bg-muted text-muted-foreground border-border',
        },
        'needs-indexing': {
            label: t('paperSetup.subSteps.corpus.readiness.needsIndexing'),
            cls: 'bg-warning-subtle text-warning-subtle-foreground border-warning/30',
        },
        'failed': {
            label: t('paperSetup.subSteps.corpus.readiness.failed'),
            cls: 'bg-destructive/10 text-destructive border-destructive/30',
        },
    };
    const { label, cls } = config[status];
    return (
        <span
            className={[
                'inline-flex items-center text-[10px] font-medium rounded-full border px-1.5 py-0 leading-tight whitespace-nowrap shrink-0',
                cls,
            ].join(' ')}
            title={label}
        >
            {label}
        </span>
    );
}

/**
 * Extracts a citation key (typical surname) from a resource's author
 * field. Used to pre-fill the corpus dialog when the student picks an
 * existing library resource. Heuristic, not authoritative — the
 * student can always tweak the result before submitting.
 *
 * Cases handled:
 *   "Daniel B. Wallace"     → "Wallace"   (last token wins)
 *   "John MacArthur"        → "MacArthur"
 *   "Bauckham, Richard"     → "Bauckham"  (before-comma wins)
 *   "Lane, William L."      → "Lane"
 *   "Barrick & Busenitz"    → "Barrick"   (first author of multi)
 *   "Watson and Callan"     → "Watson"
 *   "deSilva"               → "deSilva"
 *   ""                      → ""          (caller skips)
 */
function deriveCitationKeyFromAuthor(author: string): string {
    const trimmed = author.trim();
    if (!trimmed) return '';
    // Multi-author work: take the first author (citations conventionally
    // use first author or "first et al.").
    const firstAuthor = trimmed.split(/\s+(?:&|and|y)\s+/i)[0]!.trim();
    // "Surname, Given" form is common in academic citations — take
    // what's before the comma.
    if (firstAuthor.includes(',')) {
        const beforeComma = firstAuthor.split(',')[0]!.trim();
        if (beforeComma) return beforeComma;
    }
    // Otherwise the LAST token is conventionally the surname.
    const tokens = firstAuthor.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return firstAuthor;
    return tokens[tokens.length - 1]!;
}
