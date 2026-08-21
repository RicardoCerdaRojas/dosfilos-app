import { describe, it, expect } from 'vitest';
import {
    PROPOSITION_ELEMENTS,
    seedProposition,
    confrontProposition,
    assemblePropositionDraft,
    type PropositionDraft,
} from '../propositionContract';
import { GENRE_SERMON_STRUCTURE } from '../genreSermonStructure';

const epistola = GENRE_SERMON_STRUCTURE.epistle!;

/** Proposición de Mateo 28, el ejemplo del diseño. */
function draftCompleto(over: Partial<PropositionDraft> = {}): PropositionDraft {
    return {
        pasaje: 'Mateo 28',
        cantidadDePuntos: 3,
        sustantivo: 'exhortaciones',
        llamadoALaAccion: 'obedecer',
        elementoProposicional: 'que',
        pronombrePrimeraPlural: 'nosotros',
        ideaCentral: 'la autoridad de Cristo funda la misión de su iglesia',
        puntos: ['Debes obedecer yendo', 'Debes obedecer haciendo discípulos', 'Debes obedecer reconociendo su autoridad'],
        ...over,
    };
}

describe('los 8 elementos (§4.3)', () => {
    it('son ocho, numerados 1..8, sin ids repetidos', () => {
        expect(PROPOSITION_ELEMENTS).toHaveLength(8);
        expect(PROPOSITION_ELEMENTS.map(e => e.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(new Set(PROPOSITION_ELEMENTS.map(e => e.id)).size).toBe(8);
    });

    it('el pronombre de 1ª plural es el ÚNICO opcional (puede ser implícito)', () => {
        const opcionales = PROPOSITION_ELEMENTS.filter(e => !e.obligatorio).map(e => e.id);
        expect(opcionales).toEqual(['pronombrePrimeraPlural']);
    });

    it('sustantivo y llamado a la acción son decisión del PASTOR', () => {
        const delPastor = PROPOSITION_ELEMENTS.filter(e => e.origen === 'pastor').map(e => e.id);
        expect(delPastor).toEqual(['sustantivo', 'llamadoALaAccion']);
    });
});

describe('seedProposition — pre-siembra lo que el estudio ya tiene', () => {
    it('copia la idea central VERBATIM del paso 7', () => {
        // Reescribirla abriría una segunda versión de la idea central y la
        // proposición dejaría de ser un contrato con el estudio.
        const idea = 'la autoridad de Cristo funda la misión de su iglesia';
        expect(seedProposition({ ideaCentralDelPaso7: idea }).ideaCentral).toBe(idea);
    });

    it('deriva la cantidad de puntos del bosquejo, no la pide de nuevo', () => {
        const d = seedProposition({ puntosDelBosquejo: ['A', 'B', 'C'] });
        expect(d.cantidadDePuntos).toBe(3);
        expect(d.puntos).toEqual(['A', 'B', 'C']);
    });

    it('NO rellena lo que decide el pastor', () => {
        // Sugerirlos convertiría al tutor en el autor de la proposición.
        const d = seedProposition({ pasaje: 'Mateo 28', ideaCentralDelPaso7: 'x', puntosDelBosquejo: ['A'] });
        expect(d.sustantivo).toBeUndefined();
        expect(d.llamadoALaAccion).toBeUndefined();
    });

    it('estudio vacío → borrador vacío, sin inventar nada', () => {
        expect(seedProposition({})).toEqual({});
    });
});

describe('confrontProposition — contra los 8', () => {
    it('un borrador completo y armónico no arroja violaciones', () => {
        const r = confrontProposition({ draft: draftCompleto(), estructura: epistola });
        expect(r.completa).toBe(true);
        expect(r.hallazgos.filter(h => h.esViolacion)).toEqual([]);
    });

    it('nombra cada elemento obligatorio que falta', () => {
        const r = confrontProposition({ draft: { pasaje: 'Mateo 28' }, estructura: epistola });
        expect(r.completitud).toEqual({ presentes: 1, obligatorios: 7 });
        expect(r.hallazgos.filter(h => h.clase === 'elemento-faltante')).toHaveLength(6);
    });

    it('el pronombre ausente NO confronta (el diseño lo permite implícito)', () => {
        const draft = draftCompleto();
        delete (draft as { pronombrePrimeraPlural?: string }).pronombrePrimeraPlural;
        const r = confrontProposition({ draft, estructura: epistola });
        expect(r.completa).toBe(true);
        expect(r.hallazgos.filter(h => h.esViolacion)).toEqual([]);
    });

    it('string en blanco cuenta como faltante, no como presente', () => {
        const r = confrontProposition({ draft: draftCompleto({ llamadoALaAccion: '   ' }), estructura: epistola });
        expect(r.hallazgos.some(h => h.clase === 'elemento-faltante')).toBe(true);
    });

    it('anunciar 3 puntos y bosquejar 2 rompe el contrato en la primera frase', () => {
        const r = confrontProposition({
            draft: draftCompleto({ cantidadDePuntos: 3, puntos: ['Debes obedecer yendo', 'Debes obedecer haciendo'] }),
            estructura: epistola,
        });
        expect(r.hallazgos.find(h => h.clase === 'cantidad-no-coincide')).toMatchObject({ esViolacion: true });
    });
});

describe('elemento 8 — los puntos heredan el llamado (G3 en miniatura)', () => {
    it('un punto que no recoge el llamado se confronta y refina G3', () => {
        const r = confrontProposition({
            draft: draftCompleto({
                puntos: ['Debes obedecer yendo', 'La iglesia primitiva creció mucho', 'Debes obedecer reconociendo su autoridad'],
            }),
            estructura: epistola,
        });
        const h = r.hallazgos.find(x => x.clase === 'punto-sin-llamado')!;
        expect(h).toMatchObject({ esViolacion: true, refina: 'G3', referencia: 'punto 2' });
    });

    it('la herencia se coteja por RAÍZ: "obedecer" engancha "obedeciendo" y "obedece"', () => {
        const r = confrontProposition({
            draft: draftCompleto({ puntos: ['Obedeciendo su mandato', 'Obedece su autoridad', 'obedecemos yendo'] }),
            estructura: epistola,
        });
        expect(r.hallazgos.some(h => h.clase === 'punto-sin-llamado')).toBe(false);
    });

    it('la raíz ignora tildes y mayúsculas', () => {
        const r = confrontProposition({
            draft: draftCompleto({ llamadoALaAccion: 'Confiar', puntos: ['CONFÍA en su promesa', 'confiamos en su poder', 'Confía hoy'] }),
            estructura: epistola,
        });
        expect(r.hallazgos.some(h => h.clase === 'punto-sin-llamado')).toBe(false);
    });

    it('llamado demasiado corto → indeterminado, NO una falla inventada', () => {
        // La vara es tosca por diseño; cuando no alcanza, lo dice.
        const r = confrontProposition({
            draft: draftCompleto({ llamadoALaAccion: 'ir', puntos: ['Ve al mundo', 'Haz discípulos', 'Reconoce su autoridad'] }),
            estructura: epistola,
        });
        const h = r.hallazgos.find(x => x.clase === 'armonia-indeterminada')!;
        expect(h.esViolacion).toBe(false);
        expect(r.hallazgos.some(x => x.clase === 'punto-sin-llamado')).toBe(false);
    });
});

describe('sustantivo vs. lo que pide el género', () => {
    it('género de sustantivo singular con varios puntos → GUÍA, no violación', () => {
        // La decisión sigue siendo del pastor; el género sugiere su forma.
        const r = confrontProposition({
            draft: draftCompleto({ sustantivo: 'verdad', puntos: ['Debes obedecer A', 'Debes obedecer B'], cantidadDePuntos: 2 }),
            estructura: GENRE_SERMON_STRUCTURE.parable!,
        });
        const h = r.hallazgos.find(x => x.clase === 'sustantivo-contra-genero')!;
        expect(h.esViolacion).toBe(false);
    });

    it('sin estructura (centinela) no se opina sobre el sustantivo', () => {
        const r = confrontProposition({ draft: draftCompleto(), estructura: null });
        expect(r.hallazgos.some(h => h.clase === 'sustantivo-contra-genero')).toBe(false);
    });
});

describe('assemblePropositionDraft', () => {
    it('ensambla el borrador que el pastor pule', () => {
        expect(assemblePropositionDraft(draftCompleto())).toBe(
            'En Mateo 28 veremos 3 exhortaciones que nosotros debemos obedecer, porque la autoridad de Cristo funda la misión de su iglesia',
        );
    });

    it('con el pronombre implícito, la frase sigue corriendo', () => {
        const draft = draftCompleto();
        delete (draft as { pronombrePrimeraPlural?: string }).pronombrePrimeraPlural;
        expect(assemblePropositionDraft(draft)).toContain('exhortaciones que debemos obedecer');
    });

    it('null si falta un obligatorio: una proposición con huecos invita a aceptarla como está', () => {
        expect(assemblePropositionDraft({ pasaje: 'Mateo 28' })).toBeNull();
    });
});
