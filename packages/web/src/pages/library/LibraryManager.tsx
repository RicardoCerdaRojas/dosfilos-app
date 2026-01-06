import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { libraryService, categoryService } from '@dosfilos/application';
import { LibraryResourceEntity, LibraryCategory, ResourceType } from '@dosfilos/domain';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Book, Upload, Loader2, Sparkles, AlertTriangle, Search, LayoutGrid, List, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ResourceCard } from './ResourceCard';
import { EditResourceModal } from './EditResourceModal';
import { PhasePreferenceModal } from './PhasePreferenceModal';
import { ConfigureCoreStoresModal } from './ConfigureCoreStoresModal';
import { cn } from '@/lib/utils';
import { UpgradeRequiredPage } from '@/components/upgrade';

type IndexStatus = 'unknown' | 'indexed' | 'not-indexed' | 'checking';
type ViewMode = 'grid' | 'list';

interface IndexingProgress {
    current: number;
    total: number;
    currentTitle: string;
}

const ADMIN_EMAIL = 'rdocerda@gmail.com';

export function LibraryManager() {
    const { user } = useFirebase();
    const { checkCanAccessLibrary } = useUsageLimits();
    const isAdmin = user?.email === ADMIN_EMAIL;
    const [hasLibraryAccess, setHasLibraryAccess] = useState<boolean | null>(null);
    const [resources, setResources] = useState<LibraryResourceEntity[]>([]);
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [indexingAll, setIndexingAll] = useState(false);
    const [indexingResource, setIndexingResource] = useState<string | null>(null);
    const [syncingResource, setSyncingResource] = useState<string | null>(null);
    const [indexingProgress, setIndexingProgress] = useState<IndexingProgress | null>(null);
    const [indexStatus, setIndexStatus] = useState<Record<string, IndexStatus>>({});
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState({
        title: '',
        author: '',
        type: 'theology' as ResourceType
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<LibraryResourceEntity | null>(null);
    const [fileSizeWarning, setFileSizeWarning] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    
    // New UI states
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ResourceType | 'all'>('all');
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [resourceToEdit, setResourceToEdit] = useState<LibraryResourceEntity | null>(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [phaseModalOpen, setPhaseModalOpen] = useState(false);
    const [resourceForPhases, setResourceForPhases] = useState<LibraryResourceEntity | null>(null);
    const [coreStoresModalOpen, setCoreStoresModalOpen] = useState(false);
    const [resourceForCoreStores, setResourceForCoreStores] = useState<LibraryResourceEntity | null>(null);

    // 50MB limit for optimal Gemini processing
    const MAX_OPTIMAL_SIZE_MB = 50;

    // Load categories once
    useEffect(() => {
        if (user) {
            categoryService.getCategories(user.uid).then(setCategories).catch(console.error);
        }
    }, [user]);

    // Check library access for free users
    useEffect(() => {
        async function checkAccess() {
            if (!user) {
                setHasLibraryAccess(false);
                return;
            }
            
            const canAccess = await checkCanAccessLibrary();
            setHasLibraryAccess(canAccess);
        }
        checkAccess();
    }, [user, checkCanAccessLibrary]);

    // Subscribe to real-time resource updates
    useEffect(() => {
        if (!user || hasLibraryAccess === false) return;

        const unsubscribe = libraryService.subscribeToUserResources(
            user.uid,
            (updatedResources) => {
                setResources(updatedResources);
                setLoading(false);
                checkAllIndexStatus(updatedResources);
            }
        );

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [user, hasLibraryAccess]); // checkAllIndexStatus is defined below, exclude rom deps

    // Filtered resources based on search and category
    const filteredResources = useMemo(() => {
        return resources.filter(resource => {
            const matchesSearch = searchQuery === '' || 
                resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                resource.author.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || resource.type === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [resources, searchQuery, categoryFilter]);

    const checkAllIndexStatus = useCallback(async (resources: LibraryResourceEntity[]) => {
        const statusMap: Record<string, IndexStatus> = {};
        for (const resource of resources) {
            statusMap[resource.id] = 'checking';
        }
        setIndexStatus(statusMap);

        for (const resource of resources) {
            try {
                const isIndexed = await libraryService.isResourceIndexed(resource.id);
                setIndexStatus(prev => ({
                    ...prev,
                    [resource.id]: isIndexed ? 'indexed' : 'not-indexed'
                }));
            } catch {
                setIndexStatus(prev => ({
                    ...prev,
                    [resource.id]: 'unknown'
                }));
            }
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            // Validate file type
            const validTypes = ['application/pdf', 'application/epub+zip'];
            if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|epub)$/i)) {
                toast.error('Solo se permiten archivos PDF o EPUB');
                return;
            }
            
            const fileSizeMB = selectedFile.size / (1024 * 1024);
            setFileSizeWarning(fileSizeMB > MAX_OPTIMAL_SIZE_MB);
            setFile(selectedFile);
            setMetadata(prev => ({ 
                ...prev, 
                title: selectedFile.name.replace(/\.[^/.]+$/, "") || "" 
            }));
        }
    };


    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !file) return;

        setUploading(true);
        setUploadProgress(0);
        try {
            await libraryService.uploadResource(user.uid, file, metadata, (progress) => {
                setUploadProgress(progress);
            });
            toast.success('Recurso agregado a la biblioteca');
            setFile(null);
            setFileSizeWarning(false);
            setMetadata({ title: '', author: '', type: 'theology' });
            setShowUploadForm(false);
            // Resources will update automatically via Firestore listener
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error al subir el recurso');
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    };

    const openDeleteDialog = (resource: LibraryResourceEntity) => {
        setResourceToDelete(resource);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!resourceToDelete) return;
        try {
            await libraryService.deleteResource(resourceToDelete.id);
            toast.success('Recurso eliminado');
            // Resources will update automatically via Firestore listener
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Error al eliminar el recurso');
        } finally {
            setDeleteDialogOpen(false);
            setResourceToDelete(null);
        }
    };

    const handleEdit = (resource: LibraryResourceEntity) => {
        setResourceToEdit(resource);
        setEditModalOpen(true);
    };

    const handleSaveEdit = async (id: string, updates: { 
        title: string; 
        author: string; 
        type: ResourceType;
        isCore?: boolean;
        coreContext?: 'exegesis' | 'homiletics' | 'generic';
    }) => {
        try {
            await libraryService.updateResource(id, updates);
            toast.success('Recurso actualizado');
            // Resources will update automatically via Firestore listener
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Error al actualizar el recurso');
            throw error;
        }
    };

    const handleIndexResource = async (resource: LibraryResourceEntity) => {
        setIndexingResource(resource.id);
        try {
            const chunks = await libraryService.indexResource(resource);
            if (chunks > 0) {
                toast.success(`"${resource.title}" indexado con ${chunks} fragmentos`);
                setIndexStatus(prev => ({ ...prev, [resource.id]: 'indexed' }));
            } else {
                toast.warning(`No se generaron fragmentos para "${resource.title}". Es posible que el texto no sea reconocible o sea muy corto.`);
            }
        } catch (error) {
            console.error('Index error:', error);
            if (error instanceof Error && error.message === 'TEXT_NOT_READY') {
                toast.warning('El texto aún se está extrayendo. Espera unos segundos y vuelve a intentar.', { duration: 5000 });
            } else {
                toast.error('Error al indexar el recurso');
            }
        } finally {
            setIndexingResource(null);
        }
    };

    const handleReindexResource = async (resource: LibraryResourceEntity) => {
        if (!confirm(`¿Estás seguro de que deseas re-indexar "${resource.title}"? Esto eliminará los fragmentos existentes y los volverá a generar.`)) {
            return;
        }

        setIndexingResource(resource.id);
        try {
            // Force re-indexing by calling indexResource with force: true
            const chunks = await libraryService.indexResource(resource, { force: true });
            
            if (chunks > 0) {
                toast.success(`"${resource.title}" re-indexado exitosamente (${chunks} fragmentos)`);
                setIndexStatus(prev => ({ ...prev, [resource.id]: 'indexed' }));
            } else {
                toast.warning('No se generaron nuevos fragmentos durante la re-indexación');
            }
        } catch (error) {
            console.error('Re-index error:', error);
            toast.error('Error al re-indexar el recurso');
        } finally {
            setIndexingResource(null);
        }
    };

    const handleIndexAll = async () => {
        if (!user) return;
        setIndexingAll(true);
        
        try {
            // Get only unindexed resources
            const unindexedResources = resources.filter(
                r => indexStatus[r.id] === 'not-indexed'
            );
            
            if (unindexedResources.length === 0) {
                toast.info('No hay documentos sin indexar');
                return;
            }
            
            let totalChunks = 0;
            let processedCount = 0;
            let errorCount = 0;
            
            for (const resource of unindexedResources) {
                processedCount++;
                setIndexingProgress({
                    current: processedCount,
                    total: unindexedResources.length,
                    currentTitle: resource.title
                });
                setIndexingResource(resource.id);
                
                try {
                    const chunks = await libraryService.indexResource(resource);
                    totalChunks += chunks;
                    setIndexStatus(prev => ({
                        ...prev,
                        [resource.id]: 'indexed'
                    }));
                } catch (error) {
                    console.error(`Error indexing ${resource.title}:`, error);
                    errorCount++;
                    // Continue with next resource
                }
            }
            
            if (errorCount > 0) {
                toast.warning(`Indexación completada con ${errorCount} errores. ${totalChunks} fragmentos creados.`);
            } else {
                toast.success(`Biblioteca indexada: ${totalChunks} fragmentos creados`);
            }
        } catch (error) {
            toast.error('Error al indexar la biblioteca');
        } finally {
            setIndexingAll(false);
            setIndexingResource(null);
            setIndexingProgress(null);
        }
    };

    const handleSyncResource = async (resource: LibraryResourceEntity) => {
        setSyncingResource(resource.id);
        try {
            const functions = getFunctions();
            const syncFn = httpsCallable(functions, 'syncResourceToGemini');
            
            toast.info(`Sincronizando "${resource.title}" con Gemini...`);
            
            const result = await syncFn({ resourceId: resource.id });
            const data = result.data as any;

            if (data.success) {
                toast.success(`"${resource.title}" sincronizado correctamente con IA`);
                // Firestore listener will update the UI with new metadata
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Sync error:', error);
            toast.error(`Error al sincronizar: ${(error as Error).message}`);
        } finally {
            setSyncingResource(null);
        }
    };

    const handlePreview = (resource: LibraryResourceEntity) => {
        // Open PDF in new tab for now
        window.open(resource.storageUrl, '_blank');
    };

    const handleSetPhases = (resource: LibraryResourceEntity) => {
        setResourceForPhases(resource);
        setPhaseModalOpen(true);
    };

    const handlePhaseUpdate = (updatedResource: LibraryResourceEntity) => {
        // Update local state with new phase preferences
        setResources(prev => 
            prev.map(r => r.id === updatedResource.id ? updatedResource : r)
        );
    };
    
    const handleCoreStoresUpdate = (updatedResource: LibraryResourceEntity) => {
        // Update local state with new Core Library stores
        setResources(prev => 
            prev.map(r => r.id === updatedResource.id ? updatedResource : r)
        );
    };
    
    const handleSetCoreStores = (resource: LibraryResourceEntity) => {
        setResourceForCoreStores(resource);
        setCoreStoresModalOpen(true);
    };

    const unindexedCount = Object.values(indexStatus).filter(s => s === 'not-indexed').length;

    // Show upgrade screen for free users
    if (hasLibraryAccess === null) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (hasLibraryAccess === false) {
        return (
            <UpgradeRequiredPage
                reason="module_restricted"
                module="Biblioteca"
                limitType="library"
            />
        );
    }

    return (
        <>
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Biblioteca Teológica</h2>
                    <p className="text-muted-foreground">
                        {resources.length} recursos • {Object.values(indexStatus).filter(s => s === 'indexed').length} indexados
                    </p>
                </div>
                <div className="flex gap-2">
                    {resources.length > 0 && unindexedCount > 0 && (
                        <Button 
                            onClick={handleIndexAll} 
                            disabled={indexingAll}
                            variant="outline"
                            className="gap-2 min-w-[180px]"
                        >
                            {indexingAll ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {indexingProgress 
                                        ? `${indexingProgress.current}/${indexingProgress.total} (${Math.round((indexingProgress.current / indexingProgress.total) * 100)}%)`
                                        : 'Preparando...'
                                    }
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Indexar Todo ({unindexedCount})
                                </>
                            )}
                        </Button>
                    )}
                    <Button onClick={() => setShowUploadForm(!showUploadForm)} className="gap-2">
                        {showUploadForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {showUploadForm ? 'Cerrar' : 'Agregar'}
                    </Button>
                </div>
            </div>

            {/* Upload Form */}
            {showUploadForm && (
                <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Agregar Nuevo Recurso</CardTitle>
                        <CardDescription>Sube PDFs o EPUBs para tu biblioteca teológica</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpload} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="space-y-2 lg:col-span-1">
                                <Label htmlFor="file">Archivo</Label>
                                <Input 
                                    id="file" 
                                    type="file" 
                                    accept=".pdf,.epub"
                                    onChange={handleFileChange}
                                    required
                                />
                                {fileSizeWarning && (
                                    <Alert variant="destructive" className="bg-amber-50 border-amber-200 py-2">
                                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                                        <AlertDescription className="text-amber-700 text-xs">
                                            Archivo &gt;50MB: calidad reducida
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                                <Label htmlFor="title">Título</Label>
                                <Input 
                                    id="title" 
                                    value={metadata.title}
                                    onChange={e => setMetadata({...metadata, title: e.target.value})}
                                    placeholder="Título del documento"
                                    required
                                />
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                                <Label htmlFor="author">Autor</Label>
                                <Input 
                                    id="author" 
                                    value={metadata.author}
                                    onChange={e => setMetadata({...metadata, author: e.target.value})}
                                    placeholder="Nombre del autor"
                                    required
                                />
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                                <Label htmlFor="type">Categoría</Label>
                                <Select 
                                    value={metadata.type} 
                                    onValueChange={(v: ResourceType) => setMetadata({...metadata, type: v})}
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
                                <Button type="submit" className="w-full" disabled={uploading || !file}>
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {uploadProgress !== null ? `${Math.round(uploadProgress)}%` : '...'}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Subir
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Filters and View Toggle */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por título o autor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ResourceType | 'all')}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-1 border rounded-lg p-1">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-8 w-8 p-0"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="h-8 w-8 p-0"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Resource Grid/List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filteredResources.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Book className="mx-auto h-16 w-16 opacity-20 mb-4" />
                    <h3 className="text-lg font-medium mb-1">
                        {resources.length === 0 ? 'Tu biblioteca está vacía' : 'No se encontraron resultados'}
                    </h3>
                    <p className="text-sm">
                        {resources.length === 0 
                            ? 'Agrega tu primer recurso para comenzar'
                            : 'Intenta con otros términos de búsqueda'}
                    </p>
                </div>
            ) : (
                <div className={cn(
                    viewMode === 'grid' 
                        ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        : 'space-y-3'
                )}>
                    {filteredResources.map(resource => (
                        <ResourceCard
                            key={resource.id}
                            resource={resource}
                            categories={categories}
                            indexStatus={indexStatus[resource.id] || 'unknown'}
                            isIndexing={indexingResource === resource.id}
                            onEdit={() => handleEdit(resource)}
                            onDelete={() => openDeleteDialog(resource)}
                            onIndex={() => handleIndexResource(resource)}
                            onReindex={() => handleReindexResource(resource)}
                            onPreview={() => handlePreview(resource)}
                            onSetPhases={() => handleSetPhases(resource)}
                            onConfigureCoreStores={isAdmin ? () => handleSetCoreStores(resource) : undefined}
                            onSync={() => handleSyncResource(resource)}
                            isSyncing={syncingResource === resource.id}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Edit Modal */}
        <EditResourceModal
            resource={resourceToEdit}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            onSave={handleSaveEdit}
        />

        {/* Core Stores Modal */}
        {resourceForCoreStores && (
            <ConfigureCoreStoresModal
                resource={resourceForCoreStores}
                open={coreStoresModalOpen}
                onOpenChange={setCoreStoresModalOpen}
                onUpdate={handleCoreStoresUpdate}
            />
        )}

        {/* Phase Preference Modal */}
        {resourceForPhases && (
            <PhasePreferenceModal
                resource={resourceForPhases}
                open={phaseModalOpen}
                onOpenChange={setPhaseModalOpen}
                onUpdate={handlePhaseUpdate}
            />
        )}

        {/* Delete Confirmation Modal */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {resourceToDelete && (
                            <>
                                Estás a punto de eliminar <strong>"{resourceToDelete.title}"</strong>.
                                Esta acción no se puede deshacer y eliminará también los datos de indexación.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
