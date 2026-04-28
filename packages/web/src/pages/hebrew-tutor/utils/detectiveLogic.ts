import type { WordAnalysis } from '@dosfilos/domain';
import { DetectivePhase, VerbType } from '@dosfilos/domain';

export type InvestigationPath = 'strong' | 'weak' | null;

/**
 * Ordered phase sequences for each investigation path.
 * Phases 1-2 are shared; the rest diverge based on TRIAGE result.
 * The weak path ends at WEAK_BINYAN (Phase 5) — no Phase 6 needed
 * since the verb type was already established in WEAK_ROOT (Phase 4).
 *
 * The weak path is DYNAMIC: the PREFORMATIVE phase is only included
 * when the verb actually has a preformative morpheme (Imperfect forms).
 * Perfect, Infinitive, Imperative, and Participle forms skip it.
 */
export const STRONG_PATH: DetectivePhase[] = [
    DetectivePhase.OBSERVE,
    DetectivePhase.TRIAGE,
    DetectivePhase.COLORS,
    DetectivePhase.DAGESH,
    DetectivePhase.BINYAN,
    DetectivePhase.VERB_FORM,
    DetectivePhase.STRONG_CONFIRM,
    DetectivePhase.TRANSLATION,
];

/**
 * Verb types that follow the STRONG investigation path.
 *
 * - STRONG:      fully regular — no missing/transformed radicals
 * - I_ALEF:      Pe-Alef verbs behave near-regularly (alef quiesces quietly)
 * - III_ALEF:    Lamed-Alef verbs show all 3 radicals as consonants. The final
 *                alef is quiescent but visually present — a student correctly
 *                observes "3 clear radicals" in triage. The STRONG_CONFIRM phase
 *                normalises III_ALEF → GUTURAL_R3 for the sub-classification step.
 * - GUTURAL_R*:  all 3 radicals present; root is altered by vocal compensation,
 *                not by radical loss — therefore classified as strong in TRIAGE
 */
export const STRONG_VERB_TYPES = new Set<VerbType>([
    VerbType.STRONG,
    VerbType.I_ALEF,
    VerbType.III_ALEF,
    VerbType.GUTURAL_R1,
    VerbType.GUTURAL_R2,
    VerbType.GUTURAL_R3,
]);

/** Checks whether the word has a preformative morpheme (Imperfect prefix). */
export function hasPreformative(word: WordAnalysis): boolean {
    return (word.morphemes ?? []).some(m => m.role === 'PREFORMATIVE');
}

/** Builds the weak path sequence, conditionally including PREFORMATIVE. */
export function getWeakPath(word: WordAnalysis): DetectivePhase[] {
    const phases: DetectivePhase[] = [
        DetectivePhase.OBSERVE,
        DetectivePhase.TRIAGE,
    ];
    if (hasPreformative(word)) {
        phases.push(DetectivePhase.PREFORMATIVE);
    }
    phases.push(
        DetectivePhase.WEAK_ROOT,
        DetectivePhase.WEAK_BINYAN,
        DetectivePhase.VERB_FORM,
        DetectivePhase.TRANSLATION,
    );
    return phases;
}

/** Returns the next phase for the given path, or null if session is complete. */
export function getNextPhase(
    current: DetectivePhase,
    path: InvestigationPath,
    word: WordAnalysis,
): DetectivePhase | null {
    const sequence = path === 'weak' ? getWeakPath(word) : STRONG_PATH;
    const idx = sequence.indexOf(current);
    if (idx === -1 || idx >= sequence.length - 1) return null;
    return sequence[idx + 1];
}

/** Returns the set of phases that should be skipped for this word. */
export function getSkippedPhases(word: WordAnalysis, path: InvestigationPath): Set<DetectivePhase> {
    const skipped = new Set<DetectivePhase>();
    if (path === 'weak' && !hasPreformative(word)) {
        skipped.add(DetectivePhase.PREFORMATIVE);
    }
    return skipped;
}

/**
 * Cross-validates the backend's verbType against the actual morpheme evidence.
 *
 * Strategy:
 *  1. Strip the lexical root (word.root) down to its base consonants (הלך → [ה,ל,ך]).
 *  2. Extract the consonants actually present in root morphemes (ROOT_R1/R2/R3).
 *  3. Find which root consonant is missing from the surface form.
 *  4. Map the missing position to a grammatical weak-verb type.
 *
 * This is fully pattern-based and does NOT hardcode specific verbs.
 * It handles the case where the backend re-numbers radicals in shortened forms
 * (e.g., הלך → לֵךְ: backend labels ל as ROOT_R1, ך as ROOT_R3, making it look
 * like R2 is missing — but comparing against the root ה·ל·ך shows R1 (ה) dropped).
 */
export function getEffectiveVerbClassification(word: WordAnalysis): {
    verbType: VerbType;
    path: 'strong' | 'weak';
} {
    const backendType = (word.verbMorphology?.verbType as VerbType | undefined) ?? VerbType.STRONG;
    const morphemes = word.morphemes ?? [];

    const rootConsonants = (word.root ?? '')
        .replace(/[֑-ׇﬞ]/g, '')
        .split('')
        .filter(c => c >= 'א' && c <= 'ת');

    const rootMorphemeRoles = new Set(['ROOT_R1', 'ROOT_R2', 'ROOT_R3']);
    const presentConsonants = new Set<string>();
    for (const m of morphemes) {
        if (!rootMorphemeRoles.has(m.role)) continue;
        const clean = (m.text ?? '').replace(/[֑-ׇﬞ]/g, '');
        for (const c of clean) {
            if (c >= 'א' && c <= 'ת') presentConsonants.add(c);
        }
    }

    const missingPositions: number[] = [];
    for (let i = 0; i < rootConsonants.length; i++) {
        if (!presentConsonants.has(rootConsonants[i])) {
            missingPositions.push(i);
        }
    }

    const missingCount = missingPositions.length;

    if (STRONG_VERB_TYPES.has(backendType) && missingCount > 0) {
        let inferredType = backendType;
        const firstMissing = missingPositions[0];

        if (firstMissing === 0) {
            const r1 = rootConsonants[0];
            inferredType = r1 === 'נ' ? VerbType.I_NUN : VerbType.I_YOD_WAW;
        } else if (firstMissing === 1) {
            inferredType = VerbType.II_WAW_YOD;
        } else if (firstMissing === 2) {
            inferredType = VerbType.III_HE;
        }

        console.warn(
            `[Detective] Backend classified "${word.root}" as ${backendType} but ` +
            `${missingCount} root consonant(s) missing at position(s) [${missingPositions.join(',')}]. ` +
            `Overriding to ${inferredType} (weak path).`
        );

        return { verbType: inferredType, path: 'weak' };
    }

    const path = STRONG_VERB_TYPES.has(backendType) ? 'strong' as const : 'weak' as const;
    return { verbType: backendType, path };
}

/** Derives the expected preformative vowel ID from the word's surface form (Lección 8 table). */
export function getExpectedPreformativeVowel(word: WordAnalysis): string {
    const extractVowel = (text: string): string | null => {
        if (text.includes('ָ') && text.includes('ו')) return 'jolem-vav';
        if (text.includes('ֹ') && text.includes('ו')) return 'jolem-vav';
        if (text.includes('ֹ')) return 'jolem-vav';
        if (text.includes('ָ')) return 'qamets';
        if (text.includes('ֵ')) return 'tsere';
        if (text.includes('ִ')) return 'jireq';
        if (text.includes('ַ')) return 'pataj';
        if (text.includes('ְ')) return 'sheva';
        return null;
    };

    const preformative = word.morphemes?.find(m => m.role === 'PREFIX_VERB' || m.role === 'PREFIX_PRONOMINAL');
    if (preformative && preformative.text) {
        const vowel = extractVowel(preformative.text);
        if (vowel) return vowel;
    }

    const text = word.hebrewText;
    const eitan = ['א', 'י', 'ת', 'נ'];
    let preformativeCharIndex = -1;

    for (let i = 0; i < text.length; i++) {
        if (eitan.includes(text[i])) {
            if (i <= 4) {
                preformativeCharIndex = i;
                break;
            }
        }
    }

    if (preformativeCharIndex !== -1) {
        let j = preformativeCharIndex + 1;
        let vowelStr = '';
        while (j < text.length && text.charCodeAt(j) >= 0x0591 && text.charCodeAt(j) <= 0x05C7) {
            vowelStr += text[j];
            j++;
        }
        if (j < text.length && text[j] === 'ו') {
            vowelStr += text[j];
        }

        const vowel = extractVowel(vowelStr);
        if (vowel) return vowel;
    }

    const verbType = word.verbMorphology?.verbType as VerbType | undefined;
    switch (verbType) {
        case VerbType.II_WAW_YOD: return 'qamets';
        case VerbType.GEMINATE: return 'qamets';
        case VerbType.I_YOD_WAW: return 'tsere';
        case VerbType.III_HE: return 'tsere';
        case VerbType.III_ALEF: return 'jireq';
        case VerbType.I_NUN: return 'jireq';
        default: return 'pataj';
    }
}

/** Returns the canonical correct answer for the given investigation phase. */
export function getCorrectAnswer(word: WordAnalysis, phase: DetectivePhase): string {
    const morph = word.verbMorphology;
    switch (phase) {
        case DetectivePhase.OBSERVE:
            return 'verb';
        case DetectivePhase.TRIAGE: {
            const { path } = getEffectiveVerbClassification(word);
            return path;
        }

        case DetectivePhase.COLORS:
            return (word.morphemes ?? []).map(m => m.role).join(', ');
        case DetectivePhase.DAGESH:
            return (word.morphemes ?? []).some(m => m.role === 'DAGESH_FORTE') ? 'yes' : 'no';
        case DetectivePhase.BINYAN:
            return morph?.binyan ?? '';
        case DetectivePhase.STRONG_CONFIRM:
            return morph?.verbType ?? 'STRONG';

        case DetectivePhase.PREFORMATIVE:
            return getExpectedPreformativeVowel(word);
        case DetectivePhase.WEAK_ROOT:
            return morph?.verbType ?? '';
        case DetectivePhase.WEAK_BINYAN:
            return morph?.binyan ?? '';

        case DetectivePhase.VERB_FORM:
            return morph?.verbForm ?? '';

        case DetectivePhase.TRANSLATION:
            return word.translation ?? '';

        default:
            return '';
    }
}

/** Whether a user answer is correct for a given phase. */
export function evaluateAnswer(
    word: WordAnalysis,
    phase: DetectivePhase,
    userAnswer: string,
): boolean {
    const correct = getCorrectAnswer(word, phase);
    const morph = word.verbMorphology;

    // COLORS is observational — any answer earns credit.
    if (phase === DetectivePhase.COLORS) return true;

    if (phase === DetectivePhase.PREFORMATIVE)
        return userAnswer === getExpectedPreformativeVowel(word);

    if (phase === DetectivePhase.DAGESH) {
        const hasDagesh = (word.morphemes ?? []).some(m => m.role === 'DAGESH_FORTE');
        return (userAnswer === 'yes' && hasDagesh) || (userAnswer !== 'yes' && !hasDagesh);
    }

    if (
        phase === DetectivePhase.BINYAN ||
        phase === DetectivePhase.WEAK_BINYAN
    ) return userAnswer === morph?.binyan;

    if (phase === DetectivePhase.WEAK_ROOT) {
        const { verbType: effectiveType } = getEffectiveVerbClassification(word);
        return userAnswer === effectiveType;
    }

    if (phase === DetectivePhase.STRONG_CONFIRM) return userAnswer === morph?.verbType;

    if (phase === DetectivePhase.VERB_FORM)
        return userAnswer === morph?.verbForm;

    if (phase === DetectivePhase.TRANSLATION)
        return userAnswer.trim() === word.translation.trim();

    return userAnswer.trim().toLowerCase() === correct.trim().toLowerCase();
}
