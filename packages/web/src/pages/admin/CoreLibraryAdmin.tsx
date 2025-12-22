import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, getDoc, getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { RefreshCw, Database, FileText, CheckCircle, AlertTriangle, Loader2, BookOpen, Mic2, Library } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreConfig {
    stores: Record<string, string | null>;
    files: Record<string, any[]>;
    descriptions?: Record<string, string>;
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
                    setActiveTab(keys[0]);
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
                
                const desiredDocs = snapshot.docs
                    .map(doc => doc.data())
                    .filter(d => d.metadata?.geminiUri);
                
                const currentFiles = configData.files?.[context] || [];
                const currentUris = new Set(currentFiles.map((f: any) => f.geminiUri));
                
                const missing = desiredDocs
                    .filter(d => !currentUris.has(d.metadata.geminiUri))
                    .map(d => d.title);
                
                newSyncStatus[context] = {
                    isSynced: missing.length === 0 && desiredDocs.length === currentFiles.length,
                    desiredCount: desiredDocs.length,
                    currentCount: currentFiles.length,
                    missing
                };
            } catch (error) {
                console.error(`Error validating ${context}:`, error);
            }
        }
        setSyncStatus(newSyncStatus);
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
            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '), 
            icon: Database,
            description: config?.descriptions?.[key] || 'Contexto personalizado',
            emoji: '📂'
        };
        return {
            ...meta,
            key 
        };
    });

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
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

            {/* Quick Stats with Sync Controls - Dynamic Grid */}
            {config && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {storeContexts.map(context => {
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
                                    
                                    <div className="flex items-end justify-between mb-3">
                                        <div>
                                            <div className="text-3xl font-bold">{files.length}</div>
                                            <p className="text-xs text-muted-foreground">
                                                {isSynced 
                                                    ? `${status?.currentCount || 0}/${status?.desiredCount || 0} sincronizados`
                                                    : `${status?.missing?.length || 0} pendiente(s)`
                                                }
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSyncStore(context.key);
                                            }}
                                            disabled={syncing[context.key]}
                                            size="sm"
                                            variant={isSynced ? "outline" : "default"}
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
                    })}
                </div>
            )}

            {/* Tabs for each store */}
            {config ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StoreContext)}>
                    <TabsList className="flex w-full overflow-x-auto justify-start h-auto p-1 bg-muted/50 gap-1 flex-wrap">
                        {storeContexts.map(context => (
                            <TabsTrigger key={context.key} value={context.key} className="gap-2 px-4 py-2 h-9 min-w-[120px]">
                                <context.icon className="h-4 w-4" />
                                {context.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {storeContexts.map(context => {
                        const storeId = config.stores?.[context.key];
                        const files = config.files?.[context.key] || [];
                        const totalPages = files.reduce((sum: number, f: any) => sum + (f.pages || 0), 0);
                        
                        return (
                            <TabsContent key={context.key} value={context.key} className="space-y-4">
                                {/* Store Info Card */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    {context.emoji} {context.name}
                                                    <Badge>
                                                        {files.length} archivo{files.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                </CardTitle>
                                                <CardDescription className="mt-2">
                                                    {context.description}
                                                </CardDescription>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium">{totalPages} páginas</div>
                                                <div className="text-xs text-muted-foreground">Total indexado</div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Store ID */}
                                        {storeId && (
                                            <div className="bg-muted p-3 rounded-md">
                                                <div className="text-xs font-medium text-muted-foreground mb-1">Store ID</div>
                                                <code className="text-xs break-all">{storeId}</code>
                                            </div>
                                        )}

                                        {/* Files Grid - 3 columns */}
                                        {files.length > 0 ? (
                                            <div>
                                                <div className="text-sm font-medium mb-3 flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    Archivos Indexados
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {files.map((file: any, idx: number) => (
                                                        <div 
                                                            key={idx}
                                                            className="flex flex-col p-3 bg-background border rounded-md hover:bg-muted/50 transition-colors"
                                                        >
                                                            <div className="flex-1 mb-2">
                                                                <div className="font-medium text-sm line-clamp-2">{file.name}</div>
                                                                {file.author && (
                                                                    <div className="text-xs text-muted-foreground mt-1 truncate">
                                                                        {file.author}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center justify-between mt-auto pt-2 border-t">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {file.pages} pág
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                                <p>No hay archivos en este store</p>
                                                <p className="text-xs mt-1">Marca documentos como Core con contexto "{context.name}"</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            ) : (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        No hay stores configurados. Crea uno nuevo o espera a que se sincronice el sistema.
                    </AlertDescription>
                </Alert>
            )}

            {/* Info Card - Reduced */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm">ℹ️ Cómo Funciona</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1 pb-3">
                    <p>• Los stores son permanentes y contienen índices de archivos procesados por Gemini.</p>
                    <p>• Crea contextos específicos (ej: Historia, Sistemática) para organizar el conocimiento.</p>
                </CardContent>
            </Card>

        </div>
    );
}
