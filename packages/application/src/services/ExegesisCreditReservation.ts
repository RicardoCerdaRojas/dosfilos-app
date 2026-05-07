import {
    type ExegesisOperationKey,
    getExegesisOperationCostUsd,
} from '@dosfilos/domain';
import { processingBalanceService, InsufficientExegesisCreditsError } from './ProcessingBalanceService';
import { fireExegesisPricingEvent } from './exegesisPricingTracker';

/**
 * Thin reservation handle that consolidates the reserve / refund
 * pattern every exégesis-LLM use case follows. Lifecycle:
 *
 *   1. `open(userId, operationKey)` reserves the operation's catalog
 *      cost from the user's `processingBalance.exegesis*` bucket.
 *      Throws `InsufficientExegesisCreditsError` (from
 *      ProcessingBalanceService) when the bucket can't cover it —
 *      callers let this bubble so the UI surfaces the upgrade modal.
 *   2. The caller does its pre-LLM work (validation, repo loads).
 *      Failures here will trigger refund via step 4.
 *   3. The caller invokes `markLlmContacted()` IMMEDIATELY before the
 *      `await modelClient.generateContent(...)` line. After this, any
 *      throw is treated as post-LLM (tokens were paid for real, no
 *      refund).
 *   4. On error, the caller invokes `refundIfPreLlm()` which checks
 *      the marker and refunds when appropriate.
 *
 * Operations whose catalog cost is 0 (e.g. classifier with $0.001
 * stub, or future free ops) skip the reservation entirely and the
 * refund call becomes a no-op — cheaper than special-casing in every
 * UC.
 */
export class ExegesisCreditReservation {
    readonly costUsd: number;
    private llmContacted = false;
    private refunded = false;

    private constructor(
        readonly userId: string,
        readonly operation: ExegesisOperationKey,
    ) {
        this.costUsd = getExegesisOperationCostUsd(operation);
    }

    static async open(
        userId: string,
        operation: ExegesisOperationKey,
    ): Promise<ExegesisCreditReservation> {
        const reservation = new ExegesisCreditReservation(userId, operation);
        if (reservation.costUsd <= 0) {
            return reservation;
        }
        fireExegesisPricingEvent('exegesis.quota.reserve_attempted', {
            ownerId: userId,
            operation,
            costUsd: reservation.costUsd,
        });
        try {
            await processingBalanceService.consumeExegesis(userId, reservation.costUsd);
        } catch (err) {
            if (err instanceof InsufficientExegesisCreditsError) {
                fireExegesisPricingEvent('exegesis.quota.exceeded', {
                    ownerId: userId,
                    operation,
                    requiredUsd: err.neededUsd,
                    availableUsd: err.availableUsd,
                });
            }
            throw err;
        }
        fireExegesisPricingEvent('exegesis.quota.reserve_succeeded', {
            ownerId: userId,
            operation,
            costUsd: reservation.costUsd,
        });
        return reservation;
    }

    markLlmContacted(): void {
        this.llmContacted = true;
    }

    /**
     * Refunds the reservation when the operation failed BEFORE the LLM
     * was contacted. Idempotent — safe to call from a `catch` block
     * regardless of whether the LLM actually ran. Swallows refund
     * errors and logs them; the original error in the caller's catch
     * remains the propagated one.
     */
    async refundIfPreLlm(): Promise<void> {
        if (this.refunded) return;
        this.refunded = true;
        if (this.llmContacted || this.costUsd <= 0) return;
        try {
            await processingBalanceService.refundExegesis(this.userId, this.costUsd);
            fireExegesisPricingEvent('exegesis.quota.refunded', {
                ownerId: this.userId,
                operation: this.operation,
                costUsd: this.costUsd,
                reason: 'pre-llm-failure',
            });
        } catch (err) {
            console.error('[ExegesisCreditReservation] refund failed:', err);
        }
    }
}
