import { describe, it, expect } from 'vitest';
import { applyPropositionContract } from '../applyPropositionContract';
import type { HomileticalAnalysis } from '../../entities/SermonGenerator';

const base = {
    homileticalProposition: 'En Jonás 1:1-3, veremos tres lecciones.',
    outline: {
        mainPoints: [
            { title: 'I. Uno', description: 'desc uno', scriptureReferences: ['Jon 1:1'] },
            { title: 'II. Dos', description: 'desc dos', scriptureReferences: ['Jon 1:2'] },
            { title: 'III. Tres', description: 'desc tres', scriptureReferences: ['Jon 1:3'] },
        ],
    },
} as unknown as HomileticalAnalysis;

const p = (title: string, srcIndex: number | null) => ({ title, srcIndex });

describe('applyPropositionContract', () => {
    it('guarda proposición y puntos en una sola escritura', () => {
        const out = applyPropositionContract(base, {
            proposition: 'nueva proposición',
            points: [p('I. Editado', 0), p('II. Dos', 1), p('III. Tres', 2)],
        });
        expect(out.homileticalProposition).toBe('nueva proposición');
        expect(out.outline!.mainPoints[0]!.title).toBe('I. Editado');
    });

    it('editar el título NO pierde descripción ni referencias', () => {
        const out = applyPropositionContract(base, {
            proposition: base.homileticalProposition!,
            points: [p('I. Otro título', 0), p('II. Dos', 1), p('III. Tres', 2)],
        });
        expect(out.outline!.mainPoints[0]!.description).toBe('desc uno');
        expect(out.outline!.mainPoints[0]!.scriptureReferences).toEqual(['Jon 1:1']);
    });

    it('BORRAR EL PUNTO DEL MEDIO no corre las descripciones', () => {
        // Es el caso que motiva `srcIndex`. Mapeando por posición, el título
        // "III. Tres" se habría quedado con "desc dos". No se ve en pantalla y
        // aparece en el púlpito.
        const out = applyPropositionContract(base, {
            proposition: base.homileticalProposition!,
            points: [p('I. Uno', 0), p('III. Tres', 2)],
        });
        expect(out.outline!.mainPoints).toHaveLength(2);
        expect(out.outline!.mainPoints[1]!.title).toBe('III. Tres');
        expect(out.outline!.mainPoints[1]!.description).toBe('desc tres');
        expect(out.outline!.mainPoints[1]!.scriptureReferences).toEqual(['Jon 1:3']);
    });

    it('reordenar tampoco los corre', () => {
        const out = applyPropositionContract(base, {
            proposition: base.homileticalProposition!,
            points: [p('III. Tres', 2), p('I. Uno', 0)],
        });
        expect(out.outline!.mainPoints[0]!.description).toBe('desc tres');
        expect(out.outline!.mainPoints[1]!.description).toBe('desc uno');
    });

    it('un punto NUEVO nace vacío: el sistema no inventa su contenido', () => {
        const out = applyPropositionContract(base, {
            proposition: base.homileticalProposition!,
            points: [p('I. Uno', 0), p('II. Dos', 1), p('III. Tres', 2), p('IV. El que falta', null)],
        });
        const nuevo = out.outline!.mainPoints[3]!;
        expect(nuevo.title).toBe('IV. El que falta');
        expect(nuevo.description).toBe('');
        expect(nuevo.scriptureReferences).toEqual([]);
    });

    it('un srcIndex que ya no existe se trata como punto nuevo, no revienta', () => {
        const out = applyPropositionContract(base, {
            proposition: 'x',
            points: [p('huérfano', 99)],
        });
        expect(out.outline!.mainPoints[0]!.description).toBe('');
    });

    it('no muta el objeto original', () => {
        const antes = JSON.stringify(base);
        applyPropositionContract(base, { proposition: 'otra', points: [p('X', 0)] });
        expect(JSON.stringify(base)).toBe(antes);
    });

    it('sin bosquejo previo, crea los puntos desde cero', () => {
        const vacio = { homileticalProposition: 'p' } as unknown as HomileticalAnalysis;
        const out = applyPropositionContract(vacio, { proposition: 'p', points: [p('I', null)] });
        expect(out.outline!.mainPoints).toHaveLength(1);
    });
});
