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
