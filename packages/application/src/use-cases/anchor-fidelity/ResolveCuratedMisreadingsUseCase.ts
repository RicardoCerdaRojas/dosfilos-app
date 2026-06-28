import {
    decideAnchorAdmission,
    parsePassageReference,
    type CommonMisreadingFeature,
    type IBibleVersionRepository,
    type IVerifiedMisreadingRepository,
    type VerifiableAnchor,
} from '@dosfilos/domain';
import { verifyAnchorVerse } from './verifyAnchorVerse';

/**
 * ADR-036 PR5 — resuelve el piso curado para un pasaje, listo para mergear.
 *
 * AQUÍ vive el gate FAIL-CLOSED del runtime (el punto de uso): por cada entrada
 * curada del pasaje RE-VERIFICA la existencia del verso con la MISMA
 * `verifyAnchorVerse` (autoritativa — NO confía en el `versesExist` guardado, que
 * es advisory) y aplica `decideAnchorAdmission`. Solo `confront` (verso existe
 * AHORA + `refutes: 'yes'` cacheado + `reviewed`) produce un feature.
 *
 * La adjudicación (`refutes`) sí se lee cacheada (no se re-corre el LLM en
 * runtime — costo + determinismo); la EXISTENCIA se re-verifica siempre, porque
 * es barata y determinista y un verso pudo dejar de resolver.
 */
export class ResolveCuratedMisreadingsUseCase {
    constructor(
        private readonly repo: IVerifiedMisreadingRepository,
        private readonly bibleRepo: IBibleVersionRepository,
    ) {}

    async execute(passage: string): Promise<CommonMisreadingFeature[]> {
        const parsed = parsePassageReference(passage);
        if (!parsed.ok) return [];

        const scope = {
            bookId: parsed.ref.bookId,
            chapterStart: parsed.ref.chapterStart,
            verseStart: parsed.ref.verseStart ?? 0,
            verseEnd: parsed.ref.verseEnd ?? parsed.ref.verseStart ?? 0,
        };

        const entries = await this.repo.listByPassage(scope);
        const features: CommonMisreadingFeature[] = [];

        for (const entry of entries) {
            // RE-VERIFICACIÓN AUTORITATIVA: conserva solo anclas cuyo verso existe
            // AHORA. Un verso que dejó de resolver desaparece (fail-closed).
            const existingAnchors: VerifiableAnchor[] = [];
            for (const a of entry.correctiveAnchors) {
                if (verifyAnchorVerse(a.reference, this.bibleRepo).exists) {
                    existingAnchors.push({ reference: a.reference, ...(a.note ? { note: a.note } : {}) });
                }
            }

            const admission = decideAnchorAdmission({
                // versesExist autoritativo (recomputado), NO el guardado.
                verification: { versesExist: existingAnchors.length > 0, refutes: entry.verification?.refutes ?? 'no' },
                reviewStatus: entry.reviewStatus,
            });
            if (admission !== 'confront') continue;

            features.push({
                typeKey: 'common-misreading',
                verseRef: `${scope.bookId} ${scope.chapterStart}:${scope.verseStart}${
                    scope.verseEnd && scope.verseEnd !== scope.verseStart ? `-${scope.verseEnd}` : ''
                }`,
                claim: entry.claim,
                whyWrong: entry.whyWrong,
                correctiveAnchor: existingAnchors,
            });
        }

        return features;
    }
}
