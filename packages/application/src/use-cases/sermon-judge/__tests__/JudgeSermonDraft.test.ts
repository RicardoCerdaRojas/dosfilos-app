import { describe, it, expect, vi } from 'vitest';
import type { ILlmClient } from '@dosfilos/domain';
import { JudgeSermonDraftUseCase, type IDraftShadowRecorder } from '../JudgeSermonDraftUseCase';

/**
 * Redacción v2 §8.5 — el juez en sombra: MIDE, no confronta.
 * Lo que se prueba acá es sobre todo qué pasa cuando el juez FALLA, porque un
 * juez caro y probabilístico que arrastra al resto es peor que no tenerlo.
 */

const llmWith = (reply: string): ILlmClient => ({ generate: async () => reply });

function makeRecorder() {
    const calls: Parameters<IDraftShadowRecorder['record']>[0][] = [];
    return {
        recorder: { record: async (a: Parameters<IDraftShadowRecorder['record']>[0]) => { calls.push(a); } },
        calls,
    };
}

const input = {
    sermonId: 'srm-1',
    passage: 'Proverbios 22:6',
    approach: 'pastoral' as const,
    genre: 'wisdom' as const,
    draftText: 'Un sermón cualquiera.',
};

describe('JudgeSermonDraftUseCase — en sombra', () => {
    it('registra con collector `judged`, aislado del determinista', () => {
        // El colector determinista corre siempre y es confiable; este es caro y
        // muestreado. Mezclarlos en la agregación arruinaría los dos.
        const { recorder, calls } = makeRecorder();
        return new JudgeSermonDraftUseCase(llmWith('{}'), recorder).execute(input).then(() => {
            expect(calls).toHaveLength(1);
            expect(calls[0]!.collector).toBe('judged');
            expect(calls[0]!.signals.every(s => s.kind === 'judged')).toBe(true);
        });
    });

    it('adjudicación limpia → veredicto limpio y señales por cada vara', async () => {
        const { recorder } = makeRecorder();
        const uc = new JudgeSermonDraftUseCase(llmWith(JSON.stringify({
            criterios: { C1: 'yes', C2: 'yes', C3: 'yes' },
            descalificadores: {
                'global:G1': 'no-disparado', 'global:G2': 'no-disparado',
                'global:G3': 'no-disparado', 'global:G4': 'no-disparado',
                'forma:pastoral:E1': 'no-disparado', 'forma:pastoral:E2': 'no-disparado',
                'forma:pastoral:E3': 'no-disparado',
                'genero:wisdom:D1': 'no-disparado', 'genero:wisdom:D2': 'no-disparado',
            },
        })), recorder);
        const res = await uc.execute(input);
        expect(res.veredicto.estado).toBe('limpio');
        expect(res.veredicto.indeterminado).toBe(false);
        // Se emite la vara COMPLETA, no solo lo que disparó: "corrió y no
        // disparó" es dato, y sin él no se distingue de "no se midió".
        expect(res.signals.filter(s => s.key.startsWith('judge.disqualifier.'))).toHaveLength(9);
    });

    it('respuesta ilegible → todo unclear, indeterminado, NUNCA un falso limpio', async () => {
        const uc = new JudgeSermonDraftUseCase(llmWith('esto no es JSON'));
        const res = await uc.execute(input);
        expect(res.veredicto.indeterminado).toBe(true);
        expect(res.veredicto.estado).not.toBe('limpio');
    });

    it('si el LLM se cae, no explota: se mide que no se pudo medir', async () => {
        const uc = new JudgeSermonDraftUseCase({ generate: async () => { throw new Error('502'); } });
        const res = await uc.execute(input);
        expect(res.veredicto.indeterminado).toBe(true);
        expect(res.signals.find(s => s.key === 'judge.indeterminado')?.value).toBe(true);
    });

    it('si el recorder falla, el juez igual devuelve su veredicto', async () => {
        // Fire-and-forget de verdad: registrar la sombra no puede tumbar nada.
        const uc = new JudgeSermonDraftUseCase(llmWith('{}'), {
            record: async () => { throw new Error('firestore caído'); },
        });
        await expect(uc.execute(input)).resolves.toBeTruthy();
    });

    it('FAIL-CLOSED: el modelo no puede ampliar la vara con ids inventados', async () => {
        const uc = new JudgeSermonDraftUseCase(llmWith(JSON.stringify({
            criterios: { C1: 'yes', C99_INVENTADO: 'no' },
            descalificadores: { 'genero:wisdom:D9_INVENTADO': 'disparado' },
        })));
        const res = await uc.execute(input);
        expect(res.signals.some(s => s.key.includes('INVENTADO'))).toBe(false);
        // Y el inventado no dispara nada: no hay confrontación por vara falsa.
        expect(res.veredicto.disparados).toEqual([]);
    });

    it('un valor fuera del enum se ignora y ese criterio queda unclear', async () => {
        const uc = new JudgeSermonDraftUseCase(llmWith(JSON.stringify({
            criterios: { C1: 'quizás' },
        })));
        const res = await uc.execute(input);
        expect(res.signals.find(s => s.key.endsWith('.C1'))?.verdict).toBe('unclear');
    });

    it('acepta JSON entre fences (el modelo los mete igual)', async () => {
        const uc = new JudgeSermonDraftUseCase(llmWith('```json\n{"criterios":{"C1":"yes"}}\n```'));
        const res = await uc.execute(input);
        expect(res.signals.find(s => s.key.endsWith('.C1'))?.verdict).toBe('yes');
    });

    it('marca `proxy` la severidad que el fundador NO selló', async () => {
        // Sin esta marca, al calibrar se leería como vara firme y no lo es.
        const uc = new JudgeSermonDraftUseCase(llmWith('{}'));
        const res = await uc.execute({ ...input, genre: 'epistle' });
        const pendiente = res.signals.find(s => s.key === 'judge.disqualifier.genero:epistle:D1');
        expect(pendiente?.proxy).toBe(true);
        const sellado = res.signals.find(s => s.key === 'judge.disqualifier.global:G1');
        expect(sellado?.proxy).toBeUndefined();
    });

    it('sin género, la vara corre sin piso de género y lo deja registrado', async () => {
        const uc = new JudgeSermonDraftUseCase(llmWith('{}'));
        const { approach, sermonId, draftText } = input;
        const res = await uc.execute({ sermonId, approach, draftText });
        expect(res.signals.find(s => s.key === 'judge.genero')?.value).toBe('sin-genero');
        expect(res.rubric.descalificadores.some(d => d.capa === 'genero')).toBe(false);
    });
});
