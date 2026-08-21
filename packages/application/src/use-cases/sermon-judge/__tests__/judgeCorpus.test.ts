import { describe, it, expect } from 'vitest';
import type { SermonContent } from '@dosfilos/domain';
import { buildJudgeCorpus } from '../judgeCorpus';

const base = {
    title: 'La fidelidad de Dios',
    introduction: 'Una introducción.',
    body: [
        {
            point: 'Dios cumple',
            content: 'El desarrollo del punto.',
            illustration: 'Una historia.',
            implications: ['Implica A', 'Implica B'],
            authorityQuote: 'Calvino dijo algo.',
            transition: 'Y por eso…',
        },
    ],
    conclusion: 'Una conclusión.',
    callToAction: 'Confía hoy.',
} as unknown as SermonContent;

describe('buildJudgeCorpus — el sermón como prosa', () => {
    it('incluye lo que el pastor predica', () => {
        const c = buildJudgeCorpus(base);
        for (const frag of ['La fidelidad de Dios', 'Una introducción.', 'Dios cumple', 'El desarrollo del punto.', 'Una historia.', 'Implica A', 'Una conclusión.', 'Confía hoy.']) {
            expect(c).toContain(frag);
        }
    });

    it('incluye la cita de autoridad: G4 también se comete apoyándose en una autoridad', () => {
        expect(buildJudgeCorpus(base)).toContain('Calvino dijo algo.');
    });

    it('numera los puntos para que el juez pueda referirse a uno', () => {
        expect(buildJudgeCorpus(base)).toContain('PUNTO 1: Dios cumple');
    });

    it('un borrador vacío no revienta ni inventa texto', () => {
        expect(buildJudgeCorpus({ body: [] } as unknown as SermonContent)).toBe('');
    });

    it('tolera puntos a medio llenar', () => {
        const parcial = { body: [{ point: 'Solo el título' }] } as unknown as SermonContent;
        expect(buildJudgeCorpus(parcial)).toContain('PUNTO 1: Solo el título');
    });
});
