/**
 * GeminiHebrewService
 *
 * Implements IHebrewAnalysisService using Google Gemini 2.5 Flash.
 * Applies Farfán's grammar rules and the professor's pedagogical methodology
 * to produce morphological and syntactic verse analyses.
 *
 * Design decisions:
 *  - Uses responseMimeType 'application/json' to enforce structured output
 *  - Temperature 0.2 for deterministic, grammar-rule-driven analysis
 *  - Knowledge chunks are injected per-request (via the knowledge selector)
 *  - maxOutputTokens 32768 to accommodate long verse analyses with many words
 */

import type { IHebrewAnalysisService, HebrewVerse, VerseAnalysis } from '@dosfilos/domain';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { GEMINI_CONFIG } from '../gemini/config.js';
import { selectRelevantChunks } from './knowledge/knowledge-selector.js';
import { buildVerseAnalysisPrompt } from './knowledge/hebrew-prompt-builder.js';

export class GeminiHebrewService implements IHebrewAnalysisService {
  private readonly model: GenerativeModel;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: GEMINI_CONFIG.MODEL_NAME,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,       // Low for deterministic morphological analysis
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 32768, // Large verses (Job, Psalms) need room
      },
    });
  }

  async analyzeVerse(verse: HebrewVerse, language = 'es'): Promise<VerseAnalysis> {
    // 1. Select the most relevant grammar knowledge chunks for this verse
    const knowledgeChunks = selectRelevantChunks(verse.hebrewText, [], 10);

    // 2. Build the full pedagogical prompt
    const prompt = buildVerseAnalysisPrompt(verse, knowledgeChunks, language);

    // 3. Call Gemini
    let rawResponse: string;
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      rawResponse = result.response.text();
    } catch (error) {
      throw new Error(
        `GeminiHebrewService: API call failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 4. Parse and validate the JSON response
    const analysis = this.parseAnalysisResponse(rawResponse, verse);

    return analysis;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Parses the Gemini JSON response into a VerseAnalysis domain entity.
   * Performs minimal validation and provides safe defaults.
   */
  private parseAnalysisResponse(rawJson: string, verse: HebrewVerse): VerseAnalysis {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(this.cleanJsonResponse(rawJson)) as Record<string, unknown>;
    } catch (e) {
      throw new Error(
        `GeminiHebrewService: Failed to parse JSON response. Raw: ${rawJson.slice(0, 300)}`,
      );
    }

    // Validate required top-level fields
    if (!data.words || !Array.isArray(data.words)) {
      throw new Error(
        `GeminiHebrewService: Response missing required "words" array. Data keys: ${Object.keys(data).join(', ')}`,
      );
    }

    return {
      reference: (data.reference as string) || verse.displayReference,
      hebrewText: (data.hebrewText as string) || verse.hebrewText,
      transliteration: (data.transliteration as string) || '',
      literalTranslation: (data.literalTranslation as string) || '',
      fluidTranslation: (data.fluidTranslation as string) || '',
      words: data.words as VerseAnalysis['words'],
      verbTable: Array.isArray(data.verbTable) ? (data.verbTable as VerseAnalysis['verbTable']) : [],
      exegeticalNotes: Array.isArray(data.exegeticalNotes)
        ? (data.exegeticalNotes as string[])
        : undefined,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Removes markdown code fences and trims to valid JSON bounds.
   */
  private cleanJsonResponse(text: string): string {
    let cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      return cleaned; // Let JSON.parse throw with the original text
    }

    return cleaned.substring(firstBrace, lastBrace + 1);
  }
}
