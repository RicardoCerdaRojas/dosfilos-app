import { describe, it, expect } from 'vitest';
import { hasWizardStateChanged } from '../hasWizardStateChanged';
import type { WizardState } from '../buildWizardProgress';

const base: WizardState = {
    step: 3,
    passage: 'Jonás 1:1-3',
    exegesis: null,
    homiletics: null,
    draft: null,
};

describe('hasWizardStateChanged', () => {
    it('sin cambios, no dispara guardado', () => {
        expect(hasWizardStateChanged(base, { ...base })).toBe(false);
    });

    it('detecta un campo que la lista escrita a mano no cubría', () => {
        // ESTE ES EL BUG. `sectionElements` no estaba en la cadena de
        // comparaciones ni en las dependencias: el pastor decidía sus ideas,
        // recargaba, y no había nada. Sin error y con "Guardado" en pantalla.
        const conElementos: WizardState = { ...base, sectionElements: { 'introduction.historicalContext': [] } };
        expect(hasWizardStateChanged(base, conElementos)).toBe(true);
    });

    it('detecta cualquier clave nueva sin que haya que tocar esta función', () => {
        const conCampoFuturo = { ...base, campoQueAunNoExiste: 'x' } as unknown as WizardState;
        expect(hasWizardStateChanged(base, conCampoFuturo)).toBe(true);
    });

    it('sigue detectando los campos de siempre', () => {
        expect(hasWizardStateChanged(base, { ...base, step: 2 })).toBe(true);
        expect(hasWizardStateChanged(base, { ...base, audienceRigor: 'seminary' })).toBe(true);
    });

    it('compara por identidad: un objeto nuevo con el mismo contenido cuenta como cambio', () => {
        // El estado del wizard se reemplaza entero en cada cambio, así que esto
        // es lo esperado — y es lo que evita una comparación profunda por render.
        const a: WizardState = { ...base, sectionElements: {} };
        expect(hasWizardStateChanged(a, { ...base, sectionElements: {} })).toBe(true);
    });
});
