import { describe, it, expect } from 'vitest';
import { tallyProvenance, describeSectionAuthorship, type SermonElement } from '../SermonElement';
import { buildElementsPrompt } from '../buildElementsPrompt';
import { parseProposedElements } from '../parseProposedElements';
import { splitElementLines } from '../splitElementLines';

let n = 0;
const el = (
    provenance: SermonElement['provenance'],
    text = 'x',
    kind: SermonElement['kind'] = 'elemento',
): SermonElement => ({
    id: `e${n++}`,
    sectionId: 'introduction.historicalContext',
    text,
    provenance,
    kind,
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

describe('parseProposedElements', () => {
    const ok = '{"elements":[{"text":"La crueldad asiria","why":"Explica el miedo de Jonás"}]}';

    it('lee la respuesta limpia', () => {
        expect(parseProposedElements(ok)).toEqual([
            { text: 'La crueldad asiria', why: 'Explica el miedo de Jonás' },
        ]);
    });

    it('sobrevive al envoltorio ```json y a una frase antes', () => {
        // El modelo los pone. Sin esto la pantalla del pastor queda vacía.
        expect(parseProposedElements('Claro, aquí tienes:\n```json\n' + ok + '\n```')).toHaveLength(1);
    });

    it('descarta elementos sin texto en vez de renderizar filas vacías', () => {
        const sucio = '{"elements":[{"text":"  "},{"text":"Nínive","why":null}]}';
        expect(parseProposedElements(sucio)).toEqual([{ text: 'Nínive', why: '' }]);
    });

    it('devuelve lista vacía —no lanza— con basura', () => {
        expect(parseProposedElements('no soy json')).toEqual([]);
        expect(parseProposedElements('{roto')).toEqual([]);
        expect(parseProposedElements('{"elements":"no es lista"}')).toEqual([]);
    });
});

describe('splitElementLines', () => {
    it('una idea por línea — así escribe la gente una lista', () => {
        expect(splitElementLines('Quién es el autor\nCuándo se escribió\nEn qué contexto')).toEqual([
            'Quién es el autor',
            'Cuándo se escribió',
            'En qué contexto',
        ]);
    });

    it('limpia las viñetas: marcan estructura, no contenido', () => {
        expect(splitElementLines('- uno\n* dos\n3) tres\n• cuatro')).toEqual(['uno', 'dos', 'tres', 'cuatro']);
    });

    it('ignora líneas vacías y espacios sueltos', () => {
        expect(splitElementLines('  uno  \n\n\n   \n dos ')).toEqual(['uno', 'dos']);
    });

    it('una sola idea sigue siendo una', () => {
        expect(splitElementLines('La crueldad asiria explica el miedo de Jonás.')).toEqual([
            'La crueldad asiria explica el miedo de Jonás.',
        ]);
    });

    it('campo vacío no produce elementos fantasma', () => {
        expect(splitElementLines('')).toEqual([]);
        expect(splitElementLines('   \n  ')).toEqual([]);
        expect(splitElementLines(undefined)).toEqual([]);
    });
});

describe('describeSectionAuthorship', () => {
    it('sin elementos, vacía', () => {
        expect(describeSectionAuthorship([])).toBe('vacia');
    });

    it('todo elegido describe la sección, no la reprocha', () => {
        // El caso del primer uso. Antes mostraba "0 de 4 ideas son tuyas".
        expect(describeSectionAuthorship([el('elegido'), el('elegido')])).toBe('seleccionada');
    });

    it('todo propio (aportado o editado) es propia', () => {
        expect(describeSectionAuthorship([el('pastor'), el('editado')])).toBe('propia');
    });

    it('mezcla es mixta', () => {
        expect(describeSectionAuthorship([el('pastor'), el('elegido')])).toBe('mixta');
    });

    it('los descartados no mueven la forma de la sección', () => {
        expect(describeSectionAuthorship([el('pastor'), el('descartado')])).toBe('propia');
    });
});


describe('las directivas no cuentan como ideas originadas', () => {
    it('una directiva no mueve la autoría de la sección', () => {
        // "Fecha del libro" es una decisión de cobertura, no una idea: el
        // contenido que la llena no admitía alternativa.
        const t = tallyProvenance([el('pastor', 'Fecha del libro', 'directiva'), el('elegido')]);
        expect(t.inSermon).toBe(1);
        expect(t.originatedRatio).toBe(0);
    });

    it('llenar la sección de temas no infla el número', () => {
        const soloTemas = [
            el('pastor', 'Autor', 'directiva'),
            el('pastor', 'Fecha del libro', 'directiva'),
            el('pastor', 'Período histórico', 'directiva'),
        ];
        expect(describeSectionAuthorship(soloTemas)).toBe('vacia');
    });

    it('una idea suya junto a directivas sigue contando como propia', () => {
        const mezcla = [el('pastor', 'Autor', 'directiva'), el('pastor', 'Nínive era la capital asiria')];
        expect(describeSectionAuthorship(mezcla)).toBe('propia');
    });
});
