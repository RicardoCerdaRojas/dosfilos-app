import { describe, it, expect } from 'vitest';
import { deriveSectionWalk, pendingSections, type WalkInput } from '../deriveSectionWalk';
import { missingForDraft } from '../assembleDraft';

/**
 * El bosquejo REAL de Jonás 1:1-3 del fundador (Firestore, 2026-08-24).
 * Dos puntos, con sus directivas y aplicaciones tal como las escribió.
 */
const JONAS: WalkInput = {
    sermonPassage: 'Jonás 1:1-3',
    proposition:
        'En Jonás 1:1-3, veremos dos realidades del conflicto entre Jonás y Dios que deben guiarnos a la obediencia a Dios.',
    points: [
        {
            title: 'I. Dios habla y revela su voluntad  (vv. 1-2)',
            scriptureReferences: ['Jonás 1:1-2', 'Salmo 139:7-12', 'Jeremías 23:23-24'],
            application:
                '* Dios habla, asi que vive consciente de su dirección.\n* Dios habla, lee tu biblia, ora, escucha a tu pastor.',
            pastorDirective: {
                emphasis:
                    'Dios habla y su palabra no es sin propósito: habla para dirigir a su pueblo en sus planes. Contra la idea de que Dios existe pero no se comunica conmigo.',
                exegeticalNotes: [
                    'Debemos mostrar como Dios se comunicaba en el Antiguo Testamento y como se comunica desde el Nuevo Testamento',
                    'Debemos explicar el error de epeerar que Dios nos hable como lo hacia con los profetas.',
                ],
            },
        },
        {
            title: 'II. El hombre desobedece y revela su necedad  (vv. 3)',
            scriptureReferences: ['Jonás 1:3a', 'Proverbios 19:21', 'Hechos 9:1-6'],
            application:
                '* Recapacita de tus reacciones hostiles a la voluntad de Dios.\n* Si te resistes a lo que Dios quiere hacer con tus enemigos usandote, pide a Dios que te haga mas parecido a Cristo.',
            pastorDirective: {
                emphasis:
                    'Aqui quisiera mostrar con ejemplos de la misma biblia como hombres se hicieron necios tratando de resistir a Dios.',
                exegeticalNotes: [
                    '"y pagando su pasaje," en hebreo no dice que sea su pasaje personal, personifica a la nave.',
                    'Enseñar la imposibilidad de salir de la presencia de Jehová.',
                ],
            },
        },
    ],
};

describe('deriveSectionWalk — con el bosquejo real de Jonás', () => {
    const walk = deriveSectionWalk(JONAS);

    it('deriva las secciones de SUS dos puntos, no de una lista fija', () => {
        const puntos = [...new Set(walk.map((s) => s.parentId).filter(Boolean))];
        expect(puntos).toEqual(['point.1', 'point.2']);
    });

    it('recorre en orden inverso: cuerpo → conclusión → introducción → título', () => {
        const orden = walk.map((s) => s.id);
        expect(orden.indexOf('point.1.exposition')).toBeLessThan(orden.indexOf('conclusion.recap'));
        expect(orden.indexOf('conclusion.recap')).toBeLessThan(orden.indexOf('introduction.historicalContext'));
        expect(orden.indexOf('introduction.historicalContext')).toBeLessThan(orden.indexOf('title'));
    });

    it('NO vuelve a preguntar la aplicación que él ya escribió', () => {
        const app = walk.find((s) => s.id === 'point.1.application');
        expect(app?.status).toBe('cubierta');
        expect(app?.coveredBy?.[0]).toContain('vive consciente de su dirección');
    });

    it('sus directivas alimentan la PROPOSICIÓN del punto, no la exposición', () => {
        // Son las reflexiones iniciales con las que FORMA la proposición.
        // Estaban en la exposición, donde ya no se usan: ahí eran decoración, y
        // la sección donde de verdad hacen falta quedaba sin insumo.
        const prop = walk.find((s) => s.id === 'point.2.proposition');
        expect(prop?.coveredBy).toHaveLength(3); // emphasis + 2 notas
        expect(prop?.coveredBy?.join(' ')).toContain('personifica a la nave');
        expect(prop?.contextKey).toBe('drafting.sections.directiveContext');
    });

    it('la exposición no las repite: su insumo es la proposición ya decidida', () => {
        const exp = walk.find((s) => s.id === 'point.2.exposition');
        expect(exp?.status).toBe('pendiente');
        expect(exp?.coveredBy).toBeUndefined();
    });

    it('el título SIEMPRE se pregunta: la proposición no lo responde', () => {
        // Son cosas distintas —la proposición afirma, el título nombra— y hoy
        // el título lo produce el generador sin que el pastor lo decida nunca.
        const titulo = walk.find((s) => s.id === 'title');
        expect(titulo?.status).toBe('pendiente');
        // Pero la proposición viaja como contexto para orientarlo.
        expect(titulo?.coveredBy?.[0]).toContain('dos realidades del conflicto');
    });

    it('la ilustración de apertura queda pendiente si no la escribió en el paso 8', () => {
        expect(walk.find((s) => s.id === 'introduction.openingIllustration')?.status).toBe('pendiente');
    });

    it('con la ilustración del paso 8, llega cubierta y no se le vuelve a pedir', () => {
        const conApertura = deriveSectionWalk({ ...JONAS, openingIllustration: 'Cuando se estrenó LOST…' });
        const s = conApertura.find((x) => x.id === 'introduction.openingIllustration');
        expect(s?.status).toBe('cubierta');
        expect(s?.coveredBy).toEqual(['Cuando se estrenó LOST…']);
    });

    it('el título del punto viaja verbatim para el mapa lateral', () => {
        expect(walk.find((s) => s.id === 'point.1.exposition')?.parentLabel).toBe(
            'I. Dios habla y revela su voluntad  (vv. 1-2)',
        );
    });

    it('las etiquetas son claves i18n, no texto: el dominio no habla ningún idioma', () => {
        expect(walk.every((s) => s.labelKey.startsWith('drafting.sections.'))).toBe(true);
        expect(walk.every((s) => !/[áéíóúñ]/i.test(s.labelKey))).toBe(true);
    });
});

describe('deriveSectionWalk — bordes', () => {
    it('un bosquejo de tres puntos produce tres, no dos', () => {
        const walk = deriveSectionWalk({ points: [{ title: 'I' }, { title: 'II' }, { title: 'III' }] });
        expect([...new Set(walk.map((s) => s.parentId).filter(Boolean))]).toHaveLength(3);
    });

    it('sin puntos todavía hay conclusión, introducción y título', () => {
        const walk = deriveSectionWalk({ points: [] });
        expect(walk.map((s) => s.id)).toContain('conclusion.recap');
        expect(walk.map((s) => s.id)).toContain('title');
    });

    it('una aplicación en blanco NO cuenta como cubierta', () => {
        const walk = deriveSectionWalk({ points: [{ title: 'I', application: '   \n  ' }] });
        expect(walk.find((s) => s.id === 'point.1.application')?.status).toBe('pendiente');
    });

    it('pendingSections deja fuera lo que ya es suyo', () => {
        const pendientes = pendingSections(deriveSectionWalk(JONAS)).map((s) => s.id);
        expect(pendientes).not.toContain('point.1.application');
        expect(pendientes).toContain('title');
        expect(pendientes).toContain('point.1.exposition');
    });
});

describe('modo de sección: se deciden ideas, o se decide el texto final', () => {
    const walk = deriveSectionWalk(JONAS);

    it('el título se escribe VERBATIM: no se decide una idea sobre él', () => {
        // Nadie decide "ideas para el título". Pedirlas agrega un paso que no
        // existe y hace que la pantalla mienta sobre lo que está pidiendo.
        expect(walk.find((s) => s.id === 'title')?.mode).toBe('verbatim');
    });

    it('la proposición de cada punto también es VERBATIM: la escribe él', () => {
        // Es la frase de la que se desprenden las partes del punto. Si la
        // escribiera el modelo, volvería a haber una decisión central que nadie
        // tomó — el mismo problema que tenía el título.
        expect(walk.find((s) => s.id === 'point.1.proposition')?.mode).toBe('verbatim');
        expect(walk.find((s) => s.id === 'point.2.proposition')?.mode).toBe('verbatim');
    });

    it('va ANTES de la exposición: primero la frase, después sus partes', () => {
        const orden = walk.map((s) => s.id);
        expect(orden.indexOf('point.1.proposition')).toBeLessThan(orden.indexOf('point.1.exposition'));
    });

    it('el resto junta ideas y la prosa se escribe después', () => {
        // Las `verbatim` son las que llevan texto FINAL: las proposiciones —de
        // cada punto y del sermón— y el título. Todo lo demás junta ideas.
        const verbatim = walk.filter((s) => s.mode === 'verbatim').map((s) => s.id);
        expect(verbatim).toEqual([
            'point.1.proposition',
            'point.2.proposition',
            'introduction.proposition',
            'title',
        ]);
    });

    it('la proposición NO se etiqueta como indicación del pastor', () => {
        // Es material para pensar el título, no una instrucción que él dejó.
        // Confundirlos mezcla justo las dos cosas que este flujo distingue.
        const titulo = walk.find((s) => s.id === 'title');
        expect(titulo?.contextKey).toBe('drafting.sections.title.context');
        expect(titulo?.contextKey).not.toContain('directive');
    });

    it('las directivas del bosquejo sí se etiquetan como suyas', () => {
        expect(walk.find((s) => s.id === 'point.1.proposition')?.contextKey).toBe(
            'drafting.sections.directiveContext',
        );
    });
});

describe('toda sección verbatim declara su propio texto', () => {
    it('ninguna se queda con el texto de otra', () => {
        // Cuando el modo `verbatim` se generalizó a partir del título, el texto
        // quedó escrito para el título: la proposición del punto apareció
        // pidiendo "El título del sermón" y "Usar este título".
        //
        // Este test es la baranda: agregar una sección verbatim sin su texto
        // propio falla acá en vez de aparecer mal escrita en pantalla.
        const sinTexto = deriveSectionWalk(JONAS)
            .filter((s) => s.mode === 'verbatim')
            .filter((s) => !s.verbatimKey)
            .map((s) => s.id);
        expect(sinTexto, `Secciones verbatim sin verbatimKey: ${sinTexto.join(', ')}`).toEqual([]);
    });

    it('cada una apunta a su propio prefijo, no a uno compartido', () => {
        const claves = deriveSectionWalk(JONAS)
            .filter((s) => s.mode === 'verbatim')
            .map((s) => s.verbatimKey);
        // Proposición de punto, proposición del sermón y título: tres textos
        // distintos, tres prefijos distintos.
        expect(new Set(claves).size).toBe(3);
    });
});


describe('el versículo del punto viaja con sus secciones', () => {
    const walk = deriveSectionWalk(JONAS);

    it('la proposición del punto lleva el pasaje que expone', () => {
        // Resume lo que hay que ver EN el versículo: decidirla de memoria es
        // peor, y obligar a abrir otra pestaña es fricción justo al pensar.
        expect(walk.find((s) => s.id === 'point.1.proposition')?.scriptureRef).toBe('Jonás 1:1-2');
        // Sale de SU título "(vv. 3)", no de la referencia heredada "1:3a".
        expect(walk.find((s) => s.id === 'point.2.proposition')?.scriptureRef).toBe('Jonás 1:3');
    });

    it('la exposición también, para que el modelo cite el texto real', () => {
        expect(walk.find((s) => s.id === 'point.2.exposition')?.scriptureRef).toBe('Jonás 1:3');
    });

    it('toma la PRIMERA referencia: las demás son cruzadas, no el pasaje', () => {
        const s = walk.find((x) => x.id === 'point.1.exposition')?.scriptureRef;
        expect(s).toBe('Jonás 1:1-2');
        expect(s).not.toContain('Salmo');
    });

    it('un punto sin referencias no inventa ninguna', () => {
        const sinRefs = deriveSectionWalk({ points: [{ title: 'I' }] });
        expect(sinRefs.find((s) => s.id === 'point.1.proposition')?.scriptureRef).toBeUndefined();
    });
});

describe('una ilustración es UNA decisión, aunque ocupe varias frases', () => {
    const walk = deriveSectionWalk(JONAS);

    it('las ilustraciones se marcan como una sola idea', () => {
        // Escribió su imagen en dos frases —el jefe de obras y el arquitecto— y
        // se partió en dos elementos. Al quedar dos, la sección entró por la
        // rama de "un movimiento por concepto" y salió con la estructura de una
        // exposición: dejó de ser una ilustración.
        expect(walk.find((s) => s.id === 'point.1.illustration')?.oneIdea).toBe(true);
        expect(walk.find((s) => s.id === 'introduction.openingIllustration')?.oneIdea).toBe(true);
    });

    it('la exposición sí admite varias: ahí una lista es una lista', () => {
        expect(walk.find((s) => s.id === 'point.1.exposition')?.oneIdea).toBeUndefined();
    });
});

describe('sólo la exposición desglosa la proposición del punto', () => {
    const walk = deriveSectionWalk(JONAS);

    it('la exposición sí', () => {
        expect(walk.find((s) => s.id === 'point.1.exposition')?.unpacksProposition).toBe(true);
    });

    it('la ilustración y la aplicación NO', () => {
        // La regla se coló dos veces donde no correspondía: la ilustración salió
        // estructurada por conceptos en vez de contada, y la aplicación iba
        // camino de lo mismo. Una imagen hace visible UNA idea; una aplicación
        // dice qué cambia el lunes. Ninguna es el desglose de la tesis.
        expect(walk.find((s) => s.id === 'point.1.illustration')?.unpacksProposition).toBeUndefined();
        expect(walk.find((s) => s.id === 'point.1.application')?.unpacksProposition).toBeUndefined();
    });
});

describe('introducción — la proposición anuncia los puntos', () => {
    it('la sección de la proposición llega con la tesis Y el bosquejo', () => {
        const walk = deriveSectionWalk({
            proposition: 'En Jonás 1:1-3, veremos dos realidades.',
            points: [
                { title: 'I. Dios habla', application: '', scriptureReferences: [] },
                { title: 'II. El hombre desobedece', application: '', scriptureReferences: [] },
            ],
        } as any);
        const seccion = walk.find((s) => s.id === 'introduction.proposition');
        const texto = (seccion?.coveredBy ?? []).join('\n');
        expect(texto).toContain('En Jonás 1:1-3, veremos dos realidades.');
        expect(texto).toContain('I. Dios habla');
        expect(texto).toContain('II. El hombre desobedece');
    });

    it('sin puntos todavía, queda la proposición sola', () => {
        const walk = deriveSectionWalk({ proposition: 'Tesis.', points: [] } as any);
        const seccion = walk.find((s) => s.id === 'introduction.proposition');
        expect(seccion?.coveredBy).toEqual(['Tesis.']);
    });

    it('el título se sigue orientando con la proposición SOLA', () => {
        const walk = deriveSectionWalk({
            proposition: 'Tesis.',
            points: [{ title: 'I. Dios habla', application: '', scriptureReferences: [] }],
        } as any);
        expect(walk.find((s) => s.id === 'title')?.coveredBy).toEqual(['Tesis.']);
    });
});

describe('palabras clave por punto (convergencia PR 3)', () => {
    const walk = deriveSectionWalk({
        proposition: 'Tesis.',
        points: [{ title: 'I. Dios habla (vv. 1-2)', application: '', scriptureReferences: [] }],
    } as any);

    it('cada punto tiene su sección de palabras clave, optativa y de ítems finales', () => {
        const seccion = walk.find((s) => s.id === 'point.1.keyWords');
        expect(seccion).toBeDefined();
        expect(seccion?.optional).toBe(true);
        expect(seccion?.definition.itemsAreFinal).toBe(true);
    });

    it('va después de la exposición y antes de la cita de autoridad', () => {
        const ids = walk.map((s) => s.id);
        expect(ids.indexOf('point.1.keyWords')).toBeGreaterThan(ids.indexOf('point.1.exposition'));
        expect(ids.indexOf('point.1.keyWords')).toBeLessThan(ids.indexOf('point.1.authorityQuote'));
    });

    it('por ser optativa, no cuenta como faltante al armar', () => {
        const faltantes = missingForDraft({ walk, elements: {}, prose: {}, points: [], t: (k: string) => k });
        expect(faltantes.some((s) => s.id === 'point.1.keyWords')).toBe(false);
    });
});
