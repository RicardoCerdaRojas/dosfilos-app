import { describe, it, expect } from 'vitest';
import { buildStudyDepthSnapshot, type StudyDepthAssessment } from '../StudyDepthAssessment';

/**
 * Firestore RECHAZA `undefined` como valor de campo. Un objeto con
 * `justification: undefined` no guarda "sin justificación": revienta el
 * documento entero con "Unsupported field value".
 *
 * Esto existía y era invisible: solo persistían los snapshots CON override.
 * Medido en prod el 2026-08-22 — 11 sermones con snapshot, los 11 con
 * `bypassedConfrontation: true`, cero del caso bueno.
 */

const assessment = {
    overallScore: 88,
    weakDimensions: [],
    dimensions: {},
} as unknown as StudyDepthAssessment;

describe('buildStudyDepthSnapshot — la clave `justification`', () => {
    it('SIN justificación la clave NO existe (no viaja como undefined)', () => {
        const snap = buildStudyDepthSnapshot(assessment, {
            bypassedConfrontation: false,
            expertMode: false,
        });
        // `in` distingue "ausente" de "presente con undefined", que es
        // justamente la diferencia que Firestore castiga.
        expect('justification' in snap).toBe(false);
    });

    it('una justificación en blanco tampoco crea la clave', () => {
        const snap = buildStudyDepthSnapshot(assessment, {
            bypassedConfrontation: false,
            justification: '   ',
            expertMode: false,
        });
        expect('justification' in snap).toBe(false);
    });

    it('con justificación real, viaja recortada', () => {
        const snap = buildStudyDepthSnapshot(assessment, {
            bypassedConfrontation: true,
            justification: '  el estudio ya cubre lo esencial  ',
            expertMode: false,
        });
        expect(snap.justification).toBe('el estudio ya cubre lo esencial');
    });

    it('ningún valor del snapshot es `undefined` (contrato con Firestore)', () => {
        const snap = buildStudyDepthSnapshot(assessment, {
            bypassedConfrontation: false,
            expertMode: true,
        });
        for (const [k, v] of Object.entries(snap)) {
            expect(v, `${k} viaja como undefined y Firestore lo rechaza`).not.toBeUndefined();
        }
    });
});
