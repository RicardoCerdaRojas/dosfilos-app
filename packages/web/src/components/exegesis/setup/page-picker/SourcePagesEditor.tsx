import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { proposeSheetRanges, type ProposalKind } from '@dosfilos/infrastructure';
import type { ExegeticalPaper, ProjectSource, SheetRange } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { useDocumentPageIndex } from '@/hooks/exegesis/useDocumentPageIndex';
import { useSelectSourcePages } from '@/hooks/exegesis/useSelectSourcePages';
import { PagePickerDialog } from './PagePickerDialog';

/**
 * Abre el selector de páginas para una fuente ya adjunta.
 *
 * Reúne lo que el diálogo necesita y no sabe conseguir: el índice de hojas, la
 * propuesta del sistema para el pasaje, y cuánto presupuesto ocupan las OTRAS
 * fuentes del trabajo —el tope de 200.000 caracteres es de todas juntas, así
 * que un medidor que solo mire esta fuente mentiría.
 *
 * Existe como contenedor aparte para que `CorpusSubStep`, que ya pasa las 1.200
 * líneas, sume solo la llamada.
 */

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paper: ExegeticalPaper;
    source: ProjectSource;
}

export function SourcePagesEditor({ open, onOpenChange, paper, source }: Props) {
    const { t } = useTranslation('exegesis');
    const { user } = useFirebase();
    const resourceId = source.sourceLibraryResourceId ?? source.corpusId;
    const index = useDocumentPageIndex(open ? resourceId : null);
    const selectPages = useSelectSourcePages();

    const [proposal, setProposal] = useState<{ ranges: SheetRange[]; kind: ProposalKind }>({
        ranges: [],
        kind: 'none',
    });

    // La propuesta se calcula cuando el índice ya está: sin él no se puede
    // traducir la sección encontrada a hojas.
    useEffect(() => {
        if (!open || !user || !index.data) return;
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
    }, [open, user, index.data, resourceId, paper.passage, paper.assignmentBrief, paper.displayLanguage]);

    const otherSourcesChars = paper.sources
        .filter(s => s.id !== source.id)
        .reduce((sum, s) => sum + s.excerpts.reduce((n, e) => n + e.text.length, 0), 0);

    const handleConfirm = async (ranges: ReadonlyArray<SheetRange>) => {
        if (!index.data) return;
        try {
            const result = await selectPages.mutateAsync({
                paperId: paper.id,
                libraryResourceId: resourceId,
                displayLabel: source.displayLabel,
                sourceType: source.sourceType,
                citationKey: source.citationKey,
                sheetRanges: ranges,
                proposedRanges: proposal.ranges,
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
        } catch (err) {
            console.error('[SourcePagesEditor] no se pudo guardar la selección', err);
            toast.error(t('paperSetup.subSteps.corpus.picker.toast.saveFailed'));
            throw err;
        }
    };

    if (!open) return null;

    return (
        <PagePickerDialog
            open={open}
            onOpenChange={onOpenChange}
            resourceId={resourceId}
            resourceTitle={source.displayLabel}
            proposedRanges={proposal.ranges}
            proposalKind={proposal.kind}
            initialRanges={source.excerptRecipe?.sheetRanges}
            otherSourcesChars={otherSourcesChars}
            onConfirm={handleConfirm}
        />
    );
}
