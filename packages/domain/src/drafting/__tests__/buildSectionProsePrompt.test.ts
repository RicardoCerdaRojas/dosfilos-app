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

    it('pide frases para leer en voz alta', () => {
        // Ya NO prohíbe viñetas: esa regla imponía una forma de predicar que no
        // era la del pastor. La forma la decide ahora la estructura de lo
        // decidido — ver el describe de más abajo.
        const p = buildSectionProsePrompt({ ...base, elements: [el('x')] });
        expect(p).toContain('VOZ ALTA');
        expect(p).not.toContain('sin viñetas');
    });
});

describe('la forma del texto sigue la forma de lo decidido', () => {
    it('con VARIAS ideas pide una por movimiento, en orden', () => {
        // Estructura real del fundador (2026-08-24): sus cinco elementos
        // salieron como cinco viñetas, una a una. La prosa corrida los funde y
        // el oyente no puede seguir dónde termina uno y empieza el otro.
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('La formulación muestra el mandato directo'), el('Hijo de Amitai lo sitúa como profeta'), el('Nínive era capital asiria')],
        });
        expect(p).toContain('UNA IDEA POR MOVIMIENTO');
        expect(p).toContain('en el orden en que');
        expect(p).toContain('NO fundas dos ideas');
    });

    it('con UNA sola idea pide párrafo continuo, no viñetas', () => {
        // Sin varias partes que separar, la lista es andamiaje vacío — y una
        // ilustración partida en viñetas deja de ser una ilustración.
        const p = buildSectionProsePrompt({ ...base, elements: [el('¿Han visto a los niños cuando hacen rabietas?')] });
        expect(p).toContain('párrafo continuo');
        expect(p).toContain('No la partas en');
    });

    it('un tema también cuenta para decidir la forma', () => {
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('Nínive era capital asiria'), el('Fecha del libro', 'directiva')],
        });
        expect(p).toContain('UNA IDEA POR MOVIMIENTO');
    });
});
