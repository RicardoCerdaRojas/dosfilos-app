import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2, NotebookPen, Sparkles, FileText } from 'lucide-react';
import { sermonRepurposeService } from '@dosfilos/application';
import type { Extraction, SermonRepurposeKind } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';

interface SermonRepurposeSectionProps {
    sermonId: string;
    sermonTitle: string;
    sermonStatus: 'draft' | 'published' | 'archived' | 'working';
}

interface KindMeta {
    kind: SermonRepurposeKind;
    Icon: typeof BookOpen;
    title: string;
    description: string;
}

const KIND_META: KindMeta[] = [
    {
        kind: 'devotional',
        Icon: BookOpen,
        title: 'Devocional diario',
        description: 'Cinco entradas (Lunes a Viernes) ancladas en el sermón. Para compartir con tu congregación durante la semana.',
    },
    {
        kind: 'study-guide',
        Icon: NotebookPen,
        title: 'Guía de estudio',
        description: 'Plan para grupo pequeño (60-75 min): preguntas de observación, interpretación y aplicación.',
    },
];

/**
 * Lists existing derivatives for the sermon (devotionals, study guides)
 * and lets the user generate new ones. Renders below the sermon body
 * in the detail page. Derivatives persist as `Extraction` documents
 * with `externalRef = { collection: 'sermons', id: sermonId }` so they
 * surface in "Mis Recursos" alongside Faculty-generated artifacts.
 */
export function SermonRepurposeSection({ sermonId, sermonTitle, sermonStatus }: SermonRepurposeSectionProps) {
    const { user } = useFirebase();
    const queryClient = useQueryClient();
    const [activeKind, setActiveKind] = useState<SermonRepurposeKind | null>(null);
    const [viewerExtraction, setViewerExtraction] = useState<Extraction | null>(null);

    const derivativesQuery = useQuery({
        queryKey: ['sermon-derivatives', sermonId, user?.uid],
        queryFn: async () => {
            if (!user) return [] as Extraction[];
            const all = await sermonRepurposeService.listDerivatives.execute({
                actorUserId: user.uid,
                sermonId,
            });
            // Filter out the sermon's own canonical mirror — the panel
            // is for derivatives, not the source itself.
            return all.filter((e) => e.type !== 'SERMON');
        },
        enabled: !!user && !!sermonId,
    });

    const generateMutation = useMutation({
        mutationFn: async (kind: SermonRepurposeKind) => {
            if (!user) throw new Error('Sesión expirada — vuelve a iniciar sesión');
            setActiveKind(kind);
            return sermonRepurposeService.repurpose.execute({
                actorUserId: user.uid,
                sermonId,
                kind,
            });
        },
        onSuccess: (extraction, kind) => {
            const label = kind === 'devotional' ? 'Devocional generado' : 'Guía generada';
            toast.success(`${label} y guardado en "Mis Recursos"`);
            queryClient.invalidateQueries({ queryKey: ['sermon-derivatives', sermonId] });
            setViewerExtraction(extraction);
        },
        onError: (error: any) => {
            toast.error(error?.message || 'No pudimos generar el contenido. Intenta de nuevo.');
        },
        onSettled: () => {
            setActiveKind(null);
        },
    });

    if (sermonStatus !== 'published') {
        return null;
    }

    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Reaplicar como
                </h2>
                <p className="text-sm text-muted-foreground">
                    Convierte este sermón en otros recursos para tu congregación durante la semana.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {KIND_META.map(({ kind, Icon, title, description }) => {
                    const generating = generateMutation.isPending && activeKind === kind;
                    return (
                        <Card key={kind} className="p-4 flex flex-col gap-3">
                            <div className="flex items-start gap-2">
                                <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm">{title}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="self-end"
                                onClick={() => generateMutation.mutate(kind)}
                                disabled={generateMutation.isPending}
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                        Generando…
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-3 w-3 mr-2" />
                                        Generar
                                    </>
                                )}
                            </Button>
                        </Card>
                    );
                })}
            </div>

            <DerivativesList
                derivatives={derivativesQuery.data ?? []}
                loading={derivativesQuery.isLoading}
                onView={(e) => setViewerExtraction(e)}
            />

            <Dialog open={!!viewerExtraction} onOpenChange={(open) => !open && setViewerExtraction(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    {viewerExtraction && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-lg">{viewerExtraction.title}</DialogTitle>
                                <DialogDescription>
                                    Derivado de "{sermonTitle}". También disponible en "Mis Recursos".
                                </DialogDescription>
                            </DialogHeader>
                            <div className="prose prose-sm max-w-none">
                                <MarkdownRenderer content={viewerExtraction.markdown} enableBibleLinks={false} />
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}

interface DerivativesListProps {
    derivatives: Extraction[];
    loading: boolean;
    onView: (e: Extraction) => void;
}

function DerivativesList({ derivatives, loading, onView }: DerivativesListProps) {
    if (loading) {
        return (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando recursos derivados…
            </div>
        );
    }
    if (derivatives.length === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                Aún no has generado recursos derivados desde este sermón.
            </p>
        );
    }
    return (
        <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recursos generados ({derivatives.length})
            </h3>
            <ul className="space-y-1.5">
                {derivatives.map((e) => (
                    <li key={e.id}>
                        <button
                            type="button"
                            onClick={() => onView(e)}
                            className="w-full text-left rounded-md border border-border hover:bg-muted/40 px-3 py-2 flex items-start gap-2 transition-colors"
                        >
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{e.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatRelativeDate(e.createdAt)} · {typeLabel(e.type)}
                                </p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                                Ver
                            </Badge>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function typeLabel(type: Extraction['type']): string {
    switch (type) {
        case 'DEVOTIONAL':
            return 'Devocional';
        case 'BIBLE_STUDY':
            return 'Guía de estudio';
        default:
            return type.toLowerCase().replace(/_/g, ' ');
    }
}

function formatRelativeDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days < 1) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}
