/**
 * Types of clauses found in Greek New Testament syntax
 * 
 * Follows traditional Greek grammatical analysis based on:
 * - Wallace, Greek Grammar Beyond the Basics
 * - Stagg, The Abused Aorist
 * - Standard NT Greek pedagogy
 */
export enum ClauseType {
    /**
     * Main/Independent clause with finite verb in indicative mood
     * Example: Παρακαλῶ οὖν ὑμᾶς (Romans 12:1)
     */
    MAIN = 'MAIN',

    /**
     * Subordinate clause expressing purpose (ἵνα, ὥστε)
     * Example: ἵνα πιστεύητε (John 20:31)
     */
    SUBORDINATE_PURPOSE = 'SUBORDINATE_PURPOSE',

    /**
     * Subordinate clause expressing result (ὥστε, ὡς)
     * Example: ὥστε μὴ εἶναι ὑμᾶς (1 Cor 1:7)
     */
    SUBORDINATE_RESULT = 'SUBORDINATE_RESULT',

    /**
     * Subordinate clause expressing cause (ὅτι, διότι, γάρ)
     * Example: ὅτι θεὸς ἀγάπη ἐστίν (1 John 4:8)
     */
    SUBORDINATE_CAUSAL = 'SUBORDINATE_CAUSAL',

    /**
     * Conditional clause (εἰ, ἐάν)
     * Example: εἰ τέκνα, καὶ κληρονόμοι (Romans 8:17)
     */
    SUBORDINATE_CONDITIONAL = 'SUBORDINATE_CONDITIONAL',

    /**
     * Temporal clause (ὅτε, ὡς, ἕως)
     * Example: ὅτε ἦλθεν τὸ πλήρωμα τοῦ χρόνου (Gal 4:4)
     */
    SUBORDINATE_TEMPORAL = 'SUBORDINATE_TEMPORAL',

    /**
     * Indirect question clause (often with εἰ or interrogative words)
     * Example: εἰ υἱὸς εἶ τοῦ θεοῦ (Matt 4:3 - indirect question)
     */
    SUBORDINATE_INDIRECT_QUESTION = 'SUBORDINATE_INDIRECT_QUESTION',

    /**
     * Clause built around a participle
     * Can function adjectivally, adverbially, or substantively
     */
    PARTICIPIAL = 'PARTICIPIAL',

    /**
     * Clause built around an infinitive
     * Often articular (τὸ + infinitive)
     */
    INFINITIVAL = 'INFINITIVAL',

    /**
     * Relative clause introduced by relative pronoun (ὅς, ἥ, ὅ)
     * Example: ὃς ἐγένετο ἐκ σπέρματος Δαυίδ (Romans 1:3)
     */
    RELATIVE = 'RELATIVE'
}

/**
 * Represents a syntactic clause within a Greek New Testament passage
 * 
 * Design Principles:
 * - Immutable value object (all properties readonly)
 * - Self-contained (no external dependencies)
 * - Rich domain model (encapsulates business logic)
 * 
 * A Clause represents a syntactic unit containing:
 * - A main verb (finite, participial, or infinitival)
 * - Its arguments and modifiers
 * - Relationships to other clauses (parent/children)
 */
export interface Clause {
    /** Unique identifier for this clause */
    readonly id: string;

    /** Syntactic type of this clause */
    readonly type: ClauseType;

    /**
     * Indices of words (in BiblicalPassage.words array) that belong to this clause
     * Invariant: Must contain at least one word
     */
    readonly wordIndices: readonly number[];

    /**
     * Index of the main verb of this clause (in BiblicalPassage.words array)
     * - For finite clauses: the finite verb
     * - For participial clauses: the participle
     * - For infinitival clauses: the infinitive
     * - undefined for verbless clauses (rare in NT Greek)
     */
    readonly mainVerbIndex?: number;

    /**
     * ID of parent clause (if this is a subordinate clause)
     * null for main/independent clauses
     * 
     * Follows tree structure: each clause has at most one parent
     */
    readonly parentClauseId: string | null;

    /**
     * IDs of child clauses that depend on this clause
     * Empty array if this clause has no dependents
     */
    readonly childClauseIds: readonly string[];

    /**
     * Conjunction or connector that introduces this clause
     * Examples: ἵνα, ὅτι, εἰ, ὅτε, etc.
     * undefined for main clauses or asyndetic constructions
     */
    readonly conjunction?: string;

    /**
     * Greek text of this clause (reconstructed from words)
     * Cached for display purposes
     */
    readonly greekText: string;

    /**
     * Optional translation of this clause
     * May be literal or natural, depending on context
     */
    readonly translation?: string;

    /**
     * Description of the syntactic function of this clause
     * Examples:
     * - "Main clause expressing command"
     * - "Purpose clause modifying the main verb"
     * - "Causal clause explaining the reason"
     */
    readonly syntacticFunction?: string;
}

/**
 * Represents the complete syntactic analysis of a biblical passage
 * 
 * This is an aggregate root in DDD terms:
 * - Manages the lifecycle of Clause entities
 * - Enforces invariants across all clauses
 * - Provides high-level operations on the syntax tree
 * 
 * Invariants:
 * - Must have at least one clause
 * - Must have exactly one root clause (or a well-defined set of coordinate main clauses)
 * - All clause relationships must be valid (no orphans, no cycles)
 */
export interface PassageSyntaxAnalysis {
    /** Biblical reference (e.g., "Romans 12:1-2") */
    readonly passageReference: string;

    /**
     * All clauses in the passage, in logical order
     * Typically ordered depth-first from the root
     */
    readonly clauses: readonly Clause[];

    /**
     * ID of the root clause (primary main clause)
     * If there are multiple coordinate main clauses, this is the first one
     */
    readonly rootClauseId: string;

    /**
     * Human-readable description of the overall structure
     * Example: "Two main clauses: an exhortation followed by contrasting imperatives, 
     *           with a purpose clause modifying the second imperative"
     */
    readonly structureDescription: string;

    /** Timestamp when this analysis was performed */
    readonly analyzedAt: Date;
}

/**
 * Factory functions for creating domain entities
 * Ensures invariants are maintained at construction time
 */

export function createClause(params: {
    id: string;
    type: ClauseType;
    wordIndices: number[];
    mainVerbIndex?: number;
    parentClauseId?: string | null;
    childClauseIds?: string[];
    conjunction?: string;
    greekText: string;
    translation?: string;
    syntacticFunction?: string;
}): Clause {
    // Enforce invariant: must have at least one word
    if (params.wordIndices.length === 0) {
        throw new Error('Clause must contain at least one word');
    }

    // Validate main verb index if provided
    if (params.mainVerbIndex !== undefined && !params.wordIndices.includes(params.mainVerbIndex)) {
        throw new Error('Main verb index must be within wordIndices');
    }

    const clause: Clause = {
        id: params.id,
        type: params.type,
        wordIndices: Object.freeze([...params.wordIndices]),
        parentClauseId: params.parentClauseId ?? null,
        childClauseIds: Object.freeze([...(params.childClauseIds ?? [])]),
        greekText: params.greekText,
    };

    // Add optional properties only if they exist
    if (params.mainVerbIndex !== undefined) {
        (clause as any).mainVerbIndex = params.mainVerbIndex;
    }
    if (params.conjunction !== undefined) {
        (clause as any).conjunction = params.conjunction;
    }
    if (params.translation !== undefined) {
        (clause as any).translation = params.translation;
    }
    if (params.syntacticFunction !== undefined) {
        (clause as any).syntacticFunction = params.syntacticFunction;
    }

    return clause;
}

export function createPassageSyntaxAnalysis(params: {
    passageReference: string;
    clauses: Clause[];
    rootClauseId: string;
    structureDescription: string;
    analyzedAt?: Date;
}): PassageSyntaxAnalysis {
    // Enforce invariant: must have at least one clause
    if (params.clauses.length === 0) {
        throw new Error('PassageSyntaxAnalysis must contain at least one clause');
    }

    // Enforce invariant: root clause must exist
    const rootExists = params.clauses.some(c => c.id === params.rootClauseId);
    if (!rootExists) {
        throw new Error(`Root clause ${params.rootClauseId} not found in clauses`);
    }

    // TODO: Could add more validation here (no cycles, no orphans, etc.)
    // Left for future enhancement

    return {
        passageReference: params.passageReference,
        clauses: Object.freeze([...params.clauses]),
        rootClauseId: params.rootClauseId,
        structureDescription: params.structureDescription,
        analyzedAt: params.analyzedAt ?? new Date()
    };
}
