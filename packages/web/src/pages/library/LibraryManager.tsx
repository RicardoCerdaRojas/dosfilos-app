import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { LibraryResourceEntity, ResourceType } from '@dosfilos/domain';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { ResourceCard } from './ResourceCard';
import { EditResourceModal } from './EditResourceModal';
import { PhasePreferenceModal } from './PhasePreferenceModal';
import { ConfigureCoreStoresModal } from './ConfigureCoreStoresModal';
import { LibraryHeader } from './components/LibraryHeader';
import { BalanceBanner } from './components/BalanceBanner';
import { UsageBanner } from './components/UsageBanner';
import { CreditPacksDialog } from './components/CreditPacksDialog';
import { UpgradeRequiredModal } from '@/components/upgrade';
import { processingBalanceService } from '@dosfilos/application';
import { LibraryAttentionCallout } from './components/LibraryAttentionCallout';
import { LibraryProgress } from './components/LibraryProgress';
import { LibraryUploadForm } from './components/LibraryUploadForm';
import { LibraryFilters } from './components/LibraryFilters';
import { LibraryEmptyState } from './components/LibraryEmptyState';
import { useLibraryResources } from './hooks/useLibraryResources';
import { useResourceProcessing } from './hooks/useResourceProcessing';
import { useResourceUpload } from './hooks/useResourceUpload';
import { useResourceMutations } from './hooks/useResourceMutations';
import { cn } from '@/lib/utils';
import { UploadConsentModal } from '@/components/library/UploadConsentModal';

type ViewMode = 'grid' | 'list';

const ADMIN_EMAIL = 'rdocerda@gmail.com';

/**
 * Library page composer. Glues together data hooks (`useLibraryResources`,
 * `useResourceProcessing`, `useResourceUpload`, `useResourceMutations`) with
 * the presentational components in `./components/`.
 *
 * Owns only UI orchestration state: filters, view mode, modal open/close,
 * resource references for modals.
 */
export function LibraryManager() {
    const { t } = useTranslation('library');
    const { user } = useFirebase();
    const { checkCanAccessLibrary, checkCanUploadDocument } = useUsageLimits();
    const isAdmin = user?.email === ADMIN_EMAIL;

    // ── Access gate (free tier) ─────────────────────────────────────────────
    const [hasLibraryAccess, setHasLibraryAccess] = useState<boolean | null>(null);
    useEffect(() => {
        if (!user) { setHasLibraryAccess(false); return; }
        checkCanAccessLibrary().then(setHasLibraryAccess);
    }, [user, checkCanAccessLibrary]);

    // ── Upload gate — two-stage:
    //    1) `canUploadDocument` — Free tier (libraryDocsLimit=0) or plan cap → UpgradeRequiredModal.
    //    2) Processing balance — paid plan but standard+premium balance both at 0 → CreditPacksDialog.
    //    Stage 2 only runs after stage 1 passes; otherwise free users would see both modals.
    const [showUploadUpgradeModal, setShowUploadUpgradeModal] = useState(false);
    const [creditPacksOpen, setCreditPacksOpen] = useState(false);
    const handleToggleUploadForm = async () => {
        if (showUploadForm) {
            setShowUploadForm(false);
            return;
        }
        const check = await checkCanUploadDocument();
        if (!check.allowed) {
            setShowUploadUpgradeModal(true);
            return;
        }
        if (user) {
            const balance = await processingBalanceService.getBalance(user.uid);
            const totalAvailable = balance.standardPagesAvailable + balance.premiumPagesAvailable;
            if (totalAvailable === 0) {
                setCreditPacksOpen(true);
                return;
            }
        }
        setShowUploadForm(true);
    };

    // ── Data + business hooks ───────────────────────────────────────────────
    const userId = hasLibraryAccess ? user?.uid : undefined;
    const data = useLibraryResources(userId);
    const processing = useResourceProcessing({ setIndexStatus: data.setIndexStatus });
    const mutations = useResourceMutations();

    // ── UI state — filters, view mode, modal open/close, modal targets ──────
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ResourceType | 'all'>('all');
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [consentModalOpen, setConsentModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [resourceToEdit, setResourceToEdit] = useState<LibraryResourceEntity | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<LibraryResourceEntity | null>(null);
    const [phaseModalOpen, setPhaseModalOpen] = useState(false);
    const [resourceForPhases, setResourceForPhases] = useState<LibraryResourceEntity | null>(null);
    const [coreStoresModalOpen, setCoreStoresModalOpen] = useState(false);
    const [resourceForCoreStores, setResourceForCoreStores] = useState<LibraryResourceEntity | null>(null);

    // ── Upload hook (depends on user + consent gate callback) ──────────────
    const upload = useResourceUpload({
        userId,
        isAdmin,
        onConsentRequired: () => setConsentModalOpen(true),
        onSuccess: () => setShowUploadForm(false),
    });

    // ── Filtered view derived from search + category ────────────────────────
    const filteredResources = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return data.resources.filter(resource => {
            const matchesSearch = query === ''
                || resource.title.toLowerCase().includes(query)
                || resource.author.toLowerCase().includes(query);
            const matchesCategory = categoryFilter === 'all' || resource.type === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [data.resources, searchQuery, categoryFilter]);

    // ── Modal open helpers — declarative wrappers for prop drilling ─────────
    const openEdit = (resource: LibraryResourceEntity) => {
        setResourceToEdit(resource);
        setEditModalOpen(true);
    };
    const openDelete = (resource: LibraryResourceEntity) => {
        setResourceToDelete(resource);
        setDeleteDialogOpen(true);
    };
    const openPhases = (resource: LibraryResourceEntity) => {
        setResourceForPhases(resource);
        setPhaseModalOpen(true);
    };
    const openCoreStores = (resource: LibraryResourceEntity) => {
        setResourceForCoreStores(resource);
        setCoreStoresModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!resourceToDelete) return;
        await mutations.deleteResource(resourceToDelete.id);
        setDeleteDialogOpen(false);
        setResourceToDelete(null);
    };

    // ── Access gate render branches ─────────────────────────────────────────
    if (hasLibraryAccess === null) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    // Note: we no longer hard-block the page for users without paid plans —
    // Free tier ships in Hito 5 with read access to the curated Core Library.
    // The upload CTA is the only gate (handled below via handleToggleUploadForm).

    return (
        <>
            <div className="w-full max-w-7xl mx-auto px-6 lg:px-10 py-5 lg:py-6 space-y-6">
                <LibraryHeader
                    totalCount={data.resources.length}
                    readyCount={data.indexedCount}
                    pendingCount={data.unindexedCount}
                    isUploadFormOpen={showUploadForm}
                    onToggleUploadForm={handleToggleUploadForm}
                />

                <UsageBanner />

                <BalanceBanner />

                <LibraryAttentionCallout
                    pendingCount={data.unindexedCount}
                    isProcessing={processing.bulkProcessing}
                    onProcessAll={() => processing.processAll(data.resources, data.indexStatus)}
                />

                <LibraryProgress progress={processing.bulkProcessing ? processing.bulkProgress : null} />

                {showUploadForm && (
                    <LibraryUploadForm
                        categories={data.categories}
                        file={upload.file}
                        fileSizeWarning={upload.fileSizeWarning}
                        metadata={upload.metadata}
                        uploading={upload.uploading}
                        uploadProgress={upload.uploadProgress}
                        onFileChange={upload.handleFileChange}
                        onMetadataChange={upload.setMetadata}
                        onSubmit={upload.handleSubmit}
                    />
                )}

                <LibraryFilters
                    categories={data.categories}
                    searchQuery={searchQuery}
                    categoryFilter={categoryFilter}
                    viewMode={viewMode}
                    onSearchChange={setSearchQuery}
                    onCategoryChange={setCategoryFilter}
                    onViewModeChange={setViewMode}
                />

                {data.loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredResources.length === 0 ? (
                    <LibraryEmptyState
                        isLibraryEmpty={data.resources.length === 0}
                        isUploadFormOpen={showUploadForm}
                        onAddFirstResource={() => setShowUploadForm(true)}
                    />
                ) : (
                    <div className={cn(
                        viewMode === 'grid'
                            ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                            : 'space-y-2'
                    )}>
                        {filteredResources.map(resource => (
                            <ResourceCard
                                key={resource.id}
                                resource={resource}
                                categories={data.categories}
                                indexStatus={data.indexStatus[resource.id] || 'unknown'}
                                isIndexing={processing.processingResourceId === resource.id}
                                viewMode={viewMode}
                                onEdit={() => openEdit(resource)}
                                onDelete={() => openDelete(resource)}
                                onIndex={() => processing.processResource(resource)}
                                onReindex={() => processing.reprocessResource(resource)}
                                onPreview={() => window.open(resource.storageUrl, '_blank')}
                                onSetPhases={() => openPhases(resource)}
                                onConfigureCoreStores={isAdmin ? () => openCoreStores(resource) : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>

            <EditResourceModal
                resource={resourceToEdit}
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                onSave={mutations.saveResource}
            />

            {resourceForCoreStores && (
                <ConfigureCoreStoresModal
                    resource={resourceForCoreStores}
                    open={coreStoresModalOpen}
                    onOpenChange={setCoreStoresModalOpen}
                    onUpdate={() => { /* Firestore subscription auto-updates */ }}
                />
            )}

            {resourceForPhases && (
                <PhasePreferenceModal
                    resource={resourceForPhases}
                    open={phaseModalOpen}
                    onOpenChange={setPhaseModalOpen}
                    onUpdate={() => { /* Firestore subscription auto-updates */ }}
                />
            )}

            <UploadConsentModal
                open={consentModalOpen}
                onAccept={() => { setConsentModalOpen(false); upload.performUploadAfterConsent(); }}
                onCancel={() => setConsentModalOpen(false)}
            />

            <UpgradeRequiredModal
                open={showUploadUpgradeModal}
                onOpenChange={setShowUploadUpgradeModal}
                reason="module_restricted"
                module="Biblioteca personal"
            />

            <CreditPacksDialog open={creditPacksOpen} onOpenChange={setCreditPacksOpen} />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {resourceToDelete && (
                                <>
                                    {t('deleteDialog.description')} <strong>"{resourceToDelete.title}"</strong>.{' '}
                                    {t('deleteDialog.warning')}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t('deleteDialog.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
