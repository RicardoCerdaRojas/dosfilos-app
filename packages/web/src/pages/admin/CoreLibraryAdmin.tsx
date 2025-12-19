import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { RefreshCw, Database, FileText, Calendar, AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

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

export default function CoreLibraryAdmin() {
    const [config, setConfig] = useState<StoreConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [recreating, setRecreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const db = getFirestore();
            const docRef = doc(db, 'config/coreLibraryStores');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setConfig({
                    stores: data.stores,
                    files: data.files,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    lastValidatedAt: data.lastValidatedAt?.toDate() || new Date()
                });
            } else {
                setConfig(null);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStores = async () => {
        try {
            setRecreating(true);
            setError(null);
            
            toast.info('Creando stores... Esto puede tomar 1-2 minutos');
            
            const functions = getFunctions();
            const createStoresFn = httpsCallable(functions, 'createCoreLibraryStores');
            const result = await createStoresFn();
            const data = result.data as any;

            if (data.success) {
                toast.success(`✅ Stores creados: ${data.filesCount.exegesis + data.filesCount.homiletics + data.filesCount.generic} archivos indexados`);
                await loadConfig();
            } else {
                throw new Error('Store creation failed');
            }
        } catch (err: any) {
            setError(err.message);
            toast.error('❌ Error: ' + err.message);
        } finally {
            setRecreating(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Cargando configuración...</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>No hay stores configurados.</span>
                        <Button onClick={handleCreateStores} disabled={recreating} size="sm">
                            {recreating ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear Stores Ahora
                                </>
                            )}
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const storeContexts = [
        { key: 'exegesis', name: 'Exégesis', description: 'Léxicos griego/hebreo, hermenéutica', color: 'blue' },
        { key: 'homiletics', name: 'Homilética', description: 'Predicación, teología sistemática', color: 'green' },
        { key: 'generic', name: 'Genérico', description: 'Teología bíblica, consejería, ética', color: 'purple' }
    ] as const;

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
                    <Button onClick={loadConfig} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                    </Button>
                    <Button 
                        onClick={handleCreateStores} 
                        variant="destructive" 
                        size="sm"
                        disabled={recreating}
                    >
                        {recreating ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Recreando...
                            </>
                        ) : (
                            <>
                                <Database className="h-4 w-4 mr-2" />
                                Recrear Stores
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Stores Activos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Exégesis, Homilética, Genérico
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            <Calendar className="h-4 w-4 inline mr-2" />
                            Creado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium">
                            {config.createdAt.toLocaleDateString('es-CL', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {config.createdAt.toLocaleTimeString('es-CL')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Última Validación
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium">
                            {config.lastValidatedAt.toLocaleDateString('es-CL')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {config.lastValidatedAt.toLocaleTimeString('es-CL')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Stores Detail */}
            <div className="grid grid-cols-1 gap-6">
                {storeContexts.map((context) => {
                    const storeId = config.stores[context.key];
                    const files = config.files[context.key] || [];
                    const totalPages = files.reduce((sum: number, f: any) => sum + (f.pages || 0), 0);

                    return (
                        <Card key={context.key}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {context.name}
                                            <Badge variant={context.color === 'blue' ? 'default' : context.color === 'green' ? 'secondary' : 'outline'}>
                                                {files.length} archivos
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
                                <div className="bg-muted p-3 rounded-md">
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Store ID</div>
                                    <code className="text-xs break-all">{storeId}</code>
                                </div>

                                {/* Files List */}
                                <div>
                                    <div className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Archivos Indexados
                                    </div>
                                    <div className="space-y-2">
                                        {files.map((file: any, idx: number) => (
                                            <div 
                                                key={idx}
                                                className="flex items-start justify-between p-3 bg-background border rounded-md"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{file.name}</div>
                                                    {file.author && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {file.author} {file.year && `(${file.year})`}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                                                        {file.storagePath}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <Badge variant="outline">{file.pages} pág</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Info / Help */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                    <CardTitle className="text-sm">ℹ️ Información</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                        • Los File Search Stores son <strong>permanentes</strong> - no expiran hasta que los elimines manualmente.
                    </p>
                    <p>
                        • Costo: <strong>$0.14 USD setup one-time</strong>, luego $0/mes fijo + pay-per-use (~$0.30/100 queries).
                    </p>
                    <p>
                        • Los stores se validan automáticamente al login de cada usuario.
                    </p>
                    <p>
                        • Usa "Recrear Stores" solo si necesitas actualizar los documentos o si hay problemas.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
