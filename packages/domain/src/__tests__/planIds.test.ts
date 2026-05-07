import { describe, it, expect } from 'vitest';
import {
    PLAN_FREE,
    PLAN_PERSONAL,
    PLAN_PRO,
    PLAN_EQUIPO,
    ALL_PLAN_IDS,
    PLAN_DISPLAY_NAMES,
    getPlanDisplayName,
    isKnownPlanId,
} from '../config/planIds';

describe('planIds', () => {
    it('locks the legacy ID mapping (changing these requires a data migration)', () => {
        expect(PLAN_FREE).toBe('free');
        expect(PLAN_PERSONAL).toBe('basic');
        expect(PLAN_PRO).toBe('pro');
        expect(PLAN_EQUIPO).toBe('team');
    });

    it('ALL_PLAN_IDS lists exactly the four canonical ids', () => {
        expect(ALL_PLAN_IDS).toEqual(['free', 'basic', 'pro', 'team']);
    });

    it('display names match the post-Hito-4 labels', () => {
        expect(PLAN_DISPLAY_NAMES[PLAN_FREE]).toBe('Free');
        expect(PLAN_DISPLAY_NAMES[PLAN_PERSONAL]).toBe('Personal');
        expect(PLAN_DISPLAY_NAMES[PLAN_PRO]).toBe('Pro');
        expect(PLAN_DISPLAY_NAMES[PLAN_EQUIPO]).toBe('Equipo');
    });

    describe('getPlanDisplayName', () => {
        it('returns the canonical label for known ids', () => {
            expect(getPlanDisplayName('basic')).toBe('Personal');
            expect(getPlanDisplayName('team')).toBe('Equipo');
        });

        it('returns "Free" for null / undefined (the no-subscription default)', () => {
            expect(getPlanDisplayName(null)).toBe('Free');
            expect(getPlanDisplayName(undefined)).toBe('Free');
        });

        it('Title-Cases unknown ids as a graceful fallback', () => {
            expect(getPlanDisplayName('starter')).toBe('Starter');
        });
    });

    describe('isKnownPlanId', () => {
        it('returns true for legacy ids', () => {
            expect(isKnownPlanId('basic')).toBe(true);
            expect(isKnownPlanId('pro')).toBe(true);
        });

        it('rejects display labels (those are NOT plan keys)', () => {
            expect(isKnownPlanId('personal')).toBe(false);
            expect(isKnownPlanId('equipo')).toBe(false);
            expect(isKnownPlanId('Personal')).toBe(false);
        });

        it('rejects unrelated strings', () => {
            expect(isKnownPlanId('starter')).toBe(false);
            expect(isKnownPlanId('')).toBe(false);
        });
    });
});
