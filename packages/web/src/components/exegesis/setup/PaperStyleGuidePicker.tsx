import { useState } from 'react';
import { BookMarked, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { resolveStyleGuide, type ExegeticalPaper, type UserStyleGuide } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';

/**
 * Elegir la guía de estilo de ESTE trabajo, y ver de qué copia salen
 * sus reglas.
 *
 * Adjuntar copia la guía al trabajo. Editarla después no lo alcanza —que
 * es el punto: un paper entregado no puede cambiar de reglas porque
 * alguien corrigió la plantilla tres meses más tarde—. Cuando la guía
 * viva cambia, acá aparece un aviso y un botón: la actualización es
 * deliberada, nunca automática.
 */
interface Props {
    paper: ExegeticalPaper;
    guides: UserStyleGuide[];
}

const SIN_GUIA = '__ninguna__';

export function PaperStyleGuidePicker({ paper, guides }: Props) {
    const { t } = useTranslation('exegesis');
    const { setPaperStyleGuide } = useExegesisPapers();
    const [guardando, setGuardando] = useState(false);

    const viva = guides.find(g => g.id === paper.styleGuideId) ?? null;
    const resuelta = resolveStyleGuide(
        paper.styleGuideSnapshot,
        viva ? { displayName: viva.displayName, manifest: viva.manifest } : null,
    );

    const aplicar = async (guideId: string | null) => {
        setGuardando(true);
        try {
            await setPaperStyleGuide.mutateAsync({ paperId: paper.id, styleGuideId: guideId });
            toast.success(t('paperSetup.subSteps.manifest.picker.saved'));
        } catch (err) {
            console.error('[exegesis] no se pudo adjuntar la guía:', err);
            toast.error(t('paperSetup.subSteps.manifest.picker.failed'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2.5">
            <div className="flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs font-medium text-foreground">
                    {t('paperSetup.subSteps.manifest.picker.label')}
                </p>
                {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            <Select
                value={paper.styleGuideId ?? SIN_GUIA}
                onValueChange={v => aplicar(v === SIN_GUIA ? null : v)}
                disabled={guardando}
            >
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={SIN_GUIA}>{t('paperSetup.subSteps.manifest.picker.none')}</SelectItem>
                    {guides.map(g => (
                        <SelectItem key={g.id} value={g.id}>
                            {g.displayName}{g.version ? ` · ${g.version}` : ''}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {resuelta.origin === 'snapshot' && paper.styleGuideSnapshot && (
                <p className="text-[11px] text-muted-foreground">
                    {t('paperSetup.subSteps.manifest.picker.usingCopy', {
                        date: paper.styleGuideSnapshot.capturedAt.toLocaleDateString(),
                    })}
                </p>
            )}

            {resuelta.liveGuideDiffers && (
                <div className="rounded-md border border-warning/30 bg-warning-subtle/40 px-2.5 py-2 space-y-1.5">
                    <p className="text-[11px] text-warning-subtle-foreground">
                        {t('paperSetup.subSteps.manifest.picker.guideChanged')}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1.5"
                        disabled={guardando}
                        onClick={() => aplicar(paper.styleGuideId)}
                    >
                        <RefreshCw className="h-3 w-3" />
                        {t('paperSetup.subSteps.manifest.picker.refresh')}
                    </Button>
                </div>
            )}
        </div>
    );
}
