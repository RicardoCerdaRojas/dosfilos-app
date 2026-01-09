import { BiblicalPassage, PassageSyntaxAnalysis, ClauseType, createClause, createPassageSyntaxAnalysis } from '@dosfilos/domain';
import { IGreekTutorService } from '@dosfilos/domain';

/**
 * Use Case: Analyze Passage Syntax
 * 
 * Responsibility (Single Responsibility Principle):
 * - Orchestrate the syntactic analysis of a Greek NT passage
 * - Convert AI response into domain entities
 * - Validate and sanitize the analysis
 * 
 * Dependencies (Dependency Inversion Principle):
 * - Depends on IGreekTutorService abstraction, not concrete implementation
 * - Gemini service is injected, allowing for testing and swapping
 * 
 * This use case follows the Application Layer pattern in Clean Architecture:
 * - Orchestrates domain logic
 * - Coordinates between domain and infrastructure
 * - Contains no business rules (those are in the domain)
 * - Contains no implementation details (those are in infrastructure)
 */

/**
 * Structured response expected from Gemini for syntax analysis
 * This is an infrastructure concern, but defined here as a DTO
 */
interface GeminiSyntaxAnalysisResponse {
    /**
     * Array of clauses identified in the passage
     */
    clauses: Array<{
        /** Unique ID for this clause */
        id: string;

        /** Type of clause */
        type: 'MAIN' | 'SUBORDINATE_PURPOSE' | 'SUBORDINATE_RESULT' | 'SUBORDINATE_CAUSAL' |
        'SUBORDINATE_CONDITIONAL' | 'SUBORDINATE_TEMPORAL' | 'PARTICIPIAL' |
        'INFINITIVAL' | 'RELATIVE';

        /** Indices of words (0-based) that belong to this clause */
        wordIndices: number[];

        /** Index of the main verb (if applicable) */
        mainVerbIndex?: number;

        /** ID of parent clause (null for main clauses) */
        parentClauseId: string | null;

        /** Conjunction introducing this clause */
        conjunction?: string;

        /** Greek text of this clause */
        greekText: string;

        /** Syntactic function description */
        syntacticFunction?: string;
    }>;

    /** ID of the root (main) clause */
    rootClauseId: string;

    /** Overall structure description */
    structureDescription: string;
}

export class AnalyzePassageSyntaxUseCase {
    constructor(
        private readonly greekTutorService: IGreekTutorService,
        private readonly sessionRepository?: import('@dosfilos/domain').ISessionRepository // Optional for caching
    ) { }

    /**
     * Execute the syntax analysis with caching
     * 
     * Strategy:
     * 1. Check cache first (if repository available)
     * 2. If cache miss, generate with Gemini
     * 3. Cache the result for future use
     * 
     * @param passage - The biblical passage to analyze
     * @param language - Target language for descriptions (default: 'Spanish')
     * @returns Complete syntactic analysis of the passage
     * @throws Error if analysis fails or response is invalid
     */
    async execute(passage: BiblicalPassage, language: string = 'Spanish'): Promise<PassageSyntaxAnalysis> {
        // Step 1: Try cache first (if repository available)
        if (this.sessionRepository) {
            const cachedAnalysis = await this.sessionRepository.getCachedSyntaxAnalysis(passage.reference, language);
            if (cachedAnalysis) {
                return cachedAnalysis;
            }
        } else {
            console.warn('[AnalyzePassageSyntaxUseCase] No session repository - cache disabled');
        }

        console.log('[AnalyzePassageSyntaxUseCase] Calling Gemini API...');

        // Step 2: Generate the analysis prompt
        const prompt = this.buildAnalysisPrompt(passage, language);

        // Step 3: Call Gemini service
        const rawResponse = await this.greekTutorService.analyzeSyntax(prompt);

        // Step 4: Parse and validate response
        const geminiResponse = this.parseGeminiResponse(rawResponse);

        // Step 5: Convert to domain entities
        const analysis = this.convertToDomain(passage, geminiResponse);

        // Step 6: Validate the analysis
        this.validateAnalysis(analysis, passage);

        // Step 7: Cache the result (fire and forget, non-blocking)
        if (this.sessionRepository) {
            this.sessionRepository.cacheSyntaxAnalysis(analysis, language).catch(error => {
                console.warn('[AnalyzePassageSyntaxUseCase] Failed to cache analysis (non-critical):', error);
            });
        }

        return analysis;
    }

    /**
     * Build the specialized prompt for Gemini
     * 
     * This encapsulates the prompting strategy, making it:
     * - Testable (can verify prompt structure)
     * - Evolvable (can improve prompt without changing use case logic)
     * - Clear (separates concerns)
     * 
     * @param passage - The passage to analyze
     * @param language - Target language for descriptions
     */
    private buildAnalysisPrompt(passage: BiblicalPassage, language: string = 'Spanish'): string {
        const wordsWithIndices = passage.words
            .map((w, idx) => `[${idx}] ${w.greek}`)
            .join(' ');

        const languageInstructions = language === 'Spanish'
            ? 'IMPORTANTE: Responde en ESPAÑOL. Todas las descripciones deben estar en español.'
            : 'IMPORTANT: Respond in ENGLISH. All descriptions should be in English.';

        return `You are an expert in Koine Greek syntax and New Testament exegesis.

${languageInstructions}

Analyze the syntactic structure of the following Greek New Testament passage:

**Reference**: ${passage.reference}
**Greek Text**: ${passage.greekText}

**Indexed Words**:
${wordsWithIndices}

**Your Task**:
Identify all clauses in this passage and their relationships. For each clause, provide:

1. **Type**: MAIN, SUBORDINATE_PURPOSE, SUBORDINATE_RESULT, SUBORDINATE_CAUSAL, SUBORDINATE_CONDITIONAL, SUBORDINATE_TEMPORAL, PARTICIPIAL, INFINITIVAL, or RELATIVE

2. **Word Indices**: List ALL word indices belonging to this clause

3. **Main Verb Index**: Index of the main verb (if applicable)

4. **Parent Clause**: ID of parent clause (null for main clauses)

5. **Conjunction**: Introducing word (e.g., ἵνα, ὅτι), if any

6. **Syntactic Function**: ONE short phrase (max 8 words) describing the clause's role

**CRITICAL EFFICIENCY REQUIREMENTS**:
- Keep syntacticFunction descriptions VERY BRIEF (5-8 words max)
- Keep structureDescription CONCISE (2-3 sentences max)
- Every word must belong to exactly one clause
- Use IDs: "clause_1", "clause_2", etc.
- **In structureDescription, use [1], [2], [3]... to reference clauses (clickable in UI)**

**Response Format** (JSON):
{
  "clauses": [
    {
      "id": "clause_1",
      "type": "MAIN",
      "wordIndices": [0, 1, 2, ...],
      "mainVerbIndex": 0,
      "parentClauseId": null,
      "conjunction": null,
      "greekText": "Παρακαλῶ οὖν ὑμᾶς...",
      "syntacticFunction": "Main exhortation"
    }
  ],
  "rootClauseId": "clause_1",
  "structureDescription": "Two main clauses: [1] primary command, [2] coordinated imperative. [1] modified by purpose clause [3]."
}

Respond ONLY with valid JSON, no additional text.`;
    }

    /**
     * Parse Gemini's raw response into structured format
     * 
     * Handles:
     * - JSON parsing errors
     * - Missing required fields
     * - Invalid enum values
     */
    private parseGeminiResponse(rawResponse: string): GeminiSyntaxAnalysisResponse {
        try {
            // Remove markdown code blocks if present
            let cleanedResponse = rawResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            // Sanitize JSON: replace undefined literals with null
            // Gemini sometimes outputs 'undefined' which is not valid JSON
            cleanedResponse = cleanedResponse.replace(/:\s*undefined\s*([,}])/g, ': null$1');

            // Check for truncation indicators BEFORE parsing
            const isTruncated = this.detectTruncation(cleanedResponse);
            if (isTruncated) {
                console.warn('[AnalyzePassageSyntaxUseCase] ⚠️ Detected truncated JSON response');
                throw new Error(
                    'The syntax analysis response was truncated. This passage may be too long. ' +
                    'Try analyzing a shorter passage (1-2 verses instead of 3+).'
                );
            }

            const parsed = JSON.parse(cleanedResponse);

            // Validate structure
            if (!parsed.clauses || !Array.isArray(parsed.clauses)) {
                throw new Error('Response missing required "clauses" array');
            }
            if (!parsed.rootClauseId) {
                throw new Error('Response missing required "rootClauseId"');
            }
            if (!parsed.structureDescription) {
                throw new Error('Response missing required "structureDescription"');
            }

            return parsed as GeminiSyntaxAnalysisResponse;
        } catch (error) {
            console.error('[AnalyzePassageSyntaxUseCase] Failed to parse Gemini response:', error);
            console.error('Raw response:', rawResponse);
            throw new Error(`Failed to parse syntax analysis response: ${error}`);
        }
    }

    /**
     * Detect if JSON response was truncated
     * Common indicators: incomplete object/array, missing closing braces
     */
    private detectTruncation(json: string): boolean {
        json = json.trim();

        // Count opening and closing braces/brackets
        const openBraces = (json.match(/{/g) || []).length;
        const closeBraces = (json.match(/}/g) || []).length;
        const openBrackets = (json.match(/\[/g) || []).length;
        const closeBrackets = (json.match(/]/g) || []).length;

        // If mismatch, definitely truncated
        if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
            console.warn(
                `[detectTruncation] Brace/bracket mismatch: ` +
                `{${openBraces}vs${closeBraces}} [${openBrackets}vs${closeBrackets}]`
            );
            return true;
        }

        // Check for common truncation patterns
        const truncationPatterns = [
            /,\s*$/,              // Ends with comma (incomplete array/object)
            /:\s*$/,              // Ends with colon (incomplete key-value)
            /"\s*$/,              // Ends with quote (incomplete string)
            /,\s*\]/,             // Trailing comma before array close
            /,\s*}/               // Trailing comma before object close
        ];

        for (const pattern of truncationPatterns) {
            if (pattern.test(json)) {
                console.warn(`[detectTruncation] Matched pattern: ${pattern}`);
                return true;
            }
        }

        return false;
    }

    /**
     * Convert Gemini response to domain entities
     * 
     * This is where we cross the boundary from infrastructure DTOs
     * to rich domain models
     */
    private convertToDomain(
        passage: BiblicalPassage,
        geminiResponse: GeminiSyntaxAnalysisResponse
    ): PassageSyntaxAnalysis {
        // Convert each clause DTO to domain entity
        const clauses = geminiResponse.clauses.map(clauseDto => {
            return createClause({
                id: clauseDto.id,
                type: this.mapClauseType(clauseDto.type),
                wordIndices: clauseDto.wordIndices,
                mainVerbIndex: clauseDto.mainVerbIndex,
                parentClauseId: clauseDto.parentClauseId,
                childClauseIds: this.findChildClauses(clauseDto.id, geminiResponse.clauses),
                conjunction: clauseDto.conjunction,
                greekText: clauseDto.greekText,
                syntacticFunction: clauseDto.syntacticFunction
            });
        });

        // Create the aggregate root
        return createPassageSyntaxAnalysis({
            passageReference: passage.reference,
            clauses,
            rootClauseId: geminiResponse.rootClauseId,
            structureDescription: geminiResponse.structureDescription
        });
    }

    /**
     * Map string clause type to enum with intelligent fallback
     * 
     * Design Principles (SOLID):
     * - Open/Closed: Open to new variations without modification
     * - Single Responsibility: Normalizes and maps clause types
     * - Liskov Substitution: All mapped types are valid ClauseType values
     * 
     * Strategy:
     * 1. Normalize input (uppercase, trim)
     * 2. Try exact match with aliases
     * 3. Try fuzzy matching for common patterns
     * 4. Log warning for unknown types and use reasonable fallback
     */
    private mapClauseType(typeString: string): ClauseType {
        // Normalize input
        const normalized = typeString.toUpperCase().trim();

        // Extended type map with multiple aliases per type
        // This makes the system resilient to Gemini's varying output formats
        const typeAliases: Record<string, ClauseType> = {
            // Main clause
            'MAIN': ClauseType.MAIN,
            'INDEPENDENT': ClauseType.MAIN,
            'PRINCIPAL': ClauseType.MAIN,

            // Purpose
            'SUBORDINATE_PURPOSE': ClauseType.SUBORDINATE_PURPOSE,
            'PURPOSE': ClauseType.SUBORDINATE_PURPOSE,
            'FINAL': ClauseType.SUBORDINATE_PURPOSE,

            // Result
            'SUBORDINATE_RESULT': ClauseType.SUBORDINATE_RESULT,
            'RESULT': ClauseType.SUBORDINATE_RESULT,
            'CONSECUTIVE': ClauseType.SUBORDINATE_RESULT,

            // Causal
            'SUBORDINATE_CAUSAL': ClauseType.SUBORDINATE_CAUSAL,
            'CAUSAL': ClauseType.SUBORDINATE_CAUSAL,
            'REASON': ClauseType.SUBORDINATE_CAUSAL,

            // Conditional
            'SUBORDINATE_CONDITIONAL': ClauseType.SUBORDINATE_CONDITIONAL,
            'CONDITIONAL': ClauseType.SUBORDINATE_CONDITIONAL,

            // Temporal
            'SUBORDINATE_TEMPORAL': ClauseType.SUBORDINATE_TEMPORAL,
            'TEMPORAL': ClauseType.SUBORDINATE_TEMPORAL,
            'TIME': ClauseType.SUBORDINATE_TEMPORAL,

            // Indirect Question / Interrogative (multiple variations)
            'SUBORDINATE_INTERROGATIVE': ClauseType.SUBORDINATE_INDIRECT_QUESTION,
            'SUBORDINATE_INDIRECT_QUESTION': ClauseType.SUBORDINATE_INDIRECT_QUESTION,
            'INDIRECT_QUESTION': ClauseType.SUBORDINATE_INDIRECT_QUESTION,
            'INTERROGATIVE': ClauseType.SUBORDINATE_INDIRECT_QUESTION,
            'QUESTION': ClauseType.SUBORDINATE_INDIRECT_QUESTION,

            // Participial
            'PARTICIPIAL': ClauseType.PARTICIPIAL,
            'PARTICIPLE': ClauseType.PARTICIPIAL,

            // Infinitival
            'INFINITIVAL': ClauseType.INFINITIVAL,
            'INFINITIVE': ClauseType.INFINITIVAL,

            // Relative
            'RELATIVE': ClauseType.RELATIVE,
            'RELATIVE_CLAUSE': ClauseType.RELATIVE,
        };

        // Try exact match first
        const exactMatch = typeAliases[normalized];
        if (exactMatch) {
            return exactMatch;
        }

        // Fuzzy matching for compound names (e.g., "SUBORDINATE TEMPORAL" -> "TEMPORAL")
        // Remove common prefixes and try again
        const withoutPrefix = normalized
            .replace(/^SUBORDINATE[_\s]+/, '')
            .replace(/^CLAUSE[_\s]+/, '')
            .trim();

        const fuzzyMatch = typeAliases[withoutPrefix];
        if (fuzzyMatch) {
            console.warn(
                `[mapClauseType] Fuzzy matched "${typeString}" -> "${withoutPrefix}" -> ${fuzzyMatch}`
            );
            return fuzzyMatch;
        }

        // Last resort: use RELATIVE as safe fallback for unknown subordinate types
        console.warn(
            `[mapClauseType] ⚠️ Unknown clause type: "${typeString}". ` +
            `Using RELATIVE as fallback. Consider adding this type to the aliases map.`
        );
        return ClauseType.RELATIVE;
    }

    /**
     * Find all child clauses for a given parent
     */
    private findChildClauses(
        parentId: string,
        allClauses: GeminiSyntaxAnalysisResponse['clauses']
    ): string[] {
        return allClauses
            .filter(c => c.parentClauseId === parentId)
            .map(c => c.id);
    }

    /**
     * Validate the analysis maintains domain invariants
     * 
     * Checks:
     * - All word indices are valid
     * - No words are orphaned (every word belongs to a clause)
     * - Duplicates are auto-corrected (word in first occurrence only)
     */
    private validateAnalysis(analysis: PassageSyntaxAnalysis, passage: BiblicalPassage): void {
        const totalWords = passage.words.length;
        const coveredWords = new Map<number, string>(); // index -> clause ID

        for (const clause of analysis.clauses) {
            for (const idx of clause.wordIndices) {
                // Check index is in valid range
                if (idx < 0 || idx >= totalWords) {
                    throw new Error(
                        `Clause ${clause.id} contains invalid word index ${idx}. ` +
                        `Valid range is 0-${totalWords - 1}`
                    );
                }

                // Check for duplicates - warn and skip instead of throwing
                if (coveredWords.has(idx)) {
                    const previousClause = coveredWords.get(idx);
                    console.warn(
                        `[AnalyzePassageSyntaxUseCase] ⚠️ Word at index ${idx} (${passage.words[idx]!.greek}) ` +
                        `appears in both clause ${previousClause} and ${clause.id}. ` +
                        `Keeping only in ${previousClause}.`
                    );
                    // Don't add to covered words again - first occurrence wins
                    continue;
                }

                coveredWords.set(idx, clause.id);
            }
        }

        // Check all words are covered
        if (coveredWords.size !== totalWords) {
            const orphanedIndices = Array.from(
                { length: totalWords },
                (_, i) => i
            ).filter(i => !coveredWords.has(i));

            const orphanedWords = orphanedIndices.map(i => passage.words[i]!.greek);

            throw new Error(
                `Analysis is incomplete. The following words are not assigned to any clause: ` +
                `${orphanedWords.join(', ')} (indices: ${orphanedIndices.join(', ')})`
            );
        }

        console.log(
            `[AnalyzePassageSyntaxUseCase] ✅ Validation passed: ` +
            `${analysis.clauses.length} clauses covering ${totalWords} words`
        );
    }
}
