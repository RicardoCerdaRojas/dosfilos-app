
import { IGreekTutorService, TrainingUnit, GreekForm, UserResponse, MorphologyBreakdown } from '@dosfilos/domain';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { FORM_SELECTION_SYSTEM_PROMPT, buildFormSelectionPrompt } from './prompts/FormSelectionPrompt';
import { TRAINING_UNIT_SYSTEM_PROMPT, buildTrainingUnitPrompt } from './prompts/TrainingUnitPrompt';
import { FEEDBACK_SYSTEM_PROMPT, buildFeedbackPrompt } from './prompts/FeedbackPrompt';
import { MORPHOLOGY_BREAKDOWN_SYSTEM_PROMPT, buildMorphologyBreakdownPrompt } from './prompts/MorphologyBreakdownPrompt';

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
}
