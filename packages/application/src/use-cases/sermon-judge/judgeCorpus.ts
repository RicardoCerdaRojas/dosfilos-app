import type { SermonContent } from '@dosfilos/domain';

/**
 * El sermón como PROSA, que es lo único que el juez debe leer.
 *
 * Existe aparte de `buildFullContent` (el render del wizard) por dos razones:
 * ese depende de una función de traducción —el juez no puede depender de la UI
 * ni de en qué idioma esté el navegador— y arrastra decisiones de presentación
 * (encabezados, blockquotes) que no son el sermón sino su maquetado.
 *
 * Incluye lo que el pastor PREDICA: título, introducción, cada punto con su
 * contenido, ilustración e implicaciones, la transición, la conclusión y el
 * llamado. Deja fuera fuentes y manifiestos de citas: esos los mide el colector
 * determinista, y meterlos acá le daría al juez texto que el oyente nunca oye.
 */
export function buildJudgeCorpus(draft: SermonContent): string {
    const parts: string[] = [];

    if (draft.title?.trim()) parts.push(`TÍTULO: ${draft.title.trim()}`);
    if (draft.introduction?.trim()) parts.push(`INTRODUCCIÓN:\n${draft.introduction.trim()}`);

    (draft.body ?? []).forEach((p, i) => {
        const bloque: string[] = [`PUNTO ${i + 1}: ${p.point ?? ''}`.trim()];
        if (p.content?.trim()) bloque.push(p.content.trim());
        if (p.illustration?.trim()) bloque.push(`Ilustración: ${p.illustration.trim()}`);
        if (p.implications?.length) {
            bloque.push(`Implicaciones: ${p.implications.filter(Boolean).join(' · ')}`);
        }
        // La cita de autoridad entra porque G4 (proof-texting) se comete también
        // apoyándose en una autoridad que no dice lo que el sermón afirma.
        if (p.authorityQuote?.trim()) bloque.push(`Cita de autoridad: ${p.authorityQuote.trim()}`);
        if (p.transition?.trim()) bloque.push(`Transición: ${p.transition.trim()}`);
        parts.push(bloque.join('\n'));
    });

    if (draft.conclusion?.trim()) parts.push(`CONCLUSIÓN:\n${draft.conclusion.trim()}`);
    if (draft.callToAction?.trim()) parts.push(`LLAMADO A LA ACCIÓN:\n${draft.callToAction.trim()}`);

    return parts.join('\n\n');
}
