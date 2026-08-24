import { describe, it, expect } from 'vitest';
import { buildSectionProsePrompt } from '../buildSectionProsePrompt';
import type { SermonElement } from '../SermonElement';
import type { WalkSection } from '../deriveSectionWalk';

const seccion: WalkSection = {
    id: 'point.2.exposition',
    mode: 'elements',
    labelKey: 'drafting.sections.exposition.label',
    jobKey: 'drafting.sections.exposition.job',
    status: 'pendiente',
};

let n = 0;
const el = (
    text: string,
    kind: SermonElement['kind'] = 'elemento',
    provenance: SermonElement['provenance'] = 'pastor',
): SermonElement => ({
    id: `e${n++}`,
    sectionId: seccion.id,
    text,
    kind,
    provenance,
    decidedAt: new Date('2026-08-24'),
});

const base = {
    section: seccion,
    sectionLabel: 'Punto 2 — exposición',
    sectionJob: 'Decir lo que el texto dice y por qué importa.',
    passage: 'Jonás 1:1-3',
    proposition: 'En Jonás 1:1-3, veremos dos realidades del conflicto entre Jonás y Dios.',
    pointTitle: 'II. El hombre desobedece y revela su necedad (vv. 3)',
};

describe('buildSectionProsePrompt', () => {
    it('pasa las ideas del pastor verbatim y manda desarrollarlas', () => {
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('"y pagando su pasaje" en hebreo personifica a la nave.')],
        });
        expect(p).toContain('personifica a la nave');
        expect(p).toContain('IDEAS QUE ÉL DECIDIÓ');
        expect(p).toContain('NO las reemplaces');
    });

    it('separa TEMAS de IDEAS: en el tema el modelo sí aporta contenido', () => {
        // Mezclarlos rompe las dos direcciones: desarrollar un tema lo deja sin
        // cubrir, y "cubrir" una idea invita a reemplazarla por otra.
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('Nínive era la capital asiria'), el('Fecha del libro', 'directiva')],
        });
        const iIdeas = p.indexOf('IDEAS QUE ÉL DECIDIÓ');
        const iTemas = p.indexOf('TEMAS QUE ÉL MANDÓ CUBRIR');
        expect(iIdeas).toBeGreaterThan(-1);
        expect(iTemas).toBeGreaterThan(iIdeas);
        expect(p.slice(iIdeas, iTemas)).toContain('Nínive era la capital asiria');
        expect(p.slice(iTemas)).toContain('Fecha del libro');
    });

    it('prohíbe agregar ideas que él no decidió — la regla que sostiene la medición', () => {
        // Sin esto el modelo contrabandea contenido y la procedencia miente: la
        // pantalla diría que las ideas son suyas mientras el texto lleva otras.
        const p = buildSectionProsePrompt({ ...base, elements: [el('x')] });
        expect(p).toContain('NO AGREGUES IDEAS QUE ÉL NO DECIDIÓ');
    });

    it('prohíbe citas inventadas, con la razón escrita', () => {
        // Precedente: exigir una cita de autoridad ES el mecanismo por el que se
        // fabrica una falsa.
        const p = buildSectionProsePrompt({ ...base, elements: [el('x')] });
        expect(p).toContain('NO INVENTES CITAS');
        expect(p).toContain('destruye la credibilidad');
    });

    it('descarta los elementos que el pastor rechazó', () => {
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('la que sirve'), el('la que rechazó', 'elemento', 'descartado')],
        });
        expect(p).toContain('la que sirve');
        expect(p).not.toContain('la que rechazó');
    });

    it('omite el bloque de temas cuando no hay ninguno', () => {
        const p = buildSectionProsePrompt({ ...base, elements: [el('sólo una idea')] });
        expect(p).not.toContain('TEMAS QUE ÉL MANDÓ CUBRIR');
    });

    it('el registro cambia con el nivel elegido, no con el contenido', () => {
        const llano = buildSectionProsePrompt({ ...base, elements: [el('x')], audienceRigor: 'beginner' });
        const tecnico = buildSectionProsePrompt({ ...base, elements: [el('x')], audienceRigor: 'seminary' });
        expect(llano).toContain('explícalo en la misma frase');
        expect(tecnico).toContain('sin explicarlo');
    });

    it('pide prosa para leer en voz alta, no una lista', () => {
        const p = buildSectionProsePrompt({ ...base, elements: [el('x')] });
        expect(p).toContain('VOZ ALTA');
        expect(p).toContain('sin viñetas');
    });
});
