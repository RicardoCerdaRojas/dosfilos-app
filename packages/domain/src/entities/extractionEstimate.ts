/**
 * Heuristic time estimate for the library extraction pipeline.
 *
 * The user-facing UI (ExtractionStepper) shows
 *   "Procesando hace 4m 23s · ~12 min estimado"
 * so they can decide "is this stuck or just slow?" at a glance.
 *
 * No engine exposes a real progress signal (LlamaParse polls return
 * only PENDING/PROCESSING/SUCCESS/ERROR; Gemini is a single
 * generateContent call; pdf-parse runs synchronously). So the best we
 * can do is a coefficient-based estimate from observed production runs.
 *
 * Calibration sources (real runs from the v1.6 launch period):
 *   - Premium / LlamaParse fast (Carson/Moo NT Intro): 50.30 MB,
 *     790 págs → 11m 28s ≈ 13.7 s/MB, 0.87 s/page
 *   - Premium / LlamaParse fast (NTG28): 10.54 MB, 1020 págs → 3m 3s
 *     ≈ 17.4 s/MB, 0.18 s/page  (cached vs cold accounts for the spread)
 *   - Standard / Gemini (small Hebreo lesson): 0.13 MB, 4 págs → 13s
 *     ≈ 100 s/MB but dominated by a fixed ~5s overhead
 *   - pdf-parse fallback (WBC zombie run): 19 MB, 378 págs → ~5m 46s
 *     ≈ 18.2 s/MB
 *
 * Coefficients err on the SLOW side: better to over-estimate ETA so
 * the user is pleasantly surprised, than to promise something we
 * can't deliver and look stuck. Numbers are intentionally rough —
 * we round display to the nearest minute anyway.
 *
 * Returns total estimated wall-clock duration in MILLISECONDS,
 * including a baseline indexing-overhead allowance. Callers diff
 * against `processingStartedAt` to compute "remaining" if they want
 * (UI currently just shows the total estimate, not remaining).
 */
export function estimateExtractionDurationMs(input: {
    sizeBytes: number;
    mode?: 'standard' | 'premium' | undefined;
}): number {
    const sizeMB = Math.max(0, input.sizeBytes) / (1024 * 1024);

    // Per-MB extraction coefficient by mode. The user picked the mode
    // upfront so we know which engine is the planned primary; we don't
    // try to predict cascade fallbacks.
    //
    // Default to premium when mode is undefined (legacy uploads or
    // missing field) — over-estimates harmlessly since premium is the
    // slower path.
    const SECONDS_PER_MB: Record<'standard' | 'premium', number> = {
        standard: 12,  // Gemini average, including pdf-parse fallback bias
        premium: 16,   // LlamaParse fast — generous so cached vs cold doesn't surprise
    };
    const sPerMB = SECONDS_PER_MB[input.mode ?? 'premium'];

    // Fixed overhead per extraction: storage download + cascade
    // setup + final write. ~30s observed across runs.
    const SETUP_OVERHEAD_S = 30;

    // Indexing overhead: chunking + embedding + Firestore writes.
    // Scales loosely with content; for the rough display we use a
    // flat 60s baseline (covers ~500 chunks). Big lexicons skew higher
    // but the elapsed text already gives the user the truth in real time.
    const INDEXING_OVERHEAD_S = 60;

    const totalSeconds = SETUP_OVERHEAD_S + INDEXING_OVERHEAD_S + sPerMB * sizeMB;
    return Math.round(totalSeconds * 1000);
}

/**
 * Render an estimate as "~Nm" (whole minutes) or "~30s" if under a minute.
 * Returns the i18n-key value, not a translated string — caller wraps
 * it in `t('stepper.estimated', { duration })`.
 */
export function formatEstimateShort(estimateMs: number): string {
    const totalSeconds = Math.round(estimateMs / 1000);
    if (totalSeconds < 60) return `~${totalSeconds}s`;
    const minutes = Math.round(totalSeconds / 60);
    return `~${minutes} min`;
}
