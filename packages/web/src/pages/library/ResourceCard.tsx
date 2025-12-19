import { LibraryResourceEntity, LibraryCategory, WorkflowPhase } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, FileText, MessageSquare, Languages, FileQuestion, Trash2, Edit2, Sparkles, Loader2, CheckCircle2, AlertCircle, Eye, BookOpen, Mic2, PenTool, Settings2, RefreshCw, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

type IndexStatus = 'unknown' | 'indexed' | 'not-indexed' | 'checking';

interface ResourceCardProps {
    resource: LibraryResourceEntity;
    categories: LibraryCategory[];
    indexStatus: IndexStatus;
    isIndexing: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onIndex: () => void;
    onReindex?: () => void;
    onPreview: () => void;
    onSetPhases?: () => void;
    onSync?: () => void;
    isSyncing?: boolean;
    isAdmin?: boolean; // 🎯 NEW: Show core library controls
    onToggleCore?: (isCore: boolean, coreContext?: 'exegesis' | 'homiletics' | 'generic') => void;
}

// Icon mapping for category icons
const iconMap: Record<string, typeof Book> = {
    'Book': Book,
    'Languages': Languages,
    'MessageSquare': MessageSquare,
    'FileText': FileText,
    'FileQuestion': FileQuestion,
};

// Color mapping for category colors
const colorMap: Record<string, string> = {
    'blue': 'text-blue-600 bg-blue-100',
    'purple': 'text-purple-600 bg-purple-100',
    'green': 'text-green-600 bg-green-100',
    'orange': 'text-orange-600 bg-orange-100',
    'red': 'text-red-600 bg-red-100',
    'yellow': 'text-yellow-600 bg-yellow-100',
    'pink': 'text-pink-600 bg-pink-100',
    'gray': 'text-gray-600 bg-gray-100',
};

export function ResourceCard({ 
    resource, 
    categories,
    indexStatus, 
    isIndexing, 
    onEdit, 
    onDelete, 
    onIndex,
    onReindex,
    onPreview,
    onSetPhases,
    onSync,
    isSyncing,
    isAdmin,
    onToggleCore
}: ResourceCardProps) {
    // Find the category by ID
    const category = categories.find(c => c.id === resource.type);
    const label = category?.label || 'Otro';
    const color = colorMap[category?.color || 'gray'] || colorMap.gray;
    const Icon = iconMap[category?.icon || 'FileQuestion'] || FileQuestion;
    const fileSizeMB = (resource.sizeBytes / (1024 * 1024)).toFixed(2);
    const isGeminiReady = !!resource.metadata?.geminiUri;
    
    // Calculate Gemini URI expiration (44h margin from 48h TTL)
    const GEMINI_TTL_HOURS = 44;
    const geminiSyncedAt = resource.metadata?.geminiSyncedAt 
        ? new Date(resource.metadata.geminiSyncedAt) 
        : null;
    const isGeminiExpired = geminiSyncedAt 
        ? (Date.now() - geminiSyncedAt.getTime()) > (GEMINI_TTL_HOURS * 60 * 60 * 1000)
        : false;

    const getStatusBadge = () => {
        switch (indexStatus) {
            case 'checking':
                return (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Verificando
                    </span>
                );
            case 'indexed':
                return (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Indexado
                    </span>
                );
            case 'not-indexed':
                return (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Sin indexar
                    </span>
                );
            default:
                return null;
        }
    };

    // Get AI Ready badge with expiration state
    const getAIReadyBadge = () => {
        if (!isGeminiReady) return null;
        
        if (isGeminiExpired) {
            return (
                <span 
                    className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1" 
                    title="Sincronización expirada - Re-sincronizar"
                >
                    <AlertCircle className="h-3 w-3" /> AI Expirado
                </span>
            );
        }
        
        return (
            <span 
                className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1" 
                title={geminiSyncedAt ? `Sincronizado: ${geminiSyncedAt.toLocaleString()}` : "Listo para IA"}
            >
                <Sparkles className="h-3 w-3" /> AI Ready
            </span>
        );
    };

    const getExtractionBadge = () => {
        switch (resource.textExtractionStatus) {
            case 'pending':
                return (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Loader2 className="h-3 w-3" /> Esperando
                    </span>
                );
            case 'processing':
                return (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Extrayendo texto...
                    </span>
                );
            case 'failed':
                return (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Error extracción
                    </span>
                );
            case 'ready':
            default:
                return null; // Don't show anything when ready
        }
    };

    const isProcessing = resource.textExtractionStatus === 'processing' || resource.textExtractionStatus === 'pending';

    return (
        <Card className={cn(
            "group relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/20",
            isProcessing && "animate-pulse border-blue-300 shadow-blue-100 shadow-lg"
        )}>
            <CardContent className="p-4">
                {/* Icon and Type Badge */}
                <div className="flex items-start justify-between mb-3">
                    <div className={cn('p-3 rounded-xl', color)}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full', color)}>
                        {label}
                    </span>
                </div>

                {/* Title and Author */}
                <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {resource.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                    {resource.author}
                </p>

                {/* Metadata Row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {fileSizeMB} MB
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded" title={resource.pageCount || resource.metadata?.pageCount ? "Páginas reales (Gemini)" : "Páginas estimadas (aprox.)"}>
                        {resource.pageCount || resource.metadata?.pageCount 
                            ? `${resource.pageCount || resource.metadata?.pageCount} págs.` 
                            : `~${Math.ceil(resource.sizeBytes / 2000)} p. (est.)`
                        }
                    </span>
                    {getExtractionBadge()}
                    {resource.textExtractionStatus === 'ready' && getStatusBadge()}
                    {getAIReadyBadge()}
                    {/* 🎯 Core Library Badge */}
                    {resource.isCore && (
                        <span 
                            className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 font-medium shadow-sm"
                            title={`Biblioteca Core: ${resource.coreContext || 'generic'}`}
                        >
                            <Database className="h-3 w-3" /> Core
                        </span>
                    )}
                </div>

                {/* Phase Preference Badges */}
                {resource.preferredForPhases && resource.preferredForPhases.length > 0 && (
                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                        {resource.preferredForPhases.map(phase => (
                            <Badge key={phase} variant="outline" className="text-xs py-0 h-5 gap-1">
                                {phase === WorkflowPhase.EXEGESIS && (
                                    <><BookOpen className="h-3 w-3 text-blue-500" />Exégesis</>
                                )}
                                {phase === WorkflowPhase.HOMILETICS && (
                                    <><Mic2 className="h-3 w-3 text-purple-500" />Homilética</>
                                )}
                                {phase === WorkflowPhase.DRAFTING && (
                                    <><PenTool className="h-3 w-3 text-green-500" />Redacción</>
                                )}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1 pt-2 border-t">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={onPreview}
                        title="Ver documento"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={onEdit}
                        title="Editar"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    {/* Sync Button */}
                    {onSync && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                                "h-8 w-8 p-0",
                                isGeminiReady ? "text-green-600 hover:text-green-700" : "text-purple-600 hover:text-purple-700"
                            )}
                            onClick={onSync}
                            disabled={isSyncing}
                            title={isGeminiReady ? "Re-sincronizar con IA (Actualizar)" : "Sincronizar con IA"}
                        >
                            {isSyncing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isGeminiReady ? (
                                <RefreshCw className="h-4 w-4" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                        </Button>
                    )}

                    {onSetPhases && indexStatus === 'indexed' && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-primary hover:text-primary"
                            onClick={onSetPhases}
                            title="Configurar fases"
                        >
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    )}
                    
                    {/* 🎯 Core Library Toggle (Admin Only) */}
                    {isAdmin && onToggleCore && resource.textExtractionStatus === 'ready' && isGeminiReady && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                                "h-8 w-8 p-0",
                                resource.isCore 
                                    ? "text-amber-600 hover:text-amber-700 bg-amber-50" 
                                    : "text-gray-400 hover:text-amber-600"
                            )}
                            onClick={() => {
                                if (resource.isCore) {
                                    onToggleCore(false);
                                } else {
                                    // Default to 'generic' - admin can change later in edit dialog
                                    onToggleCore(true, 'generic');
                                }
                            }}
                            title={resource.isCore ? "Quitar de Biblioteca Core" : "Agregar a Biblioteca Core"}
                        >
                            <Database className="h-4 w-4" />
                        </Button>
                    )}
                    {onReindex && indexStatus === 'indexed' && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                            onClick={onReindex}
                            disabled={isIndexing}
                            title="Re-indexar documento"
                        >
                            {isIndexing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                    {indexStatus === 'not-indexed' && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                            onClick={onIndex}
                            disabled={isIndexing}
                            title="Indexar (Legacy)"
                        >
                            {isIndexing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive ml-auto"
                        onClick={onDelete}
                        title="Eliminar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

