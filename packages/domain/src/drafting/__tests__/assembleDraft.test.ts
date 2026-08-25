import { describe, it, expect } from 'vitest';
import { assembleDraft, missingForDraft, type AssembleDraftInput } from '../assembleDraft';
import { deriveSectionWalk } from '../deriveSectionWalk';
import type { SermonElement } from '../SermonElement';

const POINTS = [
    {
        title: 'I. Dios habla y revela su voluntad  (vv. 1-2)',
        application: '* Dios habla, vive consciente de su dirección.\n* Lee tu biblia, ora, escucha a tu pastor.',
        scriptureReferences: ['Jonás 1:1-2'],
    },
    {
        title: 'II. El hombre desobedece y revela su necedad  (vv. 3)',
        application: '* Recapacita de tus reacciones hostiles.',
        scriptureReferences: ['Jonás 1:3a'],
    },
];

let n = 0;
const el = (text: string, provenance: SermonElement['provenance'] = 'pastor'): SermonElement => ({
    id: `e${n++}`,
    sectionId: 'x',
    text,
    kind: 'elemento',
    provenance,
    decidedAt: new Date('2026-08-24'),
});

const walk = deriveSectionWalk({ points: POINTS, sermonPassage: 'Jonás 1:1-3', proposition: 'La tesis.' });

/** Traductor de prueba: devuelve la clave, así el test verifica QUÉ se pide. */
const t = (key: string) => key;

const COMPLETO: AssembleDraftInput = {
    walk,
    t,
    points: POINTS,
    elements: {
        title: [el('El Dios que persigue al rebelde')],
        'point.1.proposition': [el('Dios habla con intención: se identifica, ordena y explica.')],
        'point.2.proposition': [el('La rebeldía nace de una idea errónea de Dios.')],
    },
    prose: {
        'introduction.openingIllustration': 'Cuando se estrenó LOST…',
        'introduction.bookOverview': 'Jonás es narrativa, no oráculo.',
        'introduction.historicalContext': 'Nínive era la capital asiria.',
        'introduction.currentConnection': 'Nosotros también tenemos nuestra Tarsis.',
        'point.1.exposition': 'La formulación muestra un mandato directo.',
        'point.1.illustration': 'Como un padre que llama por su nombre.',
        'point.2.exposition': 'Jonás se levanta para huir.',
        'point.2.illustration': '¿Han visto a los niños con rabietas?',
        // La cita de autoridad es opcional: acá se deja decidida en un punto
        // para verificar que llega al sermón, y ausente en el otro.
        'point.1.authorityQuote': 'Calvino comenta que la huida revela el corazón.',
        'conclusion.recap': 'Dios habló; el hombre huyó.',
        'conclusion.callToAction': 'No tomes ese barco esta semana.',
    },
};

describe('assembleDraft', () => {
    const draft = assembleDraft(COMPLETO);

    it('el título sale de lo que él escribió, no del generador', () => {
        expect(draft.title).toBe('El Dios que persigue al rebelde');
    });

    it('la proposición del punto ABRE su contenido, antes de la exposición', () => {
        const c = draft.body[0].content;
        expect(c.indexOf('Dios habla con intención')).toBeLessThan(c.indexOf('La formulación muestra'));
    });

    it('la transición trae su recordatorio ya compuesto', () => {
        // Retomar la proposición y nombrar el punto siguiente es mecánico.
        const seccion = walk.find((s) => s.id === 'point.1.transition');
        // Llega CUBIERTA con el recordatorio ya compuesto: el pastor lo VE, y
        // marcarla resuelta sin mostrárselo sería un "listo" mudo.
        expect(seccion?.status).toBe('cubierta');
        expect(seccion?.coveredBy?.[0]).toContain('**Puntos:**');
        expect(missingForDraft(COMPLETO).map((s) => s.id)).not.toContain('point.1.transition');
    });

    it('la introducción lleva encabezados y sigue el orden del catálogo', () => {
        // El generador clásico producía la introducción con encabezados markdown
        // y por eso se leía como documento. Sin ellos el lienzo mostraba los
        // nombres de campo crudos, que no son parte de un sermón.
        const i = draft.introduction;
        expect(i).toContain('### drafting.sections.openingIllustration.heading');
        expect(i.indexOf('Cuando se estrenó LOST')).toBeLessThan(i.indexOf('Jonás es narrativa'));
        expect(i.indexOf('Jonás es narrativa')).toBeLessThan(i.indexOf('Nínive era la capital asiria'));
    });

    it('una sección vacía no deja su encabezado anunciando algo que no está', () => {
        const sinContexto = assembleDraft({
            ...COMPLETO,
            prose: { ...COMPLETO.prose, 'introduction.historicalContext': '' },
        });
        expect(sinContexto.introduction).not.toContain('historicalContext.heading');
    });

    it('las implicaciones son SUS viñetas, con su propio conteo', () => {
        expect(draft.body[0].implications).toEqual([
            'Dios habla, vive consciente de su dirección.',
            'Lee tu biblia, ora, escucha a tu pastor.',
        ]);
        expect(draft.body[1].implications).toHaveLength(1);
    });

    it('NUNCA fabrica una cita de autoridad: sale de lo que él decidió', () => {
        // La regla no cambió —no se inventa— pero pasó de imponerse con `null`
        // fijo a derivarse de su sección. Un punto sin cita decidida sigue en
        // `null`.
        expect(draft.body[1].authorityQuote).toBeNull();
    });

    it('un elemento descartado no entra al sermón', () => {
        const conDescarte = assembleDraft({
            ...COMPLETO,
            elements: { ...COMPLETO.elements, title: [el('El bueno'), el('El rechazado', 'descartado')] },
        });
        expect(conDescarte.title).toBe('El bueno');
    });
});

describe('assembleDraft — lo que falta, falta', () => {
    it('una sección sin prosa queda vacía, NO se rellena', () => {
        // Rellenar sería la puerta de atrás que este flujo existe para cerrar.
        const draft = assembleDraft({ ...COMPLETO, prose: {} });
        // Queda SÓLO lo que ya era suyo —su proposición— y nada más: las
        // secciones sin redactar no se rellenan.
        expect(draft.introduction).toContain('La tesis.');
        expect(draft.introduction).not.toContain('historicalContext.heading');
        expect(draft.body[0].content).toBe('Dios habla con intención: se identifica, ordena y explica.');
        expect(draft.conclusion).toBe('');
    });

    it('una ilustración ausente se omite en vez de quedar en blanco', () => {
        const draft = assembleDraft({ ...COMPLETO, prose: {} });
        expect(draft.body[0].illustration).toBeUndefined();
    });
});

describe('missingForDraft', () => {
    it('con todo escrito no falta nada', () => {
        expect(missingForDraft(COMPLETO)).toEqual([]);
    });

    it('nombra las secciones sin prosa y las verbatim sin decidir', () => {
        const ids = missingForDraft({ ...COMPLETO, prose: {}, elements: {} }).map((s) => s.id);
        expect(ids).toContain('point.1.exposition');
        expect(ids).toContain('point.1.proposition');
        expect(ids).toContain('title');
    });

    it('no reclama lo que ya es suyo del bosquejo', () => {
        // Las aplicaciones llegan `cubierta`: pedirle que las escriba de nuevo
        // sería exigirle trabajo que ya hizo.
        const ids = missingForDraft({ ...COMPLETO, prose: {}, elements: {} }).map((s) => s.id);
        expect(ids).not.toContain('point.1.application');
    });
});

describe('la prosa redactada manda sobre las notas del bosquejo', () => {
    it('usa la aplicación redactada cuando existe', () => {
        // Sus viñetas del bosquejo son notas de trabajo, con los asteriscos a la
        // vista. Llevarlas al sermón tal cual sería publicar su borrador.
        const draft = assembleDraft({
            ...COMPLETO,
            prose: {
                ...COMPLETO.prose,
                'point.1.application': '- Vive consciente de su dirección esta semana.\n- Abre tu Biblia antes de decidir.',
            },
        });
        expect(draft.body[0].implications).toEqual([
            'Vive consciente de su dirección esta semana.',
            'Abre tu Biblia antes de decidir.',
        ]);
    });

    it('sin prosa cae a sus notas: mejor su texto crudo que un sermón sin aplicación', () => {
        expect(assembleDraft(COMPLETO).body[0].implications).toEqual([
            'Dios habla, vive consciente de su dirección.',
            'Lee tu biblia, ora, escucha a tu pastor.',
        ]);
    });
});


describe('todo punto lleva transición, con su recordatorio', () => {
    it('TODOS lo reciben, el último incluido', () => {
        // Dos suposiciones equivocadas seguidas sobre esta misma sección: que el
        // último punto no llevaba transición, y que no llevaba recordatorio. El
        // recordatorio es CONTEXTO QUE EL PASTOR LEE, no texto que se inserte
        // solo — retomar la tesis antes de la conclusión es lo que él hace.
        for (const id of ['point.1.transition', 'point.2.transition']) {
            const s = walk.find((x) => x.id === id);
            expect(s?.status, id).toBe('cubierta');
            expect(s?.coveredBy?.[0], id).toContain('**Puntos:**');
        }
    });
});

describe('lo que la sección trae hecho: contenido o contexto', () => {
    const draft = assembleDraft(COMPLETO);

    it('el recordatorio de la transición NO entra como contenido', () => {
        // Entraba, y `assembleTransitions` lo agrega después: salía dos veces,
        // una como prosa corrida y otra como lista. Es CONTEXTO que el pastor
        // lee mientras decide, no texto de la sección.
        expect(draft.body[0].transition ?? '').not.toContain('**Puntos:**');
    });

    it('la proposición del sermón SÍ es el contenido de su sección', () => {
        // Misma fuente, distinto rol: acá es el texto; en el título es contexto
        // para que él escriba otra cosa.
        expect(draft.introduction).toContain('La tesis.');
    });

    it('y NO se cuela en el título, donde sólo orienta', () => {
        expect(draft.title).toBe('El Dios que persigue al rebelde');
        expect(draft.title).not.toContain('La tesis.');
    });

    it('las palabras clave del estudio no entran solas al sermón', () => {
        // Alimentan la decisión del contexto histórico; el texto lo escribe él.
        const conPalabras = assembleDraft({
            ...COMPLETO,
            walk: deriveSectionWalk({
                points: POINTS,
                sermonPassage: 'Jonás 1:1-3',
                proposition: 'La tesis.',
                keyWords: [{ original: 'לִבְרֹחַ', significance: 'huir, con intención' }],
            }),
            prose: {},
        });
        expect(conPalabras.introduction).not.toContain('לִבְרֹחַ');
    });
});


describe('la cita de autoridad es una decisión, no un campo forzado', () => {
    it('llega al sermón cuando él la decidió', () => {
        // Se forzaba `null` razonando "nunca se fabrica" — y no fabricar no es
        // lo mismo que no permitir. Desaparecía sin que nadie lo decidiera.
        expect(assembleDraft(COMPLETO).body[0].authorityQuote).toContain('Calvino comenta');
    });

    it('queda en null cuando no decidió ninguna, por AUSENCIA no por imposición', () => {
        expect(assembleDraft(COMPLETO).body[1].authorityQuote).toBeNull();
    });

    it('el punto lleva el pasaje que expone, derivado del recorrido', () => {
        expect(assembleDraft(COMPLETO).body[0].mainPassageRef).toBe('Jonás 1:1-2');
    });
});
