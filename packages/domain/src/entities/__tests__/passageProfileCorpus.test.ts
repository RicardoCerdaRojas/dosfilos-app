import { describe, it, expect } from 'vitest';
import { assemblePassageProfile, isFeatureAnchored } from '../PassageProfile';
import { GOLDEN_PASSAGE_PROFILES } from './passageProfileCorpus';

describe('golden passage-profile corpus (ADR-035, lado detección)', () => {
    const now = new Date('2026-06-22T00:00:00Z');

    for (const c of GOLDEN_PASSAGE_PROFILES) {
        describe(c.name, () => {
            const profile = assemblePassageProfile(c.raw, c.genres, now);

            it('keeps exactly the expected number of anchored features', () => {
                expect(profile.features).toHaveLength(c.expectedAnchoredFeatures);
            });

            it('segments the expected number of movements', () => {
                expect(profile.movements).toHaveLength(c.expectedMovements);
            });

            it('every surviving feature carries a verifiable anchor', () => {
                expect(profile.features.every(isFeatureAnchored)).toBe(true);
            });

            it('crystallizes genres + passage from the deterministic inputs', () => {
                expect(profile.genres).toEqual(c.genres);
                expect(profile.passage).toBe(c.passage);
            });
        });
    }

    it('2 Pedro detecta las dos alusiones AT (Balaam + Prov 26:11) que el método perdía', () => {
        const profile = assemblePassageProfile(GOLDEN_PASSAGE_PROFILES[0].raw, ['epistle'], now);
        const allusions = profile.features.filter((f) => f.typeKey === 'ot-allusion');
        expect(allusions.map((a) => a.typeKey === 'ot-allusion' && a.anchor.reference)).toEqual([
            'Números 22-24',
            'Proverbios 26:11',
        ]);
    });

    it('Salmo 23 NO infla alusiones AT inexistentes', () => {
        const profile = assemblePassageProfile(GOLDEN_PASSAGE_PROFILES[1].raw, ['poetry'], now);
        expect(profile.features.some((f) => f.typeKey === 'ot-allusion')).toBe(false);
    });
});
