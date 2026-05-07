import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist-safe mock: vi.mock is hoisted to the top of the file by
// Vitest, so the factory cannot reference outer variables. We use
// vi.hoisted to declare the mock fns inside the hoisted block so
// they exist at mock evaluation time AND at test time.
const { consumeExegesisMock, refundExegesisMock } = vi.hoisted(() => ({
    consumeExegesisMock: vi.fn(),
    refundExegesisMock: vi.fn(),
}));

vi.mock('../ProcessingBalanceService', async () => {
    const actual = await vi.importActual<typeof import('../ProcessingBalanceService')>(
        '../ProcessingBalanceService',
    );
    return {
        ...actual,
        processingBalanceService: {
            consumeExegesis: consumeExegesisMock,
            refundExegesis: refundExegesisMock,
        },
    };
});

import { ExegesisCreditReservation } from '../ExegesisCreditReservation';
import { InsufficientExegesisCreditsError } from '../ProcessingBalanceService';

describe('ExegesisCreditReservation', () => {
    beforeEach(() => {
        consumeExegesisMock.mockReset();
        refundExegesisMock.mockReset();
    });

    it('opens by consuming the catalog cost for the operation', async () => {
        consumeExegesisMock.mockResolvedValue(undefined);
        const reservation = await ExegesisCreditReservation.open(
            'user-1',
            'analyzeVerseCanonically',
        );
        // analyzeVerseCanonically catalog cost = $0.10
        expect(consumeExegesisMock).toHaveBeenCalledWith('user-1', 0.10);
        expect(reservation.costUsd).toBe(0.10);
    });

    it('skips consume when the operation cost is 0 (e.g. classifySourceType)', async () => {
        // classifySourceType catalog cost is $0.001 — non-zero. Use an
        // unrecognized key to exercise the zero-cost short-circuit
        // (catalog returns 0 for unknown keys).
        consumeExegesisMock.mockResolvedValue(undefined);
        const reservation = await ExegesisCreditReservation.open(
            'user-1',
            'totallyMadeUpOperation' as any,
        );
        expect(consumeExegesisMock).not.toHaveBeenCalled();
        expect(reservation.costUsd).toBe(0);
    });

    it('propagates InsufficientExegesisCreditsError from consume', async () => {
        consumeExegesisMock.mockRejectedValue(
            new InsufficientExegesisCreditsError(0.10, 0.05),
        );
        await expect(
            ExegesisCreditReservation.open('user-1', 'analyzeVerseCanonically'),
        ).rejects.toBeInstanceOf(InsufficientExegesisCreditsError);
    });

    it('refunds when refundIfPreLlm runs without markLlmContacted', async () => {
        consumeExegesisMock.mockResolvedValue(undefined);
        refundExegesisMock.mockResolvedValue(undefined);
        const reservation = await ExegesisCreditReservation.open(
            'user-1',
            'composeAcademicPaper',
        );
        await reservation.refundIfPreLlm();
        // composeAcademicPaper cost = $0.20
        expect(refundExegesisMock).toHaveBeenCalledWith('user-1', 0.20);
    });

    it('does NOT refund when markLlmContacted was called', async () => {
        consumeExegesisMock.mockResolvedValue(undefined);
        refundExegesisMock.mockResolvedValue(undefined);
        const reservation = await ExegesisCreditReservation.open(
            'user-1',
            'composeAcademicPaper',
        );
        reservation.markLlmContacted();
        await reservation.refundIfPreLlm();
        expect(refundExegesisMock).not.toHaveBeenCalled();
    });

    it('refundIfPreLlm is idempotent (safe to call twice from nested catches)', async () => {
        consumeExegesisMock.mockResolvedValue(undefined);
        refundExegesisMock.mockResolvedValue(undefined);
        const reservation = await ExegesisCreditReservation.open(
            'user-1',
            'composeAcademicPaper',
        );
        await reservation.refundIfPreLlm();
        await reservation.refundIfPreLlm();
        expect(refundExegesisMock).toHaveBeenCalledTimes(1);
    });

    it('swallows refund errors instead of propagating (preserves the original throw)', async () => {
        consumeExegesisMock.mockResolvedValue(undefined);
        refundExegesisMock.mockRejectedValue(new Error('firestore unavailable'));
        const reservation = await ExegesisCreditReservation.open(
            'user-1',
            'composeAcademicPaper',
        );
        // Should NOT throw — refund failures only get logged.
        await expect(reservation.refundIfPreLlm()).resolves.toBeUndefined();
    });

    it('skips refund call when cost was 0 (no reservation to refund)', async () => {
        const reservation = await ExegesisCreditReservation.open(
            'user-1',
            'unknownOperation' as any,
        );
        await reservation.refundIfPreLlm();
        expect(refundExegesisMock).not.toHaveBeenCalled();
    });
});
