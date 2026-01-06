/**
 * Coaching Strategy Pattern - Domain Interfaces
 * 
 * Defines the contract for different coaching behaviors
 * that the Expert Assistant can use.
 */

/**
 * Available coaching styles
 */
export enum CoachingStyle {
    /** Socratic method - guiding questions before answers */
    SOCRATIC = 'socratic',
    /** Direct responses with supporting evidence */
    DIRECT = 'direct',
    /** Multiple options for exploration */
    EXPLORATORY = 'exploratory',
    /** Step-by-step teaching approach */
    DIDACTIC = 'didactic'
}

/**
 * Intent detected from user query
 */
export type QueryIntent =
    | 'ideas'           // User wants creative ideas
    | 'clarification'   // User needs something clarified
    | 'validation'      // User wants to validate an approach
    | 'exploration'     // User wants to explore options
    | 'specific_info'   // User asks for specific information
    | 'general_topic';  // User mentions a general topic

/**
 * Suggested approach based on query analysis
 */
export type ResponseApproach =
    | 'ask_first'               // Ask guiding questions before answering
    | 'answer_with_questions'   // Answer but include follow-up questions
    | 'direct_answer';          // Provide direct answer

/**
 * Result of analyzing a user query
 */
export interface QueryAnalysis {
    /** Whether the query is vague or lacks specificity */
    isVague: boolean;
    /** Detected intent from the query */
    intent: QueryIntent;
    /** Recommended approach for responding */
    suggestedApproach: ResponseApproach;
    /** Topics detected in the query */
    detectedTopics: string[];
    /** Confidence score 0-1 */
    confidence: number;
}

/**
 * Interface for coaching strategy implementations
 * Following Strategy Pattern for extensibility
 */
export interface ICoachingStrategy {
    /**
     * Get the coaching style identifier
     */
    getStyle(): CoachingStyle;

    /**
     * Analyze a user query to determine how to respond
     * @param query - The user's message
     * @param context - Additional context (topic, resources, etc.)
     */
    analyze(query: string, context: Record<string, unknown>): Promise<QueryAnalysis>;

    /**
     * Build system prompt additions for this coaching style
     * These are appended to the base system prompt
     */
    buildSystemPromptAdditions(): string;

    /**
     * Get guiding questions for a vague query
     * @param query - The user's message
     * @param context - Additional context
     */
    generateGuidingQuestions?(query: string, context: Record<string, unknown>): Promise<string[]>;
}

/**
 * Interface for strategy selection
 * Determines which coaching strategy to use based on query analysis
 */
export interface IStrategySelector {
    /**
     * Select the most appropriate strategy for a given query
     * @param query - The user's message
     * @param context - Additional context
     * @param userPreference - Optional user override ('auto' for automatic selection)
     */
    selectStrategy(
        query: string,
        context: Record<string, unknown>,
        userPreference?: CoachingStyle | 'auto'
    ): Promise<ICoachingStrategy>;

    /**
     * Get all available strategies
     */
    getAllStrategies(): ICoachingStrategy[];

    /**
     * Get a specific strategy by style
     */
    getStrategyByStyle(style: CoachingStyle): ICoachingStrategy;
}
