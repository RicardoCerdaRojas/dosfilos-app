import type { IPrintedPageOffsetReader } from '@dosfilos/domain';
import { fetchDocumentPageIndex } from './DocumentPageIndexClient';

/**
 * Lee el desfase de página impresa del índice de hojas.
 *
 * No hace consulta propia: `fetchDocumentPageIndex` ya cachea el índice
 * por recurso durante la sesión y deduce el desfase al construirlo, así
 * que pedirlo aquí es gratis después de la primera vez —y la primera
 * suele estar hecha, porque el selector de páginas y el visor de citas
 * cargan el mismo índice.
 */
export class DocumentPrintedPageOffsetReader implements IPrintedPageOffsetReader {
    async offsetFor(resourceId: string): Promise<number | null> {
        const index = await fetchDocumentPageIndex(resourceId);
        return index.printedPageOffset;
    }
}
