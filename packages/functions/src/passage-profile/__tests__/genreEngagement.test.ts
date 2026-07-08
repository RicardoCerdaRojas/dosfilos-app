import { describe, it, expect } from 'vitest';
import type { ILlmClient, LlmGenerateOptions } from '../../llm/LlmClient';
import { judgeGenreEngagement, parseGenreEngagement, isSubstantive, type GenreEngagementInput } from '../genreEngagement';

/**
 * Redacción v2 Fase 1 (§4.4) A3 — plumbing determinista del juez de engagement
 * de género + FAIL-CLOSED a unclear. Sin LLM real (fake client con JSON canónico).
 */
const BASE: Omit<GenreEngagementInput, 'pastorMessage'> = {
    proposedGenre: 'epistle',
    proposalRationale: 'El sistema infirió "epistle" por el libro del pasaje.',
    criteria: 'Discurso lógico/argumentativo: razona con conectores, expone una tesis y la sostiene.',
};

const LONG = (n: number) => 'a'.repeat(n);

function fakeClient(json: string): ILlmClient {
    return { generate: async (_opts: LlmGenerateOptions) => json };
}

describe('genreEngagement — plumbing determinista + fail-closed', () => {
    it('isSubstantive: corto bajo umbral, largo sobre umbral', () => {
        expect(isSubstantive('corto')).toBe(false);
        expect(isSubstantive(LONG(60))).toBe(true);
    });

    it('parseGenreEngagement tolera fences + extrae los 3 flags', () => {
        expect(
            parseGenreEngagement('```json\n{"engagedProposedGenre":true,"readsAsDifferentGenre":true,"confident":true}\n```'),
        ).toEqual({ engagedAnchor: true, contradictsAnchor: true, confident: true });
    });

    it('mensaje sin sustancia → unclear, LLM NO se llama', async () => {
        let called = false;
        const spy: ILlmClient = { generate: async () => { called = true; return '{}'; } };
        const j = await judgeGenreEngagement(spy, { ...BASE, pastorMessage: 'corto' });
        expect(called).toBe(false);
        expect(j).toEqual({ substantive: false, engagedAnchor: false, contradictsAnchor: false, verdict: 'unclear' });
    });

    it('confident + mantiene el género → confirmed', async () => {
        const client = fakeClient(JSON.stringify({ engagedProposedGenre: true, readsAsDifferentGenre: false, confident: true }));
        const j = await judgeGenreEngagement(client, { ...BASE, pastorMessage: LONG(60) });
        expect(j).toEqual({ substantive: true, engagedAnchor: true, contradictsAnchor: false, verdict: 'confirmed' });
    });

    it('confident + lee otro género (trabajándolo) → discrepancy', async () => {
        const client = fakeClient(JSON.stringify({ engagedProposedGenre: true, readsAsDifferentGenre: true, confident: true }));
        const j = await judgeGenreEngagement(client, { ...BASE, pastorMessage: LONG(60) });
        expect(j).toEqual({ substantive: true, engagedAnchor: true, contradictsAnchor: true, verdict: 'discrepancy' });
    });

    it('FAIL-CLOSED: confident=false → unclear, booleanos neutralizados (no confronta ni confirma)', async () => {
        const client = fakeClient(JSON.stringify({ engagedProposedGenre: true, readsAsDifferentGenre: true, confident: false }));
        const j = await judgeGenreEngagement(client, { ...BASE, pastorMessage: LONG(60) });
        expect(j).toEqual({ substantive: true, engagedAnchor: false, contradictsAnchor: false, verdict: 'unclear' });
    });

    it('FAIL-CLOSED: respuesta sin JSON detectable → unclear (no tumba el turno)', async () => {
        const client = fakeClient('el modelo respondió en prosa sin json');
        const j = await judgeGenreEngagement(client, { ...BASE, pastorMessage: LONG(60) });
        expect(j).toEqual({ substantive: true, engagedAnchor: false, contradictsAnchor: false, verdict: 'unclear' });
    });
});
