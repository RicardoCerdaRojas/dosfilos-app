
import { IGreekTutorService, IWordCacheRepository, TrainingUnit, GreekForm, UserResponse, MorphologyBreakdown, BiblicalPassage, PassageWord, UnitPreview } from '@dosfilos/domain';
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
    private wordCache?: IWordCacheRepository;

    constructor(apiKey: string, wordCache?: IWordCacheRepository) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME });
        this.wordCache = wordCache;
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
            // Check for common keys
            if (Array.isArray(parsed.forms)) return parsed.forms;
            if (Array.isArray(parsed.greekForms)) return parsed.greekForms;
            if (Array.isArray(parsed.words)) return parsed.words;
            if (Array.isArray(parsed.items)) return parsed.items;

            // Fallback: look for ANY array value
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

        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: buildMorphologyBreakdownPrompt(word, passage, language) }] }],
                systemInstruction: MORPHOLOGY_BREAKDOWN_SYSTEM_PROMPT,
                generationConfig: genConfig
            });

            const rawText = result.response.text();
            const cleanedJson = this.cleanJsonResponse(rawText);
            const data = JSON.parse(cleanedJson);

            const morphology = {
                word: data.word || word,
                components: data.components || [],
                summary: data.summary || ''
            };

            return morphology;
        } catch (error) {
            console.error('[GeminiGreekTutorService] Error in explainMorphology:', error);
            throw error;
        }
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

FORMATO DE RESPUESTA REQUERIDO (OBLIGATORIO):
Tu respuesta DEBE seguir esta estructura con headers markdown:

## Concepto Central
Definición clara y accesible del tema preguntado.
Mínimo: 100-150 palabras.

## Contexto y Uso en el NT
Explicación de cómo se manifiesta este concepto en el griego del NT.
Ejemplos concretos de diferentes libros.
Mínimo: 150-200 palabras.

## Aspectos Técnicos
Detalles gramaticales, morfológicos o sintácticos relevantes.
Referencias a paradigmas o reglas cuando sea apropiado.
Mínimo: 100-150 palabras.

## Implicaciones para la Exégesis
Cómo este conocimiento mejora la interpretación bíblica.
Aplicación práctica para el estudio pastoral.
Mínimo: 80-120 palabras.

## Ejemplos Ilustrativos
3-4 ejemplos específicos del NT con referencias exactas.

DIRECTRICES CRÍTICAS:
- LONGITUD TOTAL MÍNIMA: 500-800 palabras
- Usa negritas (**texto**) para términos técnicos
- Incluye versículos y referencias específicas
- Mantén tono académico pero accesible
- NO truncar - desarrolla cada sección completamente
- Responde SIEMPRE en ${language}`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: question }] }],
                systemInstruction: systemInstruction,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192, // Ensure complete responses
                }
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
        `.trim();

        const systemInstruction = `Eres un tutor experto en griego del Nuevo Testamento y exégesis bíblica. 
Tu rol es responder preguntas de estudiantes pastorales sobre palabras griegas específicas en su contexto bíblico.

FORMATO DE RESPUESTA REQUERIDO (OBLIGATORIO):
Tu respuesta DEBE seguir esta estructura exacta con headers markdown:

## Concepto Clave
Definición clara del aspecto gramatical, morfológico o teológico relevante.
Mínimo: 80-120 palabras.

## Contexto en el Pasaje  
Explicación específica de cómo funciona en este versículo particular.
Incluye análisis de la sintaxis y relación con palabras circundantes.
Mínimo: 100-150 palabras.

## Profundización Técnica
Análisis morfológico detallado, paralelos sintácticos, y aspectos técnicos.
Puede incluir referencias a gramáticas o léxicos cuando sea relevante.
Mínimo: 100-150 palabras.

## Implicaciones Pastorales
Aplicación práctica para predicación y enseñanza.
Cómo este entendimiento enriquece la exposición del texto.
Mínimo: 80-120 palabras.

## Ejemplos del Nuevo Testamento
2-3 ejemplos similares de otros pasajes que ilustren el mismo concepto.

DIRECTRICES CRÍTICAS:
- LONGITUD TOTAL MÍNIMA: 500-800 palabras
- Usa negritas (**texto**) para términos técnicos clave
- Incluye ejemplos concretos en cada sección
- Cita versículos específicos cuando sea relevante
- Mantén tono académico pero accesible para pastores
- NO truncar ni abreviar - desarrolla cada sección completamente
- Responde SIEMPRE en ${language}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: contextPrompt }] }],
            systemInstruction: systemInstruction,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192, // Ensure complete responses
            }
        });

        return result.response.text();
    }

    private cleanJsonResponse(text: string): string {
        // Remove markdown code blocks
        let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Attempt to find the first generic JSON start
        const firstPunctuation = cleaned.search(/[{\[]/);
        if (firstPunctuation === -1) {
            console.warn('[GeminiGreekTutorService] No JSON start character found in response.');
            return '[]'; // Return empty array as fallback if really no JSON
        }

        // Find the last actual JSON end
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        const lastPunctuation = Math.max(lastBrace, lastBracket);

        if (lastPunctuation === -1 || lastPunctuation < firstPunctuation) {
            console.warn('[GeminiGreekTutorService] No JSON end character found in response.');
            return '[]';
        }

        cleaned = cleaned.substring(firstPunctuation, lastPunctuation + 1);
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

        // Check cache first (if lemma available and cache enabled)
        if (word.lemma && this.wordCache) {
            try {
                const cached = await this.wordCache.get(word.lemma, language);
                if (cached) {
                    console.log('[GeminiGreekTutorService] Cache HIT:', word.lemma);
                    return {
                        greekForm: {
                            text: word.greek,
                            transliteration: word.transliteration,
                            lemma: word.lemma,
                            morphology: cached.morphology,
                            gloss: cached.gloss,
                            grammaticalCategory: cached.grammaticalCategory
                        },
                        identification: cached.identification,
                        recognitionGuidance: cached.recognitionGuidance
                    };
                }
            } catch (cacheError) {
                console.warn('[GeminiGreekTutorService] Cache error:', cacheError);
            }
        }

        // Cache miss - call Gemini API
        console.log('[GeminiGreekTutorService] Cache MISS, calling API:', word.greek);

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

            // Save to cache if lemma available
            if (preview.greekForm.lemma && this.wordCache) {
                try {
                    await this.wordCache.set({
                        lemma: preview.greekForm.lemma,
                        language,
                        gloss: preview.greekForm.gloss,
                        grammaticalCategory: preview.greekForm.grammaticalCategory,
                        morphology: preview.greekForm.morphology,
                        identification: preview.identification,
                        recognitionGuidance: preview.recognitionGuidance,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    console.log('[GeminiGreekTutorService] Cached word:', preview.greekForm.lemma);
                } catch (cacheError) {
                    console.warn('[GeminiGreekTutorService] Cache save failed:', cacheError);
                }
            }

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
