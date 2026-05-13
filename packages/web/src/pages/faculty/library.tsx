import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useUserExtractions, useExtractionMutations } from '@/hooks/faculty';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { FacultyExtractionsList } from '@/components/faculty/FacultyExtractionsList';
import { FacultyDocumentEditor } from '@/components/faculty/FacultyDocumentEditor';
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
    const { updateMarkdown, rename, pinToProject, deleteExtraction } = useExtractionMutations();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
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
        const q = query.trim().toLowerCase();
        if (!q) return extractions;
        return extractions.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.type.toLowerCase().includes(q) ||
            e.markdown.toLowerCase().includes(q),
        );
    }, [extractions, query]);

    const selected = useMemo(
        () => extractions.find(e => e.id === selectedId) ?? null,
        [extractions, selectedId],
    );

    const handleRename = (extraction: Extraction) => {
        const next = window.prompt(t('extractionsList.actions.rename'), extraction.title);
        if (!next || next.trim() === extraction.title) return;
        rename.mutate({ extractionId: extraction.id, title: next.trim() });
    };

    const handlePin = (extraction: Extraction) => {
        // Library view: cycle through projects via a prompt rather than
        // a dropdown. First-cut UX — a project picker comes in a follow-up.
        if (extraction.projectId) {
            pinToProject.mutate({ extractionId: extraction.id, projectId: null });
            toast.success(t('extractionsList.toast.unpinned'));
            return;
        }
        if (projects.length === 0) {
            toast.info(t('extractionsList.toast.noProjectsAvailable'));
            return;
        }
        const list = projects.map((p, i) => `${i + 1}. ${p.title}`).join('\n');
        const choice = window.prompt(`${t('library.pickProject')}\n${list}`, '1');
        const idx = Number(choice) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= projects.length) return;
        pinToProject.mutate({ extractionId: extraction.id, projectId: projects[idx].id });
        toast.success(t('extractionsList.toast.pinned'));
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
                            onPin={handlePin}
                            onJumpToOrigin={handleJumpToOrigin}
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
        </div>
    );
}
