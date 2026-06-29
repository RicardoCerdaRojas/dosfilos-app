import { describe, it, expect } from 'vitest';
import {
    detectorMisreadingStats,
    dropUnverifiedDetectorMisreadings,
} from '../detectorMisreadingVerification';
import type { CommonMisreadingFeature, OtAllusionFeature, PassageProfile } from '../../entities/PassageProfile';

const mis = (claim: string, anchors: string[]): CommonMisreadingFeature => ({
    typeKey: 'common-misreading',
    verseRef: 'v.1',
    claim,
    whyWrong: 'x',
    correctiveAnchor: anchors.map((reference) => ({ reference })),
});
const ot: OtAllusionFeature = {
    typeKey: 'ot-allusion',
    hays: 'quotation',
    verseRef: 'v.22',
    summary: 's',
    anchor: { reference: 'Proverbios 26:11' },
};
function profile(features: PassageProfile['features']): PassageProfile {
    return { schemaVersion: 1, passage: 'X', genres: [], movements: [], features, generatedAt: new Date(0) };
}

// "existe" todo menos lo que contenga "FAKE"
const verseExists = (ref: string) => !ref.includes('FAKE');

describe('detectorMisreadingStats — corte 1', () => {
    it('cuenta misreadings y anclas verificadas', () => {
        const p = profile([
            mis('a', ['Juan 1:1', 'FAKE 9:9']), // 1 verificada de 2
            mis('b', ['FAKE 1:1']), // 0 verificadas
            ot,
        ]);
        expect(detectorMisreadingStats(p, verseExists)).toEqual({
            misreadingsTotal: 2,
            misreadingsWithVerifiedAnchor: 1,
            anchorsTotal: 3,
            anchorsVerified: 1,
        });
    });

    it('sin misreadings → ceros', () => {
        expect(detectorMisreadingStats(profile([ot]), verseExists)).toEqual({
            misreadingsTotal: 0,
            misreadingsWithVerifiedAnchor: 0,
            anchorsTotal: 0,
            anchorsVerified: 0,
        });
    });
});

describe('dropUnverifiedDetectorMisreadings — verify-drop (enforce)', () => {
    it('descarta misreading sin ancla verificada; conserva la que tiene ≥1', () => {
        const p = profile([mis('keep', ['Juan 1:1', 'FAKE 9:9']), mis('drop', ['FAKE 1:1']), ot]);
        const out = dropUnverifiedDetectorMisreadings(p, verseExists);
        const claims = out.features.filter((f) => f.typeKey === 'common-misreading').map((f) => (f as CommonMisreadingFeature).claim);
        expect(claims).toEqual(['keep']);
        // conserva la ot-allusion intacta
        expect(out.features.some((f) => f.typeKey === 'ot-allusion')).toBe(true);
    });

    it('poda las anclas individuales sin verso de la feature conservada', () => {
        const p = profile([mis('keep', ['Juan 1:1', 'FAKE 9:9'])]);
        const out = dropUnverifiedDetectorMisreadings(p, verseExists);
        const kept = out.features[0] as CommonMisreadingFeature;
        expect(kept.correctiveAnchor.map((a) => a.reference)).toEqual(['Juan 1:1']);
    });

    it('inmutable: no muta el perfil original', () => {
        const p = profile([mis('drop', ['FAKE 1:1'])]);
        const out = dropUnverifiedDetectorMisreadings(p, verseExists);
        expect(out).not.toBe(p);
        expect(p.features).toHaveLength(1);
        expect(out.features).toHaveLength(0);
    });
});
