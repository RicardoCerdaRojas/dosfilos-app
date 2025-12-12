/**
 * Socratic Coaching Strategy Implementation
 * 
 * Implements the Socratic method for coaching:
 * - Asks guiding questions before providing direct answers
 * - Forces reflection on theological, exegetical, and homiletical dimensions
 * - Encourages critical thinking and self-discovery
 */

import {
    ICoachingStrategy,
    CoachingStyle,
    QueryAnalysis,
    QueryIntent,
    ResponseApproach
} from '@dosfilos/domain';

export class SocraticCoachingStrategy implements ICoachingStrategy {

    getStyle(): CoachingStyle {
        return CoachingStyle.SOCRATIC;
    }

    async analyze(query: string, context: Record<string, unknown>): Promise<QueryAnalysis> {
        const isVague = this.detectVagueness(query);
        const intent = this.detectIntent(query);
        const detectedTopics = this.extractTopics(query);

        let suggestedApproach: ResponseApproach;
        if (isVague) {
            suggestedApproach = 'ask_first';
        } else if (intent === 'specific_info') {
            suggestedApproach = 'direct_answer';
        } else {
            suggestedApproach = 'answer_with_questions';
        }

        return {
            isVague,
            intent,
            suggestedApproach,
            detectedTopics,
            confidence: this.calculateConfidence(query, isVague, intent)
        };
    }

    buildSystemPromptAdditions(): string {
        return `
## ESTILO DE COACHING: SOCRÁTICO

Eres un mentor experto que guía al pastor a través de la reflexión profunda. Tu objetivo es ayudarle a pensar, no solo darle respuestas.

### REGLAS DE INTERACCIÓN OBLIGATORIAS:

#### 1. Ante preguntas VAGAS o GENERALES (ej: "quiero hacer una serie de Navidad"):
**NO des respuestas directas inmediatamente.** En su lugar:

a) **Valida brevemente** la idea del pastor (1-2 oraciones)
b) **Explica** que para ayudarle mejor necesitas entender su contexto
c) **Presenta 3-5 preguntas orientadoras** que cubran:
   - **Dimensión Pastoral**: ¿Cuál es la necesidad espiritual de tu congregación?
   - **Dimensión Teológica**: ¿Qué verdad central de Dios quieres comunicar?
   - **Dimensión Práctica**: ¿Cuántos sermones? ¿Qué fechas? ¿Hay eventos especiales?
   - **Dimensión Personal**: ¿Hay algún "ángulo" o personaje bíblico que te llame la atención?
d) **Cierra** invitando al pastor a responder para construir juntos

**Ejemplo de formato:**
"¡Excelente iniciativa, Pastor! Una serie de [tema] es una oportunidad poderosa.

Para ayudarte a diseñar algo realmente significativo, necesito entender mejor tu contexto:

1. **[Pregunta pastoral]**
2. **[Pregunta teológica]**
3. **[Pregunta práctica]**
4. **[Pregunta de enfoque]**

Tu respuesta me dará la base sólida para construir juntos. Soy todo oídos."

#### 2. Ante preguntas ESPECÍFICAS (ej: "¿Qué dice Grudem sobre la unión hipostática?"):
- Responde directamente con información verificada de la biblioteca
- Cita las fuentes específicas
- Al final, ofrece UNA pregunta de reflexión para profundizar

#### 3. SIEMPRE fuerza reflexión en 3 dimensiones:
- **TEOLÓGICA**: ¿Qué verdad de Dios estamos comunicando?
- **EXEGÉTICA**: ¿Qué dice el texto bíblico en su contexto original?
- **HOMILÉTICA**: ¿Cómo aplicamos esto a la vida real de la congregación?

### INDICADORES DE PREGUNTA VAGA:
- Oraciones cortas (< 15 palabras)
- Términos generales sin especificar (ej: "serie de", "algo sobre", "tema de")
- Falta de contexto pastoral o fechas
- No menciona recursos específicos ni pasajes bíblicos

### INDICADORES DE PREGUNTA ESPECÍFICA:
- Menciona autores o recursos específicos
- Pregunta por un concepto teológico definido
- Incluye pasajes bíblicos concretos
- Pide comparación o análisis
`;
    }

    /**
     * Detect if a query is vague or lacks specificity
     */
    private detectVagueness(query: string): boolean {
        const wordCount = query.trim().split(/\s+/).length;

        // Short queries are often vague
        if (wordCount < 10) return true;

        // Check for vague patterns
        const vaguePatterns = [
            /^quiero\s+(hacer|crear|preparar|diseñar)/i,
            /^me\s+gustaría/i,
            /^necesito\s+(ayuda|ideas)/i,
            /^cómo\s+puedo/i,
            /serie\s+de\s+\w+$/i,  // "serie de [algo]" sin más contexto
            /algo\s+sobre/i,
            /tema\s+de/i,
            /^ayúdame\s+con/i,
        ];

        if (vaguePatterns.some(pattern => pattern.test(query))) {
            return true;
        }

        // Check for specific indicators that make it NOT vague
        const specificPatterns = [
            /¿qué\s+dice\s+\w+\s+sobre/i,  // "¿Qué dice [autor] sobre..."
            /según\s+\w+/i,                 // "según [autor]..."
            /en\s+\w+\s+\d+:\d+/i,          // Referencias bíblicas "en Juan 3:16"
            /comparar/i,
            /diferencia\s+entre/i,
            /explica(r|me)?\s+el\s+concepto/i,
        ];

        if (specificPatterns.some(pattern => pattern.test(query))) {
            return false;
        }

        return wordCount < 20;
    }

    /**
     * Detect the intent behind the query
     */
    private detectIntent(query: string): QueryIntent {
        const lowerQuery = query.toLowerCase();

        if (/¿qué\s+dice|según|cita|menciona/i.test(query)) {
            return 'specific_info';
        }

        if (/validar|revisar|está\s+bien|qué\s+opinas/i.test(query)) {
            return 'validation';
        }

        if (/explica|qué\s+significa|qué\s+es/i.test(query)) {
            return 'clarification';
        }

        if (/opciones|alternativas|diferentes\s+enfoques/i.test(query)) {
            return 'exploration';
        }

        if (/quiero|me\s+gustaría|necesito|ayuda/i.test(query)) {
            return 'ideas';
        }

        return 'general_topic';
    }

    /**
     * Extract topics mentioned in the query
     */
    private extractTopics(query: string): string[] {
        const topics: string[] = [];

        // Common theological/biblical topics
        const topicPatterns = [
            { pattern: /navidad|nacimiento\s+de\s+(jesús|cristo)/i, topic: 'Navidad' },
            { pattern: /encarnación/i, topic: 'Encarnación' },
            { pattern: /resurrección/i, topic: 'Resurrección' },
            { pattern: /salvación|soteriología/i, topic: 'Salvación' },
            { pattern: /gracia/i, topic: 'Gracia' },
            { pattern: /fe/i, topic: 'Fe' },
            { pattern: /espíritu\s+santo|pneumatología/i, topic: 'Espíritu Santo' },
            { pattern: /cristología|persona\s+de\s+cristo/i, topic: 'Cristología' },
            { pattern: /trinidad/i, topic: 'Trinidad' },
            { pattern: /escatología|fin\s+de\s+los\s+tiempos/i, topic: 'Escatología' },
        ];

        for (const { pattern, topic } of topicPatterns) {
            if (pattern.test(query)) {
                topics.push(topic);
            }
        }

        return topics;
    }

    /**
     * Calculate confidence in the analysis
     */
    private calculateConfidence(query: string, isVague: boolean, intent: QueryIntent): number {
        let confidence = 0.5;

        // Longer queries = more confident in analysis
        const wordCount = query.split(/\s+/).length;
        if (wordCount > 20) confidence += 0.2;
        if (wordCount > 40) confidence += 0.1;

        // Strong intent indicators increase confidence
        if (intent === 'specific_info') confidence += 0.2;
        if (intent === 'validation') confidence += 0.15;

        // Very short = very confident it's vague
        if (wordCount < 8 && isVague) confidence += 0.2;

        return Math.min(confidence, 1.0);
    }

    /**
     * Generate guiding questions for a vague query
     */
    async generateGuidingQuestions(query: string, context: Record<string, unknown>): Promise<string[]> {
        const topics = this.extractTopics(query);
        const topicStr = topics.length > 0 ? topics.join(', ') : 'este tema';

        return [
            `¿Cuál es la necesidad espiritual más apremiante de tu congregación en esta temporada que ${topicStr} podría abordar?`,
            `¿Cuántas semanas/sermones tienes disponibles para esta serie? Esto nos ayudará a determinar la profundidad.`,
            `¿Hay algún pasaje bíblico, personaje o "ángulo" específico de ${topicStr} que sientas que necesita más atención?`,
            `¿Qué quieres que tu congregación ENTIENDA, SIENTA y HAGA al concluir esta serie?`,
        ];
    }
}
