import { useState } from 'react';
import { SermonEntity } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Trash2, ArrowRight, Search } from 'lucide-react';
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

    if (sermons.length === 0) return null;

    const getPhaseInfo = (step: number) => {
        switch (step) {
            case 1: return { label: 'Exégesis', progress: 33 };
            case 2: return { label: 'Homilética', progress: 66 };
            case 3: return { label: 'Redacción', progress: 90 };
            default: return { label: 'Desconocido', progress: 0 };
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
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSermons.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No se encontraron sermones que coincidan con tu búsqueda.
                    </div>
                ) : (
                    filteredSermons.map((sermon) => {
                        const wizardProgress = sermon.wizardProgress;
                        if (!wizardProgress) return null;
                        const { label, progress } = getPhaseInfo(wizardProgress.currentStep);

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
                                        <Badge variant="secondary" className="capitalize bg-secondary/50">
                                            {label}
                                        </Badge>
                                    </div>

                                    {/* Title (Passage) */}
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold font-serif leading-tight group-hover:text-primary transition-colors">
                                            {wizardProgress.passage}
                                        </h3>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1.5 pt-2">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Progreso</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-1.5" />
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
