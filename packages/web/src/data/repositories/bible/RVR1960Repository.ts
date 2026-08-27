import { BIBLE_BOOKS_ES, parseBibleReferenceParts } from '@dosfilos/domain';
import { BaseJSONRepository, BibleJSONData } from './BaseJSONRepository';
import { BibleReference } from '@/domain/bible/entities/BibleEntities';
import rvrBible from '../../../assets/bible/rvr1960.json';

/**
 * RVR1960 Repository — Adapter for Spanish Reina-Valera 1960 Bible.
 *
 * ⚠️ DUPLICATION WARNING (PR #281, 2026-05-29) ⚠️
 *
 * A FUNCTIONALLY DISTINCT copy of this class also lives at
 * `packages/infrastructure/src/bible/repositories/RVR1960Repository.ts`.
 *
 * Different surfaces use different copies:
 *   - THIS file (web copy) → wired into the `/dashboard/bible` page
 *     (BibleContext + BibleReader + VerseSelector + ChapterSelector +
 *     QuickVerseFinder + VersionSelector + BiblePage).
 *   - Infra copy → wired into `LocalBibleService`, which the SERMON
 *     WIZARD's Pasaje step + Faculty markdown citation linker call.
 *
 * Contracts differ subtly:
 *   - This (web) copy returns `book` as the abbreviation (`'phm'`).
 *   - The infra copy returns `book` as the BOOK_MAPPING KEY
 *     (`'Filemón'`), because its `getVerses()` relies on that.
 *
 * ESA REGLA —"espejea todo cambio en la otra copia"— ya no hace falta para el
 * parser, y por eso se retira: una instrucción que no describe el código es
 * peor que ninguna. Pero el motivo por el que se escribió merece recordarse:
 * PR #280 editó SÓLO este archivo y todas las pantallas del asistente siguieron
 * rotas en producción, confirmado leyendo el bundle desplegado. PR #281 fue el
 * arreglo real.
 *
 * QUÉ QUEDA DUPLICADO Y QUÉ NO (2026-08-26): la TABLA de libros y el PARSEO
 * de referencias ya no: los dos salen de `@dosfilos/domain`. Lo que sigue
 * separado es el acceso a los datos y el contrato de salida —esta copia expone
 * `book` como id (`'phm'`) y la de infraestructura como clave (`'Filemón'`)—
 * porque cada superficie construyó su UI sobre el suyo. Eso ya no puede
 * producir desacuerdos sobre QUÉ libro es "filemon", que era el daño real.
 */
export class RVR1960Repository extends BaseJSONRepository {
    protected readonly versionId = 'RVR1960';
    protected readonly language = 'es';
    protected readonly bibleData = rvrBible as BibleJSONData[];
    protected readonly bookMapping = BIBLE_BOOKS_ES;

    /**
     * Delega en el parseo COMPARTIDO del dominio.
     *
     * Antes esta función estaba escrita acá letra por letra igual que en la
     * copia del asistente, con su propia tabla de libros al lado — y las tablas
     * ya habían divergido: allá `Gén`, `Éx` y `Núm` resolvían y acá no.
     *
     * Se conserva el contrato de salida (`book` = el id, `'phm'`) porque de él
     * dependen los componentes de esta página. Lo que se comparte es cómo se
     * ENTIENDE la referencia, que es donde estaba el desacuerdo.
     */
    parseReference(ref: string): BibleReference | null {
        const parts = parseBibleReferenceParts(ref);
        if (!parts) return null;
        return {
            book: parts.bookId,
            chapter: parts.chapter,
            verseStart: parts.verseStart,
            verseEnd: parts.verseEnd,
        };
    }
}
