import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Sprout, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PastoralSeedSummary } from '@/hooks/usePastoralSeedsByUser';

interface Props {
    /** Sermon doc id (canonical link for "Continuar" deep-link). */
    sermonId: string;
    title: string;
    passage: string;
    seed: PastoralSeedSummary;
    onDelete?: () => void;
}

/**
 * Card variant for the "Estudios en curso" tab on the sermons page.
 * Surfaces the pastor's own labor (manifesto P1) by showing seed
 * progress visibly: passage, steps completed, last update, plus a
 * single CTA back into the wizard.
 *
 * Distinct from `SermonCard` (publicados): no preview text, no tags,
 * no "Publicar" affordance — those belong to finished sermons. The
 * pastor here is mid-flight; the card is a runway, not a trophy.
 */
export function SermonInProgressCard({ sermonId, title, passage, seed, onDelete }: Props) {
    const navigate = useNavigate();
    const pct = Math.round((seed.completedSteps / seed.totalSteps) * 100);

    return (
        <Card className="p-4 space-y-3 border-emerald-500/30 hover:border-emerald-500/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 mt-0.5 shrink-0">
                        <Sprout className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-serif font-semibold text-base truncate" title={title}>
                            {title}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <BookOpen className="h-3 w-3" />
                            {passage}
                        </p>
                    </div>
                </div>
                <span
                    className={cn(
                        'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                        seed.completed
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                    )}
                >
                    {seed.completed ? 'Listo para borrador' : 'En estudio'}
                </span>
            </div>

            <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>
                        Estudio personal · {seed.completedSteps} / {seed.totalSteps} pasos
                    </span>
                    <span className="font-mono tabular-nums">{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn(
                            'h-full transition-all',
                            seed.completed ? 'bg-emerald-600' : 'bg-amber-500',
                        )}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-muted-foreground">
                    Actualizado {seed.updatedAt.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onDelete}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Eliminar"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={() => navigate(`/dashboard/sermons/generate?id=${sermonId}`)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        Continuar
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
