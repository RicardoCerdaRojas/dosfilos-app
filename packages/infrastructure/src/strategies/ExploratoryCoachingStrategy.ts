/**
 * Exploratory Coaching Strategy Implementation
 * 
 * Presents multiple options and alternative approaches.
 * Ideal for brainstorming and creative exploration.
 */

import {
    ICoachingStrategy,
    CoachingStyle,
    QueryAnalysis,
    QueryIntent,
    ResponseApproach
} from '@dosfilos/domain';

export class ExploratoryCoachingStrategy implements ICoachingStrategy {

    getStyle(): CoachingStyle {
        return CoachingStyle.EXPLORATORY;
    }

    async analyze(query: string, _context: Record<string, unknown>): Promise<QueryAnalysis> {
        const intent = this.detectIntent(query);
        const detectedTopics = this.extractTopics(query);

        return {
            isVague: false,
            intent: 'exploration',
            suggestedApproach: 'answer_with_questions',
            detectedTopics,
            confidence: 0.75
        };
    }

    buildSystemPromptAdditions(): string {
        return `
## ESTILO DE COACHING: EXPLORATORIO

Tu objetivo es presentar múltiples opciones y enfoques alternativos para fomentar la creatividad.

### REGLAS DE INTERACCIÓN:

#### 1. Siempre presenta MÚLTIPLES opciones:
- Mínimo 3 enfoques diferentes
- Cada opción debe ser viable y distinta
- Indica pros y contras de cada una

#### 2. Estructura de respuesta:
a) **Breve contexto** (1-2 oraciones)
b) **Opción A**: [Nombre descriptivo]
   - Descripción breve
   - Pros: ...
   - Contras: ...
c) **Opción B**: [Nombre descriptivo]
   - (mismo formato)
d) **Opción C**: [Nombre descriptivo]
   - (mismo formato)
e) **Recomendación**: Cuál elegirías y por qué

#### 3. Tipos de opciones a explorar:
- **Por enfoque teológico**: Diferentes ángulos doctrinales
- **Por estructura**: Narrativo vs. temático vs. expositivo
- **Por audiencia**: General vs. específica
- **Por tono**: Inspiracional vs. educativo vs. confrontador

#### 4. Fomenta la creatividad:
- "¿Has considerado...?"
- "Una alternativa interesante sería..."
- "Otra posibilidad es..."

**Ejemplo:**
Usuario: "Quiero predicar sobre la gracia"

Respuesta exploratoria:
"La gracia es un tema rico con múltiples ángulos. Aquí hay 3 enfoques distintos:

**Opción A: Gracia Irresistible**
Enfoque en la doctrina reformada de la gracia soberana.
✓ Pros: Profundidad teológica, edifica la fe
✗ Contras: Puede ser abstracto para nuevos creyentes

**Opción B: Gracia en Acción**
Serie narrativa siguiendo personajes que experimentaron gracia (David, Pedro, mujer adúltera).
✓ Pros: Accesible, emocional, memorable
✗ Contras: Menos sistemático

**Opción C: Gracia vs. Obras**
Contraste entre gracia y esfuerzo humano (Gálatas/Romanos).
✓ Pros: Muy práctico, combate legalismo
✗ Contras: Requiere cuidado para no fomentar antinomianismo

**Mi sugerencia**: Para una congregación mixta, Opción B suele conectar mejor emocionalmente mientras enseña teología sólida."
`;
    }

    private detectIntent(query: string): QueryIntent {
        if (/opciones|alternativas|diferentes|otras\s+formas/i.test(query)) {
            return 'exploration';
        }
        if (/qué\s+puedo|cómo\s+podría/i.test(query)) {
            return 'ideas';
        }
        return 'exploration';
    }

    private extractTopics(query: string): string[] {
        const topics: string[] = [];
        const topicPatterns = [
            { pattern: /navidad/i, topic: 'Navidad' },
            { pattern: /gracia/i, topic: 'Gracia' },
            { pattern: /fe/i, topic: 'Fe' },
            { pattern: /amor/i, topic: 'Amor' },
            { pattern: /esperanza/i, topic: 'Esperanza' },
        ];

        for (const { pattern, topic } of topicPatterns) {
            if (pattern.test(query)) {
                topics.push(topic);
            }
        }
        return topics;
    }
}
