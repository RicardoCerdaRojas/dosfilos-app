/**
 * Parses a date string from a `<input type="date">` (always in
 * `YYYY-MM-DD` format) into a Date at LOCAL midnight, never UTC
 * midnight. Critical for any negative-offset timezone (Chile UTC-3/-4,
 * all of the Americas) where `new Date('2026-05-03')` parses as UTC
 * midnight and becomes the previous calendar day in local time.
 *
 * Use this helper for ANY date-input → Date conversion; the bug is
 * silent and easy to reintroduce.
 */
export function parseLocalDate(yyyymmdd: string | null | undefined): Date | undefined {
    if (!yyyymmdd) return undefined;
    const parts = yyyymmdd.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return undefined;
    const [year, month, day] = parts as [number, number, number];
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Returns whole-day difference between two Dates (b - a), regardless of
 * the time component. Negative if `a` is later than `b`.
 *
 * Used by the SeriesForm "shift planned sermons when start date
 * changes" logic to compute how many days to shift each scheduled
 * date by when the pastor edits the series start date.
 */
export function daysBetween(a: Date, b: Date): number {
    const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((bMid - aMid) / (24 * 60 * 60 * 1000));
}

/**
 * Returns a new Date shifted by `days` days from `date`. Preserves the
 * time component. Uses `setDate` which handles month/year rollover.
 */
export function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
