import {
    IAIChatRepository,
    IAIGeneratorService,
    AIAgentRole
} from '@dosfilos/domain';

export type ExtractionType = 'SERMON' | 'SERMON_OUTLINE' | 'BIBLE_STUDY' | 'COUNSELING_TASK' | 'NEWSLETTER' | 'SYSTEMATIC_THEOLOGY_PAPER';

export class ExtractTheologicalContentUseCase {
    constructor(
        private chatRepository: IAIChatRepository,
        private generatorService: IAIGeneratorService
    ) { }

    async execute(userId: string, sessionId: string, type: ExtractionType): Promise<string> {
        const session = await this.chatRepository.getSession(userId, sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        let extractionPrompt = '';

        switch (type) {
            case 'SERMON_OUTLINE':
                extractionPrompt = `
Analiza la conversación teológica y extrae la estructura central del sermón en formato JSON.
Devuelve ÚNICAMENTE el siguiente JSON, sin texto adicional, sin markdown:

{
  "title": "Título creativo del sermón",
  "passage": "Referencia completa del pasaje (ej: 1 Pedro 2:11-17)",
  "proposition": "En 📖 [pasaje], [congregación] aprenderá/descubrirá [X] que [complemento].",
  "points": [
    { "title": "Título del punto I comenzando con verbo imperativo", "verses": "vv. XX-XX" },
    { "title": "Título del punto II comenzando con verbo imperativo", "verses": "vv. XX-XX" },
    { "title": "Título del punto III comenzando con verbo imperativo", "verses": "vv. XX-XX" }
  ]
}

REGLAS:
- La proposición debe comenzar con "En 📖" seguido del pasaje y ser una oración completa.
- Cada punto debe comenzar con un VERBO IMPERATIVO (Ejercita, Reconoce, Confía, etc.)
- Los versos deben ser el rango exacto del texto que corresponde a ese punto.
- Devuelve SOLO el JSON. Sin explicaciones ni texto adicional.
`;
                break;
            case 'SERMON':
                extractionPrompt = `
Basándote en la conversación teológica anterior, extrae y redacta un BOSQUEJO DE SERMÓN EXPOSITIVO COMPLETO en Markdown con esta estructura exacta:

# [TÍTULO CREATIVO DEL SERMÓN]
**Pasaje:** [Referencia bíblica con emoji 📖]
**Proposición Homilética:** [Una oración que capture el punto central]

---

## Introducción
### Contexto Histórico
[Trasfondo del pasaje: quién, cuándo, dónde, situación original]

### Conexión Actual
[Cómo esta situación original resuena hoy]

### Proposición y Puntos
[Proposición homilética completa en una sola oración (ej: "En 📖 Referencia, aprenderás X que todo creyente debe...")]
* [Título del Punto I] (vv. XX-XX)
* [Título del Punto II] (vv. XX-XX)
* [Título del Punto III] (vv. XX-XX)

---

## Punto I: [Título del Punto]
### Exposición Bíblica
[Explicación exegética accesible del texto, integrando terminología griega/hebrea si fue discutida]

**Referencias Cruzadas:**
> "[Texto del versículo]" (Referencia)

**Cita de Autoridad:**
> "[Cita de teólogo o comentarista relevante]"
> — *Autor, Fuente*

**Ilustración:** [Título de la ilustración]
[Desarrollo de la ilustración]

**Implicaciones Prácticas:**
- **Implicación 1:** [Descripción]
- **Implicación 2:** [Descripción]

*Transición:* [Frase de puente al siguiente punto]

**Recordatorio de Proposición:**
[Repetir la misma proposición homilética completa]
* [Punto I] (vv. XX-XX)
* [Punto II] (vv. XX-XX)
* [Punto III] (vv. XX-XX)

---

[Repetir estructura de Punto para cada punto adicional]

---

## Conclusión
### Síntesis
[Cierre del argumento principal que recapitula la proposición]

### Llamado Final
[Convocación a responder al mensaje]

## Llamado a la Acción
1. **[Acción concreta 1]:** Descripción
2. **[Acción concreta 2]:** Descripción
3. **[Acción concreta 3]:** Descripción

REGLAS IMPORTANTES:
- Usa únicamente lo discutido en la conversación. No inventes datos no cubiertos.
- Si en la conversación se discutió griego/hebreo, inclúyelo en la Exposición Bíblica.
- El formato de la proposición debe seguir exactamente este ejemplo:
  "En 📖 1 Pedro 2:11-17, aprenderás tres virtudes que todo creyente debe ejercitar en un mundo hostil."
  * Ejercita una conducta ejemplar como extranjero y peregrino (vv. 11-12)
  * Ejercita una sumisión voluntaria a las autoridades humanas por causa del Señor (vv. 13-15)
  * Ejercita tu libertad en Cristo para el bien, no como pretexto para la maldad (vv. 16-17)
`;
                break;
            case 'BIBLE_STUDY':
                extractionPrompt = "Resume la conversación anterior y estructúrala como una guía de estudio bíblico para un grupo pequeño, incluyendo ideas principales, preguntas de discusión para la congregación y aplicación práctica.";
                break;
            case 'COUNSELING_TASK':
                extractionPrompt = "Basado en los principios neutéticos discutidos, extrae un resumen del caso y define 3 tareas prácticas y bíblicas (homework) para el aconsejado, apoyadas en las Escrituras.";
                break;
            case 'NEWSLETTER':
                extractionPrompt = "Resume el punto teológico principal o la reflexión pastoral de esta conversación en un formato amigable y alentador para un boletín dominical (newsletter) de la iglesia, de unos 3 párrafos.";
                break;
            case 'SYSTEMATIC_THEOLOGY_PAPER':
                extractionPrompt = "Resume los conceptos dogmáticos discutidos en un formato de ensayo teológico corto o 'paper' académico con estructura lógica, citas clave y conclusión doctrinal.";
                break;
        }

        // We construct a strictly-focused "Extraction Agent" on the fly
        const extractionAgent = {
            id: 'system_extractor',
            name: 'Extracting Engine',
            role: 'GENERAL_TUTOR' as AIAgentRole,
            isActive: true,
            description: 'Internal content extractor engine',
            expertiseArea: 'Document formatting and summarization',
            systemInstruction: "Eres un asistente pastoral experto en redactar y dar formato a contenido teológico. Tu trabajo exclusivo es leer historiales de chat completos y extraer el contenido en un formato Markdown de altísima calidad. No agregues saludos, introducciones coloquiales ni comentarios finales, solo entrega el documento formateado y listo para exportar."
        };

        const result = await this.generatorService.sendMessage(
            extractionAgent,
            session.messages,
            extractionPrompt
        );

        return result;
    }
}
