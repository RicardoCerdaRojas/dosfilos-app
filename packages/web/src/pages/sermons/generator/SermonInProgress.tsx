import { SermonEntity } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, Play, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SermonsInProgressProps {
    sermons: SermonEntity[];
    onContinue: (sermon: SermonEntity) => void;
    onDiscard: (sermon: SermonEntity) => void;
}

export function SermonsInProgress({ sermons, onContinue, onDiscard }: SermonsInProgressProps) {
    if (sermons.length === 0) return null;

    const getPhaseLabel = (step: number) => {
        switch (step) {
            case 1: return 'Exégesis';
            case 2: return 'Homilética';
            case 3: return 'Redacción';
            default: return 'Desconocido';
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="h-6 w-6 text-primary" />
                    Sermones en Progreso
                </h2>
                <p className="text-muted-foreground">
                    Tienes {sermons.length} {sermons.length === 1 ? 'sermón' : 'sermones'} sin terminar
                </p>
            </div>

            <div className="grid gap-4">
                {sermons.map((sermon) => {
                    const wizardProgress = sermon.wizardProgress;
                    if (!wizardProgress) return null;

                    return (
                        <Card key={sermon.id} className="p-4 border-2 border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors">
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            {wizardProgress.passage}
                                        </h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                            <span>Fase: <strong>{getPhaseLabel(wizardProgress.currentStep)}</strong></span>
                                            <span>
                                                {formatDistanceToNow(wizardProgress.lastSaved, { 
                                                    addSuffix: true,
                                                    locale: es 
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button onClick={() => onContinue(sermon)} className="flex-1" size="sm">
                                        <Play className="mr-2 h-3 w-3" />
                                        Continuar
                                    </Button>
                                    <Button onClick={() => onDiscard(sermon)} variant="outline" size="sm">
                                        <Trash2 className="mr-2 h-3 w-3" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
