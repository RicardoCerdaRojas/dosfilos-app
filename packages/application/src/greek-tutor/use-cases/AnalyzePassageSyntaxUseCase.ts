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
            const cachedAnalysis = await this.sessionRepository.getCachedSyntaxAnalysis(passage.reference);
            if (cachedAnalysis) {
                console.log('[AnalyzePassageSyntaxUseCase] Using cached syntax analysis');
                return cachedAnalysis;
            }
        }

        console.log('[AnalyzePassageSyntaxUseCase] Cache miss - generating new analysis');

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
            this.sessionRepository.cacheSyntaxAnalysis(analysis).catch(error => {
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
            ? 'IMPORTANTE: Responde en ESPAÑOL. Todas las descripciones, explicaciones y términos técnicos deben estar en español.'
            : 'IMPORTANT: Respond in ENGLISH. All descriptions, explanations, and technical terms should be in English.';

        return `You are an expert in Koine Greek syntax and New Testament exegesis.

${languageInstructions}

Analyze the syntactic structure of the following Greek New Testament passage:

**Reference**: ${passage.reference}
**Greek Text**: ${passage.greekText}

**Indexed Words**:
${wordsWithIndices}

**Your Task**:
Identify all clauses in this passage and their relationships. For each clause, provide:

1. **Type**: 
   - MAIN: Independent clause with finite verb
   - SUBORDINATE_PURPOSE: Purpose clause (ἵνα, ὥστε)
   - SUBORDINATE_RESULT: Result clause (ὥστε, ὡς)
   - SUBORDINATE_CAUSAL: Causal clause (ὅτι, διότι, γάρ)
   - SUBORDINATE_CONDITIONAL: Conditional (εἰ, ἐάν)
   - SUBORDINATE_TEMPORAL: Temporal (ὅτε, ὡς, ἕως)
   - PARTICIPIAL: Built around a participle
   - INFINITIVAL: Built around an infinitive
   - RELATIVE: Relative clause (ὅς, ἥ, ὅ)

2. **Word Indices**: List the indices (from the numbered list above) of ALL words in this clause

3. **Main Verb Index**: The index of the main verb of the clause (if applicable)

4. **Parent Clause**: The ID of the clause this depends on (null for main clauses)

5. **Conjunction**: The word that introduces this clause (e.g., ἵνα, ὅτι), if any

6. **Syntactic Function**: Brief description of what this clause does (e.g., "States the main command", "Expresses the purpose of the action")

**Requirements**:
- Every word must belong to exactly one clause
- Use clear, unique IDs for clauses (e.g., "clause_1", "clause_2")
- Main clauses should have parentClauseId = null
- Provide a brief overall structure description

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
    },
    ...
  ],
  "rootClauseId": "clause_1",
  "structureDescription": "The passage contains two main clauses..."
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
     * Map string clause type to enum
     */
    private mapClauseType(typeString: string): ClauseType {
        const typeMap: Record<string, ClauseType> = {
            'MAIN': ClauseType.MAIN,
            'SUBORDINATE_PURPOSE': ClauseType.SUBORDINATE_PURPOSE,
            'SUBORDINATE_RESULT': ClauseType.SUBORDINATE_RESULT,
            'SUBORDINATE_CAUSAL': ClauseType.SUBORDINATE_CAUSAL,
            'SUBORDINATE_CONDITIONAL': ClauseType.SUBORDINATE_CONDITIONAL,
            'SUBORDINATE_TEMPORAL': ClauseType.SUBORDINATE_TEMPORAL,
            'PARTICIPIAL': ClauseType.PARTICIPIAL,
            'INFINITIVAL': ClauseType.INFINITIVAL,
            'RELATIVE': ClauseType.RELATIVE
        };

        const mapped = typeMap[typeString];
        if (!mapped) {
            throw new Error(`Unknown clause type: ${typeString}`);
        }
        return mapped;
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
     * - No words are duplicated (each word belongs to exactly one clause)
     */
    private validateAnalysis(analysis: PassageSyntaxAnalysis, passage: BiblicalPassage): void {
        const totalWords = passage.words.length;
        const coveredWords = new Set<number>();

        for (const clause of analysis.clauses) {
            for (const idx of clause.wordIndices) {
                // Check index is in valid range
                if (idx < 0 || idx >= totalWords) {
                    throw new Error(
                        `Clause ${clause.id} contains invalid word index ${idx}. ` +
                        `Valid range is 0-${totalWords - 1}`
                    );
                }

                // Check for duplicates
                if (coveredWords.has(idx)) {
                    throw new Error(
                        `Word at index ${idx} (${passage.words[idx]!.greek}) ` +
                        `appears in multiple clauses`
                    );
                }

                coveredWords.add(idx);
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
            `[AnalyzePassageSyntaxUseCase] Validation passed: ` +
            `${analysis.clauses.length} clauses covering ${totalWords} words`
        );
    }
}
