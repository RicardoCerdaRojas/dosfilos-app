/**
 * Espejo de `DEFAULT_FEATURE_FLAGS` del dominio. Copia deliberada: este paquete
 * no puede importar `@dosfilos/domain` (el build revienta con ~180 TS6059). La
 * paridad la garantiza `__tests__/defaultFlagsParity.test.ts`, que lee el fuente
 * del dominio y falla si las dos listas se separan — misma disciplina que
 * `ALLOWED_FLAGS` en `admin/setUserFeatureFlags.ts`.
 *
 * Vive en su propio módulo, sin dependencias de firebase, para que el test pueda
 * importarlo sin levantar la app.
 *
 * Sin esto una cuenta de PAGO nace sin el flujo de fidelidad pastoral: estrena la
 * versión vieja del producto. Pasó de verdad hasta 2026-08-19.
 */
export const DEFAULT_FEATURE_FLAGS = [
    'pastoral_fidelity_flow',
    'pastoral_word_study',
    'three_witnesses',
    'study_depth',
    'contra_scan',
    'conduccion_corazon',
    'passage_profile',
    'sermon_draft_shadow',
] as const;

/** El mapa listo para escribir en el perfil (`{flag: true}`). */
export function buildDefaultFeatureFlags(): Record<string, boolean> {
    return Object.fromEntries(DEFAULT_FEATURE_FLAGS.map((f) => [f, true]));
}
