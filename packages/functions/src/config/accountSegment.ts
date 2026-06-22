import * as admin from 'firebase-admin';

/**
 * Segmento de la cuenta, derivado SERVER-SIDE (no client-passed) para que sea
 * confiable. Permite leer deltas de telemetría solo sobre `real` (el input de
 * superadmin/embajador/equipo no representa la población).
 *
 * A esta escala usamos allowlists de uids en vez de un campo en el doc del
 * usuario (sobre-ingeniería); migrar a campo real cuando crezca a cientos.
 *
 * Precedencia: super_admin (role) → ambassador (allowlist) → team (allowlist) → real.
 *
 * SSOT de la segmentación de shadow/telemetría (grieta doxológica + perfil del
 * pasaje + futuros). No dupliques los uids: importá de aquí.
 */
export type AccountSegment = 'super_admin' | 'ambassador' | 'team' | 'real';

// 3 embajadores activos (personas distintas). El uid del fundador NO va aquí:
// su segment sale de role==='super_admin'.
const AMBASSADOR_UIDS: ReadonlySet<string> = new Set<string>([
    'VdXKk1KdKQcV1lxwYMJ8u2IsQ1V2',
    '8K4l0BTAp9MRbmOrYws5gvDedpD2',
    'dgPRVkueyShc3nJvs50f3UYv6oa2',
]);
const TEAM_UIDS: ReadonlySet<string> = new Set<string>([]);

export async function deriveSegment(uid: string): Promise<AccountSegment> {
    try {
        const snap = await admin.firestore().collection('users').doc(uid).get();
        if (snap.exists && snap.data()?.role === 'super_admin') return 'super_admin';
    } catch {
        // Si la lectura falla, caemos a la clasificación por allowlist / real.
    }
    if (AMBASSADOR_UIDS.has(uid)) return 'ambassador';
    if (TEAM_UIDS.has(uid)) return 'team';
    return 'real';
}
