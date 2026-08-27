import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { aggregateRagSourcesFlat } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SermonPreview } from '@/components/sermons/SermonPreview';
import { SermonBibliographySection } from '@/components/sermons/SermonBibliographySection';
import { useTranslation } from '@/i18n';

export interface DraftPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: any;
    exegesis: any;
    homiletics: any;
    /** El sermón renderizado tal como se guardaría. */
    fullContent: string;
    authorName: string | null | undefined;
}

/**
 * El sermón como lo verá impreso, antes de publicar.
 *
 * LA BIBLIOGRAFÍA SE AGREGA DE LAS TRES ETAPAS —exégesis, homilética y
 * borrador—, no sólo del borrador: una fuente consultada al estudiar y citada
 * al redactar entró por el primer camino, y sin agregarlas el sermón aparecía
 * apoyado en menos de lo que realmente usó.
 */
export function DraftPreviewDialog(props: DraftPreviewDialogProps) {
    const { t } = useTranslation('generator');

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="!max-w-[95vw] !w-full sm:!w-[1200px] lg:!w-[1600px] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <VisuallyHidden>
                    <DialogTitle>{t('drafting.previewDialogTitle')}</DialogTitle>
                </VisuallyHidden>
                <div className="flex-1 overflow-y-auto">
                    {props.draft && props.exegesis && (
                        <>
                            <SermonPreview
                                title={props.draft.title}
                                content={props.fullContent}
                                authorName={props.authorName || t('drafting.authorDefault')}
                                date={new Date()}
                                bibleReferences={[props.exegesis.passage]}
                                tags={props.exegesis.keyWords.map((kw: any) => kw.original)}
                                status="draft"
                                citationManifest={props.draft.citationManifest}
                            />
                            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                                <SermonBibliographySection
                                    bibliography={aggregateRagSourcesFlat({
                                        exegesisSources: props.exegesis?.ragSources,
                                        homileticsSources: props.homiletics?.ragSources,
                                        draftSources: props.draft.ragSources,
                                    })}
                                    manifest={props.draft.citationManifest}
                                />
                            </div>
                        </>
                    )}
                </div>
                <div className="p-4 border-t bg-background flex justify-end">
                    <Button onClick={() => props.onOpenChange(false)}>{t('drafting.closePreview')}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
