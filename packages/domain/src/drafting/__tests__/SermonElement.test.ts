import { describe, it, expect } from 'vitest';
import { tallyProvenance, type SermonElement } from '../SermonElement';
import { buildElementsPrompt } from '../buildElementsPrompt';

let n = 0;
const el = (provenance: SermonElement['provenance'], text = 'x'): SermonElement => ({
    id: `e${n++}`,
    sectionId: 'introduction.historicalContext',
    text,
    provenance,
    decidedAt: new Date(),
});

describe('tallyProvenance', () => {
    it('no cuenta los descartados como parte del sermón', () => {
        const t = tallyProvenance([el('pastor'), el('descartado'), el('descartado')]);
        expect(t.inSermon).toBe(1);
        expect(t.originatedRatio).toBe(1);
        expect(t.descartado).toBe(2);
    });

    it('elegido está en el sermón pero NO cuenta como autoría', () => {
        // La distinción central del ADR-037: aprobar no es originar.
        const t = tallyProvenance([el('pastor'), el('elegido')]);
        expect(t.inSermon).toBe(2);
        expect(t.originatedRatio).toBe(0.5);
    });

    it('editar una propuesta SÍ cuenta como autoría', () => {
        expect(tallyProvenance([el('editado'), el('elegido')]).originatedRatio).toBe(0.5);
    });

    it('sin elementos no divide por cero', () => {
        expect(tallyProvenance([]).originatedRatio).toBe(0);
    });

    it('un sermón íntegramente elegido da 0 — y eso es información, no un bug', () => {
        expect(tallyProvenance([el('elegido'), el('elegido')]).originatedRatio).toBe(0);
    });
});

describe('buildElementsPrompt', () => {
    const base = {
        passage: 'Jonás 1:1-3',
        sectionLabel: 'Contexto histórico',
        sectionJob: 'Situar al oyente en el mundo del texto.',
    };

    it('pasa la proposición y los puntos verbatim', () => {
        const p = buildElementsPrompt({
            ...base,
            proposition: 'Dios habla, y su palabra nunca vuelve vacía.',
            points: ['Dios llama', 'Jonás huye'],
        });
        expect(p).toContain('Dios habla, y su palabra nunca vuelve vacía.');
        expect(p).toContain('- Jonás huye');
    });

    it('omite los bloques vacíos en vez de dejar encabezados huérfanos', () => {
        const p = buildElementsPrompt(base);
        expect(p).not.toContain('PUNTOS DEL SERMÓN');
        expect(p).not.toContain('YA DECIDIÓ');
    });

    it('cuando ya hay elementos decididos, prohíbe repetirlos', () => {
        const p = buildElementsPrompt({ ...base, alreadyDecided: ['La crueldad asiria'] });
        expect(p).toContain('La crueldad asiria');
        expect(p).toContain('NO los repitas');
    });

    it('autoriza explícitamente proponer menos del máximo', () => {
        // Sin esto el modelo rellena hasta el número pedido: es el mismo
        // mecanismo por el que una cita de autoridad obligatoria se fabrica.
        expect(buildElementsPrompt(base)).toContain('PROPÓN MENOS');
    });
});
