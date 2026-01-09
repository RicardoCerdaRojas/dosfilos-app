import {
    IQuizService,
    ISessionRepository,
    QuizQuestion,
    TrainingUnit
} from '@dosfilos/domain';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Implementation of IQuizService using Gemini AI with hybrid caching strategy.
 * 
 * Strategy:
 * 1. Generate cache key from unit characteristics (lemma + grammatical category)
 * 2. Check Firestore cache for existing questions
 * 3. If cache miss, generate with Gemini and store in cache
 * 4. Return questions
 * 
 * Follows Dependency Inversion - depends on ISessionRepository abstraction for caching.
 */
export class GeminiQuizService implements IQuizService {
    private genAI: GoogleGenerativeAI;

    constructor(
        private apiKey: string,
        private sessionRepository: ISessionRepository
    ) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async generateQuizQuestions(
        unit: TrainingUnit,
        count: number,
        fileSearchStoreId?: string,
        language: string = 'Spanish'
    ): Promise<QuizQuestion[]> {
        // Generate cache key from grammatical characteristics + language
        const cacheKey = this.generateCacheKey(unit, language);

        // Try cache first (hybrid strategy)
        const cached = await this.getCached(cacheKey);
        if (cached && cached.length >= count) {
            // Update usage metrics and return
            return cached.slice(0, count).map(q => ({
                ...q,
                unitId: unit.id, // Update to current unit ID
                usageCount: (q.usageCount || 0) + 1
            }));
        }

        // Convert locale code to full language name for prompt
        const languageName = this.getLanguageName(language);

        // Generate with Gemini
        const questions = await this.generateWithGemini(unit, count, languageName);

        // Store in cache for future use
        await this.storeInCache(cacheKey, questions);

        return questions;
    }

    /**
     * Converts i18n locale code to full language name for AI prompt.
     */
    private getLanguageName(locale: string): string {
        const languageMap: Record<string, string> = {
            'es': 'Spanish',
            'en': 'English',
            'es-ES': 'Spanish',
            'en-US': 'English'
        };
        return languageMap[locale] || 'Spanish'; // Default to Spanish
    }

    /**
     * Generates cache key from unit grammatical characteristics AND language.
     * Units with same lemma + category + language will share quiz questions.
     */
    private generateCacheKey(unit: TrainingUnit, language: string): string {
        const { lemma, grammaticalCategory } = unit.greekForm;
        // Normalize to lowercase for consistency, include language
        return `quiz_${lemma.toLowerCase()}_${grammaticalCategory.toLowerCase()}_${language.toLowerCase()}`;
    }

    /**
     * Retrieves cached quiz questions from Firestore.
     */
    private async getCached(cacheKey: string): Promise<QuizQuestion[] | null> {
        try {
            return await this.sessionRepository.getCachedQuiz(cacheKey);
        } catch (error) {
            console.warn('[GeminiQuizService] Cache lookup failed:', error);
            return null;
        }
    }

    /**
     * Stores quiz questions in Firestore cache.
     */
    private async storeInCache(cacheKey: string, questions: QuizQuestion[]): Promise<void> {
        try {
            // Add cache metadata
            const questionsWithMeta = questions.map(q => ({
                ...q,
                cacheKey,
                usageCount: 1
            }));

            await this.sessionRepository.cacheQuiz(cacheKey, questionsWithMeta);
            console.log(`[GeminiQuizService] Cached ${questions.length} questions for key: ${cacheKey}`);
        } catch (error) {
            console.error('[GeminiQuizService] Failed to cache questions:', error);
            // Non-critical error - continue
        }
    }

    /**
     * Generates quiz questions using Gemini AI.
     */
    private async generateWithGemini(
        unit: TrainingUnit,
        count: number,
        language: string
    ): Promise<QuizQuestion[]> {
        const model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7 // Slight creativity for varied questions
            }
        });

        const prompt = this.buildQuizPrompt(unit, count, language);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (error) {
            console.error('[GeminiQuizService] Failed to parse Gemini response:', text);
            throw new Error('Failed to generate quiz questions');
        }

        // Map to domain entities
        return parsed.questions.map((q: any) => ({
            id: crypto.randomUUID(),
            unitId: unit.id,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            createdAt: new Date()
        }));
    }

    /**
     * Builds Gemini prompt for quiz generation.
     * Pedagogically structured to ensure quality questions.
     */
    private buildQuizPrompt(
        unit: TrainingUnit,
        count: number,
        language: string
    ): string {
        return `
Eres un tutor pedagógico especializado en griego koiné del Nuevo Testamento. Tu objetivo es generar ${count} preguntas de quiz de alta calidad pedagógica para evaluar la comprensión del estudiante pastoral.

**Contexto de la palabra estudiada:**
- Palabra griega: ${unit.greekForm.text}
- Transliteración: ${unit.greekForm.transliteration}
- Lema (forma raíz): ${unit.greekForm.lemma}
- Glosa: ${unit.greekForm.gloss}
- Identificación gramatical: ${unit.identification}
- Función en contexto: ${unit.functionInContext}
- Significado teológico: ${unit.significance}

**Instrucciones para generar quiz de calidad:**

1. **Progresión pedagógica**: Las preguntas deben ir de reconocimiento básico a aplicación teológica:
   - Primera pregunta: Identificación morfológica/gramatical
   - Segunda pregunta: Función sintáctica o contextual
   - Tercera pregunta: Implicación teológica o exegética

2. **Tipos de pregunta permitidos**:
   - "multiple-choice": 4 opciones (1 correcta, 3 distractores plausibles)
   - "true-false": Afirmación que requiere juicio verdadero/falso

3. **Calidad de distractores (opciones incorrectas)**:
   - Deben ser plausibles pero claramente incorrectas
   - Basados en errores comunes de estudiantes
   - No deben ser obviamente absurdas

4. **Explicaciones**:
   - Deben ser concisas (2-3 oraciones)
   - Explicar POR QUÉ la respuesta es correcta
   - Opcionalmente, mencionar por qué los distractores son incorrectos

**Formato de respuesta requerido** (JSON estricto):

{
  "questions": [
    {
      "type": "multiple-choice",
      "question": "¿Qué característica gramatical identifica a '${unit.greekForm.text}'?",
      "options": [
        "Opción A correcta",
        "Opción B incorrecta",
        "Opción C incorrecta",
        "Opción D incorrecta"
      ],
      "correctAnswer": "Opción A correcta",
      "explanation": "Esta es la respuesta correcta porque..."
    },
    {
      "type": "true-false",
      "question": "La función de '${unit.greekForm.text}' en este contexto es enfatizar la acción completada.",
      "options": ["Verdadero", "Falso"],
      "correctAnswer": "Verdadero",
      "explanation": "Es verdadero porque..."
    }
  ]
}

**IMPORTANTE**: 
- Genera exactamente ${count} preguntas
- Responde SOLO con JSON válido, sin texto adicional
- Todas las preguntas en ${language}
- Enfócate en la comprensión exegética, no en memorización superficial
        `.trim();
    }
}
