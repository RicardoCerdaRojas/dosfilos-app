import { describe, it, expect } from 'vitest';
import {
    assemblePassageProfile,
    isFeatureAnchored,
    FEATURE_CATALOG_V1,
    PASSAGE_PROFILE_SCHEMA_VERSION,
    type CommonMisreadingFeature,
    type OtAllusionFeature,
    type RawPassageProfile,
} from '../PassageProfile';

const otAnchored: OtAllusionFeature = {
    typeKey: 'ot-allusion',
    hays: 'allusion',
    verseRef: 'v.22',
    summary: 'perro que vuelve a su vómito',
    anchor: { reference: 'Proverbios 26:11' },
};

const otNoAnchor = {
    ...otAnchored,
    anchor: { reference: '   ' },
} as OtAllusionFeature;

const misreadingAnchored: CommonMisreadingFeature = {
    typeKey: 'common-misreading',
    verseRef: 'v.20-22',
    claim: 'el pasaje enseña que se pierde la salvación',
    whyWrong: 'describe falsos maestros que apostatan; la naturaleza nunca cambió',
    correctiveAnchor: [{ reference: 'v.22' }, { reference: 'Juan 10:28-29' }],
};

const misreadingNoAnchor: CommonMisreadingFeature = {
    ...misreadingAnchored,
    correctiveAnchor: [{ reference: '' }],
};

describe('FEATURE_CATALOG_V1', () => {
    it('routes each v1 feature to the right step + kind (ADR-035 D4)', () => {
        expect(FEATURE_CATALOG_V1['ot-allusion']).toMatchObject({ kind: 'hard', routeToStep: 'recognition' });
        expect(FEATURE_CATALOG_V1['common-misreading']).toMatchObject({ kind: 'soft', routeToStep: 'function' });
        expect(FEATURE_CATALOG_V1.movements).toMatchObject({ kind: 'hard', routeToStep: 'structuralAnalysis' });
    });

    it('only soft features carry nudge-only; hard features are must-touch', () => {
        for (const ft of Object.values(FEATURE_CATALOG_V1)) {
            if (ft.kind === 'soft') expect(ft.coverageRule).toBe('nudge-only');
            else expect(ft.coverageRule).toBe('must-touch');
        }
    });
});

describe('isFeatureAnchored — regla anti-alucinación', () => {
    it('accepts an OT allusion with a non-empty anchor reference', () => {
        expect(isFeatureAnchored(otAnchored)).toBe(true);
    });
    it('rejects an OT allusion whose anchor is blank', () => {
        expect(isFeatureAnchored(otNoAnchor)).toBe(false);
    });
    it('accepts a misreading with at least one corrective anchor', () => {
        expect(isFeatureAnchored(misreadingAnchored)).toBe(true);
    });
    it('rejects a misreading with no usable corrective anchor', () => {
        expect(isFeatureAnchored(misreadingNoAnchor)).toBe(false);
    });
});

describe('assemblePassageProfile', () => {
    const now = new Date('2026-06-22T00:00:00Z');
    const raw: RawPassageProfile = {
        passage: '2 Pedro 2:10-22',
        movements: [
            { reference: '2 Pedro 2:10-16', summary: 'acusación a los falsos maestros' },
            { reference: '2 Pedro 2:17-19', summary: 'su vacío' },
            { reference: '2 Pedro 2:20-22', summary: 'fin peor + proverbios' },
        ],
        features: [otAnchored, otNoAnchor, misreadingAnchored, misreadingNoAnchor],
    };

    it('stamps the schema version + genres + passage', () => {
        const p = assemblePassageProfile(raw, ['epistle'], now);
        expect(p.schemaVersion).toBe(PASSAGE_PROFILE_SCHEMA_VERSION);
        expect(p.genres).toEqual(['epistle']);
        expect(p.passage).toBe('2 Pedro 2:10-22');
        expect(p.generatedAt).toBe(now);
        expect(p.movements).toHaveLength(3);
    });

    it('drops unanchored features (keeps only the two anchored ones)', () => {
        const p = assemblePassageProfile(raw, ['epistle'], now);
        expect(p.features).toHaveLength(2);
        expect(p.features).toEqual([otAnchored, misreadingAnchored]);
    });

    it('tolerates missing movements/features arrays', () => {
        const p = assemblePassageProfile({ passage: 'Salmo 23' } as RawPassageProfile, ['poetry'], now);
        expect(p.movements).toEqual([]);
        expect(p.features).toEqual([]);
    });
});
