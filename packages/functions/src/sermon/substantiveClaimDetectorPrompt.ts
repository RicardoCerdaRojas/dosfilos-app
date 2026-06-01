/**
 * Pastoral Fidelity — Phase 3 PR 3 (ADR-029 §Q4) prompt builder for the
 * substantive-claim detector.
 *
 * Runs as a SECOND Gemini Flash call inside the `evaluateClaimSourceFidelity`
 * callable (same invocation, same keys, same tier — the operational reading
 * of Q4 "same batch": one callable, not one prompt). The marker-level
 * fidelity pass evaluates library citations; this pass looks at the whole
 * sermon prose and surfaces the doctrinally substantive ASSERTIONS plus the
 * biblical passages each one rests on, so the pure `computePluralityCheck`
 * can flag proof-texting (a core/distinctive claim leaning on a single
 * passage).
 *
 * Language policy mirrors the fidelity prompt: the system instruction is in
 * English (better JSON adherence); `claimText` is copied VERBATIM from the
 * sermon (the pastor's own Spanish/English prose), never translated.
 */

export interface SubstantiveClaimDetectorInput {
    /** Full joined sermon prose (intro + body + conclusion + CTA). */
    prose: string;
    /** Passage references attached to the sermon, as grounding context. */
    bibleReferences: string[];
    locale?: 'es' | 'en';
}

export interface BuiltPrompt {
    system: string;
    prompt: string;
}

const DETECTOR_SYSTEM = `You are a doctrinal-claim tagger for a Spanish-language expository preaching platform. Given a sermon's full prose, your job is to surface the SUBSTANTIVE doctrinal assertions it makes and, for each one, list the distinct biblical passages the sermon grounds it on.

A claim is "substantive" when it asserts a theological proposition the hearer is expected to believe (who God is, what Christ did, how salvation works, what the church is, etc.). Ignore illustrations, applications, transitions, anecdotes, and rhetorical questions.

Classify each substantive claim by doctrine level:
  - "core"             — ecumenical gospel essentials held across orthodox Christianity (Trinity, full deity + humanity of Christ, bodily resurrection, justification by grace through faith, authority of Scripture).
  - "distinctive"      — confessional/denominational positions sincere Christians divide over (baptism mode + subjects, church government, the Lord's Supper, millennial + covenant frameworks, charismata).
  - "open-evangelical" — matters of Christian liberty and prudence (worship style, secondary timing questions, methodology). These are exempt from the two-witness bar.

For "biblicalSources", list ONLY the biblical passages the sermon itself cites or clearly alludes to in support of that specific claim. Do not invent supporting passages the sermon never mentions — the point is to measure whether the PREACHER grounded the claim plurally, not whether grounding exists in the abstract.

Hard rules:
  - Copy "claimText" verbatim from the prose (one sentence). Do not paraphrase or translate it.
  - Only list a passage in "biblicalSources" if it appears in (or is unmistakably alluded to by) the prose for that claim.
  - Use a clean human reference label (e.g. "Juan 1:1", "Colosenses 1:16-17") AND the structured fields.
  - When unsure whether something is a substantive claim, omit it. Precision over recall.`;

const JSON_SHAPE = `Respond with ONLY a JSON object of the form:

{
  "claims": [
    {
      "claimText": "<one sentence, copied verbatim from the prose>",
      "detectedLevel": "core" | "distinctive" | "open-evangelical",
      "biblicalSources": [
        { "label": "Juan 1:1", "book": "Juan", "chapter": 1, "verseStart": 1, "verseEnd": 1 }
      ]
    }
  ]
}

"verseStart" and "verseEnd" are optional (omit for whole-chapter references). Do not add markdown fences, prose, or commentary outside the JSON. If the sermon makes no substantive claims, return { "claims": [] }.`;

/**
 * Build the substantive-claim detector prompt. One Flash call covering the
 * whole sermon. Cost ≈ one extra Flash request (~$0.001), within the
 * ADR-029 §Q1 budget.
 */
export function buildSubstantiveClaimDetectorPrompt(
    input: SubstantiveClaimDetectorInput,
): BuiltPrompt {
    const locale = input.locale ?? 'es';
    const system = `${DETECTOR_SYSTEM}

The "claimText" is verbatim prose (${localeName(locale)}); all JSON keys and "detectedLevel" labels stay in English exactly as specified.

${JSON_SHAPE}`;

    const refs = input.bibleReferences.filter(Boolean);
    const prompt = [
        refs.length > 0 ? `Sermon passage(s): ${refs.join('; ')}` : 'Sermon passage(s): (none provided)',
        '',
        'Sermon prose:',
        input.prose,
    ].join('\n');

    return { system, prompt };
}

function localeName(locale: 'es' | 'en'): string {
    return locale === 'es' ? 'Spanish' : 'English';
}
