import { SERMON_TONE_LABELS, type SermonPersonalization } from '../entities/SermonPersonalization';

/**
 * Renders a `SermonPersonalization` as a Spanish prompt block ready to
 * prepend to a sermon-generation prompt. Empty input (undefined or
 * every field blank) returns `''` so callers can concat unconditionally.
 *
 * Shared between the Faculty extraction pipeline
 * (`ExtractTheologicalContentUseCase`) and the wizard draft generator
 * (`prompts-generator.buildSermonDraftPrompt`) so both surfaces inject
 * the same pastoral voice block with identical wording.
 */
export function formatSermonPersonalizationBlock(personalization?: SermonPersonalization): string {
    if (!personalization) return '';

    const lines: string[] = [];

    if (personalization.tone) {
        lines.push(`TONO DEL SERMÓN: ${SERMON_TONE_LABELS[personalization.tone]}`);
    }
    if (personalization.situationalContext?.trim()) {
        lines.push(`CONTEXTO SITUACIONAL: ${personalization.situationalContext.trim()}`);
    }
    if (personalization.congregationDescription?.trim()) {
        lines.push(`CONGREGACIÓN: ${personalization.congregationDescription.trim()}`);
    }
    if (personalization.pastoralEmphasis?.trim()) {
        lines.push(`ÉNFASIS PASTORAL (lo que la congregación debe sentir/hacer): ${personalization.pastoralEmphasis.trim()}`);
    }
    if (personalization.illustrations?.trim()) {
        lines.push(`ILUSTRACIONES DEL PREDICADOR (incorporar literalmente en el cuerpo del sermón):\n${personalization.illustrations.trim()}`);
    }
    if (personalization.preacherNotes?.trim()) {
        lines.push(`NOTAS DEL PREDICADOR (ideas a desarrollar e integrar):\n${personalization.preacherNotes.trim()}`);
    }

    if (lines.length === 0) return '';

    return `
═══ VOZ DEL PREDICADOR ═══
${lines.join('\n\n')}
═════════════════════════

INSTRUCCIONES SOBRE LA VOZ DEL PREDICADOR:
- El contenido de arriba refleja la voz, intención y contexto del predicador.
- Integra sus ilustraciones y notas de forma orgánica en el sermón.
- El tono general del sermón debe alinearse con la indicación de tono.
- Las aplicaciones deben ser relevantes para la congregación descrita.

`;
}
