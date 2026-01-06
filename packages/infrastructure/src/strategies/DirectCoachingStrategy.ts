/**
 * Direct Coaching Strategy Implementation
 * 
 * Provides quick, concise responses without guiding questions.
 * Ideal for experienced pastors who need fast answers.
 */

import {
    ICoachingStrategy,
    CoachingStyle,
    QueryAnalysis,
    QueryIntent,
    ResponseApproach
} from '@dosfilos/domain';

export class DirectCoachingStrategy implements ICoachingStrategy {

    getStyle(): CoachingStyle {
        return CoachingStyle.DIRECT;
    }

    async analyze(query: string, _context: Record<string, unknown>): Promise<QueryAnalysis> {
        const intent = this.detectIntent(query);
        const detectedTopics = this.extractTopics(query);

        return {
            isVague: false, // Direct strategy treats everything as specific
            intent,
            suggestedApproach: 'direct_answer',
            detectedTopics,
            confidence: 0.8
        };
    }

    buildSystemPromptAdditions(): string {
        return `
## ESTILO DE COACHING: DIRECTO

Tu objetivo es proporcionar respuestas rápidas, concisas y accionables.

### REGLAS DE INTERACCIÓN:

#### 1. Responde de manera directa y concisa:
- Ve al grano inmediatamente
- No hagas preguntas orientadoras antes de responder
- Proporciona la información solicitada de forma clara

#### 2. Estructura de respuesta:
a) **Respuesta principal** (1-2 párrafos máximo)
b) **Puntos clave** (lista breve si aplica)
c) **Acción sugerida** (1 línea)

#### 3. Cuando uses fuentes de la biblioteca:
- Cita brevemente: "Según Grudem..."
- No te extiendas en explicaciones teológicas largas
- Enfócate en la aplicación práctica

#### 4. Formato preferido:
- Respuestas cortas
- Listas con viñetas
- Acciones concretas

**Ejemplo:**
Usuario: "Necesito títulos para una serie de Navidad"

Respuesta directa:
"Aquí tienes 5 títulos para tu serie navideña:

1. **El Regalo Inesperado** - Enfoque en la gracia
2. **Luz en la Oscuridad** - Esperanza en tiempos difíciles
3. **Emmanuel: Dios Con Nosotros** - La presencia de Dios
4. **La Promesa Cumplida** - Profecía y cumplimiento
5. **Navidad Sin Pretensiones** - Humildad del nacimiento

Te sugiero empezar con #3 si quieres un enfoque teológico sólido."
`;
    }

    private detectIntent(query: string): QueryIntent {
        if (/dame|necesito|quiero\s+\d+|lista/i.test(query)) {
            return 'ideas';
        }
        if (/qué\s+es|significa|explica/i.test(query)) {
            return 'clarification';
        }
        if (/qué\s+dice|según/i.test(query)) {
            return 'specific_info';
        }
        return 'general_topic';
    }

    private extractTopics(query: string): string[] {
        const topics: string[] = [];
        const topicPatterns = [
            { pattern: /navidad/i, topic: 'Navidad' },
            { pattern: /resurrección/i, topic: 'Resurrección' },
            { pattern: /salvación/i, topic: 'Salvación' },
            { pattern: /gracia/i, topic: 'Gracia' },
            { pattern: /fe/i, topic: 'Fe' },
        ];

        for (const { pattern, topic } of topicPatterns) {
            if (pattern.test(query)) {
                topics.push(topic);
            }
        }
        return topics;
    }
}
