import type { SermonElement } from '@dosfilos/domain';
import { describe, it, expect } from 'vitest';
import { buildWizardProgress, type WizardState } from '../buildWizardProgress';

const base = (over: Partial<WizardState> = {}): WizardState => ({
    step: 3,
    passage: 'Jonás 1:1-3',
    exegesis: null,
    homiletics: { homileticalProposition: 'hp' } as WizardState['homiletics'],
    draft: null,
    ...over,
});

describe('buildWizardProgress — audienceRigor: omitir NO es borrar', () => {
    // El repositorio escribe con `setDoc(..., { merge: true })`: una clave que
    // no viaja en el payload NO se borra, se conserva la vieja. Por eso volver
    // al default hay que ESCRIBIRLO.
    it('escribe "beginner" cuando el pastor elige Cotidiano', () => {
        // El bug real (2026-08-23): eligió Cotidiano, recargó, y volvió a
        // Técnico. El payload omitía `beginner`, así que el `'seminary'` ya
        // guardado sobrevivía al merge.
        const p = buildWizardProgress(base({ audienceRigor: 'beginner' }));
        expect(p.audienceRigor).toBe('beginner');
    });

    it('escribe "seminary" cuando elige Técnico', () => {
        expect(buildWizardProgress(base({ audienceRigor: 'seminary' })).audienceRigor).toBe('seminary');
    });

    it('NO escribe nada si nunca eligió: undefined ≠ eligió Cotidiano', () => {
        // Este es el caso que el comportamiento anterior sí protegía y hay que
        // conservar: no ensuciar los sermones que jamás abrieron el panel.
        const p = buildWizardProgress(base());
        expect('audienceRigor' in p).toBe(false);
    });
});

describe('buildWizardProgress — el resto del payload', () => {
    it('sólo incluye las fases que existen', () => {
        const p = buildWizardProgress(base());
        expect(p.homiletics).toBeDefined();
        expect('exegesis' in p).toBe(false);
        expect('draft' in p).toBe(false);
        expect(p.currentStep).toBe(3);
        expect(p.passage).toBe('Jonás 1:1-3');
    });

    it('no escribe una personalización vacía, pero sí una con un solo campo', () => {
        expect('personalization' in buildWizardProgress(base({ personalization: {} }))).toBe(false);
        expect('personalization' in buildWizardProgress(base({ personalization: { pastoralEmphasis: '  ' } }))).toBe(false);
        const p = buildWizardProgress(base({ personalization: { pastoralEmphasis: 'Que obedezcan a Dios' } }));
        expect(p.personalization).toEqual({ pastoralEmphasis: 'Que obedezcan a Dios' });
    });

    it('el derivedContext se re-incluye en cada guardado cuando existe', () => {
        const derivedContext = { kind: 'paper', paperId: 'p1', paperTitle: 'Jonás' } as WizardState['derivedContext'];
        expect(buildWizardProgress(base({ derivedContext })).derivedContext).toEqual(derivedContext);
    });

    it('ninguna clave del payload lleva puntos: con merge se crearían campos literales', () => {
        const p = buildWizardProgress(base({ audienceRigor: 'beginner' }));
        expect(Object.keys(p).filter((k) => k.includes('.'))).toEqual([]);
    });
});

describe('sectionElements (ADR-037)', () => {
    const base = { step: 3, passage: 'Jonás 1:1-3', exegesis: null, homiletics: null, draft: null };
    const el = (text: string): SermonElement => ({
        id: text,
        sectionId: 'introduction.historicalContext',
        text,
        provenance: 'pastor',
        kind: 'elemento',
        decidedAt: new Date('2026-08-24'),
    });

    it('un sermón que nunca usó el flujo no escribe la clave', () => {
        // AUSENTE NO ES CERO. Escribir `{}` en todo sermón legacy borraría la
        // distinción entre "sin medir" y "medido en cero".
        expect(buildWizardProgress({ ...base }).sectionElements).toBeUndefined();
        expect(buildWizardProgress({ ...base, sectionElements: null }).sectionElements).toBeUndefined();
    });

    it('persiste el mapa cuando hay decisiones', () => {
        const map = { 'introduction.historicalContext': [el('Nínive era la capital asiria')] };
        expect(buildWizardProgress({ ...base, sectionElements: map }).sectionElements).toEqual(map);
    });

    it('una sección VACIADA se escribe como lista vacía, no se omite', () => {
        // Con merge, omitirla dejaría intactos los elementos viejos: el pastor
        // borra el último, recarga, y lo ve volver. Mismo fallo que tuvo
        // `audienceRigor`.
        const map = { 'introduction.historicalContext': [] };
        expect(buildWizardProgress({ ...base, sectionElements: map }).sectionElements).toEqual(map);
    });
});

describe('sectionElements — las claves con punto son seguras SÓLO escritas enteras', () => {
    it('el mapa se entrega completo, no aplanado en rutas de campo', () => {
        // El guard de arriba cubre las claves de PRIMER nivel. Éstas son claves
        // ANIDADAS con punto: legales con `setDoc merge` sobre un objeto, pero
        // un `updateDoc` por ruta las leería como niveles y crearía mapas
        // paralelos con los datos reales huérfanos.
        const p = buildWizardProgress({
            step: 3, passage: 'Jonás 1:1-3', exegesis: null, homiletics: null, draft: null,
            sectionElements: { 'introduction.historicalContext': [], 'point.1.exposition': [] },
        });
        expect(Object.keys(p).filter((k) => k.includes('.'))).toEqual([]);
        expect(Object.keys(p.sectionElements ?? {})).toEqual([
            'introduction.historicalContext',
            'point.1.exposition',
        ]);
    });
});
