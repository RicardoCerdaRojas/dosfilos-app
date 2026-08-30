import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { proposeSheetRanges, type ProposalKind } from '@dosfilos/infrastructure';
import { normalizeSheetRanges, type SheetRange } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/context/firebase-context';
import { useExegesisPaper } from '@/hooks/exegesis/useExegesisPaper';
import { useDocumentPageIndex } from '@/hooks/exegesis/useDocumentPageIndex';
import { useSelectSourcePages } from '@/hooks/exegesis/useSelectSourcePages';
import { SourcePagesWorkspace } from '@/components/exegesis/setup/page-picker/SourcePagesWorkspace';

/**
 * Elegir qué hojas de una fuente entran al trabajo.
 *
 * Es una página y no un diálogo por lo que la tarea es: recorrer un libro de
 * cuatrocientas páginas para decidir qué parte sirve. Eso pide el viewport
 * entero, no un recuadro centrado con ancho tope; pide botón atrás y recarga
 * sin perder el lugar; y pide una URL, porque el usuario se va a ir a consultar
 * otra cosa y va a querer volver.
 *
 * La primera versión fue un modal y se notó enseguida: tres paneles y un visor
 * de PDF no entran en un diálogo sin pelearse por cada píxel.
 */
export function ExegesisSourcePagesPage() {
    const { paperId, sourceId } = useParams<{ paperId: string; sourceId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation('exegesis');
    const { user } = useFirebase();
    const { paper, isLoading: paperLoading } = useExegesisPaper(paperId);
    const selectPages = useSelectSourcePages();

    const source = paper?.sources.find(s => s.id === sourceId) ?? null;
    const resourceId = source ? (source.sourceLibraryResourceId ?? source.corpusId) : null;

    const index = useDocumentPageIndex(resourceId);
    const [proposal, setProposal] = useState<{ ranges: SheetRange[]; kind: ProposalKind } | null>(null);

    useEffect(() => {
        if (!user || !paper || !resourceId || !index.data) return;
        let cancelled = false;
        proposeSheetRanges({
            resourceId,
            userId: user.uid,
            passage: paper.passage,
            assignmentBrief: paper.assignmentBrief,
            language: paper.displayLanguage,
            pageIndex: index.data.pages,
        }).then(result => {
            if (!cancelled) setProposal(result);
        });
        return () => { cancelled = true; };
    }, [user, paper, resourceId, index.data]);

    const otherSourcesChars = useMemo(() => {
        if (!paper || !source) return 0;
        return paper.sources
            .filter(s => s.id !== source.id)
            .reduce((sum, s) => sum + s.excerpts.reduce((n, e) => n + e.text.length, 0), 0);
    }, [paper, source]);

    const back = () => navigate(`/dashboard/exegesis/${paperId}/setup?tab=corpus`);

    const handleConfirm = async (ranges: ReadonlyArray<SheetRange>) => {
        if (!paper || !source || !resourceId || !index.data) return;
        try {
            const result = await selectPages.mutateAsync({
                paperId: paper.id,
                libraryResourceId: resourceId,
                displayLabel: source.displayLabel,
                sourceType: source.sourceType,
                citationKey: source.citationKey,
                sheetRanges: ranges,
                proposedRanges: proposal?.ranges ?? [],
                pageIndex: index.data.pages,
                selectionMode: 'manual',
            });
            toast.success(
                t('paperSetup.subSteps.corpus.picker.toast.saved', { count: result.excerptCount }),
            );
            if (result.emptySheets > 0) {
                toast.warning(
                    t('paperSetup.subSteps.corpus.picker.toast.emptySheets', { count: result.emptySheets }),
                );
            }
            back();
        } catch (err) {
            console.error('[ExegesisSourcePagesPage] no se pudo guardar la selección', err);
            toast.error(t('paperSetup.subSteps.corpus.picker.toast.saveFailed'));
        }
    };

    if (paperLoading || (!!resourceId && index.isLoading)) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="text-sm">{t('paperSetup.subSteps.corpus.picker.loadingIndex')}</span>
            </div>
        );
    }

    if (!paper || !source) {
        return (
            <div className="px-6 py-16 text-center">
                <p className="text-sm text-muted-foreground">
                    {t('paperSetup.subSteps.corpus.picker.sourceNotFound')}
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={back}>
                    {t('paperSetup.subSteps.corpus.picker.backToCorpus')}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            <header className="flex items-start gap-3 border-b border-border px-5 py-3">
                <Button
                    variant="ghost" size="icon" className="mt-0.5 h-8 w-8 shrink-0"
                    onClick={back}
                    aria-label={t('paperSetup.subSteps.corpus.picker.backToCorpus')}
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <div className="min-w-0">
                    <h1 className="truncate text-base font-semibold text-foreground">
                        {source.displayLabel}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {t('paperSetup.subSteps.corpus.picker.subtitle')}
                    </p>
                </div>
            </header>

            <SourcePagesWorkspace
                pages={index.data?.pages ?? []}
                printedPageOffset={index.data?.printedPageOffset ?? null}
                resourceId={resourceId!}
                proposedRanges={proposal?.ranges ?? []}
                proposalKind={proposal?.kind ?? 'none'}
                proposalPending={proposal === null}
                initialRanges={normalizeSheetRanges(source.excerptRecipe?.sheetRanges ?? [])}
                otherSourcesChars={otherSourcesChars}
                onConfirm={handleConfirm}
                isSaving={selectPages.isPending}
            />
        </div>
    );
}
