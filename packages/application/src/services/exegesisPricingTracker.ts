import type { ExegesisOperationKey } from '@dosfilos/domain';

/**
 * Six telemetry events that drive the pricing dashboards (see
 * `docs/EXEGESIS_PRICING_INTEGRATION.md` §7). Names are dotted
 * `<feature>.<surface>.<verb>` so the existing `feature_used`
 * collection can index them by string match.
 */
export type ExegesisPricingEvent =
    | 'exegesis.quota.reserve_attempted'
    | 'exegesis.quota.reserve_succeeded'
    | 'exegesis.quota.exceeded'
    | 'exegesis.quota.refunded'
    | 'exegesis.pack.purchased'
    | 'exegesis.upgrade.cta_clicked';

export interface ExegesisPricingEventMetadata {
    ownerId?: string;
    operation?: ExegesisOperationKey;
    costUsd?: number;
    requiredUsd?: number;
    availableUsd?: number;
    plan?: string;
    packSku?: string;
    amountUsd?: number;
    surface?: string;
    reason?: string;
}

export type ExegesisPricingTracker = (
    event: ExegesisPricingEvent,
    metadata: ExegesisPricingEventMetadata,
) => void;

let _tracker: ExegesisPricingTracker = () => { /* no-op default */ };

/**
 * Register a tracker implementation. Web bootstrap wires this to a
 * `trackUserActivity` callable; functions wires it to a direct admin
 * SDK write. Tests leave it as the default no-op.
 */
export function setExegesisPricingTracker(tracker: ExegesisPricingTracker): void {
    _tracker = tracker;
}

/**
 * Fire-and-forget. Swallows tracker errors so telemetry never breaks
 * the user-facing flow.
 */
export function fireExegesisPricingEvent(
    event: ExegesisPricingEvent,
    metadata: ExegesisPricingEventMetadata,
): void {
    try {
        _tracker(event, metadata);
    } catch (err) {
        console.debug('[exegesisPricingTracker] fire failed:', err);
    }
}
