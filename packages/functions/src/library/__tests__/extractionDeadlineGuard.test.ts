import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    DEADLINE_GUARD_MARGIN_SECONDS,
    armExtractionDeadlineGuard,
} from '../extractionDeadlineGuard';
import { EXTRACTION_TIMEOUT_SECONDS } from '../extractionBudget';

describe('armExtractionDeadlineGuard', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('escribe el estado antes del tope de la plataforma', async () => {
        const escribir = vi.fn().mockResolvedValue(undefined);
        armExtractionDeadlineGuard(escribir);

        vi.advanceTimersByTime((EXTRACTION_TIMEOUT_SECONDS - DEADLINE_GUARD_MARGIN_SECONDS - 1) * 1000);
        expect(escribir).not.toHaveBeenCalled();

        vi.advanceTimersByTime(2000);
        expect(escribir).toHaveBeenCalledTimes(1);
    });

    it('desarmado no escribe: la extracción terminó a tiempo', () => {
        const escribir = vi.fn().mockResolvedValue(undefined);
        armExtractionDeadlineGuard(escribir).disarm();

        vi.advanceTimersByTime(EXTRACTION_TIMEOUT_SECONDS * 1000);
        expect(escribir).not.toHaveBeenCalled();
    });

    it('un fallo al escribir no propaga: la extracción viva manda', () => {
        const escribir = vi.fn().mockRejectedValue(new Error('firestore caído'));
        const error = vi.spyOn(console, 'error').mockImplementation(() => { });
        armExtractionDeadlineGuard(escribir);

        expect(() => vi.advanceTimersByTime(EXTRACTION_TIMEOUT_SECONDS * 1000)).not.toThrow();
        error.mockRestore();
    });
});
