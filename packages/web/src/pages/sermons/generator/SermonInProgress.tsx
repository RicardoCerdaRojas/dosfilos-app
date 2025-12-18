import { useState } from 'react';
import { SermonEntity } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Trash2, ArrowRight, Search, LayoutGrid, List } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SermonsInProgressProps {
    sermons: SermonEntity[];
    onContinue: (sermon: SermonEntity) => void;
    onDiscard: (sermon: SermonEntity) => void;
}

export function SermonsInProgress({ sermons, onContinue, onDiscard }: SermonsInProgressProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(
        (localStorage.getItem('sermonGeneratorView') as 'grid' | 'list') || 'grid'
    );

    if (sermons.length === 0) return null;

    const getPhaseInfo = (sermon: SermonEntity) => {
        const step = sermon.wizardProgress?.currentStep || 0;
        const hasPublishedCopy = !!(sermon.wizardProgress?.publishedCopyId && sermon.wizardProgress?.lastPublishedAt);
        
        // If this draft has a published copy, show as published
        if (hasPublishedCopy) {
            return { 
                label: 'Publicado', 
                progress: 100, 
                variant: 'success' as const,
                color: 'green',
                badgeClass: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
                progressClass: 'bg-green-500'
            };
        }
        
        switch (step) {
            case 1: return { 
                label: 'Exégesis', 
                progress: 33, 
                variant: 'secondary' as const,
                color: 'blue',
                badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
                progressClass: 'bg-blue-500'
            };
            case 2: return { 
                label: 'Homilética', 
                progress: 66, 
                variant: 'secondary' as const,
                color: 'purple',
                badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
                progressClass: 'bg-purple-500'
            };
            case 3: return { 
                label: 'Redacción', 
                progress: 100, 
                variant: 'secondary' as const,
                color: 'orange',
                badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
                progressClass: 'bg-orange-500'
            };
            default: return { 
                label: 'Desconocido', 
                progress: 0, 
                variant: 'secondary' as const,
                color: 'gray',
                badgeClass: 'bg-secondary/50',
                progressClass: 'bg-secondary'
            };
        }
    };

    const filteredSermons = sermons
        .filter(sermon => {
            const passage = sermon.wizardProgress?.passage || '';
            return passage.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => {
            const dateA = new Date(a.wizardProgress?.lastSaved || 0).getTime();
            const dateB = new Date(b.wizardProgress?.lastSaved || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Clock className="h-6 w-6 text-primary" />
                        Sermones en Progreso
                    </h2>
                    <p className="text-muted-foreground">
                        Retoma tu trabajo donde lo dejaste
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por pasaje..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Más recientes</SelectItem>
                            <SelectItem value="oldest">Más antiguos</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 border rounded-md p-1">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => {
                                setViewMode('grid');
                                localStorage.setItem('sermonGeneratorView', 'grid');
                            }}
                            className="h-8 px-2"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => {
                                setViewMode('list');
                                localStorage.setItem('sermonGeneratorView', 'list');
                            }}
                            className="h-8 px-2"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-4'}>
                {filteredSermons.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No se encontraron sermones que coincidan con tu búsqueda.
                    </div>
                ) : (
                    filteredSermons.map((sermon) => {
                        const wizardProgress = sermon.wizardProgress;
                        if (!wizardProgress) return null;
                        const phaseInfo = getPhaseInfo(sermon);
                        const { label, progress, variant, badgeClass, progressClass } = phaseInfo;

                        return (
                            <Card key={sermon.id} className="group flex flex-col hover:shadow-lg transition-all duration-300 border-muted hover:border-primary/50 overflow-hidden">
                                <div className="p-6 flex-1 space-y-4">
                                    {/* Header: Date + Phase Badge */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatDistanceToNow(wizardProgress.lastSaved, { 
                                                addSuffix: true,
                                                locale: es 
                                            })}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge 
                                                variant={variant} 
                                                className={`capitalize ${badgeClass}`}
                                            >
                                                {label}
                                            </Badge>
                                            {wizardProgress.publishCount && wizardProgress.publishCount > 1 && (
                                                <Badge variant="outline" className="text-xs px-2 py-0">
                                                    {wizardProgress.publishCount} versiones
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Title (Passage) */}
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold font-serif leading-tight group-hover:text-primary transition-colors">
                                            {wizardProgress.passage}
                                        </h3>
                                        
                                        {/* Publication Info */}
                                        {wizardProgress.lastPublishedAt && (
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>Publicado {formatDistanceToNow(
                                                        wizardProgress.lastPublishedAt instanceof Date 
                                                            ? wizardProgress.lastPublishedAt 
                                                            : (wizardProgress.lastPublishedAt as any).toDate?.() || new Date(wizardProgress.lastPublishedAt as any),
                                                        { locale: es, addSuffix: true }
                                                    )}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1.5 pt-2">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Progreso</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${progressClass} transition-all duration-300`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-3">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => onDiscard(sermon)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        onClick={() => onContinue(sermon)}
                                        className="gap-2 shadow-sm"
                                    >
                                        Continuar
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
