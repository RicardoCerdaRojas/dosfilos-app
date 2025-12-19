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
import { cn } from '@/lib/utils';

interface StoreConfig {
    stores: {
        exegesis: string | null;
        homiletics: string | null;
        generic: string | null;
    };
    files: {
        exegesis: any[];
        homiletics: any[];
        generic: any[];
    };
    createdAt: Date;
    lastValidatedAt: Date;
}

interface SyncStatus {
    isSynced: boolean;
    desiredCount: number;
    currentCount: number;
    missing: string[];
}

type StoreContext = 'exegesis' | 'homiletics' | 'generic';

export default function CoreLibraryAdmin() {
    const firebase = useFirebase();
    const [config, setConfig] = useState<StoreConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<Record<StoreContext, SyncStatus | null>>({
        exegesis: null,
        homiletics: null,
        generic: null
    });
    const [syncing, setSyncing] = useState<Record<StoreContext, boolean>>({
        exegesis: false,
        homiletics: false,
        generic: false
    });
    const [activeTab, setActiveTab] = useState<StoreContext>('exegesis');

    const loadConfig = async () => {
        try {
            setLoading(true);
            const db = getFirestore();
            const docRef = doc(db, 'config/coreLibraryStores');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists) {
                const data = docSnap.data();
                setConfig({
                    stores: data.stores,
                    files: data.files,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    lastValidatedAt: data.lastValidatedAt?.toDate() || new Date()
                });
                
                // Load sync status for each store
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
        const contexts: StoreContext[] = ['exegesis', 'homiletics', 'generic'];
        
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
                
                setSyncStatus(prev => ({
                    ...prev,
                    [context]: {
                        isSynced: missing.length === 0 && desiredDocs.length === currentFiles.length,
                        desiredCount: desiredDocs.length,
                        currentCount: currentFiles.length,
                        missing
                    }
                }));
            } catch (error) {
                console.error(`Error validating ${context}:`, error);
            }
        }
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

    const storeContexts = [
        { 
            key: 'exegesis' as StoreContext, 
            name: 'Exégesis', 
            icon: BookOpen,
            description: 'Léxicos griego/hebreo, hermenéutica, gramática',
            emoji: '📖'
        },
        { 
            key: 'homiletics' as StoreContext, 
            name: 'Homilética', 
            icon: Mic2,
            description: 'Predicación, teología sistemática',
            emoji: '🎤'
        },
        { 
            key: 'generic' as StoreContext, 
            name: 'Genérico', 
            icon: Library,
            description: 'Recursos de uso general',
            emoji: '📚'
        }
    ];

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
                <Button onClick={loadConfig} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Quick Stats with Sync Controls - Compact Version */}
            {config && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                                    ? `${status?.currentCount}/${status?.desiredCount} sincronizados`
                                                    : `${status?.missing.length || 0} pendiente(s)`
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
                    <TabsList className="grid w-full grid-cols-3">
                        {storeContexts.map(context => (
                            <TabsTrigger key={context.key} value={context.key} className="gap-2">
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
                        No hay stores configurados. Los stores se crearán automáticamente al marcar documentos como Core en la biblioteca.
                    </AlertDescription>
                </Alert>
            )}

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                    <CardTitle className="text-sm">ℹ️ Cómo Funciona</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                        • <strong>Auto-sincronización:</strong> Al marcar/desmarcar documentos como Core, el store se sincroniza automáticamente.
                    </p>
                    <p>
                        • <strong>Validación:</strong> La página verifica si los stores están sincronizados al cargar.
                    </p>
                    <p>
                        • <strong>Sincronización manual:</strong> Usa el botón "Sincronizar" si detectas inconsistencias.
                    </p>
                    <p>
                        • <strong>Stores permanentes:</strong> Los File Search Stores no expiran y persisten sin costo mensual fijo.
                    </p>
                </CardContent>
            </Card>

        </div>
    );
}
