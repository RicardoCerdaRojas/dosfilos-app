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
        // El último punto necesita su puente a la conclusión: lo escribe él.
        'point.2.transition': 'Y si esto es así, ¿qué nos queda?',
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

    it('NUNCA fabrica una cita de autoridad', () => {
        expect(draft.body.every((p) => p.authorityQuote === null)).toBe(true);
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
        expect(draft.introduction).toBe('');
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


describe('todo punto lleva transición, incluido el último', () => {
    it('el último la tiene, pero SIN recordatorio: no hay punto al que apuntar', () => {
        // Se asumió que el último no llevaba —"después viene la conclusión"— y
        // el fundador lo corrigió: él la hace siempre. Lo que cambia no es que
        // exista, sino que ahí el puente a la conclusión lo escribe él.
        const ultima = walk.find((s) => s.id === 'point.2.transition');
        expect(ultima).toBeDefined();
        expect(ultima?.coveredBy).toBeUndefined();
        expect(ultima?.status).toBe('pendiente');
    });

    it('los anteriores traen el recordatorio compuesto', () => {
        const primera = walk.find((s) => s.id === 'point.1.transition');
        expect(primera?.status).toBe('cubierta');
        expect(primera?.coveredBy?.[0]).toContain('**Puntos:**');
    });
});
