import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import {
    countChars,
    countSheets,
    normalizeSheetRanges,
    printedPageFor,
    type SheetRange,
} from '@dosfilos/domain';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentPageIndex, useDocumentPdfUrl } from '@/hooks/exegesis/useDocumentPageIndex';
import { PageRail, sheetsInRanges } from './PageRail';
import { PdfPageViewer } from './PdfPageViewer';
import { SelectionCart } from './SelectionCart';

/**
 * Elegir qué parte de un documento entra al trabajo.
 *
 * Tres paneles: el índice para llegar, el PDF para decidir, el carrito para
 * confirmar. La propuesta del sistema llega pre-cargada y el usuario la
 * corrige — arrancar vacío convertiría un click en una sesión de hojear 425
 * páginas.
 */

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resourceId: string;
    resourceTitle: string;
    /** Tramos que propone el sistema para el pasaje del trabajo. */
    proposedRanges: ReadonlyArray<SheetRange>;
    /** Cómo se obtuvo la propuesta, para decir cuánto confiar en ella. */
    proposalKind: 'structural' | 'semantic' | 'none';
    /** Selección previa, cuando se reabre una fuente ya armada. */
    initialRanges?: ReadonlyArray<SheetRange>;
    /** Caracteres que ya ocupan las otras fuentes del trabajo. */
    otherSourcesChars: number;
    onConfirm: (ranges: ReadonlyArray<SheetRange>) => Promise<void>;
}

export function PagePickerDialog({
    open,
    onOpenChange,
    resourceId,
    resourceTitle,
    proposedRanges,
    proposalKind,
    initialRanges,
    otherSourcesChars,
    onConfirm,
}: Props) {
    const { t } = useTranslation('exegesis');
    const index = useDocumentPageIndex(open ? resourceId : null);
    const pdf = useDocumentPdfUrl(open ? resourceId : null);

    const [ranges, setRanges] = useState<SheetRange[]>(() =>
        normalizeSheetRanges(initialRanges ?? proposedRanges),
    );
    const [currentSheet, setCurrentSheet] = useState<number>(
        () => proposedRanges[0]?.start ?? initialRanges?.[0]?.start ?? 1,
    );
    const [isSaving, setIsSaving] = useState(false);

    const pages = index.data?.pages ?? [];
    const offset = index.data?.printedPageOffset ?? null;
    const selectedSheets = useMemo(() => sheetsInRanges(ranges), [ranges]);
    const proposedSheets = useMemo(() => sheetsInRanges(proposedRanges), [proposedRanges]);
    const selectedChars = useMemo(() => countChars(pages, ranges), [pages, ranges]);
    const sheetCount = useMemo(() => countSheets(ranges), [ranges]);

    const toggleSheet = useCallback((sheet: number) => {
        setRanges(prev => {
            const sheets = sheetsInRanges(prev);
            if (sheets.has(sheet)) sheets.delete(sheet);
            else sheets.add(sheet);
            return normalizeSheetRanges(
                [...sheets].sort((a, b) => a - b).map(s => ({ start: s, end: s })),
            );
        });
    }, []);

    const removeRange = useCallback((range: SheetRange) => {
        setRanges(prev => {
            const sheets = sheetsInRanges(prev);
            for (let s = range.start; s <= range.end; s++) sheets.delete(s);
            return normalizeSheetRanges(
                [...sheets].sort((a, b) => a - b).map(s => ({ start: s, end: s })),
            );
        });
    }, []);

    const acceptProposal = useCallback(() => {
        setRanges(prev => normalizeSheetRanges([...prev, ...proposedRanges]));
        if (proposedRanges[0]) setCurrentSheet(proposedRanges[0].start);
    }, [proposedRanges]);

    // Navegar por hojas que EXISTEN en el índice: un documento puede saltear
    // números cuando una página no produjo texto, y avanzar de a uno dejaría al
    // visor sobre una hoja que el índice no conoce.
    const step = useCallback((delta: number) => {
        setCurrentSheet(prev => {
            const i = pages.findIndex(p => p.sheet === prev);
            if (i < 0) return pages[0]?.sheet ?? prev;
            const next = pages[Math.min(Math.max(i + delta, 0), pages.length - 1)];
            return next?.sheet ?? prev;
        });
    }, [pages]);

    const confirm = async () => {
        setIsSaving(true);
        try {
            await onConfirm(ranges);
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    const printedCurrent = printedPageFor(currentSheet, offset);
    const isCurrentSelected = selectedSheets.has(currentSheet);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-5 py-3 border-b border-border">
                    <DialogTitle className="text-base">{resourceTitle}</DialogTitle>
                    <DialogDescription>
                        {t('paperSetup.subSteps.corpus.picker.subtitle')}
                    </DialogDescription>
                </DialogHeader>

                {proposedRanges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-info-subtle px-5 py-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-info-subtle-foreground shrink-0" aria-hidden="true" />
                        <p className="flex-1 min-w-[220px] text-xs text-info-subtle-foreground">
                            {proposalKind === 'structural'
                                ? t('paperSetup.subSteps.corpus.picker.proposal.structural')
                                : t('paperSetup.subSteps.corpus.picker.proposal.semantic')}
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={acceptProposal}>
                            {t('paperSetup.subSteps.corpus.picker.proposal.accept')}
                        </Button>
                    </div>
                )}

                {index.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span className="text-sm">{t('paperSetup.subSteps.corpus.picker.loadingIndex')}</span>
                    </div>
                ) : index.isError ? (
                    <p className="px-5 py-16 text-center text-sm text-muted-foreground">
                        {t('paperSetup.subSteps.corpus.picker.indexFailed')}
                    </p>
                ) : (
                    <div className="grid min-h-0 h-[560px] grid-cols-1 lg:grid-cols-[236px_minmax(0,1fr)_290px]">
                        <div className="hidden lg:flex min-h-0">
                            <PageRail
                                pages={pages}
                                printedPageOffset={offset}
                                selected={selectedSheets}
                                proposed={proposedSheets}
                                currentSheet={currentSheet}
                                onGoToSheet={setCurrentSheet}
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
                                    <span className="ml-1 text-xs tabular-nums font-semibold text-foreground">
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
                                />
                            </div>
                        </div>

                        <div className="flex min-h-0">
                            <SelectionCart
                                ranges={ranges}
                                pages={pages}
                                printedPageOffset={offset}
                                otherSourcesChars={otherSourcesChars}
                                selectedChars={selectedChars}
                                sheetCount={sheetCount}
                                onRemoveRange={removeRange}
                                onConfirm={confirm}
                                isSaving={isSaving}
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
