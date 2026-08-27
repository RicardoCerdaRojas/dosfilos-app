import { describe, it, expect } from 'vitest';
import { pointPassageRef } from '../pointPassageRef';
import { applyPropositionContract } from '../../sermon-judge/applyPropositionContract';
import type { HomileticalAnalysis } from '../../entities/SermonGenerator';

describe('el pasaje que el pastor escribe gana', () => {
    it('gana sobre el "(vv. N)" deducido del título', () => {
        // Antes el título mandaba porque era lo único que él mantenía. Ahora
        // que hay una pantalla donde escribe el pasaje, deducir por encima de
        // lo que escribió sería ignorarlo.
        expect(
            pointPassageRef({
                title: 'II. El hombre desobedece (vv. 3)',
                sermonPassage: 'Jonás 1:1-3',
                passageRef: 'Jonás 1:3b-5',
            }),
        ).toBe('Jonás 1:3b-5');
    });

    it('gana sobre la referencia heredada del generador', () => {
        expect(
            pointPassageRef({
                title: 'II. El hombre desobedece',
                scriptureReferences: ['Jonás 1:3a'],
                passageRef: 'Jonás 1:3-5',
            }),
        ).toBe('Jonás 1:3-5');
    });

    it('sin lo suyo, se sigue deduciendo del título como antes', () => {
        // El comportamiento anterior no cambia para quien no escribe nada.
        expect(
            pointPassageRef({
                title: 'II. El hombre desobedece (vv. 3)',
                sermonPassage: 'Jonás 1:1-3',
            }),
        ).toBe('Jonás 1:3');
    });

    it('un pasaje en blanco no cuenta como decisión', () => {
        expect(
            pointPassageRef({
                title: 'II. El hombre desobedece (vv. 3)',
                sermonPassage: 'Jonás 1:1-3',
                passageRef: '   ',
            }),
        ).toBe('Jonás 1:3');
    });
});

const base = (): HomileticalAnalysis =>
    ({
        homileticalProposition: 'Tres verdades que debes obedecer',
        outline: {
            mainPoints: [
                { title: 'I. Dios habla', description: 'desc', scriptureReferences: ['Jonás 1:1'] },
            ],
        },
    }) as unknown as HomileticalAnalysis;

describe('applyPropositionContract — guardar el pasaje del punto', () => {
    it('guarda lo que el pastor escribió', () => {
        const out = applyPropositionContract(base(), {
            proposition: 'Tres verdades que debes obedecer',
            points: [{ title: 'I. Dios habla', passageRef: 'Jonás 1:1-2', srcIndex: 0 }],
        });

        expect(out.outline!.mainPoints[0]).toMatchObject({ passageRef: 'Jonás 1:1-2' });
    });

    it('vacío significa "vuelve a deducirlo", así que la clave DESAPARECE', () => {
        // Y desaparecer de verdad importa: si sólo se omitiera del patch, el
        // spread del punto anterior la traería de vuelta y el borrado del
        // pastor no tendría ningún efecto en pantalla.
        const conRef = applyPropositionContract(base(), {
            proposition: 'p',
            points: [{ title: 'I. Dios habla', passageRef: 'Jonás 1:1-2', srcIndex: 0 }],
        });

        const borrado = applyPropositionContract(conRef, {
            proposition: 'p',
            points: [{ title: 'I. Dios habla', passageRef: '', srcIndex: 0 }],
        });

        expect('passageRef' in borrado.outline!.mainPoints[0]!).toBe(false);
    });

    it('no toca la descripción ni las referencias heredadas del punto', () => {
        const out = applyPropositionContract(base(), {
            proposition: 'p',
            points: [{ title: 'I. Dios habla', passageRef: 'Jonás 1:1-2', srcIndex: 0 }],
        });

        expect(out.outline!.mainPoints[0]).toMatchObject({
            description: 'desc',
            scriptureReferences: ['Jonás 1:1'],
        });
    });

    it('un punto nuevo nace sin pasaje, no con uno inventado', () => {
        const out = applyPropositionContract(base(), {
            proposition: 'p',
            points: [
                { title: 'I. Dios habla', srcIndex: 0 },
                { title: 'II. El hombre huye', srcIndex: null },
            ],
        });

        expect('passageRef' in out.outline!.mainPoints[1]!).toBe(false);
    });
});
