import { describe, it, expect } from 'vitest';
import { mergeCuratedMisreadings } from '../curatedMisreadingMerge';
import type { CommonMisreadingFeature, OtAllusionFeature, PassageProfile } from '../../entities/PassageProfile';

const runtimeMis = (claim: string): CommonMisreadingFeature => ({
    typeKey: 'common-misreading',
    verseRef: 'v.20-22',
    claim,
    whyWrong: 'runtime',
    correctiveAnchor: [{ reference: 'v.22' }],
});
const curatedMis = (claim: string): CommonMisreadingFeature => ({
    typeKey: 'common-misreading',
    verseRef: '2pe 2:20-22',
    claim,
    whyWrong: 'curado verificado',
    correctiveAnchor: [{ reference: 'Juan 10:28-29' }],
});
const otAllusion: OtAllusionFeature = {
    typeKey: 'ot-allusion',
    hays: 'quotation',
    verseRef: 'v.22',
    summary: 'Prov 26:11',
    anchor: { reference: 'Proverbios 26:11' },
};

function profile(features: PassageProfile['features']): PassageProfile {
    return { schemaVersion: 1, passage: '2 Pedro 2:20-22', genres: [], movements: [], features, generatedAt: new Date(0) };
}

describe('mergeCuratedMisreadings — precedencia del piso curado', () => {
    it('curado vacío → perfil sin cambios', () => {
        const p = profile([runtimeMis('se pierde la salvación'), otAllusion]);
        expect(mergeCuratedMisreadings(p, [])).toBe(p);
    });

    it('mismo claim → el curado REEMPLAZA al runtime (precedencia)', () => {
        const p = profile([runtimeMis('Se Pierde  la Salvación'), otAllusion]);
        const merged = mergeCuratedMisreadings(p, [curatedMis('se pierde la salvación')]);
        const mis = merged.features.filter((f) => f.typeKey === 'common-misreading');
        expect(mis).toHaveLength(1);
        expect((mis[0] as CommonMisreadingFeature).whyWrong).toBe('curado verificado');
        // normaliza espacios/caso al comparar el claim
    });

    it('claim distinto → el curado se AGREGA (runtime perdió la lectura)', () => {
        const p = profile([runtimeMis('otra mala lectura')]);
        const merged = mergeCuratedMisreadings(p, [curatedMis('se pierde la salvación')]);
        const mis = merged.features.filter((f) => f.typeKey === 'common-misreading');
        expect(mis).toHaveLength(2);
    });

    it('otros tipos de feature quedan intactos', () => {
        const p = profile([otAllusion, runtimeMis('se pierde la salvación')]);
        const merged = mergeCuratedMisreadings(p, [curatedMis('se pierde la salvación')]);
        expect(merged.features.some((f) => f.typeKey === 'ot-allusion')).toBe(true);
    });

    it('devuelve perfil NUEVO (inmutable)', () => {
        const p = profile([runtimeMis('x')]);
        const merged = mergeCuratedMisreadings(p, [curatedMis('y')]);
        expect(merged).not.toBe(p);
        expect(p.features).toHaveLength(1); // original no mutado
    });
});
