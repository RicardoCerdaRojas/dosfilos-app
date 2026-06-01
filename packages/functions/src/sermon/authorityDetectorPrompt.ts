/**
 * Pastoral Fidelity — Phase 3 PR 4 prompt builder for the authority-
 * subordination detector (ADR-006 §8 / manifesto §6).
 *
 * Runs as a THIRD Gemini Flash call inside `evaluateClaimSourceFidelity`
 * (same callable, same keys — consistent with the plurality tagger). It scans
 * the sermon prose for sentences that lean on a confession / creed / theologian
 * as the FINAL authority ("la Confesión de Westminster lo afirma, por tanto es
 * verdad") instead of grounding the assertion in the biblical text. The creed
 * is a witness to what the text teaches — never the ground itself.
 *
 * It must NOT flag legitimate, subordinate uses: "la iglesia ha confesado X
 * (WCF 2.1) porque el texto enseña…" is fine — the text is the ground and the
 * creed corroborates. Only flag when the human/confessional authority is doing
 * the load-bearing work.
 *
 * Language policy mirrors the other prompts: English system instruction;
 * `claim` copied verbatim (the pastor's prose); `reformulationHint` +
 * `reasoning` written in the pastor's locale.
 */

export interface AuthorityDetectorInput {
    prose: string;
    locale?: 'es' | 'en';
}

export interface BuiltPrompt {
    system: string;
    prompt: string;
}

const DETECTOR_SYSTEM = `You are an authority-subordination checker for a Spanish-language expository preaching platform. The platform's core conviction (sola Scriptura applied to METHOD): a confession, creed, council, or theologian is a WITNESS to what Scripture teaches — never the final ground of a claim. The ground is always the biblical text, read honestly.

Scan the sermon prose and flag sentences where a confession / creed / council / theologian is used as the FINAL authority for a doctrinal claim — i.e. the claim's justification is "the creed/theologian says so" rather than "the text says so".

Flag (examples of the BAD pattern):
  - "La Confesión de Westminster afirma X, por tanto debemos creerlo."
  - "Esto es verdad porque Calvino lo enseñó."
  - "El Concilio de Nicea lo definió, así que es doctrina."

Do NOT flag (legitimate subordinate use — the text is the ground, the creed corroborates):
  - "El texto enseña X; por eso la iglesia lo ha confesado (WCF 2.1)."
  - "Los Padres leyeron este pasaje así porque el texto lo exige."
  - A bare historical mention that doesn't carry the claim's weight.

For each violation, return the verbatim sentence, the authority it leans on, a short reasoning, and a reformulationHint: a rewrite that grounds the SAME claim in the text (appealing to what the passage says/demands), keeping the creed as a corroborating witness if useful.

Hard rules:
  - Copy "claim" verbatim from the prose. Do not paraphrase it.
  - Precision over recall: when unsure whether the authority is load-bearing, DO NOT flag.
  - "reformulationHint" and "reasoning" in the requested locale; "claim" + "citedAuthority" verbatim.`;

const JSON_SHAPE = `Respond with ONLY a JSON object of the form:

{
  "violations": [
    {
      "claim": "<verbatim sentence>",
      "citedAuthority": "<e.g. Confesión de Westminster 2.1 / Calvino / Concilio de Nicea>",
      "reformulationHint": "<rewrite grounding the claim in the text>",
      "reasoning": "<one sentence>"
    }
  ]
}

If the sermon has no authority-subordination problems, return { "violations": [] }. Do not add markdown fences or commentary outside the JSON.`;

export function buildAuthorityDetectorPrompt(input: AuthorityDetectorInput): BuiltPrompt {
    const locale = input.locale ?? 'es';
    const system = `${DETECTOR_SYSTEM}

The "reformulationHint" and "reasoning" must be written in ${localeName(locale)}; all JSON keys stay in English exactly as specified.

${JSON_SHAPE}`;

    const prompt = ['Sermon prose:', input.prose].join('\n');
    return { system, prompt };
}

function localeName(locale: 'es' | 'en'): string {
    return locale === 'es' ? 'Spanish' : 'English';
}
