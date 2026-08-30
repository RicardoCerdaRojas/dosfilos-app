import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import {
    countChars,
    countSheets,
    normalizeSheetRanges,
    printedPageFor,
    type PageIndexEntry,
    type SheetRange,
} from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { useDocumentPdfUrl } from '@/hooks/exegesis/useDocumentPageIndex';
import { PageRail, sheetsInRanges } from './PageRail';
import { PdfPageViewer } from './PdfPageViewer';
import { SelectionCart } from './SelectionCart';

/**
 * Los tres paneles del selector: índice, hoja y carrito.
 *
 * La propuesta del sistema llega DESPUÉS del primer render —hay que leer el
 * índice del libro y resolver la sección del pasaje—, así que el carrito y la
 * hoja visible no se pueden fijar en el estado inicial. La primera versión lo
 * hacía y el resultado era el peor posible: el aviso decía «encontramos la
 * sección» mientras el carrito mostraba «nada elegido» y el visor abría en la
 * portada.
 *
 * Se adopta una sola vez, cuando llega, y solo si el usuario no tocó nada.
 */

interface Props {
    pages: ReadonlyArray<PageIndexEntry>;
    printedPageOffset: number | null;
    resourceId: string;
    proposedRanges: ReadonlyArray<SheetRange>;
    proposalKind: 'structural' | 'semantic' | 'none';
    /** La propuesta todavía se está calculando. */
    proposalPending: boolean;
    /** Selección guardada, cuando la fuente ya pasó por el selector. */
    initialRanges: ReadonlyArray<SheetRange>;
    otherSourcesChars: number;
    onConfirm: (ranges: ReadonlyArray<SheetRange>) => Promise<void>;
    isSaving: boolean;
}

export function SourcePagesWorkspace({
    pages,
    printedPageOffset,
    resourceId,
    proposedRanges,
    proposalKind,
    proposalPending,
    initialRanges,
    otherSourcesChars,
    onConfirm,
    isSaving,
}: Props) {
    const { t } = useTranslation('exegesis');
    const pdf = useDocumentPdfUrl(resourceId);

    const [ranges, setRanges] = useState<SheetRange[]>(() => normalizeSheetRanges(initialRanges));
    const [currentSheet, setCurrentSheet] = useState<number>(
        () => initialRanges[0]?.start ?? pages[0]?.sheet ?? 1,
    );
    // El usuario mandó: una vez que tocó algo, la propuesta que llegue tarde no
    // le pisa la selección ni le mueve la hoja de abajo del cursor.
    const touched = useRef(false);
    const adopted = useRef(false);

    useEffect(() => {
        if (adopted.current || touched.current) return;
        if (proposalPending || proposedRanges.length === 0) return;
        adopted.current = true;
        // Solo se adopta si la fuente no traía una selección guardada: esa es
        // del usuario y pesa más que cualquier sugerencia.
        if (initialRanges.length === 0) {
            setRanges(normalizeSheetRanges(proposedRanges));
        }
        setCurrentSheet(proposedRanges[0]!.start);
    }, [proposalPending, proposedRanges, initialRanges]);

    // Con índice cargado y sin propuesta ni selección previa, se arranca en la
    // primera hoja que exista, no en la 1 — un documento puede empezar en otra.
    useEffect(() => {
        if (touched.current || adopted.current) return;
        if (pages.length === 0) return;
        setCurrentSheet(prev => (pages.some(p => p.sheet === prev) ? prev : pages[0]!.sheet));
    }, [pages]);

    const selectedSheets = useMemo(() => sheetsInRanges(ranges), [ranges]);
    const proposedSheets = useMemo(() => sheetsInRanges(proposedRanges), [proposedRanges]);
    const selectedChars = useMemo(() => countChars(pages, ranges), [pages, ranges]);
    const sheetCount = useMemo(() => countSheets(ranges), [ranges]);

    const rebuild = (mutate: (sheets: Set<number>) => void) => {
        touched.current = true;
        setRanges(prev => {
            const sheets = sheetsInRanges(prev);
            mutate(sheets);
            return normalizeSheetRanges(
                [...sheets].sort((a, b) => a - b).map(s => ({ start: s, end: s })),
            );
        });
    };

    const toggleSheet = useCallback((sheet: number) => {
        rebuild(sheets => { if (sheets.has(sheet)) sheets.delete(sheet); else sheets.add(sheet); });
    }, []);

    const removeRange = useCallback((range: SheetRange) => {
        rebuild(sheets => { for (let s = range.start; s <= range.end; s++) sheets.delete(s); });
    }, []);

    const acceptProposal = useCallback(() => {
        touched.current = true;
        setRanges(prev => normalizeSheetRanges([...prev, ...proposedRanges]));
        if (proposedRanges[0]) setCurrentSheet(proposedRanges[0].start);
    }, [proposedRanges]);

    // Navegar por hojas que EXISTEN en el índice: un documento puede saltear
    // números cuando una página no produjo texto.
    const step = useCallback((delta: number) => {
        touched.current = true;
        setCurrentSheet(prev => {
            const i = pages.findIndex(p => p.sheet === prev);
            if (i < 0) return pages[0]?.sheet ?? prev;
            return pages[Math.min(Math.max(i + delta, 0), pages.length - 1)]?.sheet ?? prev;
        });
    }, [pages]);

    const goToSheet = useCallback((sheet: number) => {
        touched.current = true;
        setCurrentSheet(sheet);
    }, []);

    const printedCurrent = printedPageFor(currentSheet, printedPageOffset);
    const isCurrentSelected = selectedSheets.has(currentSheet);

    return (
        <>
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-info-subtle px-5 py-2.5">
                {proposalPending ? (
                    <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-info-subtle-foreground shrink-0" aria-hidden="true" />
                        <p className="text-xs text-info-subtle-foreground">
                            {t('paperSetup.subSteps.corpus.picker.proposal.pending')}
                        </p>
                    </>
                ) : proposedRanges.length === 0 ? (
                    <p className="text-xs text-info-subtle-foreground">
                        {t('paperSetup.subSteps.corpus.picker.proposal.none')}
                    </p>
                ) : (
                    <>
                        <Sparkles className="h-3.5 w-3.5 text-info-subtle-foreground shrink-0" aria-hidden="true" />
                        <p className="flex-1 min-w-[220px] text-xs text-info-subtle-foreground">
                            {proposalKind === 'structural'
                                ? t('paperSetup.subSteps.corpus.picker.proposal.structural')
                                : t('paperSetup.subSteps.corpus.picker.proposal.semantic')}
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={acceptProposal}>
                            {t('paperSetup.subSteps.corpus.picker.proposal.accept')}
                        </Button>
                    </>
                )}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_310px]">
                <div className="hidden min-h-0 lg:flex">
                    <PageRail
                        pages={pages}
                        printedPageOffset={printedPageOffset}
                        selected={selectedSheets}
                        proposed={proposedSheets}
                        currentSheet={currentSheet}
                        onGoToSheet={goToSheet}
                        onToggleSheet={toggleSheet}
                    />
                </div>

                <div className="flex min-h-0 flex-col bg-muted/30">
                    <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
                        <div className="flex items-center gap-1.5">
                            <Button
                                type="button" variant="outline" size="icon" className="h-7 w-7"
                                onClick={() => step(-1)}
                                aria-label={t('paperSetup.subSteps.corpus.picker.viewer.previous')}
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                                type="button" variant="outline" size="icon" className="h-7 w-7"
                                onClick={() => step(1)}
                                aria-label={t('paperSetup.subSteps.corpus.picker.viewer.next')}
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <span className="ml-1 text-xs font-semibold tabular-nums text-foreground">
                                {t('paperSetup.subSteps.corpus.picker.viewer.sheet', { sheet: currentSheet })}
                            </span>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                                {printedCurrent === null
                                    ? t('paperSetup.subSteps.corpus.picker.viewer.noPrinted')
                                    : t('paperSetup.subSteps.corpus.picker.viewer.printed', { printed: printedCurrent })}
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant={isCurrentSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleSheet(currentSheet)}
                        >
                            {isCurrentSelected
                                ? t('paperSetup.subSteps.corpus.picker.viewer.removeSheet')
                                : t('paperSetup.subSteps.corpus.picker.viewer.addSheet')}
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <PdfPageViewer
                            url={pdf.data?.url ?? null}
                            sheet={currentSheet}
                            selected={isCurrentSelected}
                            width={560}
                        />
                    </div>
                </div>

                <div className="flex min-h-0">
                    <SelectionCart
                        ranges={ranges}
                        pages={pages}
                        printedPageOffset={printedPageOffset}
                        otherSourcesChars={otherSourcesChars}
                        selectedChars={selectedChars}
                        sheetCount={sheetCount}
                        onRemoveRange={removeRange}
                        onConfirm={() => onConfirm(ranges)}
                        isSaving={isSaving}
                    />
                </div>
            </div>
        </>
    );
}
