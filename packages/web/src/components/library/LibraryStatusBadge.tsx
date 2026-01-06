/**
 * LibraryStatusBadge
 * 
 * Non-intrusive visual indicator of library sync/cache status.
 * Shows current state and allows manual refresh.
 */

import { useLibraryContextOptional } from '@/context/library-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
    CheckCircle, 
    AlertCircle, 
    Loader2, 
    RefreshCw, 
    Database,
    Cloud,
    CloudOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function LibraryStatusBadge() {
    const context = useLibraryContextOptional();

    // If no context, don't render anything
    if (!context) return null;

    const {
        syncStatus,
        cacheStatus,
        expiredCount,
        syncedCount,
        totalCount,
        isLoading,
        isReady,
        needsSync,
        needsCacheRefresh,
        syncExpiredDocuments,
        refreshCache
    } = context;

    // Determine the overall status
    const getStatusIcon = () => {
        if (isLoading) {
            return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
        }
        if (isReady) {
            return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
        }
        if (syncStatus === 'error' || cacheStatus === 'error') {
            return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
        }
        if (needsSync) {
            return <CloudOff className="h-3.5 w-3.5 text-yellow-500" />;
        }
        return <Cloud className="h-3.5 w-3.5 text-muted-foreground" />;
    };

    const getStatusText = () => {
        if (isLoading) {
            return syncStatus === 'syncing' ? 'Sincronizando...' : 'Creando cache...';
        }
        if (isReady) {
            return 'Contexto listo';
        }
        if (expiredCount > 0) {
            return `${expiredCount} expirado${expiredCount > 1 ? 's' : ''}`;
        }
        if (needsCacheRefresh) {
            return 'Cache expirado';
        }
        return 'Sin contexto';
    };

    const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
        if (isReady) return 'default';
        if (syncStatus === 'error' || cacheStatus === 'error') return 'destructive';
        if (needsSync || needsCacheRefresh) return 'secondary';
        return 'outline';
    };

    if (totalCount === 0) {
        return null; // No resources configured
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button type="button" className="focus:outline-none">
                    <Badge 
                        variant={getVariant()} 
                        className={cn(
                            "cursor-pointer gap-1.5 px-2 py-0.5",
                            isLoading && "animate-pulse"
                        )}
                    >
                        {getStatusIcon()}
                        <span className="text-xs">{syncedCount}/{totalCount}</span>
                    </Badge>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Contexto de Biblioteca</h4>
                        <Badge variant={isReady ? 'default' : 'secondary'} className="text-xs">
                            {getStatusText()}
                        </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Documentos
                            </span>
                            <span className={cn(
                                syncedCount === totalCount ? 'text-green-600' : 'text-yellow-600'
                            )}>
                                {syncedCount}/{totalCount} sincronizados
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Cloud className="h-4 w-4" />
                                Cache
                            </span>
                            <span className={cn(
                                cacheStatus === 'ready' ? 'text-green-600' : 'text-yellow-600'
                            )}>
                                {cacheStatus === 'ready' ? 'Activo' : 
                                 cacheStatus === 'creating' ? 'Creando...' :
                                 cacheStatus === 'expired' ? 'Expirado' : 'Pendiente'}
                            </span>
                        </div>
                    </div>

                    {!isReady && (
                        <div className="flex gap-2 pt-2">
                            {needsSync && (
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={syncExpiredDocuments}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    <RefreshCw className={cn(
                                        "h-3.5 w-3.5 mr-1.5",
                                        syncStatus === 'syncing' && "animate-spin"
                                    )} />
                                    Sincronizar
                                </Button>
                            )}
                            {needsCacheRefresh && syncStatus === 'ready' && (
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={refreshCache}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    <Cloud className={cn(
                                        "h-3.5 w-3.5 mr-1.5",
                                        cacheStatus === 'creating' && "animate-spin"
                                    )} />
                                    Crear Cache
                                </Button>
                            )}
                        </div>
                    )}

                    {isReady && (
                        <p className="text-xs text-muted-foreground pt-1">
                            ✓ Contexto completo con {syncedCount} documentos
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
