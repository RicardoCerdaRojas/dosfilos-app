/**
 * Automatic Strategy Selector Implementation
 * 
 * Analyzes user queries and automatically selects the most appropriate
 * coaching strategy based on query characteristics.
 */

import {
    IStrategySelector,
    ICoachingStrategy,
    CoachingStyle
} from '@dosfilos/domain';

import { SocraticCoachingStrategy } from './SocraticCoachingStrategy';
import { DirectCoachingStrategy } from './DirectCoachingStrategy';
import { ExploratoryCoachingStrategy } from './ExploratoryCoachingStrategy';
import { DidacticCoachingStrategy } from './DidacticCoachingStrategy';

/**
 * Query patterns for automatic strategy selection
 */
interface StrategyPattern {
    patterns: RegExp[];
    strategy: CoachingStyle;
    priority: number; // Higher = more important
}

export class AutomaticStrategySelector implements IStrategySelector {
    private strategies: Map<CoachingStyle, ICoachingStrategy>;
    private selectionPatterns: StrategyPattern[];

    constructor() {
        // Initialize all available strategies
        this.strategies = new Map<CoachingStyle, ICoachingStrategy>();
        this.strategies.set(CoachingStyle.SOCRATIC, new SocraticCoachingStrategy());
        this.strategies.set(CoachingStyle.DIRECT, new DirectCoachingStrategy());
        this.strategies.set(CoachingStyle.EXPLORATORY, new ExploratoryCoachingStrategy());
        this.strategies.set(CoachingStyle.DIDACTIC, new DidacticCoachingStrategy());


        // Define selection patterns (order matters - checked in priority order)
        this.selectionPatterns = [
            // DIRECT: User wants quick answers
            {
                patterns: [
                    /dame\s+\d+/i,                    // "dame 5 títulos"
                    /necesito\s+rápido/i,             // "necesito rápido"
                    /lista\s+de/i,                     // "lista de..."
                    /sugiere\s+\d+/i,                  // "sugiere 3..."
                    /títulos?\s+para/i,               // "títulos para..."
                    /sin\s+explicar/i,                 // "sin explicar"
                ],
                strategy: CoachingStyle.DIRECT,
                priority: 3
            },
            // DIDACTIC: User wants to learn/understand
            {
                patterns: [
                    /qué\s+es\s+(la|el|un|una)/i,     // "qué es la..."
                    /qué\s+significa/i,                // "qué significa..."
                    /explícame/i,                      // "explícame..."
                    /enséñame/i,                       // "enséñame..."
                    /cómo\s+funciona/i,                // "cómo funciona..."
                    /ayúdame\s+a\s+entender/i,         // "ayúdame a entender..."
                    /en\s+qué\s+consiste/i,           // "en qué consiste..."
                    /diferencia\s+entre/i,             // "diferencia entre..."
                    /unión\s+hipostática/i,           // Theological terms
                    /hermenéutica/i,
                    /exégesis/i,
                ],
                strategy: CoachingStyle.DIDACTIC,
                priority: 4
            },
            // EXPLORATORY: User wants options/alternatives
            {
                patterns: [
                    /opciones/i,                       // "opciones..."
                    /alternativas/i,                   // "alternativas..."
                    /diferentes\s+(enfoques|formas|maneras)/i,
                    /qué\s+puedo/i,                    // "qué puedo..."
                    /cuáles\s+son\s+las\s+formas/i,
                    /varias\s+ideas/i,
                    /múltiples/i,
                    /comparar/i,                       // "comparar..."
                ],
                strategy: CoachingStyle.EXPLORATORY,
                priority: 3
            },
            // SOCRATIC: Default for vague/general queries
            {
                patterns: [
                    /^quiero\s+(hacer|crear|preparar)/i,  // "quiero hacer..."
                    /^me\s+gustaría/i,                     // "me gustaría..."
                    /^estoy\s+pensando/i,                  // "estoy pensando..."
                    /^tengo\s+la\s+idea/i,                 // "tengo la idea..."
                    /serie\s+de\s+\w+$/i,                  // "serie de [algo]" sin más
                    /algo\s+sobre/i,                       // "algo sobre..."
                ],
                strategy: CoachingStyle.SOCRATIC,
                priority: 2
            }
        ];
    }

    async selectStrategy(
        query: string,
        _context: Record<string, unknown>,
        userPreference?: CoachingStyle | 'auto'
    ): Promise<ICoachingStrategy> {
        // If user has a specific preference, use it
        if (userPreference && userPreference !== 'auto') {
            const preferredStrategy = this.strategies.get(userPreference);
            if (preferredStrategy) {
                console.log(`🎯 [StrategySelector] Using user preference: ${userPreference}`);
                return preferredStrategy;
            }
        }

        // Automatic selection based on query analysis
        const selectedStyle = this.analyzeAndSelectStyle(query);
        const strategy = this.strategies.get(selectedStyle) || this.strategies.get(CoachingStyle.SOCRATIC)!;

        console.log(`🎯 [StrategySelector] Auto-selected: ${selectedStyle} for query: "${query.substring(0, 40)}..."`);

        return strategy;
    }

    getAllStrategies(): ICoachingStrategy[] {
        return Array.from(this.strategies.values());
    }

    getStrategyByStyle(style: CoachingStyle): ICoachingStrategy {
        const strategy = this.strategies.get(style);
        if (!strategy) {
            throw new Error(`Strategy not found for style: ${style}`);
        }
        return strategy;
    }

    /**
     * Analyze query and determine the best strategy style
     */
    private analyzeAndSelectStyle(query: string): CoachingStyle {
        const matchedPatterns: { style: CoachingStyle; priority: number }[] = [];

        // Check each pattern group
        for (const patternGroup of this.selectionPatterns) {
            for (const pattern of patternGroup.patterns) {
                if (pattern.test(query)) {
                    matchedPatterns.push({
                        style: patternGroup.strategy,
                        priority: patternGroup.priority
                    });
                    break; // Only count each pattern group once
                }
            }
        }

        // If we have matches, pick the highest priority one
        if (matchedPatterns.length > 0) {
            matchedPatterns.sort((a, b) => b.priority - a.priority);
            return matchedPatterns[0].style;
        }

        // Default behavior based on query characteristics
        const wordCount = query.trim().split(/\s+/).length;

        // Very short queries = probably vague = Socratic
        if (wordCount < 10) {
            return CoachingStyle.SOCRATIC;
        }

        // Longer queries with specific content = Direct
        if (wordCount > 25) {
            return CoachingStyle.DIRECT;
        }

        // Default to Socratic for medium-length queries
        return CoachingStyle.SOCRATIC;
    }
}
