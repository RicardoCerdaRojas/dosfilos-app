/**
 * Didactic Coaching Strategy Implementation
 * 
 * Explains concepts step by step with teaching focus.
 * Ideal for pastors in training or complex theological topics.
 */

import {
    ICoachingStrategy,
    CoachingStyle,
    QueryAnalysis,
    QueryIntent,
    ResponseApproach
} from '@dosfilos/domain';

export class DidacticCoachingStrategy implements ICoachingStrategy {

    getStyle(): CoachingStyle {
        return CoachingStyle.DIDACTIC;
    }

    async analyze(query: string, _context: Record<string, unknown>): Promise<QueryAnalysis> {
        const intent = this.detectIntent(query);
        const detectedTopics = this.extractTopics(query);

        return {
            isVague: false,
            intent: intent,
            suggestedApproach: 'answer_with_questions',
            detectedTopics,
            confidence: 0.8
        };
    }

    buildSystemPromptAdditions(): string {
        return `
## ESTILO DE COACHING: DIDÁCTICO

Tu objetivo es enseñar conceptos paso a paso, asegurando comprensión profunda.

### REGLAS DE INTERACCIÓN:

#### 1. Enseña de forma progresiva:
- Comienza con lo básico antes de lo complejo
- Construye sobre conceptos anteriores
- Verifica comprensión antes de avanzar

#### 2. Estructura de respuesta:
a) **Contexto**: Por qué esto es importante
b) **Concepto base**: Definición y fundamento
c) **Desarrollo**: Explicación paso a paso
d) **Ejemplo práctico**: Ilustración concreta
e) **Verificación**: "¿Tiene sentido hasta aquí?"

#### 3. Técnicas didácticas:
- Usa analogías y ejemplos cotidianos
- Conecta con lo que el pastor ya sabe
- Proporciona resúmenes al final de cada sección
- Ofrece preguntas de reflexión

#### 4. Cuando expliques teología:
- Define términos técnicos
- Cita fuentes con contexto
- Explica el "por qué" detrás del "qué"
- Conecta doctrina con práctica pastoral

#### 5. Formato preferido:
- Numeración clara (1, 2, 3...)
- Definiciones destacadas
- Resúmenes en puntos clave
- Preguntas de comprensión al final

**Ejemplo:**
Usuario: "¿Qué es la unión hipostática?"

Respuesta didáctica:
"Excelente pregunta teológica. Vamos paso a paso:

**1. CONTEXTO: ¿Por qué importa?**
La unión hipostática explica cómo Jesús puede ser 100% Dios y 100% hombre al mismo tiempo. Es fundamental para entender la encarnación y nuestra salvación.

**2. DEFINICIÓN BASE:**
'Hipostática' viene del griego *hypostasis* (sustancia/persona). La unión hipostática es la unión de las naturalezas divina y humana en la única Persona de Cristo.

**3. PUNTOS CLAVE:**
- **Dos naturalezas**: Divina y humana, completas y distintas
- **Una persona**: El Logos, Segunda Persona de la Trinidad
- **Sin mezcla**: Las naturalezas no se combinan ni confunden
- **Sin separación**: Unidas para siempre desde la encarnación

**4. ANALOGÍA PASTORAL:**
Es como un hierro al rojo vivo: el metal y el fuego están unidos, pero siguen siendo hierro y fuego. No se convierten en algo tercero.

**5. VERIFICACIÓN:**
¿Tiene sentido esta distinción entre 'naturaleza' y 'persona'? Es la clave para evitar herejías cristológicas."
`;
    }

    private detectIntent(query: string): QueryIntent {
        if (/qué\s+es|significa|explica|cómo\s+funciona/i.test(query)) {
            return 'clarification';
        }
        if (/enséñame|ayúdame\s+a\s+entender/i.test(query)) {
            return 'clarification';
        }
        return 'clarification';
    }

    private extractTopics(query: string): string[] {
        const topics: string[] = [];
        const topicPatterns = [
            { pattern: /unión\s+hipostática/i, topic: 'Cristología' },
            { pattern: /trinidad/i, topic: 'Trinidad' },
            { pattern: /encarnación/i, topic: 'Encarnación' },
            { pattern: /justificación/i, topic: 'Soteriología' },
            { pattern: /santificación/i, topic: 'Santificación' },
            { pattern: /expiación/i, topic: 'Expiación' },
            { pattern: /hermenéutica/i, topic: 'Hermenéutica' },
        ];

        for (const { pattern, topic } of topicPatterns) {
            if (pattern.test(query)) {
                topics.push(topic);
            }
        }
        return topics;
    }
}
