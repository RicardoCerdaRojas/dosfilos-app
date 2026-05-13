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

export type ExtractionType =
    | 'SERMON'
    | 'SERMON_OUTLINE'
    | 'BIBLE_STUDY'
    | 'COUNSELING_TASK'
    | 'NEWSLETTER'
    | 'SYSTEMATIC_THEOLOGY_PAPER'
    | 'BLOG_POST'
    | 'DEVOTIONAL';

/**
 * Mode-detection preamble injected into every non-SERMON template.
 *
 * Existing templates assumed the conversation was always about a SPECIFIC
 * Bible passage. When a user discusses a CONCEPT instead (morphology vs
 * syntax, doctrine of justification, noutetic method), the model forced
 * the concept content into a passage-anchored template and produced
 * generic devotionals/studies that lost the actual topic.
 *
 * This preamble lets the template branch: passage-focused conversations
 * keep the current behavior; concept-focused conversations get a
 * concept-anchored variant that uses biblical references as supporting
 * examples rather than as the central organizing element.
 */
const MODE_DETECTION_PREAMBLE = `
═══════════════════════════════════════════════════════════
ANTES DE REDACTAR — IDENTIFICA EL TIPO DE CONVERSACIÓN
═══════════════════════════════════════════════════════════

MODO A — Conversación centrada en un PASAJE BÍBLICO específico
  Ejemplos: "exégesis de Juan 3:16", "estudio de 1 Pedro 2:11-17",
  "qué significa Romanos 8:28 en contexto", "análisis de Génesis 1".
  → Estructura el output AROUND ese pasaje. El pasaje es el
    corazón del documento. Los conceptos teológicos sirven al
    pasaje.

MODO B — Conversación centrada en un CONCEPTO teológico o método
  Ejemplos: "diferencia entre morfología y sintaxis", "doctrina
  de la justificación por fe", "método histórico-gramatical",
  "consejería noutética vs. psicología secular", "qué es la
  inerrancia bíblica".
  → Estructura el output AROUND ese concepto. El concepto es el
    corazón del documento. Los pasajes bíblicos aparecen como
    ejemplos ilustrativos y respaldo del concepto, no como tema
    principal.

Identifica el modo PRIMERO. Después adapta el formato del template
a ese modo. Las instrucciones específicas por sección indican qué
escribir en cada modo. No mezcles modos en el mismo documento.

═══════════════════════════════════════════════════════════
`;

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
                extractionPrompt = `${MODE_DETECTION_PREAMBLE}
Genera una GUÍA DE ESTUDIO BÍBLICO para un grupo pequeño basada en la conversación teológica.

═══ ESTRUCTURA PARA MODO A — Pasaje específico ═══

# [TÍTULO DEL ESTUDIO — refleja el pasaje y su mensaje]
**Pasaje Central:** 📖 [Referencia bíblica principal]
**Objetivo del Estudio:** [Una oración clara que describe lo que el participante aprenderá del pasaje]

---

## Contexto del Pasaje
[2-3 párrafos: contexto histórico, autor, audiencia original, situación. Usa información de la conversación.]

---

## Observación: ¿Qué dice el texto?
**Preguntas de Observación:**
1. [Pregunta sobre detalles del texto]
2. [Pregunta sobre personajes, acciones o mandamientos]
3. [Pregunta sobre palabras o frases repetidas]

## Interpretación: ¿Qué significa el texto?
**Idea Principal:** [Declaración teológica central en 1-2 oraciones]

**Preguntas de Interpretación:**
1. [Pregunta sobre significado de un concepto clave]
2. [Pregunta sobre intención del autor]
3. [Pregunta que conecte con teología bíblica más amplia]

**Nota Exegética:**
> [Si se discutió griego/hebreo en la conversación: transliteración + significado + relevancia. Omitir si no aplica.]

## Aplicación: ¿Cómo debo responder?
**Preguntas de Aplicación:**
1. [Pregunta personal de auto-reflexión a la luz del texto]
2. [Pregunta sobre relaciones o vida en comunidad]
3. [Pregunta sobre acción práctica para esta semana]

═══ ESTRUCTURA PARA MODO B — Concepto teológico/gramatical ═══

# [TÍTULO DEL ESTUDIO — refleja el concepto y su importancia para la vida cristiana]
**Tema:** [El concepto en cuestión, ej: "La diferencia entre morfología y sintaxis en el griego del NT"]
**Objetivo del Estudio:** [Una oración clara: qué entenderá el participante sobre el concepto y por qué importa para su vida]

---

## ¿De qué se trata este concepto?
[2-3 párrafos definiendo el concepto en términos accesibles. Usa información de la conversación.]

---

## Anclas Bíblicas: ¿Dónde vemos esto en la Escritura?
[Pasajes bíblicos mencionados en la conversación que ilustran el concepto. Para cada uno:]
- 📖 **[Referencia]** — Cómo este pasaje muestra el concepto.

---

## Exploración del Concepto
**Preguntas de Comprensión:**
1. [Pregunta que invite a explicar el concepto con palabras propias]
2. [Pregunta que distinga el concepto de otros relacionados]
3. [Pregunta sobre la dimensión teológica/exegética que el concepto ilumina]

**Profundización:**
[2-3 párrafos desarrollando matices del concepto. Si se discutieron términos técnicos del griego/hebreo, transliteración + significado aquí.]

**Preguntas de Discernimiento:**
1. [Pregunta sobre errores comunes al aplicar este concepto]
2. [Pregunta sobre cómo este concepto cambia nuestra lectura de la Escritura]

## Aplicación a la Vida Cristiana
**Preguntas de Aplicación:**
1. [Pregunta sobre cómo este concepto afecta la lectura personal de la Biblia]
2. [Pregunta sobre implicaciones para la enseñanza en la iglesia o el grupo]
3. [Pregunta sobre una práctica concreta que el participante puede adoptar]

═══ COMÚN A AMBOS MODOS ═══

---

## Versículo para Memorizar
> "[Texto del versículo más relevante — del pasaje en MODO A, o de los discutidos en MODO B]"
> — 📖 [Referencia]

## Oración de Cierre
[Oración breve (3-4 líneas) basada en lo estudiado]

REGLAS COMUNES:
- Usa ÚNICAMENTE información discutida en la conversación. No inventes datos.
- Preguntas ABIERTAS, no de sí/no.
- 9-12 preguntas totales distribuidas en las secciones.
- Tono pastoral, accesible, adecuado para grupo diverso.
- Si se discutieron términos griegos/hebreos, transliteración obligatoria.
`;
                break;
            case 'COUNSELING_TASK':
                extractionPrompt = `${MODE_DETECTION_PREAMBLE}
Genera un documento de TAREAS NOUTÉTICAS (homework bíblico) para uso del consejero y del aconsejado, basado en la conversación.

NOTA DE MODO: las conversaciones de consejería suelen ser MODO A (caso específico anclado a uno o más pasajes) PERO también pueden ser MODO B (discusión sobre principios noutéticos, el rol del corazón, idolatría funcional, etc.) En MODO B el documento se convierte en una guía para que el consejero APLIQUE esos principios en casos futuros, no para asignar a un aconsejado específico.

═══ ESTRUCTURA PARA MODO A — Caso específico de consejería ═══

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
> "[Una promesa del Evangelio directamente relevante a la lucha del aconsejado]"
> — 📖 [Referencia]

═══ ESTRUCTURA PARA MODO B — Guía noutética sobre un principio/concepto ═══

# [TÍTULO — refleja el principio noutético discutido]
**Tema noutético:** [Principio o concepto, ej: "Diagnóstico de ídolos funcionales del corazón"]
**Para uso del consejero pastoral**

---

## El Principio en Síntesis
[2-3 párrafos definiendo el principio con claridad. Usa la conversación.]

## Fundamento Bíblico
[Pasajes discutidos en la conversación que sustentan el principio. Para cada uno:]
- 📖 **[Referencia]** — Cómo este texto fundamenta el principio.

## Diagnóstico Pastoral: Cómo Reconocerlo en Casos
[3-5 señales prácticas que ayudan al consejero a identificar cuándo este principio aplica a una sesión.]

## Aplicación Pastoral: Preguntas para Usar con el Aconsejado
1. [Pregunta diagnóstica que un consejero puede hacer]
2. [Pregunta de exposición del corazón]
3. [Pregunta de aplicación bíblica concreta]
4. [Pregunta de seguimiento sobre cambio práctico]

## Riesgos y Errores Comunes
[Cómo este principio puede mal-aplicarse. Distinción de psicologías secularizadas si la conversación lo trató.]

## Pasajes Clave para Tener a Mano
- 📖 **[Referencia]** — Aplicación contextual.
- 📖 **[Referencia]** — Aplicación contextual.

═══ COMÚN A AMBOS MODOS ═══

REGLAS:
- En MODO A: fundamenta CADA tarea en pasaje bíblico con texto citado; tareas CONCRETAS, MEDIBLES, ALCANZABLES en una semana; las 3 tareas cubren estudio personal, cambio de conducta, dimensión relacional; cierra con verdad del Evangelio.
- En MODO B: el documento es un recurso PARA EL CONSEJERO sobre el principio. No incluye tareas para un aconsejado específico (no hay uno). Mantiene rigor noutético (Powlison, Adams, Tripp) si la conversación lo invocó.
- Ambos modos: tono pastoral, esperanzador y firme. Nunca condenatorio ni tibio.
- Usa ÚNICAMENTE información y pasajes discutidos en la conversación.
`;
                break;
            case 'NEWSLETTER':
                extractionPrompt = `${MODE_DETECTION_PREAMBLE}
Redacta un artículo devocional para el BOLETÍN DOMINICAL de la iglesia, basado en la conversación.

═══ ESTRUCTURA PARA MODO A — Pasaje específico ═══

# [TÍTULO ATRACTIVO Y PASTORAL — sobre el pasaje]
*Por Tu pastor*

---

**Pasaje de la semana:** 📖 [Referencia bíblica principal]

[Párrafo 1 — Gancho: situación cotidiana, pregunta provocadora o ilustración breve que conecte con la vida diaria y guíe al tema bíblico del pasaje.]

[Párrafo 2 — Desarrollo teológico: presenta la verdad central del pasaje de forma accesible. Si se discutió un término griego/hebreo en la conversación, menciónalo de forma breve y comprensible.]

[Párrafo 3 — Aplicación pastoral: conecta la verdad bíblica con la vida práctica de la congregación. Ánimo, exhortación o consuelo según corresponda.]

---

> "[Versículo clave del pasaje]"
> — 📖 [Referencia]

═══ ESTRUCTURA PARA MODO B — Concepto teológico/gramatical ═══

# [TÍTULO ATRACTIVO Y PASTORAL — sobre el concepto y por qué importa]
*Por Tu pastor*

---

**Tema de la semana:** [El concepto, ej: "Por qué la gramática del griego del NT importa para tu lectura de la Biblia"]

[Párrafo 1 — Gancho: pregunta o ilustración que conecte el concepto con la experiencia del lector. Algo como "¿Alguna vez te has preguntado por qué dos traducciones del mismo versículo dicen cosas distintas?" si el tema es traducción/gramática.]

[Párrafo 2 — Desarrollo accesible: explica el concepto en términos comprensibles para un lector no especializado. Usa ejemplos concretos. Si la conversación incluyó términos técnicos (griego/hebreo, gramaticales, teológicos), tradúcelos al lenguaje del lector promedio.]

[Párrafo 3 — Aplicación pastoral: por qué este concepto importa para la vida del creyente y la salud de la iglesia. Cómo cambia o profundiza la lectura personal de la Escritura.]

---

> "[Versículo bíblico citado en la conversación que ilustra el concepto]"
> — 📖 [Referencia]

═══ COMÚN A AMBOS MODOS ═══

**Para reflexionar esta semana:**
- [Una pregunta personal breve para meditar]
- [Un desafío práctico sencillo]

REGLAS:
- Tono cálido, pastoral, alentador, accesible para TODA la congregación (incluyendo nuevos creyentes).
- Extensión: 300-500 palabras (3 párrafos sustanciales).
- Sin jerga teológica excesiva. Términos técnicos explicados brevemente.
- Usa ÚNICAMENTE ideas y pasajes de la conversación.
- Formato listo para copiar/pegar en boletín impreso o digital.
`;
                break;
            case 'SYSTEMATIC_THEOLOGY_PAPER':
                extractionPrompt = `${MODE_DETECTION_PREAMBLE}
Redacta un ENSAYO TEOLÓGICO ACADÉMICO breve (paper) con rigor doctrinal, basado en la conversación.

═══ ESTRUCTURA PARA MODO A — Ensayo anclado en un pasaje ═══

# [TÍTULO ACADÉMICO — refleja el pasaje y su carga doctrinal]
**Locus Teológico:** [Categoría sistemática que el pasaje toca]
**Tradición Confesional:** Reformada

---

## Introducción
[Planteamiento: por qué este pasaje genera la cuestión doctrinal. Tesis del ensayo en una oración.]

## Fundamento Bíblico-Exegético
[Análisis del pasaje central. Términos griegos/hebreos con transliteración si se discutieron.]

**Textos primarios:**
- 📖 [Pasaje central] — [Aporte al argumento]
- 📖 [Referencias cruzadas discutidas] — [Aporte]

═══ ESTRUCTURA PARA MODO B — Ensayo anclado en un concepto/locus ═══

# [TÍTULO ACADÉMICO — refleja el concepto/doctrina como locus]
**Locus Teológico:** [La categoría sistemática del concepto, ej: "Bibliología — Doctrina de la Inspiración", "Hermenéutica — Método Histórico-Gramatical"]
**Tradición Confesional:** Reformada

---

## Introducción
[Planteamiento del problema teológico. Por qué el concepto importa. Tesis del ensayo en una oración.]

## Definición y Delimitación del Concepto
[2-3 párrafos definiendo el concepto con precisión académica. Distinción de conceptos vecinos. Usa terminología técnica discutida en la conversación.]

## Fundamento Bíblico
[Pasajes discutidos que sustentan el concepto. Para cada uno:]
- 📖 [Referencia] — [Cómo este texto fundamenta o ilustra el concepto]

═══ COMÚN A AMBOS MODOS ═══

## Desarrollo Dogmático
[Argumento sistemático. Referencias a confesiones (Westminster, 1689) y teólogos reformados (Calvino, Turretín, Bavinck, Berkhof, Sproul, Frame, Horton) si la conversación los invocó.]

**Cita Teológica:**
> "[Cita relevante]"
> — *Autor, Obra*

## Errores Históricos y Refutación
[Posiciones heterodoxas relevantes discutidas en la conversación + respuesta ortodoxa con fundamento bíblico.]

## Implicaciones Pastorales
[Cómo el pasaje/concepto impacta la vida de la iglesia: predicación, adoración, piedad, formación. Diferencia entre MODO A (el pasaje predicado fielmente) y MODO B (el concepto enseñado y aplicado).]

## Conclusión
[Síntesis del argumento. Reafirmación de la tesis. Declaración doctrinal final.]

---

**Bibliografía Sugerida:**
- [Autor, *Obra* — si fue mencionado en la conversación]

REGLAS:
- Rigor académico + accesibilidad pastoral. Lector: pastor o estudiante de seminario.
- Escrituras como autoridad primaria; teólogos como secundaria.
- Usa ÚNICAMENTE conceptos, pasajes y autores discutidos en la conversación.
- Extensión: 800-1200 palabras.
- Perspectiva: Reformada y confesional.
`;
                break;

            case 'BLOG_POST':
                extractionPrompt = `${MODE_DETECTION_PREAMBLE}
Redacta una entrada para un BLOG PASTORAL en WordPress. El autor del blog es un pastor que expone SU PUNTO DE VISTA personal sobre lo que estudia, conectándolo con la relevancia para la iglesia hoy. NO es un ensayo académico ni un sermón — es ensayístico, reflexivo, pastoral-personal.

═══ ESTRUCTURA PARA MODO A — Reflexión sobre un pasaje ═══

# [TÍTULO PROVOCATIVO — invita a leer]

[Párrafo 1 — Hook personal: el pastor cuenta por qué este pasaje lo ha estado ocupando. Una experiencia, una pregunta que le surgió, algo que vio en su iglesia. Primera persona singular ("esta semana estuve estudiando", "me llamó la atención", "no había notado").]

[Párrafo 2 — Lo que dice el pasaje: explica el pasaje en términos accesibles. Si en la conversación se discutió griego/hebreo, lo menciona con la naturalidad de alguien que conoce el idioma sin asfixiar al lector con tecnicismos. Una transliteración suelta + significado pastoral.]

[Párrafo 3 — Lo que veo aquí (su POV): la lectura PERSONAL del pastor. Su énfasis. Lo que él destaca o re-enmarca. Esta es la voz editorial del blog — no neutral, comprometida.]

[Párrafo 4 — Por qué importa para la iglesia hoy: cómo este pasaje habla a la situación de la iglesia contemporánea. Crítica suave a errores comunes. Llamado a una práctica o postura.]

[Párrafo 5 — Cierre reflexivo: una invitación a meditar, una pregunta abierta para los lectores, o una declaración personal de cómo este estudio lo cambió a él.]

═══ ESTRUCTURA PARA MODO B — Reflexión sobre un concepto ═══

# [TÍTULO PROVOCATIVO — invita a leer]

[Párrafo 1 — Hook personal: por qué este concepto lo tiene ocupado al pastor. La conversación o estudio que lo llevó a pensar en esto. Una observación de su iglesia o de la cultura cristiana que lo hizo volver al tema.]

[Párrafo 2 — Qué es el concepto (en términos accesibles): definición desde la voz del pastor, no desde un manual. Si el concepto involucra términos técnicos (griego/hebreo/dogmática), los traduce con calidez.]

[Párrafo 3 — Por qué el concepto se distorsiona o se ignora: la crítica del pastor. Errores comunes que ha visto. Confusiones populares.]

[Párrafo 4 — Lo que cambia cuando lo recuperamos: cómo entender bien este concepto reforma la lectura de la Biblia, la predicación, la consejería, la vida cristiana — según lo que el pastor identifica.]

[Párrafo 5 — Cierre con llamado: invitación a los lectores a estudiar, a corregir una práctica, o a sumarse a una conversación. Pregunta abierta opcional.]

═══ COMÚN A AMBOS MODOS ═══

REGLAS:
- VOZ PRIMERA PERSONA SINGULAR del pastor ("estuve estudiando", "me llamó la atención", "creo que", "veo en mi iglesia"). NO voz institucional ni académica.
- Tono ensayístico-pastoral: reflexivo, comprometido, con opinión clara pero humilde. Estilo blog cristiano serio (piensa Tim Challies, Jared Wilson, Carl Trueman — no Christianity Today devocional).
- Extensión: 600-1000 palabras (5 párrafos sustanciales).
- Citas bíblicas inline cuando aporten — formato natural, no académico (ej: "Pablo escribe en Romanos 8:28 que..." más que "Romanos 8:28 dice...").
- Términos técnicos: explicados con naturalidad pastoral. Una transliteración suelta es OK, no listas exhaustivas.
- Usa ÚNICAMENTE ideas, pasajes y referencias discutidos en la conversación.
- NO incluyas título con "Por Tu pastor" — el blog tiene autor implícito.
- Markdown limpio, listo para pegar en WordPress.
`;
                break;

            case 'DEVOTIONAL':
                extractionPrompt = `${MODE_DETECTION_PREAMBLE}
Redacta un DEVOCIONAL DIARIO BREVE — una versión condensada del tema con reflexión pastoral, pensado para que un creyente lo lea en 2-3 minutos como parte de su tiempo personal con Dios.

═══ ESTRUCTURA PARA MODO A — Devocional sobre un pasaje ═══

# [TÍTULO BREVE Y EVOCADOR]

> "[Texto del versículo central — máximo 2 versículos]"
> — 📖 [Referencia]

[Párrafo 1 — Observación pastoral del pasaje en 3-4 oraciones: qué dice, qué llama la atención. Si se discutió griego/hebreo en la conversación, una palabra clave con su significado en una oración suelta. Sin tecnicismo pesado.]

[Párrafo 2 — Reflexión personal en 3-4 oraciones: qué nos enseña este texto sobre Dios, sobre nosotros, sobre el evangelio. La verdad central del pasaje aplicada al corazón del lector. Tono pastoral cálido.]

**Para hoy:**
[Una sola oración: un pensamiento concreto para llevar al día. Acción, postura o meditación.]

**Oración:**
[3-4 líneas. Oración breve que el lector puede hacer suya. Primera persona singular.]

═══ ESTRUCTURA PARA MODO B — Devocional sobre un concepto ═══

# [TÍTULO BREVE Y EVOCADOR]

> "[Versículo bíblico discutido en la conversación que ilustra el concepto]"
> — 📖 [Referencia]

[Párrafo 1 — Introducción al concepto en 3-4 oraciones: qué es, en lenguaje accesible. Sin jerga. Una palabra técnica máximo, traducida al instante.]

[Párrafo 2 — Por qué este concepto te importa hoy: la dimensión personal del concepto. Cómo cambia la forma en que lees la Biblia, oras, vives. 3-4 oraciones de reflexión pastoral cálida.]

**Para hoy:**
[Una sola oración: cómo este concepto se traduce en una práctica o postura concreta para el día.]

**Oración:**
[3-4 líneas. Oración breve. Primera persona singular.]

═══ COMÚN A AMBOS MODOS ═══

REGLAS:
- Extensión TOTAL: 150-300 palabras. Es BREVE — un devocional matutino, no un sermón.
- Tono cálido, personal, accesible. Sin jerga teológica. Sin ostentación académica.
- Lectura: 2-3 minutos máximo.
- Usa ÚNICAMENTE ideas y pasajes de la conversación.
- "Para hoy" + "Oración" son OBLIGATORIOS en ambos modos.
- Markdown limpio.
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
            'SYSTEMATIC_THEOLOGY_PAPER': "Eres un teólogo sistemático reformado con rigor académico y sensibilidad pastoral. Dominas las categorías de los loci teológicos clásicos y las confesiones de fe reformadas. Tu trabajo es transformar conversaciones teológicas en ensayos académicos breves con estructura lógica y fundamento escritural. Entrega únicamente el ensayo formateado en Markdown, sin saludos ni comentarios adicionales.",
            'BLOG_POST': "Eres un pastor reformado que escribe un blog cristiano serio en la línea de Tim Challies, Jared C. Wilson o Carl Trueman — ensayístico, reflexivo, con opinión clara pero humilde, en primera persona. Tu trabajo es transformar conversaciones teológicas en entradas de blog donde expones tu punto de vista pastoral sobre lo estudiado y conectas con la relevancia para la iglesia hoy. Escribe siempre en primera persona singular ('estuve estudiando', 'me llamó la atención', 'creo que'). Entrega únicamente la entrada formateada en Markdown, lista para pegar en WordPress.",
            'DEVOTIONAL': "Eres un pastor que escribe devocionales diarios breves para lectores que dedican 2-3 minutos a su tiempo personal con Dios. Tu trabajo es destilar conversaciones teológicas en piezas devocionales cortas, cálidas y centradas en una sola idea. Sin jerga académica, sin ostentación. Reflexión pastoral accesible que mueva el corazón. Entrega únicamente el devocional formateado en Markdown."
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

