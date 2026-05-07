import { describe, it, expect } from 'vitest';
import {
    EXEGESIS_OPERATION_CATALOG,
    STUDY_UNIT_USD,
    getExegesisOperationCostUsd,
    operationRequiresPreConfirm,
    usdToStudies,
} from '../ExegesisOperationCatalog';

describe('ExegesisOperationCatalog', () => {
    describe('EXEGESIS_OPERATION_CATALOG', () => {
        it('every entry has a non-negative cost', () => {
            for (const def of Object.values(EXEGESIS_OPERATION_CATALOG)) {
                expect(def.estimatedCostUsd).toBeGreaterThanOrEqual(0);
            }
        });

        it('every entry has an i18n key under the studies namespace', () => {
            for (const def of Object.values(EXEGESIS_OPERATION_CATALOG)) {
                expect(def.displayKeyI18n).toMatch(/^studies\.operations\./);
            }
        });

        it('the most expensive single-call operations require pre-confirm', () => {
            // Pre-confirm gates anything user-visible at ≥ $0.10 OR the
            // ones that are easy to accidentally re-trigger (recompose
            // academic). Spot-check the critical entries.
            expect(EXEGESIS_OPERATION_CATALOG.composeAcademicPaper.requiresPreConfirm).toBe(true);
            expect(EXEGESIS_OPERATION_CATALOG.runCoherencePass.requiresPreConfirm).toBe(true);
            expect(EXEGESIS_OPERATION_CATALOG.analyzeVerseCanonically.requiresPreConfirm).toBe(true);
        });

        it('cheap operations skip pre-confirm', () => {
            expect(EXEGESIS_OPERATION_CATALOG.classifySourceType.requiresPreConfirm).toBe(false);
            expect(EXEGESIS_OPERATION_CATALOG.composeVerseAcademicProse.requiresPreConfirm).toBe(false);
        });
    });

    describe('getExegesisOperationCostUsd', () => {
        it('returns the cost from the catalog', () => {
            expect(getExegesisOperationCostUsd('analyzeVerseCanonically')).toBe(0.10);
            expect(getExegesisOperationCostUsd('composeAcademicPaper')).toBe(0.20);
        });

        it('returns 0 for unknown keys (graceful default — adding ops without catalog entries is safe)', () => {
            expect(getExegesisOperationCostUsd('thisDoesNotExist')).toBe(0);
        });
    });

    describe('operationRequiresPreConfirm', () => {
        it('returns the catalog flag', () => {
            expect(operationRequiresPreConfirm('runCoherencePass')).toBe(true);
            expect(operationRequiresPreConfirm('classifySourceType')).toBe(false);
        });

        it('returns false for unknown keys', () => {
            expect(operationRequiresPreConfirm('thisDoesNotExist')).toBe(false);
        });
    });

    describe('usdToStudies', () => {
        it('converts USD to display "estudios" via STUDY_UNIT_USD', () => {
            expect(usdToStudies(STUDY_UNIT_USD)).toBe(1);
            expect(usdToStudies(STUDY_UNIT_USD * 5)).toBe(5);
            expect(usdToStudies(0)).toBe(0);
        });

        it('handles partial estudios', () => {
            expect(usdToStudies(STUDY_UNIT_USD / 2)).toBe(0.5);
        });
    });
});
