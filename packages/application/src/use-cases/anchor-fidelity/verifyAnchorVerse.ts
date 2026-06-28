/**
 * ADR-036 PR2 — verificación DETERMINISTA de existencia del verso del ancla.
 *
 * Cierra la mitad determinista de presencia → validez (la otra mitad, "¿refuta?",
 * la resuelve el adjudicador en PR3). NO usa LLM: compone primitivos que ya
 * existen — `parsePassageReference` (canon: libro + capítulo en rango, maneja
 * cross-chapter) + `IBibleVersionRepository.getVerses` (resuelve el texto o
 * `null` si el verso cae fuera de rango). Corre en ingest/revisión y en el merge
 * runtime; al ser determinista (sin red, sin modelo) puede correr en el path del
 * pastor sin costo.
 *
 * Existe ⟺ la referencia parsea Y el repo devuelve texto no vacío. Cualquier
 * fallo (libro inválido, capítulo/verso fuera de rango, basura) → `exists: false`
 * — fail-closed: una referencia que no resuelve nunca se trata como verso real.
 */

import { parsePassageReference } from '@dosfilos/domain';
import type { IBibleVersionRepository } from '@dosfilos/domain';

export interface AnchorVerseResult {
    exists: boolean;
    /** Texto del verso (trim) cuando existe; cadena vacía cuando no. */
    text: string;
}

/**
 * Verifica que `reference` apunte a un verso real en `repo`. Determinista.
 *
 * @param reference referencia bíblica ("Juan 10:28-29", cross-chapter incluido).
 * @param repo repositorio de la versión (RVR1960, ASV, …) — inyectado.
 */
export function verifyAnchorVerse(
    reference: string,
    repo: IBibleVersionRepository,
): AnchorVerseResult {
    const ref = (reference ?? '').trim();
    if (!ref) return { exists: false, text: '' };

    // 1) Canon: ¿libro válido + capítulo en rango? (cross-chapter incluido.)
    const parsed = parsePassageReference(ref);
    if (!parsed.ok) return { exists: false, text: '' };

    // 2) Contenido: ¿el repo resuelve texto? `null` = verso fuera de rango.
    const text = repo.getVerses(ref);
    if (text == null) return { exists: false, text: '' };

    const trimmed = text.trim();
    if (!trimmed) return { exists: false, text: '' };

    return { exists: true, text: trimmed };
}
