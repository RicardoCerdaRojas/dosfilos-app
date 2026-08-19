import { describe, it, expect } from 'vitest';
import { FirestorePastoralSeedRepository } from '../FirestorePastoralSeedRepository';

/**
 * Regresión del bug de data-loss: en un update PARCIAL (p.ej. solo
 * `{ completed: true }`, el 2º write tras aceptar Insight), el serializador
 * NO debe emitir `insight: null` ni `toolsConsulted: []` — eso sobreescribía y
 * BORRABA el insight/tools ya guardados en el write anterior. Las claves
 * ausentes del patch deben OMITIRSE, no anularse.
 */
const repo = new FirestorePastoralSeedRepository();
const toFs = (patch: unknown, partial: boolean) =>
    (repo as any).toFirestore(patch, { partial }) as Record<string, unknown>;

describe('FirestorePastoralSeedRepository — partial update no borra pasos ausentes', () => {
    it('un patch parcial sin insight OMITE la clave (no escribe null)', () => {
        const out = toFs({ completed: true }, true);
        expect('insight' in out).toBe(false);
        expect(out.completed).toBe(true);
    });

    it('un patch parcial sin toolsConsulted OMITE la clave (no escribe [])', () => {
        const out = toFs({ completed: true }, true);
        expect('toolsConsulted' in out).toBe(false);
    });

    it('un patch parcial CON insight sí lo serializa', () => {
        const out = toFs(
            {
                insight: {
                    centralIdea: 'La idea central del estudio',
                    observations: ['obs uno', 'obs dos'],
                    openQuestion: '¿pregunta?',
                    pastoralAnecdote: 'anécdota',
                    doxologicalApplication: 'aplicación',
                    pasteEvents: [],
                    timeSpentSeconds: 0,
                },
            },
            true,
        );
        expect((out.insight as any).centralIdea).toBe('La idea central del estudio');
        expect((out.insight as any).observations).toEqual(['obs uno', 'obs dos']);
    });
});

/**
 * Superficie de creación. El campo se escribe UNA vez al crear; un autosave
 * posterior (patch parcial sin `origin`) jamás debe pisarlo — si lo pisara, el
 * estudio perdería su origen a la primera tecla y volveríamos a medir por proxies.
 */
describe('FirestorePastoralSeedRepository — origin', () => {
    it('serializa la superficie al crear', () => {
        const out = toFs({ passage: 'Romanos 8:28', origin: 'wizard' }, false);
        expect(out.origin).toBe('wizard');
    });

    it('un patch parcial sin origin OMITE la clave (no lo borra)', () => {
        const out = toFs({ completed: true }, true);
        expect('origin' in out).toBe(false);
    });

    it('lee la superficie ausente como desconocida, sin inferirla', () => {
        const seed = (repo as any).toSeed('seed_legacy', {
            sermonId: 'srm1',
            userId: 'u1',
            passage: 'Juan 1:1',
        });
        expect(seed.origin).toBeUndefined();
    });
});
