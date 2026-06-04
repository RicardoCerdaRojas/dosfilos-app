import type { SermonContent } from '../entities/SermonGenerator';

/**
 * Per ADR-030 the sermon cites NARRATIVELY (07-citation-policy §4) and its
 * prose carries NO inline citation markers — those are a paper feature.
 *
 * Even with a narrative-citation prompt, the LLM occasionally appends a
 * bracketed citation token to a sentence (`[S3]`, `[cite: S3]`, `[3]`,
 * `[1, 3]`). `validateCitations` only normalises the bare-ordinal form, so
 * variants like `[cite: S3]` leak into the rendered sermon as raw syntax.
 *
 * This pure pass strips any such token from every prose surface of the
 * sermon, leaving the narrative attribution ("Como resume la Confesión…")
 * untouched. Bibliography + legal attribution are unaffected — they come
 * from `ragSources`/`citationManifest`, not from prose markers.
 *
 * Bible reference links (`[📖 Juan 1:1](#bible-juan-1-1)`) are preserved:
 * the token pattern requires the bracket to contain only an optional
 * `cite:` plus `S?`-digits, and a trailing `(` (markdown link) is excluded.
 */

// `[S3]`, `[cite: S3]`, `[3]`, `[1, 3]`, `[cite: S1, S3]` — never `[📖 …](…)`.
const CITATION_TOKEN_RE =
    / ?\[\s*(?:cite:\s*)?S?\d+(?:\s*,\s*(?:cite:\s*)?S?\d+)*\s*\](?!\()/gi;

function stripProse(text: string | undefined): string | undefined {
    if (text === undefined) return undefined;
    return text
        .replace(CITATION_TOKEN_RE, '')
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
