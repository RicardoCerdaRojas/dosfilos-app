import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { libraryService, categoryService } from '@dosfilos/application';
import { LibraryCategory, ResourceType } from '@dosfilos/domain';
import { Upload } from 'lucide-react';
import { doc, getDoc, getFirestore, collection, query, where, getDocs, writeBatch, arrayUnion } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { RefreshCw, Database, FileText, CheckCircle, AlertTriangle, Loader2, BookOpen, Mic2, Library } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface StoreConfig {
    stores: Record<string, string | null>;
    files: Record<string, any[]>;
    descriptions?: Record<string, string>;
    displayNames?: Record<string, string>;
    createdAt: Date;
    lastValidatedAt: Date;
}

interface SyncStatus {
    isSynced: boolean;
    desiredCount: number;
    currentCount: number;
    missing: string[];
}

type StoreContext = string;

export default function CoreLibraryAdmin() {
    const firebase = useFirebase();
    const [config, setConfig] = useState<StoreConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StoreContext>('exegesis');
    
    // Create Store State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newStoreKey, setNewStoreKey] = useState('');
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreDesc, setNewStoreDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Dynamic Sync Status State
    const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});
    const [syncing, setSyncing] = useState<Record<string, boolean>>({});
    const [storeResources, setStoreResources] = useState<Record<string, any[]>>({});

    // Unlink file state
    const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

    // Manual Retry state
    const [isRetrying, setIsRetrying] = useState<string | null>(null);

    const handleUnlinkFile = async (docTitle: string, context: string) => {
        if (!confirm(`¿Estás seguro de desvincular "${docTitle}" del store "${context}"? Deberás sincronizar después para aplicar los cambios a Gemini.`)) return;
        
        try {
            setIsUnlinking(docTitle);
            
            // 1. Find the document Id in Firestore by querying the title
            const db = getFirestore();
            const libraryRef = collection(db, 'library_resources');
            const q = query(
                libraryRef,
                where('userId', '==', firebase!.user!.uid),
                where('title', '==', docTitle),
                where('coreStores', 'array-contains', context)
            );
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                toast.error('No se pudo encontrar el documento original en tu biblioteca.');
                return;
            }
            
            const docId = snapshot.docs[0]!.id;
            
            // 2. Call cloud function
            const functions = getFunctions();
            const unlinkFn = httpsCallable(functions, 'removeFileFromStore');
            const result = await unlinkFn({ documentId: docId, context });
            const data = result.data as any;
            
            if (data.success) {
                toast.success(data.message);
                // We purposefully DO NOT auto-sync to avoid slow UI, admin will click Sync.
                // But we reload config to show it as Missing (pending sync out)
                await loadConfig();
            }
        } catch (error: any) {
            toast.error(`Error al desvincular: ${error.message}`);
        } finally {
            setIsUnlinking(null);
        }
    };

    // Edit Store State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStoreKey, setEditingStoreKey] = useState<string | null>(null);
    const [editStoreName, setEditStoreName] = useState('');
    const [editStoreDesc, setEditStoreDesc] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Add Documents State
    const [isAddDocsOpen, setIsAddDocsOpen] = useState(false);
    const [availableDocs, setAvailableDocs] = useState<any[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [isAddingDocs, setIsAddingDocs] = useState(false);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    // Direct Upload State
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadMetadata, setUploadMetadata] = useState({ title: '', author: '', type: 'theology' as ResourceType });
    const [isUploading, setIsUploading] = useState(false);
    const [fileSizeWarning, setFileSizeWarning] = useState(false);
    const MAX_OPTIMAL_SIZE_MB = 50;

    useEffect(() => {
        if (firebase?.user) {
            categoryService.getCategories(firebase.user.uid).then(setCategories).catch(console.error);
        }
    }, [firebase?.user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const validTypes = ['application/pdf', 'application/epub+zip'];
            if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|epub)$/i)) {
                toast.error('Solo se permiten archivos PDF o EPUB');
                return;
            }
            
            const fileSizeMB = selectedFile.size / (1024 * 1024);
            setFileSizeWarning(fileSizeMB > MAX_OPTIMAL_SIZE_MB);
            setUploadFile(selectedFile);
            setUploadMetadata(prev => ({ 
                ...prev, 
                title: selectedFile.name.replace(/\.[^/.]+$/, "") || "" 
            }));
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent, contextKey: string) => {
        e.preventDefault();
        if (!firebase?.user || !uploadFile) return;

        setIsUploading(true);
        try {
            const resource = await libraryService.uploadResource(firebase.user.uid, uploadFile, uploadMetadata);
            const db = getFirestore();
            const docRef = doc(db, 'library_resources', resource.id);
            const batch = writeBatch(db);
            batch.update(docRef, {
                coreStores: arrayUnion(contextKey)
            });
            await batch.commit();

            toast.success(`Documento subido y añadido a ${contextKey}. Procesando IA en segundo plano...`);
            setUploadFile(null);
            setFileSizeWarning(false);
            setUploadMetadata({ title: '', author: '', type: 'theology' });
            setIsAddDocsOpen(false);
            await loadConfig();

            // Trigger background sync to generate Gemini URI immediately
            try {
                const functions = getFunctions();
                const syncResourceFn = httpsCallable(functions, 'syncResourceToGemini');
                // We don't await this so it runs in the background and doesn't block UI
                syncResourceFn({ resourceId: resource.id }).catch(err => {
                    console.error("Background sync resource to gemini failed:", err);
                });
            } catch(e) { 
                console.error("Failed to trigger background sync:", e);
            }

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Error al subir el recurso: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleOpenAddDocs = async (contextKey: string) => {
        setIsAddDocsOpen(true);
        setSelectedDocs(new Set());
        setIsLoadingDocs(true);
        try {
            const db = getFirestore();
            const libraryRef = collection(db, 'library_resources');
            const q = query(
                libraryRef,
                where('userId', '==', firebase!.user!.uid)
            );
            const snapshot = await getDocs(q);
            
            // Filter out docs already in this store
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
            const currentFiles = config?.files?.[contextKey] || [];
            const currentUris = new Set(currentFiles.map(f => f.geminiUri));

            const available = docs.filter(d => 
                d.metadata?.geminiUri && 
                !currentUris.has(d.metadata.geminiUri) && 
                !d.coreStores?.includes(contextKey)
            );
            
            setAvailableDocs(available);
        } catch (error: any) {
            toast.error('Error cargando documentos: ' + error.message);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const handleAddSelectedDocs = async (contextKey: string) => {
        if (selectedDocs.size === 0) return;
        setIsAddingDocs(true);
        try {
            const db = getFirestore();
            const batch = writeBatch(db);
            
            selectedDocs.forEach(docId => {
                const docRef = doc(db, 'library_resources', docId);
                batch.update(docRef, {
                    coreStores: arrayUnion(contextKey)
                });
            });
            
            await batch.commit();
            
            toast.success(`${selectedDocs.size} documentos añadidos al store`);
            setIsAddDocsOpen(false);
            
            // Reload config to update the frontend
            await loadConfig();
            
            // Reload available docs to remove them from the list
            if (firebase?.user) {
                const db = getFirestore();
                const libraryRef = collection(db, 'library_resources');
                const q = query(libraryRef, where('userId', '==', firebase.user.uid));
                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }) as any);
                const currentUris = new Set((config?.files?.[contextKey] || []).map((f: any) => f.geminiUri));
                setAvailableDocs(docs.filter((d: any) => d.metadata?.geminiUri && !currentUris.has(d.metadata.geminiUri) && !d.coreStores?.includes(contextKey)));
            }
            
        } catch (error: any) {
            toast.error('Error al añadir documentos: ' + error.message);
        } finally {
            setIsAddingDocs(false);
        }
    };

    const handleRetrySync = async (resourceId: string, title: string) => {
        setIsRetrying(resourceId);
        try {
            toast.info(`Iniciando procesamiento manual para "${title}"...`);
            const functions = getFunctions();
            const syncResourceFn = httpsCallable(functions, 'syncResourceToGemini');
            
            // Wait for it because user triggered it manually
            const result = await syncResourceFn({ resourceId }) as any;
            
            if (result.data?.success) {
                toast.success(`✅ Documento procesado correctamente.`);
                await loadConfig();
            } else {
                toast.error(`Error procesando documento: ${result.data?.error || 'Desconocido'}`);
            }
        } catch (error: any) {
            console.error('Manual sync error:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsRetrying(null);
        }
    };

    const handleEditStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStoreKey || !editStoreName.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }

        try {
            setIsEditing(true);
            const functions = getFunctions();
            const updateStoreFn = httpsCallable(functions, 'updateCoreLibraryStore');
            
            await updateStoreFn({
                key: editingStoreKey,
                displayName: editStoreName.trim(),
                description: editStoreDesc.trim()
            });

            toast.success('Store actualizado exitosamente');
            setIsEditOpen(false);
            await loadConfig();
        } catch (error: any) {
            toast.error(`Error al actualizar store: ${error.message}`);
        } finally {
            setIsEditing(false);
            setEditingStoreKey(null);
        }
    };

    const loadConfig = async () => {
        try {
            setLoading(true);
            const db = getFirestore();
            const docRef = doc(db, 'config/coreLibraryStores');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setConfig({
                    stores: data.stores || {},
                    files: data.files || {},
                    descriptions: data.descriptions || {},
                    createdAt: data.createdAt?.toDate() || new Date(),
                    lastValidatedAt: data.lastValidatedAt?.toDate() || new Date()
                });
                
                // Initialize sync state for all stores
                const keys = Object.keys(data.stores || {});
                if (keys.length > 0 && !keys.includes(activeTab)) {
                    setActiveTab(keys[0] as string);
                }

                await validateAllStores(data);
            } else {
                setConfig(null);
            }
        } catch (err: any) {
            toast.error('Error cargando configuración: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const validateAllStores = async (configData: any) => {
        if (!firebase?.user) return;
        
        const db = getFirestore();
        const contexts = Object.keys(configData.stores || {});
        
        const newSyncStatus: Record<string, SyncStatus> = {};
        const newStoreResources: Record<string, any[]> = {};

        for (const context of contexts) {
            try {
                // Get desired state from library
                const libraryRef = collection(db, 'library_resources');
                const q = query(
                    libraryRef,
                    where('userId', '==', firebase.user.uid),
                    where('coreStores', 'array-contains', context)
                );
                const snapshot = await getDocs(q);
                
                const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                newStoreResources[context] = allDocs;

                const desiredDocs = allDocs.filter((d: any) => d.metadata?.geminiUri);
                
                const currentFiles = configData.files?.[context] || [];
                const currentUris = new Set(currentFiles.map((f: any) => f.geminiUri));
                
                // Missing files are now only docs that actually have Gemini URI and are not in store
                const missing = desiredDocs
                    .filter((d: any) => !currentUris.has(d.metadata.geminiUri))
                    .map((d: any) => d.title || d.name);
                
                // Calculate missing because they are totally new (No Gemini URI)
                const pendingProcessing = allDocs.filter((d: any) => !d.metadata?.geminiUri);
                
                newSyncStatus[context] = {
                    isSynced: missing.length === 0 && desiredDocs.length === currentFiles.length && allDocs.length === currentFiles.length,
                    desiredCount: allDocs.length, // use total associated docs, not just valid for Gemini ones
                    currentCount: currentFiles.length,
                    missing: [...missing, ...pendingProcessing.map((d: any) => d.title || d.name)] 
                };
            } catch (error) {
                console.error(`Error validating ${context}:`, error);
            }
        }
        setSyncStatus(newSyncStatus);
        setStoreResources(newStoreResources);
    };

    const handleSyncStore = async (context: StoreContext) => {
        try {
            setSyncing(prev => ({ ...prev, [context]: true }));
            toast.info(`Sincronizando ${context}...`);
            
            const functions = getFunctions();
            const syncFn = httpsCallable(functions, 'syncCoreLibraryStore');
            const result = await syncFn({ context });
            const data = result.data as any;

            if (data.success) {
                if (data.alreadySynced) {
                    toast.success(`✅ ${context} ya estaba sincronizado`);
                } else if (data.storeCreated) {
                    toast.success(`✅ Store ${context} creado con ${data.filesAdded} archivos`);
                } else {
                    toast.success(`✅ ${context} sincronizado: +${data.filesAdded} archivos`);
                }
                await loadConfig();
            } else {
                throw new Error('Sync failed');
            }
        } catch (err: any) {
            toast.error(`❌ Error: ${err.message}`);
        } finally {
            setSyncing(prev => ({ ...prev, [context]: false }));
        }
    };

    const handleCreateStore = async () => {
        if (!newStoreKey || !newStoreName) {
            toast.error("Clave y Nombre son requeridos");
            return;
        }

        // Basic validation for key (slug format)
        if (!/^[a-z0-9-]+$/.test(newStoreKey)) {
            toast.error("La clave debe contener solo letras minúsculas, números y guiones");
            return;
        }

        try {
            setIsCreating(true);
            const functions = getFunctions();
            const createFn = httpsCallable(functions, 'createCoreLibraryStore');
            
            await createFn({
                key: newStoreKey,
                displayName: newStoreName,
                description: newStoreDesc
            });

            toast.success(`Store '${newStoreName}' creado correctamente`);
            setIsCreateOpen(false);
            setNewStoreKey('');
            setNewStoreName('');
            setNewStoreDesc('');
            
            await loadConfig();
            setActiveTab(newStoreKey); // Switch to new tab
            
        } catch (error: any) {
            console.error("Error creating store:", error);
            toast.error(`Error al crear store: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, [firebase?.user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p>Cargando configuración...</p>
                </div>
            </div>
        );
    }

    const defaultMeta: Record<string, { name: string, icon: any, description: string, emoji: string }> = {
        exegesis: { name: 'Exégesis', icon: BookOpen, description: 'Léxicos griego/hebreo, hermenéutica, gramática', emoji: '📖' },
        homiletics: { name: 'Homilética', icon: Mic2, description: 'Predicación, teología sistemática', emoji: '🎤' },
        generic: { name: 'Genérico', icon: Library, description: 'Recursos de uso general', emoji: '📚' }
    };

    // Generate dynamic contexts from config
    const storeKeys = config?.stores ? Object.keys(config.stores) : [];
    
    // Ensure we default to showing something if empty
    const displayKeys = storeKeys.length > 0 ? storeKeys : [];

    const storeContexts = displayKeys.map(key => {
        const meta = defaultMeta[key] || {
            name: config?.displayNames?.[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '), 
            icon: Database,
            description: config?.descriptions?.[key] || 'Contexto personalizado',
            emoji: '📂'
        };
        return {
            ...meta,
            key 
        };
    });

    const activeStoreData = storeContexts.find(c => c.key === activeTab);

    return (
        <div className="p-6 max-w-[95%] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Biblioteca Core - File Search Stores</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestión de contextos de conocimiento teológico
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Store
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Crear Nuevo Store</DialogTitle>
                                <DialogDescription>
                                    Crea un nuevo contexto de archivos para el asistente de IA.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre (Display Name)</Label>
                                    <Input 
                                        placeholder="Ej: Historia de la Iglesia" 
                                        value={newStoreName}
                                        onChange={(e) => {
                                            setNewStoreName(e.target.value);
                                            // Auto-generate slug if empty
                                            if (!newStoreKey && e.target.value) {
                                                setNewStoreKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Clave (Key ID)</Label>
                                    <Input 
                                        placeholder="ej: historia-iglesia" 
                                        value={newStoreKey}
                                        onChange={(e) => setNewStoreKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    />
                                    <p className="text-xs text-muted-foreground">Identificador único (slug) usado internamente.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Textarea 
                                        placeholder="Descripción breve del contenido de este store..."
                                        value={newStoreDesc}
                                        onChange={(e) => setNewStoreDesc(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateStore} disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear Store
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={loadConfig} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Master-Detail Layout */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* LEFTSIDE (MASTER) */}
                <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0">
                    <div className="font-semibold text-sm text-foreground px-1 border-b pb-2 mb-1 flex items-center justify-between">
                        <span>Stores Configurados</span>
                        <Badge variant="secondary">{storeContexts.length}</Badge>
                    </div>
                    {config ? (
                        storeContexts.map(context => {
                        const status = syncStatus[context.key];
                        const files = config.files[context.key] || [];
                        const Icon = context.icon;
                        const isSynced = status?.isSynced ?? true;
                        
                        return (
                            <Card 
                                key={context.key}
                                className={cn(
                                    "cursor-pointer transition-all hover:shadow-md",
                                    activeTab === context.key && "ring-2 ring-primary"
                                )}
                                onClick={() => setActiveTab(context.key)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            <span className="text-sm font-medium">{context.name}</span>
                                        </div>
                                        {isSynced ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                {storeResources[context.key]?.length || 0} doc{(storeResources[context.key]?.length || 0) !== 1 ? 's' : ''} • {isSynced 
                                                    ? `${status?.currentCount || 0}/${status?.desiredCount || 0} sync`
                                                    : `${status?.currentCount || 0}/${status?.desiredCount || 0} sync`
                                                }
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSyncStore(context.key);
                                            }}
                                            disabled={syncing[context.key]}
                                            size="icon"
                                            className="h-7 w-7"
                                            variant={isSynced ? "ghost" : "secondary"}
                                            title="Sincronizar Store"
                                        >
                                            {syncing[context.key] ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-3 w-3" />
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                    ) : (
                        <div className="text-sm text-muted-foreground p-4 text-center border rounded-md border-dashed">
                            Cargando stores...
                        </div>
                    )}
                </div>

                {/* RIGHTSIDE (DETAIL) */}
                <div className="w-full flex-1 min-w-0">
                    {/* Active Store Details Area */}
                    {activeStoreData ? (() => {
                const context = activeStoreData;
                const storeId = config?.stores?.[context.key];
                const activeSyncdFiles = config?.files?.[context.key] || [];
                // Use the database resources to show ALL intended files, including pending ones
                const files = storeResources[context.key] || [];
                const totalPages = files.reduce((sum: number, f: any) => sum + (f.pageCount || f.pages || 0), 0);
                
                return (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Store Info Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {context.emoji} {context.name}
                                            <Badge variant="secondary">
                                                {files.length} archivo{files.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="mt-2 text-base">
                                            {context.description}
                                        </CardDescription>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div>
                                            <div className="text-sm font-medium">{totalPages} páginas</div>
                                            <div className="text-xs text-muted-foreground">Total indexado</div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Store ID */}
                                {storeId && (
                                    <div className="bg-muted/50 p-3 rounded-md flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground mb-1">ID de Store (Google Gemini)</div>
                                            <code className="text-xs text-primary">{storeId}</code>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8"
                                            onClick={() => {
                                                setEditingStoreKey(context.key);
                                                setEditStoreName(context.name);
                                                setEditStoreDesc(context.description || '');
                                                setIsEditOpen(true);
                                            }}
                                        >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Editar Store
                                        </Button>
                                    </div>
                                )}

                                {/* Files Table */}
                                <div>
                                    <div className="flex items-center justify-between mb-3 border-b pb-2">
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Documentos Exclusivos de este Store
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleOpenAddDocs(context.key)}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Añadir Archivos
                                        </Button>
                                    </div>
                                    
                                    {files.length > 0 ? (
                                        <div className="border rounded-md bg-background overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead>Documento</TableHead>
                                                        <TableHead>Autor</TableHead>
                                                        <TableHead className="w-[100px]">Páginas</TableHead>
                                                        <TableHead className="w-[120px]">Estado</TableHead>
                                                        <TableHead className="text-right w-[100px]">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {files.map((file: any, idx: number) => {
                                                        const hasGeminiUri = !!file.metadata?.geminiUri;
                                                        const isSynced = hasGeminiUri && activeSyncdFiles.some((f: any) => f.geminiUri === file.metadata.geminiUri);

                                                        return (
                                                            <TableRow key={idx}>
                                                                <TableCell className="font-medium">{file.title || file.name}</TableCell>
                                                                <TableCell className="text-muted-foreground">{file.author || '---'}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{file.pageCount || file.pages || '?'} pág</Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {isSynced ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-transparent">
                                                                                Activo
                                                                            </Badge>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                                title="Re-indexar con marcadores de página"
                                                                                onClick={() => handleRetrySync(file.id, file.title || file.name)}
                                                                                disabled={isRetrying === file.id}
                                                                            >
                                                                                <RefreshCw className={`h-3 w-3 ${isRetrying === file.id ? 'animate-spin' : ''}`} />
                                                                            </Button>
                                                                        </div>
                                                                    ) : !hasGeminiUri ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-transparent">
                                                                                Procesando IA
                                                                            </Badge>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6"
                                                                                title="Reintentar Procesamiento"
                                                                                onClick={() => handleRetrySync(file.id, file.title || file.name)}
                                                                                disabled={isRetrying === file.id}
                                                                            >
                                                                                <RefreshCw className={`h-3 w-3 ${isRetrying === file.id ? 'animate-spin' : ''}`} />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1">
                                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent">
                                                                                Pendiente Sync
                                                                            </Badge>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6"
                                                                                title="Reintentar Procesamiento"
                                                                                onClick={() => handleRetrySync(file.id, file.title || file.name)}
                                                                                disabled={isRetrying === file.id}
                                                                            >
                                                                                <RefreshCw className={`h-3 w-3 ${isRetrying === file.id ? 'animate-spin' : ''}`} />
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                        onClick={() => handleUnlinkFile(file.title || file.name, context.key)}
                                                                        disabled={isUnlinking === (file.title || file.name)}
                                                                        title="Desvincular del Store"
                                                                    >
                                                                        {isUnlinking === (file.title || file.name) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 border rounded-md border-dashed text-muted-foreground bg-muted/10">
                                            <Database className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium text-foreground">El store está vacío</p>
                                            <p className="text-sm mt-1">Sube archivos a "Mi Biblioteca" y márcalos con el contexto <b>{context.name}</b></p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            })()
            : (
                <div className="h-full flex items-center justify-center p-12 border rounded-md border-dashed">
                    <div className="text-center text-muted-foreground">
                        <Database className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="font-medium text-foreground">Ningún Store Seleccionado</p>
                        <p className="text-sm mt-1">Selecciona un store de la izquierda para ver y gestionar sus documentos.</p>
                    </div>
                </div>
            )}
            </div>
            </div>

            {/* Info Card - Reduced */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm">ℹ️ Cómo Funciona</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1 pb-3">
                    <p>• Los stores son permanentes y contienen índices de archivos procesados por Gemini.</p>
                    <p>• Crea contextos específicos (ej: Historia, Sistemática) para organizar el conocimiento.</p>
                    <p>• Si desvinculas un documento, debes pulsar "Sincronizar" para que Gemini recree el Store sin ese documento.</p>
                </CardContent>
            </Card>

            {/* Edit Store Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Store</DialogTitle>
                        <DialogDescription>
                            Actualiza el nombre y descripción del store. Cambiar el nombre actualizará el Display Name en la API de Gemini.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditStore} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editKey">Clave del Contexto (No editable)</Label>
                            <Input
                                id="editKey"
                                value={editingStoreKey || ''}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editName">Nombre para Mostrar <span className="text-destructive">*</span></Label>
                            <Input
                                id="editName"
                                placeholder="Ej: Teología Sistemática"
                                value={editStoreName}
                                onChange={e => setEditStoreName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editDesc">Descripción</Label>
                            <Textarea
                                id="editDesc"
                                placeholder="Breve descripción del propósito de este store..."
                                value={editStoreDesc}
                                onChange={e => setEditStoreDesc(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isEditing}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isEditing}>
                                {isEditing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Docs Dialog */}
            <Dialog open={isAddDocsOpen} onOpenChange={setIsAddDocsOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Añadir Documentos al Store</DialogTitle>
                        <DialogDescription>
                            Selecciona documentos existentes de tu biblioteca o sube uno nuevo.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="select" className="flex-1 flex flex-col min-h-0 mt-4">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="select">Seleccionar de Biblioteca</TabsTrigger>
                            <TabsTrigger value="upload">Subir Nuevo Documento</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="select" className="flex-1 overflow-hidden flex flex-col mt-0 data-[state=inactive]:hidden">
                            <div className="flex-1 overflow-y-auto border rounded-md">
                                {isLoadingDocs ? (
                                    <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                                ) : availableDocs.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">No hay documentos disponibles en tu biblioteca para añadir.</div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="w-[50px] text-center">
                                                    <CheckCircle className="h-4 w-4 mx-auto text-muted-foreground" />
                                                </TableHead>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Autor</TableHead>
                                                <TableHead>Páginas</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {availableDocs.map(doc => {
                                                const isSelected = selectedDocs.has(doc.id);
                                                return (
                                                    <TableRow 
                                                        key={doc.id}
                                                        className={cn("cursor-pointer", isSelected && "bg-primary/5")}
                                                        onClick={() => {
                                                            const newSet = new Set(selectedDocs);
                                                            if (isSelected) newSet.delete(doc.id);
                                                            else newSet.add(doc.id);
                                                            setSelectedDocs(newSet);
                                                        }}
                                                    >
                                                        <TableCell className="text-center">
                                                            <div className={cn("h-4 w-4 mx-auto rounded-sm border flex items-center justify-center shrink-0", isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground")}>
                                                                {isSelected && <CheckCircle className="h-3 w-3" />}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{doc.title}</TableCell>
                                                        <TableCell className="text-muted-foreground">{doc.author || '---'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{doc.metadata?.pages || 0} pág</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>

                            <div className="flex justify-end pt-4 mt-auto">
                                <Button variant="outline" className="mr-2" onClick={() => setIsAddDocsOpen(false)}>Cancelar</Button>
                                <Button 
                                    onClick={() => handleAddSelectedDocs(activeTab)} 
                                    disabled={isAddingDocs || selectedDocs.size === 0}
                                >
                                    {isAddingDocs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Añadir {selectedDocs.size > 0 ? `(${selectedDocs.size})` : ''} Documentos
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="upload" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden px-1">
                            <form onSubmit={(e) => handleUploadSubmit(e, activeTab)} className="space-y-4 pt-2">
                                <div className="space-y-2">
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
                                                Archivo &gt;50MB: calidad reducida o posible rechazo de la API de IA.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="title">Título</Label>
                                    <Input 
                                        id="title" 
                                        value={uploadMetadata.title}
                                        onChange={e => setUploadMetadata({...uploadMetadata, title: e.target.value})}
                                        placeholder="Título del documento"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="author">Autor</Label>
                                    <Input 
                                        id="author" 
                                        value={uploadMetadata.author}
                                        onChange={e => setUploadMetadata({...uploadMetadata, author: e.target.value})}
                                        placeholder="Nombre del autor"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">Categoría</Label>
                                    <Select 
                                        value={uploadMetadata.type} 
                                        onValueChange={(v: ResourceType) => setUploadMetadata({...uploadMetadata, type: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona una categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="flex justify-end pt-4 border-t mt-4">
                                    <Button type="button" variant="outline" className="mr-2" onClick={() => setIsAddDocsOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isUploading || !uploadFile}>
                                        {isUploading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="mr-2 h-4 w-4" />
                                        )}
                                        Subir y Añadir a Store
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

        </div>
    );
}
