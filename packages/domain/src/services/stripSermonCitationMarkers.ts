import type { SermonContent } from '../entities/SermonGenerator';

/**
 * Per ADR-031 the sermon cites NARRATIVELY ("Como resume la Confesión…") AND
 * carries a verifiable anchor: the bare-ordinal marker `[N]` that
 * `validateCitations` produces, which the renderer turns into a clickable
 * popover (chunk text + book + page). Those VALID `[N]` anchors must survive.
 *
 * What must NOT survive is junk the model leaks that `validateCitations` does
 * not normalise into a valid anchor:
 *   - labelled tokens: `[cite: S3]`, `[fuente: 1]`, `[source: 2]`, `[ref: 3]`
 *   - S-prefixed tokens: `[S3]`, `[S1, S3]` — if these reached the prose they
 *     were never validated/renumbered (a valid one would already be `[N]`).
 *
 * This pure pass strips that junk from every prose surface while leaving the
 * narrative attribution AND the valid `[N]` anchors intact. Bible reference
 * links (`[📖 Juan 1:1](#bible-juan-1-1)`) are preserved — they contain a
 * non-digit first char and a trailing `(`.
 */

// Labelled junk: `[cite: …]`, `[fuente: …]`, `[source: …]`, `[ref: …]`.
const LABELLED_TOKEN_RE = / ?\[\s*(?:cite|fuente|source|ref)\b[^\]]*\](?!\()/gi;
// S-prefixed junk that escaped validation: `[S3]`, `[S1, S3]` (NOT bare `[3]`).
const S_PREFIXED_TOKEN_RE = / ?\[\s*S\d+(?:\s*,\s*S?\d+)*\s*\](?!\()/gi;

function stripProse(text: string | undefined): string | undefined {
    if (text === undefined) return undefined;
    return text
        .replace(LABELLED_TOKEN_RE, '')
        .replace(S_PREFIXED_TOKEN_RE, '')
        // tidy up the gap a removed token leaves before punctuation/space
        .replace(/[ \t]+([.,;:!?])/g, '$1')
        .replace(/[ \t]{2,}/g, ' ');
}

export function stripSermonCitationMarkers(content: SermonContent): SermonContent {
    return {
        ...content,
        introduction: stripProse(content.introduction) ?? content.introduction,
        conclusion: stripProse(content.conclusion) ?? content.conclusion,
        callToAction: stripProse(content.callToAction),
        body: content.body.map((point) => ({
            ...point,
            content: stripProse(point.content) ?? point.content,
            illustration: stripProse(point.illustration),
            transition: stripProse(point.transition),
        })),
    };
}
