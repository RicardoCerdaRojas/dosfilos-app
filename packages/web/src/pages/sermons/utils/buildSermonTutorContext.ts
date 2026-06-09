import type { SermonEntity } from '@dosfilos/domain';

/** Keep the injected sermon body bounded so the prompt stays reasonable. */
const MAX_BODY_CHARS = 6000;

/**
 * Builds the ephemeral grounding block handed to the tutor on each editor
 * follow-up: the sermon's title, passage(s) and (truncated) body. This is the
 * SAVED sermon — unsaved editor edits are not reflected until the pastor saves.
 */
export function buildSermonTutorContext(sermon: SermonEntity): string {
    const passage = (sermon.bibleReferences ?? []).filter(Boolean).join(', ');
    const body = (sermon.content ?? '').trim();
    const clampedBody = body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS)}\n[…]` : body;

    return [
        `Título: ${sermon.title}`,
        passage ? `Pasaje: ${passage}` : null,
        '',
        clampedBody || '(El sermón aún no tiene contenido.)',
    ]
        .filter((line) => line !== null)
        .join('\n');
}
