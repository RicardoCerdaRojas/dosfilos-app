
import { IGreekTutorService, TrainingUnit, GreekForm, UserResponse, MorphologyBreakdown, BiblicalPassage, PassageWord, UnitPreview } from '@dosfilos/domain';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { FORM_SELECTION_SYSTEM_PROMPT, buildFormSelectionPrompt } from './prompts/FormSelectionPrompt';
import { TRAINING_UNIT_SYSTEM_PROMPT, buildTrainingUnitPrompt } from './prompts/TrainingUnitPrompt';
import { FEEDBACK_SYSTEM_PROMPT, buildFeedbackPrompt } from './prompts/FeedbackPrompt';
import { MORPHOLOGY_BREAKDOWN_SYSTEM_PROMPT, buildMorphologyBreakdownPrompt } from './prompts/MorphologyBreakdownPrompt';
import { PASSAGE_TEXT_SYSTEM_PROMPT, buildPassageTextPrompt } from './prompts/PassageTextPrompt';
import { WORD_IDENTIFICATION_SYSTEM_PROMPT, buildWordIdentificationPrompt } from './prompts/WordIdentificationPrompt';

import { GEMINI_CONFIG } from '../../gemini/config';

export class GeminiGreekTutorService implements IGreekTutorService {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME });
    }

    private getModelWithTools(fileSearchStoreId?: string) {
        if (fileSearchStoreId) {
            return this.genAI.getGenerativeModel({
                model: GEMINI_CONFIG.MODEL_NAME,
                tools: [
                    {
                        // @ts-ignore - types might not be fully updated for fileSearch
                        fileSearch: {
                            fileSearchStoreNames: [fileSearchStoreId]
                        }
                    }
                ],
                // NOTE: Cannot use responseMimeType: "application/json" with Tools
            });
        }
        return this.model;
    }

    async identifyForms(passage: string, fileSearchStoreId?: string, config?: { basePrompt?: string; userPrompts?: string[] }, language: string = 'Spanish'): Promise<string[]> {
        const model = this.getModelWithTools(fileSearchStoreId);

        const genConfig: any = {};
        if (!fileSearchStoreId) {
            genConfig.responseMimeType = "application/json";
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: buildFormSelectionPrompt(passage, language) }] }],
            systemInstruction: FORM_SELECTION_SYSTEM_PROMPT,
            generationConfig: genConfig
        });

        const text = result.response.text();
        const parsed = JSON.parse(this.cleanJsonResponse(text));

        if (Array.isArray(parsed)) {
            return parsed;
        }

        // Handle wrapped responses (e.g. { "forms": [...] })
        if (typeof parsed === 'object' && parsed !== null) {
            const values = Object.values(parsed);
            const arrayValue = values.find(val => Array.isArray(val));
            if (arrayValue) {
                return arrayValue as string[];
            }
        }

        console.warn("Gemini identifyForms returned unexpected format:", parsed);
        return [];
    }

    async createTrainingUnit(form: string, passage: string, fileSearchStoreId?: string, config?: { basePrompt?: string; userPrompts?: string[] }, language: string = 'Spanish'): Promise<TrainingUnit> {
        const model = this.getModelWithTools(fileSearchStoreId);

        const genConfig: any = {};
        if (!fileSearchStoreId) {
            genConfig.responseMimeType = "application/json";
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: buildTrainingUnitPrompt(form, passage, language) }] }],
            systemInstruction: TRAINING_UNIT_SYSTEM_PROMPT,
            generationConfig: genConfig
        });

        const data = JSON.parse(this.cleanJsonResponse(result.response.text()));

        return {
            id: crypto.randomUUID(),
            sessionId: '',
            greekForm: data.greekForm,
            identification: data.identification,
            recognitionGuidance: data.recognitionGuidance,
            functionInContext: data.functionInContext,
            significance: data.significance,
            reflectiveQuestion: data.reflectiveQuestion
        };
    }

    async evaluateResponse(unit: TrainingUnit, userAnswer: string, fileSearchStoreId?: string, language: string = 'Spanish'): Promise<{ feedback: string; isCorrect: boolean; }> {
        const model = this.getModelWithTools(fileSearchStoreId);

        const unitJson = JSON.stringify({
            identification: unit.identification,
            function: unit.functionInContext,
            question: unit.reflectiveQuestion
        });

        const genConfig: any = {};
        if (!fileSearchStoreId) {
            genConfig.responseMimeType = "application/json";
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: buildFeedbackPrompt(unitJson, userAnswer, language) }] }],
            systemInstruction: FEEDBACK_SYSTEM_PROMPT,
            generationConfig: genConfig
        });

        return JSON.parse(this.cleanJsonResponse(result.response.text()));
    }

    async explainMorphology(word: string, passage: string, fileSearchStoreId?: string, language: string = 'Spanish'): Promise<MorphologyBreakdown> {
        const model = this.getModelWithTools(fileSearchStoreId);

        const genConfig: any = {};
        if (!fileSearchStoreId) {
            genConfig.responseMimeType = "application/json";
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: buildMorphologyBreakdownPrompt(word, passage, language) }] }],
            systemInstruction: MORPHOLOGY_BREAKDOWN_SYSTEM_PROMPT,
            generationConfig: genConfig
        });

        const data = JSON.parse(this.cleanJsonResponse(result.response.text()));

        return {
            word: data.word || word,
            components: data.components || [],
            summary: data.summary || ''
        };
    }

    async answerFreeQuestion(
        question: string,
        context: {
            greekWord: string;
            transliteration: string;
            gloss: string;
            identification: string;
            functionInContext: string;
            significance: string;
            passage: string;
        },
        fileSearchStoreId?: string,
        language: string = 'Spanish'
    ): Promise<string> {
        const model = this.getModelWithTools(fileSearchStoreId);

        // Check if this is a general question (empty context)
        const isGeneralQuestion = !context.greekWord && !context.passage;

        if (isGeneralQuestion) {
            // General Greek question - no specific context
            const systemInstruction = `Eres un experto en griego koiné del Nuevo Testamento. 
Tu tarea es responder preguntas generales sobre el griego koiné con claridad y profundidad académica.
Siempre responde en ${language}.
Usa formato markdown para estructurar tu respuesta con títulos, listas y ejemplos cuando sea apropiado.`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: question }] }],
                systemInstruction: systemInstruction
            });

            return result.response.text();
        }

        // Contextual question about specific word/passage
        // Build context-aware prompt
        const contextPrompt = `
El estudiante está analizando la palabra griega "${context.greekWord}" (${context.transliteration}, "${context.gloss}") del pasaje ${context.passage}.

**Contexto de la palabra:**
- **Identificación**: ${context.identification}
- **Función en contexto**: ${context.functionInContext}
- **Significado teológico**: ${context.significance}

**Pregunta del estudiante:**
${question}

Por favor, proporciona una respuesta pastoral, exegéticamente sólida y pedagógicamente útil en ${language}. Usa markdown para formatear la respuesta cuando sea apropiado.
        `.trim();

        const systemInstruction = `Eres un tutor experto en griego del Nuevo Testamento y exégesis bíblica. Tu rol es responder preguntas de estudiantes pastorales sobre palabras griegas específicas en su contexto bíblico.

DIRECTRICES:
- Usa lenguaje claro y accesible
- Fundamenta tus respuestas en el contexto del pasaje
- Cuando sea relevante, menciona implicaciones teológicas o pastorales
- Usa ejemplos concretos
- Formatea tu respuesta en markdown cuando sea apropiado
- Mantén un tono pastoral y educativo`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: contextPrompt }] }],
            systemInstruction: systemInstruction
        });

        return result.response.text();
    }

    private cleanJsonResponse(text: string): string {
        // Remove markdown code blocks
        let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Find the first '{' or '['
        const firstPunctuation = cleaned.search(/[{\[]/);
        if (firstPunctuation === -1) return '{}';

        cleaned = cleaned.substring(firstPunctuation);

        // Find the matching closing bracket/brace
        // This handles cases where there's text after the JSON
        let depth = 0;
        let inString = false;
        let endIndex = -1;
        const firstChar = cleaned[0];
        const expectedClose = firstChar === '{' ? '}' : ']';

        for (let i = 0; i < cleaned.length; i++) {
            const char = cleaned[i];

            // Track if we're in a string (ignore brackets in strings)
            if (char === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
                inString = !inString;
                continue;
            }

            if (inString) continue;

            // Track bracket depth
            if (char === firstChar) {
                depth++;
            } else if (char === expectedClose) {
                depth--;
                if (depth === 0) {
                    endIndex = i;
                    break;
                }
            }
        }

        // Extract just the JSON part
        if (endIndex !== -1) {
            cleaned = cleaned.substring(0, endIndex + 1);
        }

        return cleaned.trim();
    }

    // ========================================================================
    // Phase 3B: Passage Reader Methods
    // ========================================================================

    /**
     * Retrieves biblical passage in multiple versions with word alignment
     */
    async getPassageText(
        reference: string,
        fileSearchStoreId?: string,
        language: string = 'Spanish'
    ): Promise<BiblicalPassage> {
        console.log('[GeminiGreekTutorService] Fetching passage text for:', reference);

        const model = this.getModelWithTools(fileSearchStoreId);

        const genConfig: any = {};
        if (!fileSearchStoreId) {
            genConfig.responseMimeType = "application/json";
        }

        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: buildPassageTextPrompt(reference, language) }] }],
                systemInstruction: PASSAGE_TEXT_SYSTEM_PROMPT,
                generationConfig: genConfig
            });

            const data = JSON.parse(this.cleanJsonResponse(result.response.text()));

            // Validate and structure the response
            const passage: BiblicalPassage = {
                reference: data.reference || reference,
                rv60Text: data.rv60Text || '',
                greekText: data.greekText || '',
                transliteration: data.transliteration || '',
                words: (data.words || []).map((w: any, index: number) => ({
                    id: w.id || `w${index}`,
                    greek: w.greek || '',
                    transliteration: w.transliteration || '',
                    spanish: w.spanish || '',
                    position: w.position !== undefined ? w.position : index,
                    lemma: w.lemma,
                    isInUnits: false // Will be set by use case layer
                }))
            };

            console.log('[GeminiGreekTutorService] Successfully retrieved passage with', passage.words.length, 'words');
            return passage;
        } catch (error) {
            console.error('[GeminiGreekTutorService] Error fetching passage text:', error);
            throw new Error(`Failed to retrieve passage ${reference}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Identifies a word from the passage and generates unit preview
     */
    async identifyWordForUnit(
        word: PassageWord,
        context: string,
        fileSearchStoreId?: string,
        language: string = 'Spanish'
    ): Promise<UnitPreview> {
        console.log('[GeminiGreekTutorService] Identifying word for unit:', word.greek);

        const model = this.getModelWithTools(fileSearchStoreId);

        const genConfig: any = {};
        if (!fileSearchStoreId) {
            genConfig.responseMimeType = "application/json";
        }

        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: buildWordIdentificationPrompt(word.greek, context, language) }] }],
                systemInstruction: WORD_IDENTIFICATION_SYSTEM_PROMPT,
                generationConfig: genConfig
            });

            const data = JSON.parse(this.cleanJsonResponse(result.response.text()));

            const preview: UnitPreview = {
                greekForm: {
                    text: data.greekForm.text || word.greek,
                    transliteration: data.greekForm.transliteration || word.transliteration,
                    lemma: data.greekForm.lemma || '',
                    morphology: data.greekForm.morphology || '',
                    gloss: data.greekForm.gloss || '',
                    grammaticalCategory: data.greekForm.grammaticalCategory || ''
                },
                identification: data.identification || '',
                recognitionGuidance: data.recognitionGuidance
            };

            console.log('[GeminiGreekTutorService] Successfully identified word:', preview.greekForm.lemma);
            return preview;
        } catch (error) {
            console.error('[GeminiGreekTutorService] Error identifying word:', error);
            throw new Error(`Failed to identify word ${word.greek}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Analyzes the syntactic structure of a Greek passage
     * 
     * This method is intentionally simple - it just calls Gemini with the prompt.
     * The complexity of prompt building and response parsing is handled in the
     * use case layer (Application Layer), following Clean Architecture.
     * 
     * @param prompt - The complete analysis prompt (built by use case)
     * @returns Raw JSON string response from Gemini
     */
    async analyzeSyntax(prompt: string): Promise<string> {
        try {
            console.log('[GeminiGreekTutorService] Analyzing syntax...');

            // Use the model without tools for JSON response
            // (Tools conflict with JSON mode in Gemini)
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3, // Lower temperature for more deterministic syntax analysis
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                    // NOTE: responseMimeType JSON doesn't guarantee valid JSON in practice,
                    // so we parse manually in the use case
                }
            });

            const response = result.response;
            const text = response.text();

            console.log('[GeminiGreekTutorService] Syntax analysis complete. Response length:', text.length);

            return text;
        } catch (error) {
            console.error('[GeminiGreekTutorService] Error analyzing syntax:', error);
            throw new Error(`Failed to analyze syntax: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
