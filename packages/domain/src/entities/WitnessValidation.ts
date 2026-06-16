/**
 * Pastoral Fidelity — Phase 2 three-witnesses validation (ADR-011).
 *
 * Pure domain layer for the "tres testigos" mechanism. The orchestration
 * (LLM calls, Firestore reads) lives in the `validateSeedWitnesses`
 * Cloud Function; everything here is deterministic + testable without IO:
 *
 *   - claim extraction from the seed (`collectSeedClaims`)
 *   - per-claim escalation (`escalateClaim`) — level × dissent count
 *   - aggregation (`aggregateWitnessResult`)
 *   - resolution gating (`canProceedFromWitnesses`)
 *
 * The escalation model replaces the by-count table of ADR-001 with the
 * three doctrine-level system (core / distinctive / open-evangelical)
 * from 06-pedagogy-applied § 4. See ADR-011 for the full rationale.
 */

import type { DoctrineLevel } from './Confession';
import type { PastoralSeed } from './PastoralSeed';

/** Bump when the witness prompts change — invalidates `witnessResults/` cache. */
export const WITNESS_PROMPT_VERSION = 'v1';

export const WITNESS_THRESHOLDS = {
    /** A verdict only counts as dissent above this confidence. */
    dissentConfidenceMin: 0.6,
    /** Minimum chars for a soft-block override response. */
    softBlockResponseMinChars: 50,
    /** Minimum chars for a hard-block override response. */
    hardBlockResponseMinChars: 100,
} as const;

/** The three witnesses. */
export type WitnessId = 'context' | 'parallels' | 'confession';

export const WITNESS_IDS: WitnessId[] = ['context', 'parallels', 'confession'];

/** Which seed field a validated claim came from (sermon pipeline). */
export type SeedClaimKind =
    | 'centralIdea'
    | 'observation'
    | 'doxologicalApplication'
    /** Phase 1.6 (ADR-023) — the timeless principle (Step 7). */
    | 'principle';

/**
 * Provenance label carried through the escalation pipeline. The escalation
 * math NEVER switches on `kind` (it's a label only — see `escalateClaim`,
 * which takes only `detectedLevel` + `dissentCount`), so the type stays OPEN:
 * other sources reusing the same engine (e.g. `estudio_madre` element kinds)
 * pass their own kind strings without coupling this entity to their vocabulary.
 * The `(string & {})` keeps autocomplete for the seed kinds.
 */
export type ClaimKind = SeedClaimKind | (string & {});

/**
 * Escalation outcome for a claim, ordered by severity. `absolute-block`
 * is the only level with no override (negating an ecumenical core).
 */
export type EscalationLevel =
    | 'pass'
    | 'note'
    | 'soft-block'
    | 'hard-block'
    | 'absolute-block';

const ESCALATION_SEVERITY: Record<EscalationLevel, number> = {
    pass: 0,
    note: 1,
    'soft-block': 2,
    'hard-block': 3,
    'absolute-block': 4,
};

/** A single witness's read on a single claim. */
export interface WitnessVerdict {
    witness: WitnessId;
    /** Whether this witness flags tension with the claim. */
    dissents: boolean;
    /** Pastoral, español. Why it dissents (or why it concurs). */
    reasoning: string;
    /** Supporting references / sections the witness leaned on. */
    evidence: string[];
    /** 0–1. A dissent below `dissentConfidenceMin` is downgraded to concur. */
    confidence: number;
}

/** One claim from the seed plus its three verdicts + computed escalation. */
export interface WitnessedClaim {
    /** Stable key: 'centralIdea' | 'observation:{i}' | 'doxologicalApplication'. */
    key: string;
    kind: ClaimKind;
    /** Index within `observations` when `kind === 'observation'`. */
    index?: number;
    /** The pastor's own text being validated. */
    text: string;
    /** Doctrine level assigned by Testigo 3. `null` when not classified. */
    detectedLevel: DoctrineLevel | null;
    verdicts: WitnessVerdict[];
    /** Count of dissenting witnesses at confidence ≥ threshold. */
    dissentCount: number;
    escalation: EscalationLevel;
}

export interface WitnessResult {
    seedId: string;
    sermonId: string;
    claims: WitnessedClaim[];
    /** Max severity across claims. */
    overallEscalation: EscalationLevel;
    /** True iff any claim is hard- or absolute-block. */
    requiresFaculty: boolean;
    /** Whether T3 distinctive/open checks ran (ADR-010 toggle). */
    confessionalWitnessesEnabled: boolean;
    promptVersion: string;
    generatedAt: Date;
}

/** The pastor's response to a blocked claim. Persisted on the seed. */
export interface WitnessResolution {
    /** Matches `WitnessedClaim.key`. */
    claimKey: string;
    escalation: EscalationLevel;
    /** The written response (≥50 soft, ≥100 hard). */
    response: string;
    /** Whether the pastor opened the Faculty doctrinal launcher (hard-block). */
    facultyConsulted?: boolean;
    resolvedAt: Date;
}

/** Audit trail of the witness review, stored on `PastoralSeed.witnessReview`. */
export interface WitnessReview {
    validatedAt: Date;
    overallEscalation: EscalationLevel;
    resolutions: WitnessResolution[];
    /** True once the pastor cleared the gate and advanced to the draft. */
    proceeded: boolean;
}

/**
 * Curated ecumenical core doctrines (Apostles / Nicene-Constantinople /
 * Chalcedon + shared evangelical affirmations). Injected into the T3
 * prompt so the classifier anchors `core` detection on this list rather
 * than improvising. Negating any of these → `absolute-block`.
 *
 * Not exhaustive by design — the list is the floor, reviewed pastorally.
 */
export const CORE_DOCTRINE_CLAIMS: ReadonlyArray<{ id: string; statement: string }> = [
    { id: 'trinity', statement: 'Un solo Dios en tres personas: Padre, Hijo y Espíritu Santo.' },
    { id: 'deity-of-christ', statement: 'Jesucristo es verdaderamente Dios, de la misma sustancia que el Padre.' },
    { id: 'incarnation', statement: 'El Hijo se encarnó verdaderamente: dos naturalezas, divina y humana, en una persona (Calcedonia).' },
    { id: 'bodily-resurrection', statement: 'Cristo resucitó corporalmente de entre los muertos.' },
    { id: 'salvation-by-grace', statement: 'La salvación es por gracia mediante la fe, no por obras.' },
    { id: 'scripture-authority', statement: 'La Escritura es suficiente y la autoridad final en fe y práctica.' },
    { id: 'virgin-birth', statement: 'Cristo fue concebido por el Espíritu Santo y nacido de la virgen María.' },
    { id: 'second-coming', statement: 'Cristo volverá a juzgar a vivos y muertos.' },
] as const;

/** Extracts the doctrinal claims the witnesses validate (ADR-011 § 1). */
export function collectSeedClaims(seed: PastoralSeed): Array<{
    key: string;
    kind: ClaimKind;
    index?: number;
    text: string;
}> {
    const claims: Array<{ key: string; kind: ClaimKind; index?: number; text: string }> = [];
    const insight = seed.insight;
    if (insight?.centralIdea?.trim()) {
        claims.push({ key: 'centralIdea', kind: 'centralIdea', text: insight.centralIdea.trim() });
    }
    (insight?.observations ?? []).forEach((o, i) => {
        if (o?.trim()) {
            claims.push({ key: `observation:${i}`, kind: 'observation', index: i, text: o.trim() });
        }
    });
    if (insight?.doxologicalApplication?.trim()) {
        claims.push({
            key: 'doxologicalApplication',
            kind: 'doxologicalApplication',
            text: insight.doxologicalApplication.trim(),
        });
    }
    // Phase 1.6 (ADR-023): the timeless principle is a doctrinal claim too;
    // the full gate validates it alongside the insight claims.
    const principle = seed.timelessPrinciple?.principle?.trim();
    if (principle) {
        claims.push({ key: 'principle', kind: 'principle', text: principle });
    }
    return claims;
}

/**
 * Phase 1.6 (ADR-023) — the doctrinally-loaded claims eligible for the
 * inline `core`-only tripwire (Tier 1). These are the fields where an
 * eisegesis at the source contaminates everything downstream: the central
 * idea, each observation, and the timeless principle. The inline hook runs
 * Testigo 3 (`core` level only) on the *just-edited* field; this helper
 * enumerates the candidates so the caller can match the edited field.
 *
 * Deliberately EXCLUDES `doxologicalApplication` and earlier exegetical
 * steps — the tripwire fires on synthesis fields, not on observation of
 * the text. `core`-only by design (productive struggle: silence on
 * distinctive / open-evangelical until the full gate).
 */
export function collectCoreTripwireClaims(seed: PastoralSeed): Array<{
    key: string;
    kind: ClaimKind;
    index?: number;
    text: string;
}> {
    const claims: Array<{ key: string; kind: ClaimKind; index?: number; text: string }> = [];
    const insight = seed.insight;
    if (insight?.centralIdea?.trim()) {
        claims.push({ key: 'centralIdea', kind: 'centralIdea', text: insight.centralIdea.trim() });
    }
    (insight?.observations ?? []).forEach((o, i) => {
        if (o?.trim()) {
            claims.push({ key: `observation:${i}`, kind: 'observation', index: i, text: o.trim() });
        }
    });
    const principle = seed.timelessPrinciple?.principle?.trim();
    if (principle) {
        claims.push({ key: 'principle', kind: 'principle', text: principle });
    }
    return claims;
}

/** Counts dissents at or above the confidence threshold. */
export function countDissents(verdicts: WitnessVerdict[]): number {
    return verdicts.filter(
        (v) => v.dissents && v.confidence >= WITNESS_THRESHOLDS.dissentConfidenceMin,
    ).length;
}

/**
 * Pure escalation: doctrine level × dissent count (ADR-011 § 4).
 *
 * - core + any dissent → absolute-block (no override)
 * - otherwise by-count {0:pass,1:note,2:soft,3:hard}, capped by level
 *   (open-evangelical caps at note; distinctive/null cap at hard-block).
 */
export function escalateClaim(
    detectedLevel: DoctrineLevel | null,
    dissentCount: number,
): EscalationLevel {
    if (detectedLevel === 'core' && dissentCount >= 1) return 'absolute-block';

    const byCount: EscalationLevel =
        dissentCount >= 3 ? 'hard-block'
        : dissentCount === 2 ? 'soft-block'
        : dissentCount === 1 ? 'note'
        : 'pass';

    const cap: EscalationLevel =
        detectedLevel === 'open-evangelical' ? 'note' : 'hard-block';

    return ESCALATION_SEVERITY[byCount] <= ESCALATION_SEVERITY[cap] ? byCount : cap;
}

/** Reduces verdicts into a fully-escalated claim. */
export function escalateWitnessedClaim(input: {
    key: string;
    kind: ClaimKind;
    index?: number;
    text: string;
    detectedLevel: DoctrineLevel | null;
    verdicts: WitnessVerdict[];
}): WitnessedClaim {
    const dissentCount = countDissents(input.verdicts);
    return {
        key: input.key,
        kind: input.kind,
        index: input.index,
        text: input.text,
        detectedLevel: input.detectedLevel,
        verdicts: input.verdicts,
        dissentCount,
        escalation: escalateClaim(input.detectedLevel, dissentCount),
    };
}

/** Picks the most severe escalation across claims. */
export function maxEscalation(claims: WitnessedClaim[]): EscalationLevel {
    let worst: EscalationLevel = 'pass';
    for (const c of claims) {
        if (ESCALATION_SEVERITY[c.escalation] > ESCALATION_SEVERITY[worst]) worst = c.escalation;
    }
    return worst;
}

/** Builds the aggregate result from escalated claims. */
export function aggregateWitnessResult(input: {
    seedId: string;
    sermonId: string;
    claims: WitnessedClaim[];
    confessionalWitnessesEnabled: boolean;
    promptVersion?: string;
    generatedAt?: Date;
}): WitnessResult {
    const overallEscalation = maxEscalation(input.claims);
    const requiresFaculty = input.claims.some(
        (c) => c.escalation === 'hard-block' || c.escalation === 'absolute-block',
    );
    return {
        seedId: input.seedId,
        sermonId: input.sermonId,
        claims: input.claims,
        overallEscalation,
        requiresFaculty,
        confessionalWitnessesEnabled: input.confessionalWitnessesEnabled,
        promptVersion: input.promptVersion ?? WITNESS_PROMPT_VERSION,
        generatedAt: input.generatedAt ?? new Date(),
    };
}

/** Claims that need a written response before the gate clears. */
export function claimsRequiringResponse(result: WitnessResult): WitnessedClaim[] {
    return result.claims.filter(
        (c) => c.escalation === 'soft-block' || c.escalation === 'hard-block',
    );
}

/** Claims that can never be overridden — pastor must revise the text. */
export function claimsBlockingAbsolutely(result: WitnessResult): WitnessedClaim[] {
    return result.claims.filter((c) => c.escalation === 'absolute-block');
}

export interface ProceedDecision {
    allowed: boolean;
    /** Claim keys still missing a valid response. */
    pendingKeys: string[];
    /** True when an absolute block makes the seed unpublishable as-is. */
    hasAbsoluteBlock: boolean;
}

/**
 * Decides whether the pastor may leave the witness gate toward the draft.
 *
 * - any absolute-block → never (must revise the claim)
 * - soft-block → response ≥50 chars
 * - hard-block → response ≥100 chars
 * - pass / note → no response needed
 */
export function canProceedFromWitnesses(
    result: WitnessResult,
    resolutions: ReadonlyArray<{ claimKey: string; response: string }>,
): ProceedDecision {
    const absolute = claimsBlockingAbsolutely(result);
    const byKey = new Map(resolutions.map((r) => [r.claimKey, r.response ?? '']));
    const pendingKeys: string[] = [];

    for (const claim of claimsRequiringResponse(result)) {
        const min =
            claim.escalation === 'hard-block'
                ? WITNESS_THRESHOLDS.hardBlockResponseMinChars
                : WITNESS_THRESHOLDS.softBlockResponseMinChars;
        const response = (byKey.get(claim.key) ?? '').trim();
        if (response.length < min) pendingKeys.push(claim.key);
    }

    return {
        allowed: absolute.length === 0 && pendingKeys.length === 0,
        pendingKeys,
        hasAbsoluteBlock: absolute.length > 0,
    };
}

/**
 * Stable claim key for the doxological (affective) application — the one
 * application field the sermon seed carries. Mirrors the key produced by
 * `collectSeedClaims`.
 */
export const DOXOLOGICAL_CLAIM_KEY = 'doxologicalApplication';

/**
 * Three-way gate outcome for the doxological claim, narrowed from a full
 * `WitnessResult`. This is the *scoped collector* for the doxological gate
 * (the affective-leak fix): it does NOT re-run any witness, build any new
 * threshold, or touch the escalation math — it reads the escalation the single
 * motor already computed for the `doxologicalApplication` claim and folds it
 * into the gate's three states.
 *
 * Folding (reuses `EscalationLevel`, no new threshold):
 * - `pass`  ← `pass` | `note`            (no response needed)
 * - `soft`  ← `soft-block`               (override response ≥50, see WITNESS_THRESHOLDS)
 * - `hard`  ← `hard-block` | `absolute-block` (response ≥100 / unoverridable)
 *
 * `absent` means the result carried no doxological claim (empty field) — the
 * caller decides what that means per flow; the gate itself stays silent.
 *
 * The raw `escalation` is preserved so shadow-mode logging can distinguish
 * `absolute-block` from `hard-block` without a second pass.
 */
export type DoxologicalGate =
    | { status: 'absent' }
    | {
          status: 'pass' | 'soft' | 'hard';
          escalation: EscalationLevel;
          claim: WitnessedClaim;
      };

export function evaluateDoxologicalGate(result: WitnessResult): DoxologicalGate {
    const claim = result.claims.find((c) => c.key === DOXOLOGICAL_CLAIM_KEY);
    if (!claim) return { status: 'absent' };
    const e = claim.escalation;
    const status: 'pass' | 'soft' | 'hard' =
        e === 'pass' || e === 'note'
            ? 'pass'
            : e === 'soft-block'
              ? 'soft'
              : 'hard'; // hard-block | absolute-block
    return { status, escalation: e, claim };
}

/**
 * Normalización compartida del texto doxológico — Capa 2.B.
 *
 * DEBE ser idéntica en compute-time (al persistir `DoxologicalGate.fingerprint`)
 * y en check-time (enforce en el chokepoint). Una divergencia produce stale
 * falsos: el gate re-dispararía sin que el texto cambie de fondo. NFC + colapso
 * de espacios + trim. Función única; nadie normaliza por su cuenta.
 */
export function normalizeDoxological(text: string): string {
    return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * Fingerprint determinista del texto doxológico normalizado (dos carriles
 * FNV-1a → 16 hex). NO criptográfico — solo detecta cambios de contenido para
 * invalidar veredicto + override cuando el pastor edita la aplicación. Puro y
 * portable (sin `crypto`), corre igual en dominio/web/functions.
 */
export function doxologicalFingerprint(text: string): string {
    const norm = normalizeDoxological(text);
    let h1 = 0x811c9dc5;
    let h2 = 0xc59d1c81;
    for (let i = 0; i < norm.length; i++) {
        const c = norm.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ c, 0x85ebca77);
    }
    const hex = (h: number) => (h >>> 0).toString(16).padStart(8, '0');
    return hex(h1) + hex(h2);
}

/** Override del pastor a un bloqueo doxológico, LIGADO a su fingerprint. Si el
 * texto cambia (nuevo fingerprint), el override viejo deja de aplicar — hay que
 * re-justificar contra el veredicto nuevo. */
export interface DoxologicalGateOverride {
    /** Respuesta escrita (≥50 soft, ≥100 hard — umbral existente). */
    response: string;
    facultyConsulted: boolean;
    /** Fingerprint para el que se escribió este override. */
    fingerprint: string;
    resolvedAt: Date;
}

/**
 * Estado AUTORITATIVO del gate doxológico persistido en el seed (Capa 2.B).
 * El shadow loguea a telemetría; ESTO vive en el seed para que el enforce
 * (C/D) lo lea en el chokepoint. Aditivo + inerte hasta que `doxological_enforce`
 * flipee.
 */
export interface DoxologicalGateRecord {
    /** Fingerprint del texto doxológico validado (normalizado). */
    fingerprint: string;
    /** Veredicto plegado, o 'sin_auditar' para seeds legacy pre-B grandfathered (C/D). */
    status: 'pass' | 'soft' | 'hard' | 'sin_auditar';
    /** Banda cruda del único motor; null para legacy sin_auditar. */
    escalation: EscalationLevel | null;
    validatedAt: Date;
    /** Override ligado a su fingerprint; SIEMPRE null al (re)correr el gate. */
    override: DoxologicalGateOverride | null;
    /** True para seeds pre-B grandfathered (lo estampa C/D, no B). */
    legacy?: boolean;
}

/**
 * Construye el `DoxologicalGate` autoritativo desde un `WitnessResult` ya
 * escalado (Capa 2.B). Reusa `evaluateDoxologicalGate` (único motor) — sin
 * re-thresholdear. `override` SIEMPRE null: cada (re)corrida limpia el override
 * viejo, que el pastor re-adquiere contra el fingerprint nuevo. Devuelve null
 * cuando no hay claim doxológico (texto vacío/ausente → nada que persistir).
 */
export function buildDoxologicalGate(
    result: WitnessResult,
    validatedAt: Date,
): DoxologicalGateRecord | null {
    const gate = evaluateDoxologicalGate(result);
    if (gate.status === 'absent') return null;
    return {
        fingerprint: doxologicalFingerprint(gate.claim.text),
        status: gate.status,
        escalation: gate.escalation,
        validatedAt,
        override: null,
    };
}
