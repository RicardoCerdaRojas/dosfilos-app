import { describe, it, expect } from 'vitest';
import type { HomileticalAnalysis, SermonContent } from '../../entities/SermonGenerator';
import { assembleTransitions, buildTransitionReminder } from '../assembleTransitions';

const homiletics = (): HomileticalAnalysis =>
    ({
        homileticalProposition:
            'En Jonás 1:1-3, veremos dos realidades del conflicto entre Jonás y Dios que deben guiarnos a la obediencia a Dios.',
        outline: {
            mainPoints: [
                { title: 'I. Dios habla y revela su voluntad (vv. 1-2)', description: 'd', scriptureReferences: [] },
                { title: 'II. El hombre desobedece y revela su necedad (v. 3)', description: 'd', scriptureReferences: [] },
            ],
        },
    }) as HomileticalAnalysis;

const content = (transitions: (string | undefined)[]): SermonContent =>
    ({ body: transitions.map((transition) => ({ point: 'p', content: 'c', transition })) }) as SermonContent;

describe('assembleTransitions — la proposición se copia, no se pide', () => {
    it('reemplaza la proposición INVENTADA por la del pastor, verbatim', () => {
        // El fallo real: el modelo escribió un título inventado donde debía ir,
        // palabra por palabra, la proposición aprobada.
        const r = assembleTransitions(
            content([
                'Hemos visto que Dios habla con claridad y propósito. Pero, ¿cómo responde el hombre?\n\nEl Dios que se revela a todas las naciones y la rebeldía de su profeta.\n\n**Puntos:**\n1. algo',
                'cierre',
            ]),
            homiletics(),
        );
        const t = r.body[0]!.transition!;
        expect(t).not.toContain('El Dios que se revela a todas las naciones');
        expect(t).toContain('veremos dos realidades del conflicto entre Jonás y Dios');
    });

    it('conserva la frase de transición: ESA sí es trabajo del modelo', () => {
        const r = assembleTransitions(content(['Hemos visto que Dios habla. ¿Y el hombre?\n\nbasura inventada', 'x']), homiletics());
        expect(r.body[0]!.transition).toContain('Hemos visto que Dios habla. ¿Y el hombre?');
    });

    it('los puntos salen del bosquejo verbatim, sin renumerar los que ya traen romano', () => {
        // Este test afirmaba "1. I. Dios habla…": había fijado la duplicación
        // como si fuera el contrato. El pastor numera sus puntos en el
        // bosquejo; anteponerle otro número lo hace leer dos veces la cifra.
        const r = assembleTransitions(content(['frase', 'x']), homiletics());
        // Viñetas y no saltos simples: markdown colapsa un `\n` solo y los
        // puntos salían como prosa corrida en pantalla.
        expect(r.body[0]!.transition).toContain('**Puntos:**\n- I. Dios habla y revela su voluntad (vv. 1-2)\n- II. El hombre desobedece y revela su necedad (v. 3)');
    });

    it('TODOS los puntos llevan recordatorio, el último incluido', () => {
        // Se excluía al último razonando que después viene la conclusión y no
        // otro movimiento. El fundador lo corrigió sobre su propio sermón: él
        // hace la transición siempre, y el punto final quedaba sin nada donde
        // los demás sí tenían. Recoger la tesis antes de la conclusión es el
        // movimiento con que un predicador cierra el cuerpo.
        const salida = assembleTransitions(content(['frase 1', 'frase 2']), homiletics());
        for (const [i, punto] of salida.body.entries()) {
            expect(punto.transition, `punto ${i + 1}`).toContain('**Puntos:**');
        }
    });

    it('quita los rótulos que el modelo anteponga', () => {
        const r = assembleTransitions(content(['**Recordatorio:** Hemos visto que Dios habla.', 'x']), homiletics());
        expect(r.body[0]!.transition!.startsWith('Hemos visto que Dios habla.')).toBe(true);
    });

    it('sin frase del modelo, el recordatorio va solo', () => {
        const r = assembleTransitions(content(['', 'x']), homiletics());
        expect(r.body[0]!.transition!.startsWith('En Jonás 1:1-3')).toBe(true);
    });

    it('sin bosquejo o sin proposición no toca nada', () => {
        const sinProp = { ...homiletics(), homileticalProposition: '' } as HomileticalAnalysis;
        const c = content(['a', 'b']);
        expect(assembleTransitions(c, sinProp)).toEqual(c);
    });
});

describe('buildTransitionReminder — numeración', () => {
    it('no vuelve a numerar un título que ya trae su romano', () => {
        const out = buildTransitionReminder('Tesis.', [
            'I. Dios habla y revela su voluntad (vv. 1-2)',
            'II. El hombre desobedece (v. 3)',
        ]);
        expect(out).toContain('- I. Dios habla y revela su voluntad (vv. 1-2)');
        expect(out).not.toContain('1. I. Dios habla');
    });

    it('numera cuando el título viene sin número', () => {
        const out = buildTransitionReminder('Tesis.', ['Dios habla', 'El hombre desobedece']);
        expect(out).toContain('- 1. Dios habla');
        expect(out).toContain('- 2. El hombre desobedece');
    });

    it('respeta la numeración arábiga del pastor', () => {
        const out = buildTransitionReminder('Tesis.', ['2) El hombre desobedece']);
        expect(out).not.toContain('1. 2)');
    });
});
