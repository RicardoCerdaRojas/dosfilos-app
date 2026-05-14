import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useUserExtractions, useExtractionMutations } from '@/hooks/faculty';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { FacultyExtractionsList } from '@/components/faculty/FacultyExtractionsList';
import { FacultyDocumentEditor } from '@/components/faculty/FacultyDocumentEditor';
import { ExtractionFilters, filterExtractions, type TypeFilterValue, type TimeFilterValue } from '@/components/faculty/ExtractionFilters';
import { EmailExtractionDialog } from '@/components/faculty/EmailExtractionDialog';
import { PublishToWordpressDialog } from '@/components/faculty/PublishToWordpressDialog';
import { Input } from '@/components/ui/input';
import { Library, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Extraction } from '@dosfilos/domain';

/**
 * Cross-session library page at /dashboard/faculty/library. Lists every
 * extraction the user has ever generated, with a search filter and a
 * full-width editor for the currently-selected artifact. This is the
 * "all my generated work" view — analog to NotebookLM's notebook list
 * but for derived artifacts rather than source notebooks.
 */
export function FacultyLibraryPage() {
    const { t } = useTranslation('faculty');
    const navigate = useNavigate();
    const { extractions, isLoading } = useUserExtractions();
    const { projects } = useFacultyProjects();
    const { updateMarkdown, rename, addToProject, removeFromProject, deleteExtraction } = useExtractionMutations();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
    const [timeFilter, setTimeFilter] = useState<TimeFilterValue>('all');
    const [emailDialogExtraction, setEmailDialogExtraction] = useState<Extraction | null>(null);
    const [wpDialogExtraction, setWpDialogExtraction] = useState<Extraction | null>(null);
    const [draftMarkdown, setDraftMarkdown] = useState<string>('');
    const [draftFor, setDraftFor] = useState<string | null>(null);

    /**
     * Atomic selection setter. Updates id + draft + draftFor in one batch
     * so a single render observes all three values consistent. Doing this
     * via useEffect created a race where the editor would mount with the
     * previous selection's markdown (or empty on first click) because
     * setSelectedId triggered a render before the effect could seed the
     * draft.
     */
    const selectExtraction = (extraction: Extraction) => {
        setSelectedId(extraction.id);
        setDraftMarkdown(extraction.markdown);
        setDraftFor(extraction.id);
    };

    // Fallback re-seed: covers the case where the user picked an
    // artifact before the extractions list finished loading (no entry
    // in the list at click time → we can't seed synchronously).
    useEffect(() => {
        if (!selectedId) return;
        if (draftFor === selectedId) return;
        const found = extractions.find(e => e.id === selectedId);
        if (!found) return;
        setDraftMarkdown(found.markdown);
        setDraftFor(selectedId);
    }, [selectedId, extractions, draftFor]);

    // Debounced autosave: save 1.5s after the user stops typing.
    useEffect(() => {
        if (!selectedId || draftFor !== selectedId) return;
        const original = extractions.find(e => e.id === selectedId)?.markdown;
        if (original === draftMarkdown) return;
        const handle = setTimeout(() => {
            updateMarkdown.mutate({ extractionId: selectedId, markdown: draftMarkdown });
        }, 1500);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftMarkdown, selectedId, draftFor]);

    const filtered = useMemo(() => {
        const afterFilters = filterExtractions(extractions, typeFilter, timeFilter);
        const q = query.trim().toLowerCase();
        if (!q) return afterFilters;
        return afterFilters.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.type.toLowerCase().includes(q) ||
            e.markdown.toLowerCase().includes(q),
        );
    }, [extractions, query, typeFilter, timeFilter]);

    const selected = useMemo(
        () => extractions.find(e => e.id === selectedId) ?? null,
        [extractions, selectedId],
    );

    const handleRename = (extraction: Extraction, newTitle: string) => {
        rename.mutate({ extractionId: extraction.id, title: newTitle });
    };

    const handleAddToProject = (extraction: Extraction, projectId: string) => {
        addToProject.mutate({ extractionId: extraction.id, projectId });
        toast.success(t('extractionsList.toast.pinned'));
    };

    const handleRemoveFromProject = (extraction: Extraction, projectId: string) => {
        removeFromProject.mutate({ extractionId: extraction.id, projectId });
        toast.success(t('extractionsList.toast.unpinned'));
    };

    const handleDelete = (extraction: Extraction) => {
        if (!window.confirm(t('extractionsList.confirmDelete'))) return;
        deleteExtraction.mutate(extraction.id);
        if (selectedId === extraction.id) setSelectedId(null);
    };

    const handleJumpToOrigin = (extraction: Extraction) => {
        if (!extraction.sessionId) return;
        const hash = extraction.derivedFromMessageIds.length > 0
            ? `#origin=${extraction.derivedFromMessageIds.slice(-3).join(',')}`
            : '';
        navigate(`/dashboard/faculty/${extraction.sessionId}${hash}`);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <header className="border-b px-6 py-4 flex items-center gap-3 shrink-0">
                <Library className="w-5 h-5 text-indigo-500" />
                <div className="flex-1">
                    <h1 className="font-semibold text-lg">{t('library.title')}</h1>
                    <p className="text-xs text-muted-foreground">{t('library.subtitle')}</p>
                </div>
                <div className="relative w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t('library.searchPlaceholder')}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-[24rem] border-r flex flex-col shrink-0">
                    <ExtractionFilters
                        typeFilter={typeFilter}
                        timeFilter={timeFilter}
                        onTypeChange={setTypeFilter}
                        onTimeChange={setTimeFilter}
                    />
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                            {t('library.loading')}
                        </div>
                    ) : (
                        <FacultyExtractionsList
                            extractions={filtered}
                            selectedId={selectedId}
                            onSelect={selectExtraction}
                            onDelete={handleDelete}
                            onRename={handleRename}
                            onAddToProject={handleAddToProject}
                            onRemoveFromProject={handleRemoveFromProject}
                            projects={projects}
                            onJumpToOrigin={handleJumpToOrigin}
                            onOpenExternal={(extraction) => {
                                if (extraction.externalRef?.collection === 'sermons') {
                                    navigate(`/dashboard/sermons/${extraction.externalRef.id}`);
                                }
                            }}
                            onShareByEmail={setEmailDialogExtraction}
                            onPublishToWordpress={setWpDialogExtraction}
                        />
                    )}
                </aside>

                <main className="flex-1 overflow-hidden bg-background">
                    {selected ? (
                        <FacultyDocumentEditor
                            // Remount on artifact change. MDXEditor is
                            // uncontrolled — it only reads the `markdown`
                            // prop on mount, so without a fresh key it
                            // keeps showing whatever was loaded first
                            // (in this case nothing). The Vista previa
                            // path renders independently and was the
                            // only thing showing content before this fix.
                            key={selected.id}
                            title={selected.title}
                            markdown={draftMarkdown}
                            onChange={setDraftMarkdown}
                            onMicroAction={async () => {
                                // Micro-actions require live chat-session
                                // context for the agent retrieval. From
                                // the library view (no session) they're
                                // disabled.
                                toast.info(t('library.microActionsUnavailable'));
                                return '';
                            }}
                            isProcessing={false}
                            isZenMode={false}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            {t('library.emptyState')}
                        </div>
                    )}
                </main>
            </div>

            <EmailExtractionDialog
                extraction={emailDialogExtraction}
                onClose={() => setEmailDialogExtraction(null)}
            />

            <PublishToWordpressDialog
                extraction={wpDialogExtraction}
                onClose={() => setWpDialogExtraction(null)}
            />
        </div>
    );
}
