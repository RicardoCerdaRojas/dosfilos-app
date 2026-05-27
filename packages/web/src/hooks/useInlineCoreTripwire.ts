import { useCallback, useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { escalateClaim, type DoctrineLevel, type PastoralSeed } from '@dosfilos/domain';

/**
 * Pastoral Fidelity Phase 1.6 — Tier 1 inline tripwire (ADR-023).
 *
 * Runs Testigo 3 in `inline-core` mode on a single doctrinally-loaded
 * field as the pastor edits it (debounced). Surfaces a NON-BLOCKING
 * warning only when the claim risks negating an ecumenical core doctrine.
 *
 * Productive-struggle guardrail (manifesto P1): **silent on
 * distinctive / open-evangelical**. The tripwire is a verifier, never a
 * generator — it marks risk + evidence; the pastor decides and rewrites.
 */

interface RawConfessionVerdict {
    index: number;
    dissents: boolean;
    confidence: number;
    reasoning: string;
    evidence: string[];
    detectedLevel: DoctrineLevel | null;
}

export interface CoreTripwireWarning {
    claimKey: string;
    /** Pastoral, español — why this tensions a core doctrine. */
    reasoning: string;
    evidence: string[];
}

interface CheckArgs {
    seed: PastoralSeed;
    claimKey: string;
    /** The just-edited text to check (central idea / observation / principle). */
    text: string;
}

interface UseInlineCoreTripwireResult {
    warning: CoreTripwireWarning | null;
    checking: boolean;
    /** Debounced check. Clears any prior warning for the same key first. */
    check: (args: CheckArgs) => void;
    dismiss: () => void;
}

const DEBOUNCE_MS = 1200;
const MIN_CHARS = 25;

export function useInlineCoreTripwire(): UseInlineCoreTripwireResult {
    const [warning, setWarning] = useState<CoreTripwireWarning | null>(null);
    const [checking, setChecking] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestKeyRef = useRef<string>('');

    const dismiss = useCallback(() => setWarning(null), []);

    const runCheck = useCallback(async ({ seed, claimKey, text }: CheckArgs) => {
        const trimmed = text.trim();
        if (trimmed.length < MIN_CHARS) {
            setWarning((w) => (w?.claimKey === claimKey ? null : w));
            return;
        }
        setChecking(true);
        try {
            const callable = httpsCallable(getFunctions(), 'validateSeedWitnesses');
            const response = await callable({
                mode: 'inline-core',
                sermonId: seed.sermonId,
                seedId: seed.id,
                passage: seed.passage,
                // inline-core forces core-only T3 server-side; send the single claim.
                claims: [{ key: claimKey, kind: 'centralIdea', text: trimmed }],
            });
            const data = response.data as {
                witnesses?: { confession?: RawConfessionVerdict[] };
            };
            const verdict = data.witnesses?.confession?.[0];
            if (
                verdict &&
                verdict.detectedLevel === 'core' &&
                escalateClaim('core', verdict.dissents && verdict.confidence >= 0.6 ? 1 : 0) ===
                    'absolute-block'
            ) {
                // Only surface if this is still the field the pastor cares about.
                if (latestKeyRef.current === claimKey) {
                    setWarning({
                        claimKey,
                        reasoning: verdict.reasoning,
                        evidence: verdict.evidence ?? [],
                    });
                }
            } else {
                setWarning((w) => (w?.claimKey === claimKey ? null : w));
            }
        } catch (err) {
            // Tripwire failure must never block the pastor — fail silent.
            console.error('[useInlineCoreTripwire] check failed', err);
        } finally {
            setChecking(false);
        }
    }, []);

    const check = useCallback(
        (args: CheckArgs) => {
            latestKeyRef.current = args.claimKey;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => void runCheck(args), DEBOUNCE_MS);
        },
        [runCheck],
    );

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return { warning, checking, check, dismiss };
}
