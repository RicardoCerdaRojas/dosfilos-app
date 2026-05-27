import { useEffect, useRef } from 'react';

/**
 * Accumulates `timeSpentSeconds` for a sub-step while the component is
 * mounted + the document is visible. Flushes on unmount + every
 * `flushIntervalSeconds` (default 15s) so the wizard doesn't lose
 * audit data if the tab closes mid-step.
 *
 * The wizard treats time as evidence-of-study, never as a gate.
 */
export function useStepTimer(args: {
    enabled: boolean;
    flushIntervalSeconds?: number;
    onFlush: (deltaSeconds: number) => void;
}) {
    const { enabled, flushIntervalSeconds = 15, onFlush } = args;
    const lastTickRef = useRef<number | null>(null);
    const onFlushRef = useRef(onFlush);
    onFlushRef.current = onFlush;

    useEffect(() => {
        if (!enabled) {
            lastTickRef.current = null;
            return;
        }
        lastTickRef.current = Date.now();

        const flushNow = () => {
            if (lastTickRef.current == null) return;
            const now = Date.now();
            const deltaSeconds = Math.floor((now - lastTickRef.current) / 1000);
            lastTickRef.current = now;
            if (deltaSeconds > 0) onFlushRef.current(deltaSeconds);
        };

        const interval = setInterval(flushNow, flushIntervalSeconds * 1000);
        const handleVisibility = () => {
            if (document.hidden) {
                flushNow();
                lastTickRef.current = null;
            } else {
                lastTickRef.current = Date.now();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
            flushNow();
        };
    }, [enabled, flushIntervalSeconds]);
}
