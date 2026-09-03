import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, SearchX } from 'lucide-react';
import {
    isCitableSourceType,
    printedPageFor,
    sheetForPrintedPage,
} from '@dosfilos/domain';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/i18n';
import { useDocumentPageIndex, useDocumentPdfUrl } from '@/hooks/exegesis/useDocumentPageIndex';
import { useExegesisPaper } from '@/hooks/exegesis/useExegesisPaper';
import { PdfPageViewer } from '@/components/exegesis/setup/page-picker/PdfPageViewer';

/**
 * La página del libro detrás de una cita, con la frase señalada.
 *
 * Existe porque comprobar una cita costaba cinco pasos —ir a la
 * biblioteca, buscar el libro, abrirlo, buscar la página, buscar la
 * frase— y nadie los da por costumbre. Por eso una atribución invertida a
 * un diccionario teológico sobrevivió meses en un paper: era verificable
 * en teoría y nadie la verificaba.
 *
 * La conversión de página importa más de lo que parece. Una cita habla en
 * páginas IMPRESAS («Adamson, 60») y el visor navega por HOJA FÍSICA del
 * archivo; en un comentario medido, las dos se llevan dos páginas de
 * diferencia. Cuando no hay desfase detectado el modal lo dice y trata el
 * número como hoja, en vez de convertir a ciegas: una herramienta de
 * verificación que manda a la página equivocada es peor que no tenerla.
 */
export interface CitationTarget {
    /** Clave de cita tal como aparece en el análisis, p. ej. "Adamson". */
    sourceKey: string;
    /** Página impresa que declara la cita. */
    page: number;
    /** Frase textual registrada, cuando el análisis guardó una. */
    verbatimQuote?: string | null;
}

export interface CitationSourceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paperId: string;
    citation: CitationTarget | null;
}

export function CitationSourceModal({
    open,
    onOpenChange,
    paperId,
    citation,
}: CitationSourceModalProps) {
    const { t } = useTranslation('exegesis');
    const [quoteFound, setQuoteFound] = useState<boolean | null>(null);
    // Ya está en caché: la página del trabajo la pidió al montarse, así
    // que resolverla acá no agrega lecturas y evita arrastrar el paper
    // por props hasta cada tarjeta.
    const { paper } = useExegesisPaper(paperId);

    const source = useMemo(() => {
        if (!citation || !paper) return null;
        return paper.sources.find(s =>
            isCitableSourceType(s.sourceType)
            && (s.citationKey ?? s.displayLabel) === citation.sourceKey) ?? null;
    }, [paper, citation]);

    const resourceId = source?.sourceLibraryResourceId ?? source?.corpusId ?? null;
    const index = useDocumentPageIndex(open ? resourceId : null);
    const pdf = useDocumentPdfUrl(open ? resourceId : null);

    const offset = index.data?.printedPageOffset ?? null;
    // Sin desfase medido el número de la cita se toma como hoja. Es una
    // suposición, y por eso el encabezado la declara en vez de callarla.
    const sheet = citation
        ? (sheetForPrintedPage(citation.page, offset) ?? citation.page)
        : 1;
    const printed = printedPageFor(sheet, offset);

    // Cada cita nueva vuelve a empezar: sin esto el modal heredaría el
    // veredicto de la anterior y diría «no la encontré» sobre una frase
    // que todavía no buscó.
    useEffect(() => { setQuoteFound(null); }, [citation?.sourceKey, citation?.page, citation?.verbatimQuote]);

    const hasQuote = !!citation?.verbatimQuote?.trim();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-none w-[95vw] h-[92vh] p-0 flex flex-col gap-0">
                <DialogHeader className="px-6 py-4 border-b border-border space-y-1">
                    <DialogTitle className="inline-flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        {source?.displayLabel ?? citation?.sourceKey ?? ''}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {offset !== null && printed !== null
                            ? t('citationViewer.pageWithSheet', { printed, sheet })
                            : t('citationViewer.sheetOnly', { sheet })}
                    </DialogDescription>
                    <StatusLine
                        hasSource={!!source}
                        hasQuote={hasQuote}
                        quoteFound={quoteFound}
                        quote={citation?.verbatimQuote ?? ''}
                    />
                </DialogHeader>

                <div className="flex-1 min-h-0 bg-muted/30">
                    {!source ? (
                        <Centered icon={<SearchX className="h-5 w-5 text-warning" />}>
                            {t('citationViewer.sourceNotConfigured', { key: citation?.sourceKey ?? '' })}
                        </Centered>
                    ) : index.isLoading || pdf.isLoading ? (
                        <Centered icon={<Loader2 className="h-4 w-4 animate-spin" />}>
                            {t('citationViewer.loading')}
                        </Centered>
                    ) : (
                        <PdfPageViewer
                            url={pdf.data?.url ?? null}
                            sheet={sheet}
                            selected={false}
                            highlightQuote={citation?.verbatimQuote ?? null}
                            onHighlightResolved={setQuoteFound}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Qué esperar de la página que se está abriendo.
 *
 * Los tres casos son distintos y confundirlos deja al lector buscando una
 * marca que no existe: la cita se resaltó, la cita existe pero no se pudo
 * localizar —OCR ilegible, corriente en documentos escaneados—, o el
 * análisis nunca guardó una frase y sólo hay página.
 */
function StatusLine({
    hasSource,
    hasQuote,
    quoteFound,
    quote,
}: {
    hasSource: boolean;
    hasQuote: boolean;
    quoteFound: boolean | null;
    quote: string;
}) {
    const { t } = useTranslation('exegesis');
    if (!hasSource) return null;

    if (!hasQuote) {
        return (
            <p className="text-[11px] text-muted-foreground pt-0.5">
                {t('citationViewer.noQuoteRecorded')}
            </p>
        );
    }
    if (quoteFound === false) {
        return (
            <p className="text-[11px] text-warning pt-0.5">
                {t('citationViewer.quoteNotFound')}
            </p>
        );
    }
    return (
        <p className="text-[11px] text-muted-foreground pt-0.5 line-clamp-2 italic">
            «{quote}»
        </p>
    );
}

function Centered({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            {icon}
            <p className="text-sm text-muted-foreground max-w-md">{children}</p>
        </div>
    );
}
