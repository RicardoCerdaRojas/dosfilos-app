import {
    IAIChatRepository,
    IAIGeneratorService,
    IAIProjectRepository,
    AIAgentRole,
    SermonPersonalization,
    SERMON_TONE_LABELS,
    DEFAULT_LANGUAGE,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';

export type ExtractionType = 'SERMON' | 'SERMON_OUTLINE' | 'BIBLE_STUDY' | 'COUNSELING_TASK' | 'NEWSLETTER' | 'SYSTEMATIC_THEOLOGY_PAPER';

export interface ApprovedSermonOutline {
    title: string;
    passage: string;
    proposition: string;
    points: { title: string; verses: string }[];
}

export class ExtractTheologicalContentUseCase {
    constructor(
        private chatRepository: IAIChatRepository,
        private generatorService: IAIGeneratorService,
        private projectRepository?: IAIProjectRepository
    ) { }

    async execute(userId: string, sessionId: string, type: ExtractionType, approvedOutline?: ApprovedSermonOutline, personalization?: SermonPersonalization, onChunk?: (chunk: string) => void, language: SupportedLanguage = DEFAULT_LANGUAGE): Promise<string> {
        const session = await this.chatRepository.getSession(userId, sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Load project context if the session belongs to a project
        let projectContext = '';
        if (session.projectId && this.projectRepository) {
            const project = await this.projectRepository.getProject(session.projectId);
            if (project?.contextNote) {
                projectContext = `\n\n═══ CONTEXTO DEL PROYECTO ═══\n${project.contextNote}\n═════════════════════════════\n\nConsidera este contexto al generar el contenido. Adapta el tono, profundidad y aplicaciones según la descripción de la congregación y la serie de predicación.\n`;
            }
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
            case 'SERMON': {
                // Build the approved structure block if the user edited the outline
                const outlineBlock = approvedOutline
                    ? `
═══════════════════════════════════════════════════
ESTRUCTURA APROBADA POR EL USUARIO (OBLIGATORIA)
DEBES usar EXACTAMENTE los siguientes valores.
No los modifiques, no los reinterpetes.
═══════════════════════════════════════════════════
TÍTULO: ${approvedOutline.title}
PASAJE: ${approvedOutline.passage}
PROPOSICIÓN HOMILÉTICA: ${approvedOutline.proposition}
PUNTOS DEL SERMÓN:
${approvedOutline.points.map((p, i) => `  ${['I', 'II', 'III', 'IV', 'V'][i] ?? i + 1}. ${p.title} (${p.verses})`).join('\n')}
═══════════════════════════════════════════════════
`
                    : '';

                // Build pastoral personalization block
                const personalizationBlock = this.buildPersonalizationBlock(personalization);

                extractionPrompt = `
${outlineBlock}${personalizationBlock}
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
${approvedOutline ? `- CRÍTICO: El título, pasaje, proposición y puntos ya fueron aprobados por el usuario. Úsalos EXACTAMENTE como aparecen en la ESTRUCTURA APROBADA de arriba. NO LOS CAMBIES.` : `- El formato de la proposición debe seguir exactamente este ejemplo:
  "En 📖 1 Pedro 2:11-17, aprenderás tres virtudes que todo creyente debe ejercitar en un mundo hostil."
  * Ejercita una conducta ejemplar como extranjero y peregrino (vv. 11-12)
  * Ejercita una sumisión voluntaria a las autoridades humanas por causa del Señor (vv. 13-15)
  * Ejercita tu libertad en Cristo para el bien, no como pretexto para la maldad (vv. 16-17)`}
`;
                break;
            }
            case 'BIBLE_STUDY':
                extractionPrompt = `
Analiza la conversación teológica y genera una GUÍA DE ESTUDIO BÍBLICO para un grupo pequeño siguiendo el método inductivo (Observación → Interpretación → Aplicación).

Usa esta estructura Markdown EXACTA:

# [TÍTULO DEL ESTUDIO]
**Pasaje Central:** 📖 [Referencia bíblica principal]
**Objetivo del Estudio:** [Una oración clara que describe lo que el participante aprenderá]

---

## Contexto del Pasaje
[2-3 párrafos: contexto histórico, autor, audiencia original, situación. Usa información de la conversación.]

---

## Observación: ¿Qué dice el texto?
*Guía al grupo a leer el pasaje detenidamente antes de interpretar.*

**Preguntas de Observación:**
1. [Pregunta que invite a notar un detalle específico del texto]
2. [Pregunta sobre personajes, acciones o mandamientos presentes en el pasaje]
3. [Pregunta sobre palabras, frases repetidas o contrastes en el texto]

---

## Interpretación: ¿Qué significa el texto?

**Idea Principal:**
[Declaración teológica central del pasaje en 1-2 oraciones]

**Preguntas de Interpretación:**
1. [Pregunta sobre el significado de un concepto clave del pasaje]
2. [Pregunta que explore la intención del autor para su audiencia original]
3. [Pregunta que conecte con la teología bíblica más amplia o con otro pasaje de las Escrituras]

**Nota Exegética:**
> [Si en la conversación se discutió griego/hebreo, incluir aquí el término transliterado, su significado y su relevancia para entender el pasaje. Si no se discutió ningún término, omitir esta sección.]

---

## Aplicación: ¿Cómo debo responder?

**Preguntas de Aplicación:**
1. [Pregunta personal concreta que invite a la auto-reflexión a la luz del texto]
2. [Pregunta sobre cómo este pasaje impacta nuestras relaciones o vida en comunidad]
3. [Pregunta sobre una acción práctica específica para esta semana]

---

## Versículo para Memorizar
> "[Texto completo del versículo más relevante]"
> — 📖 [Referencia]

## Oración de Cierre
[Sugerencia de oración breve (3-4 líneas) basada en las verdades del pasaje estudiado]

REGLAS:
- Usa ÚNICAMENTE información discutida en la conversación. No inventes datos ni referencias no mencionadas.
- Las preguntas deben ser ABIERTAS y promover el diálogo, NO de respuesta sí/no.
- Incluye entre 9-12 preguntas en total distribuidas entre Observación, Interpretación y Aplicación.
- Si se discutieron términos griegos/hebreos, inclúyelos en la Nota Exegética con transliteración.
- El tono debe ser pastoral, accesible y adecuado para un grupo diverso.
`;
                break;
            case 'COUNSELING_TASK':
                extractionPrompt = `
Analiza la conversación de consejería pastoral y genera un documento de TAREAS NOUTÉTICAS (homework bíblico) estructurado para uso del consejero y del aconsejado.

Usa esta estructura Markdown EXACTA:

# Tareas Bíblicas para la Semana
**Tema de la sesión:** [Tema o situación principal discutida]

---

## Resumen de la Sesión *(Confidencial — Para el consejero)*
[2-3 párrafos resumiendo los temas discutidos, pecados o patrones identificados, principios bíblicos aplicados, y el estado emocional/espiritual observado en el aconsejado.]

---

## Diagnóstico del Corazón
**Deseo raíz identificado:** [Ej: control, aprobación humana, comodidad, seguridad financiera, poder]
**Ídolo funcional:** [Qué está ocupando funcionalmente el lugar de Dios en esta situación — lo que el corazón "exige" tener]
**Pasaje diagnóstico:**
> "[Texto del versículo que expone el problema del corazón]"
> — 📖 [Referencia]

---

## Tareas para el Aconsejado

### 📖 Tarea 1: Estudio Bíblico Personal
**Pasaje:** 📖 [Referencia bíblica relevante a la situación]
**Instrucciones:** Lee este pasaje una vez al día durante la semana. Cada día, responde por escrito en un cuaderno:
1. ¿Qué dice este pasaje sobre quién es Dios y cómo actúa?
2. ¿Qué dice sobre mi situación o mi corazón?
3. ¿Qué me llama a creer, hacer o dejar de hacer?

### 🎯 Tarea 2: Cambio Práctico de Conducta
**Acción concreta:** [Descripción específica de algo que debe hacer o dejar de hacer durante la semana]
**Base bíblica:**
> "[Texto del versículo que fundamenta esta acción]"
> — 📖 [Referencia]
**Registro:** Lleva un diario breve donde anotes cada vez que la situación ocurra, cómo respondiste, y qué pensaste en ese momento.

### 🤝 Tarea 3: Tarea Relacional
**Acción concreta:** [Ej: pedir perdón a alguien, iniciar una conversación difícil, servir a una persona específica, reconciliarse con un hermano]
**Base bíblica:**
> "[Texto del versículo que fundamenta esta acción relacional]"
> — 📖 [Referencia]
**Plazo:** Completar antes de la próxima sesión de consejería.

---

## Preguntas de Seguimiento *(Para la próxima sesión)*
1. [Pregunta de seguimiento sobre el estudio bíblico: ¿Qué descubriste al leer el pasaje?]
2. [Pregunta de seguimiento sobre la conducta: ¿Qué fue lo más difícil? ¿Dónde fallaste y cómo respondiste al fallar?]
3. [Pregunta de diagnóstico del corazón para profundizar: ¿Qué te revela esto sobre lo que tu corazón realmente desea?]

---

## Verdad del Evangelio para Recordar
> "[Una promesa del Evangelio directamente relevante a la lucha del aconsejado — gracia, perdón, nueva identidad en Cristo, poder del Espíritu]"
> — 📖 [Referencia]

REGLAS:
- Fundamenta CADA tarea en un pasaje bíblico específico con texto citado.
- Las tareas deben ser CONCRETAS, MEDIBLES y ALCANZABLES en una semana.
- El tono debe ser pastoral, esperanzador y firme; nunca condenatorio ni tibio.
- Distingue claramente entre el resumen confidencial del consejero y las tareas del aconsejado.
- Incluye siempre el "Diagnóstico del Corazón" con deseo raíz e ídolo funcional (principios de David Powlison).
- Las 3 tareas deben cubrir: (1) estudio bíblico personal, (2) cambio de conducta, (3) dimensión relacional.
- Termina SIEMPRE con una verdad del Evangelio que dé esperanza.
- Usa ÚNICAMENTE información y pasajes discutidos en la conversación.
`;
                break;
            case 'NEWSLETTER':
                extractionPrompt = `
Basándote en la conversación teológica, redacta un artículo devocional para el BOLETÍN DOMINICAL de la iglesia.

Usa esta estructura Markdown EXACTA:

# [TÍTULO ATRACTIVO Y PASTORAL]
*Por [nombre del pastor/autor si se mencionó, o "Tu pastor"]*

---

**Pasaje de la semana:** 📖 [Referencia bíblica principal]

[Párrafo 1 — Gancho: Comienza con una situación cotidiana, una pregunta provocadora o una ilustración breve que conecte con la vida diaria del lector y lo guíe naturalmente al tema bíblico.]

[Párrafo 2 — Desarrollo teológico: Presenta la verdad central del pasaje de forma accesible. Si en la conversación se discutió un término griego/hebreo, menciónalo de forma breve y comprensible para un lector no especializado.]

[Párrafo 3 — Aplicación pastoral: Conecta la verdad bíblica con la vida práctica de la congregación. Ofrece ánimo, exhortación o consuelo según corresponda al tema.]

---

> "[Versículo clave del pasaje]"
> — 📖 [Referencia]

**Para reflexionar esta semana:**
- [Una pregunta personal breve para meditar]
- [Un desafío práctico sencillo]

REGLAS:
- El tono debe ser cálido, pastoral, alentador y accesible para TODA la congregación (incluyendo nuevos creyentes).
- Extensión ideal: 300-500 palabras en total (3 párrafos sustanciales).
- No uses jerga teológica excesiva. Si mencionas un término técnico, explícalo brevemente.
- Usa ÚNICAMENTE ideas y pasajes de la conversación.
- El formato debe ser listo para copiar y pegar en un boletín impreso o digital.
`;
                break;
            case 'SYSTEMATIC_THEOLOGY_PAPER':
                extractionPrompt = `
Basándote en los conceptos teológicos discutidos en la conversación, redacta un ENSAYO TEOLÓGICO ACADÉMICO breve (paper) con rigor doctrinal.

Usa esta estructura Markdown EXACTA:

# [TÍTULO ACADÉMICO DEL ENSAYO]
**Locus Teológico:** [Categoría sistemática: Soteriología, Cristología, Eclesiología, Escatología, Pneumatología, Teología Propia, Antropología, Hamartiología, etc.]
**Tradición Confesional:** Reformada

---

## Introducción
[Planteamiento del problema o pregunta teológica. Breve contexto histórico de por qué esta doctrina es relevante. Tesis del ensayo en una oración clara.]

## Fundamento Bíblico-Exegético
[Análisis de los pasajes bíblicos claves discutidos en la conversación. Si se trataron términos griegos/hebreos, incluir su análisis con transliteración. Conectar los textos con la doctrina en cuestión.]

**Textos primarios:**
- 📖 [Referencia 1] — [Breve explicación de su aporte al argumento]
- 📖 [Referencia 2] — [Breve explicación de su aporte al argumento]

## Desarrollo Dogmático
[Presentación sistemática del argumento teológico. Incluir referencias a confesiones de fe (Westminster, 1689), teólogos reformados históricos (Calvino, Turretín, Bavinck, Berkhof) o contemporáneos (Sproul, Frame, Horton) si fueron mencionados en la conversación.]

**Cita Teológica:**
> "[Cita relevante de un teólogo o confesión]"
> — *Autor, Obra*

## Errores Históricos y Refutación
[Si en la conversación se discutieron herejías o posiciones heterodoxas, presentarlas brevemente y ofrecer la respuesta ortodoxa con fundamento bíblico.]

## Implicaciones Pastorales
[Cómo esta doctrina impacta la vida de la iglesia, la predicación, la adoración o la piedad personal del creyente.]

## Conclusión
[Síntesis del argumento. Reafirmación de la tesis. Declaración doctrinal final.]

---

**Bibliografía Sugerida:**
- [Autor, *Obra* — si fue mencionado en la conversación]

REGLAS:
- Mantén rigor académico pero accesibilidad pastoral. El lector es un pastor o estudiante de seminario.
- Cita las Escrituras como autoridad primaria; los teólogos como autoridad secundaria.
- Usa ÚNICAMENTE conceptos, pasajes y autores discutidos en la conversación.
- Extensión ideal: 800-1200 palabras.
- Perspectiva: Reformada y confesional.
`;
                break;
        }

        // Build a context-aware system instruction based on the extraction type
        const systemInstructions: Record<string, string> = {
            'SERMON_OUTLINE': "Eres un experto en homilética expositiva reformada. Tu trabajo es analizar conversaciones teológicas y extraer estructuras de sermón en formato JSON limpio. No agregues texto adicional fuera del JSON solicitado.",
            'SERMON': "Eres un maestro de predicación expositiva con décadas de experiencia en la tradición reformada. Tu trabajo exclusivo es leer historiales de chat teológicos y producir bosquejos de sermón completos en Markdown de calidad profesional. Sigue la estructura indicada con exactitud. No agregues saludos, introducciones coloquiales ni comentarios finales.",
            'BIBLE_STUDY': "Eres un educador teológico experto en diseño de estudios bíblicos inductivos para grupos pequeños. Dominas el método de Observación-Interpretación-Aplicación (Howard Hendricks). Tu trabajo es transformar conversaciones teológicas en guías de estudio estructuradas, pastorales y pedagógicamente sólidas. Entrega únicamente el documento formateado en Markdown, sin saludos ni comentarios adicionales.",
            'COUNSELING_TASK': "Eres un consejero bíblico noutético con profundo conocimiento de los principios de Jay Adams y David Powlison. Dominas el diagnóstico de ídolos del corazón y la asignación de tareas bíblicas (homework) concretas y medibles. Tu trabajo es transformar sesiones de consejería en documentos estructurados con diagnóstico del corazón y tareas prácticas. Entrega únicamente el documento formateado en Markdown, sin saludos ni comentarios adicionales.",
            'NEWSLETTER': "Eres un comunicador pastoral experto en redactar devocionales accesibles y alentadores para congregaciones diversas. Tu trabajo es transformar conversaciones teológicas profundas en artículos breves, cálidos y edificantes para boletines dominicales. El tono debe ser pastoral, no académico. Entrega únicamente el artículo formateado en Markdown, listo para publicar.",
            'SYSTEMATIC_THEOLOGY_PAPER': "Eres un teólogo sistemático reformado con rigor académico y sensibilidad pastoral. Dominas las categorías de los loci teológicos clásicos y las confesiones de fe reformadas. Tu trabajo es transformar conversaciones teológicas en ensayos académicos breves con estructura lógica y fundamento escritural. Entrega únicamente el ensayo formateado en Markdown, sin saludos ni comentarios adicionales."
        };

        // We construct a strictly-focused "Extraction Agent" on the fly
        const extractionAgent = {
            id: 'system_extractor',
            name: 'Extracting Engine',
            role: 'GENERAL_TUTOR' as AIAgentRole,
            isActive: true,
            description: 'Internal content extractor engine',
            expertiseArea: 'Document formatting and summarization',
            systemInstruction: systemInstructions[type] ?? "Eres un asistente pastoral experto en redactar y dar formato a contenido teológico. Tu trabajo exclusivo es leer historiales de chat completos y extraer el contenido en un formato Markdown de altísima calidad. No agregues saludos, introducciones coloquiales ni comentarios finales, solo entrega el documento formateado y listo para exportar."
        };

        // Enable deeper reasoning for rich-content extractions.
        // JSON-only outputs (SERMON_OUTLINE) keep thinking disabled to avoid
        // polluting the structured response.
        const enableThinking = type !== 'SERMON_OUTLINE';

        const enrichedPrompt = projectContext
            ? `${projectContext}\n${extractionPrompt}`
            : extractionPrompt;

        // If onChunk is provided and it's not a JSON outline extraction, use stream
        if (onChunk && type !== 'SERMON_OUTLINE') {
            const result = await this.generatorService.sendMessageStream(
                extractionAgent,
                session.messages,
                enrichedPrompt,
                onChunk,
                undefined,
                undefined,
                undefined,
                language,
            );
            return result;
        }

        const result = await this.generatorService.sendMessage(
            extractionAgent,
            session.messages,
            enrichedPrompt,
            undefined,
            enableThinking,
            language,
        );

        return result;
    }

    /**
     * Builds a prompt section from the preacher's personalization input.
     * Only populated fields are included, so an empty personalization
     * produces an empty string (no impact on the prompt).
     */
    private buildPersonalizationBlock(personalization?: SermonPersonalization): string {
        if (!personalization) return '';

        const lines: string[] = [];

        if (personalization.tone) {
            lines.push(`TONO DEL SERMÓN: ${SERMON_TONE_LABELS[personalization.tone]}`);
        }
        if (personalization.situationalContext?.trim()) {
            lines.push(`CONTEXTO SITUACIONAL: ${personalization.situationalContext.trim()}`);
        }
        if (personalization.congregationDescription?.trim()) {
            lines.push(`CONGREGACIÓN: ${personalization.congregationDescription.trim()}`);
        }
        if (personalization.pastoralEmphasis?.trim()) {
            lines.push(`ÉNFASIS PASTORAL (lo que la congregación debe sentir/hacer): ${personalization.pastoralEmphasis.trim()}`);
        }
        if (personalization.illustrations?.trim()) {
            lines.push(`ILUSTRACIONES DEL PREDICADOR (incorporar literalmente en el cuerpo del sermón):\n${personalization.illustrations.trim()}`);
        }
        if (personalization.preacherNotes?.trim()) {
            lines.push(`NOTAS DEL PREDICADOR (ideas a desarrollar e integrar):\n${personalization.preacherNotes.trim()}`);
        }

        if (lines.length === 0) return '';

        return `
═══ VOZ DEL PREDICADOR ═══
${lines.join('\n\n')}
═════════════════════════

INSTRUCCIONES SOBRE LA VOZ DEL PREDICADOR:
- El contenido de arriba refleja la voz, intención y contexto del predicador.
- Integra sus ilustraciones y notas de forma orgánica en el sermón.
- El tono general del sermón debe alinearse con la indicación de tono.
- Las aplicaciones deben ser relevantes para la congregación descrita.

`;
    }
}

