import { describe, it, expect } from 'vitest';
import type {
    IBibleVersionRepository,
    IVerifiedMisreadingRepository,
    VerifiedMisreadingRecord,
} from '@dosfilos/domain';
import { ResolveCuratedMisreadingsUseCase } from '../ResolveCuratedMisreadingsUseCase';

/**
 * ADR-036 PR5 — gate FAIL-CLOSED en el punto de uso.
 *
 * El test clave (guardrail): una entrada `reviewed` + `refutes:'yes'` cuyo verso
 * NO resuelve AHORA (aunque el `versesExist` GUARDADO diga true) NO produce
 * feature. Si alguien revierte la re-verificación autoritativa y confía en el
 * dato guardado, este test rompe CI — igual que cross-chapter / la fila ortogonal
 * de 035.
 */

/** Bible repo fake: existe solo lo que esté en `existing`. */
function fakeBible(existing: Set<string>): IBibleVersionRepository {
    return {
        getVerses: (ref: string) => (existing.has(ref.trim()) ? 'texto del verso' : null),
        parseReference: () => null,
        getChapterContent: () => null,
        getVersionId: () => 'RVR1960',
        getLanguage: () => 'es',
        isValidBook: () => true,
        getBooks: () => [],
        getChapterCount: () => 0,
        search: () => [],
    } as unknown as IBibleVersionRepository;
}

function fakeRepo(entries: VerifiedMisreadingRecord[]): IVerifiedMisreadingRepository {
    return {
        listByPassage: async () => entries,
        listByStatus: async () => [],
        getById: async () => null,
    };
}

function entry(over: Partial<VerifiedMisreadingRecord>): VerifiedMisreadingRecord {
    return {
        id: 'e1',
        schemaVersion: 1,
        passageScope: { bookId: 'jn', chapterStart: 10, verseStart: 28, verseEnd: 29 },
        claim: 'se pierde la salvación',
        whyWrong: 'seguridad eterna',
        severity: 'critical',
        correctiveAnchors: [{ reference: 'Juan 10:28-29' }],
        reviewStatus: 'reviewed',
        verification: { versesExist: true, refutes: 'yes' },
        ...over,
    };
}

const passage = 'Juan 10:28-29';

describe('ResolveCuratedMisreadingsUseCase — admisión fail-closed en runtime', () => {
    it('reviewed + yes + verso existe AHORA → produce feature', async () => {
        const uc = new ResolveCuratedMisreadingsUseCase(
            fakeRepo([entry({})]),
            fakeBible(new Set(['Juan 10:28-29'])),
        );
        const out = await uc.execute(passage);
        expect(out).toHaveLength(1);
        expect(out[0].claim).toBe('se pierde la salvación');
        expect(out[0].correctiveAnchor).toHaveLength(1);
    });

    it('GUARDRAIL: reviewed + yes pero el verso NO resuelve ahora → NO feature (aunque versesExist guardado sea true)', async () => {
        const uc = new ResolveCuratedMisreadingsUseCase(
            fakeRepo([entry({ verification: { versesExist: true, refutes: 'yes' } })]),
            fakeBible(new Set()), // ningún verso existe ahora
        );
        expect(await uc.execute(passage)).toHaveLength(0);
    });

    it('pending (no reviewed) → NO feature', async () => {
        const uc = new ResolveCuratedMisreadingsUseCase(
            fakeRepo([entry({ reviewStatus: 'pending-pastoral-review' })]),
            fakeBible(new Set(['Juan 10:28-29'])),
        );
        expect(await uc.execute(passage)).toHaveLength(0);
    });

    it('refutes:no → NO feature', async () => {
        const uc = new ResolveCuratedMisreadingsUseCase(
            fakeRepo([entry({ verification: { versesExist: true, refutes: 'no' } })]),
            fakeBible(new Set(['Juan 10:28-29'])),
        );
        expect(await uc.execute(passage)).toHaveLength(0);
    });

    it('refutes:unclear → NO feature', async () => {
        const uc = new ResolveCuratedMisreadingsUseCase(
            fakeRepo([entry({ verification: { versesExist: true, refutes: 'unclear' } })]),
            fakeBible(new Set(['Juan 10:28-29'])),
        );
        expect(await uc.execute(passage)).toHaveLength(0);
    });

    it('sin verificación (nunca adjudicada) → NO feature', async () => {
        const uc = new ResolveCuratedMisreadingsUseCase(
            fakeRepo([entry({ verification: undefined })]),
            fakeBible(new Set(['Juan 10:28-29'])),
        );
        expect(await uc.execute(passage)).toHaveLength(0);
    });

    it('pasaje no parseable → lista vacía (no explota)', async () => {
        const uc = new ResolveCuratedMisreadingsUseCase(
            fakeRepo([entry({})]),
            fakeBible(new Set(['Juan 10:28-29'])),
        );
        expect(await uc.execute('no soy referencia')).toHaveLength(0);
    });

    it('solo conserva las anclas que existen ahora (descarta las que no)', async () => {
        const uc = new ResolveCuratedMisreadingsUseCase(
            fakeRepo([
                entry({
                    correctiveAnchors: [{ reference: 'Juan 10:28-29' }, { reference: 'Juan 21:99' }],
                }),
            ]),
            fakeBible(new Set(['Juan 10:28-29'])), // solo la primera existe
        );
        const out = await uc.execute(passage);
        expect(out).toHaveLength(1);
        expect(out[0].correctiveAnchor).toHaveLength(1);
        expect(out[0].correctiveAnchor[0].reference).toBe('Juan 10:28-29');
    });
});
