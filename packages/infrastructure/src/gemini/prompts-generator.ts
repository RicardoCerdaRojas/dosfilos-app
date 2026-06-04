import { CitationManifest, GenerationRules, ExegeticalStudy, HomileticalAnalysis, WorkflowPhase, PhaseConfiguration, DEFAULT_LANGUAGE, formatSermonPersonalizationBlock } from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';

const JSON_INSTRUCTION = `IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido. No incluyas NADA de texto antes ni después del JSON (ni "Aquí está el JSON", ni bloques de código markdown como \`\`\`json). Solo el objeto JSON crudo.`;

/**
 * Defense-in-depth language directive prepended to every sermon-generator
 * prompt. Authoring of the underlying prompts is in Spanish (the launch
 * language); this directive keeps Gemini emitting in the user's locale until
 * a content authoring pass produces fully-translated EN variants.
 *
 * Why prepend (not append): models attend more strongly to leading tokens, and
 * the JSON instruction sits at the bottom of many prompts — keeping the
 * language directive at the top avoids it getting shadowed.
 */
function languageDirective(language: SupportedLanguage): string {
    if (language === 'en') {
        return 'IMPORTANT: Respond entirely in English. Field values inside any JSON output must also be in English. The instructions below are authored in Spanish — translate them mentally and respond in English.';
    }
    return 'IMPORTANTE: Responde completamente en español. Los valores dentro de cualquier JSON también deben ir en español.';
}

/**
 * Wraps any prompt body with the language directive on top.
 */
function withLanguage(language: SupportedLanguage | undefined, body: string): string {
    return `${languageDirective(language ?? DEFAULT_LANGUAGE)}\n\n${body}`;
}

const DEFAULT_BASE_PROMPT = `Actúa como un experto teólogo, exégeta bíblico y predicador evangélico con décadas de experiencia.

**MÉTODO HERMENÉUTICO DE DOS FILOS**:
Utiliza un enfoque histórico-gramatical-literal, priorizando:
1. La intención del autor original en su contexto histórico
2. El significado literal del texto en sus idiomas originales (griego/hebreo)
3. La gramática y estructura del texto como guía interpretativa
4. El testimonio coherente de toda la Escritura

Tu objetivo es ayudar a pastores a crear sermones bíblicamente fieles, teológicamente sólidos y culturalmente relevantes.`;

const BASE_SYSTEM_PROMPT = `${DEFAULT_BASE_PROMPT}\n${JSON_INSTRUCTION}`;

export function buildExegesisPrompt(passage: string, rules: GenerationRules, config?: PhaseConfiguration, language?: SupportedLanguage): string {
  return withLanguage(language, buildExegesisPromptBody(passage, rules, config));
}

function buildExegesisPromptBody(passage: string, rules: GenerationRules, config?: PhaseConfiguration): string {
  const basePersona = config?.basePrompt || DEFAULT_BASE_PROMPT;
  const userPrompts = config?.userPrompts?.map(p => `- ${p}`).join('\n') || 'Ninguna';

  let knowledgeBase = config?.documents?.map(doc =>
    `--- DOCUMENTO: ${doc.name} ---\n${doc.content?.substring(0, 10000) || ''}\n--- FIN DOCUMENTO ---`
  ).join('\n\n') || '';

  if (config?.cachedResources && config.cachedResources.length > 0) {
    const cachedList = config.cachedResources.map(r => `- ${r.title} (Autor: ${r.author})`).join('\n');
    knowledgeBase += `\n\nADEMÁS, TIENES ACCESO A LOS SIGUIENTES LIBROS COMPLETOS EN TU CONTEXTO (CACHE):\n${cachedList}\n\nINSTRUCCIÓN: Usa estos libros para tu análisis y cítalos en "ragSources" cuando extraigas información de ellos.`;
  }

  // If no library resources available, provide recommended sources
  const hasLibraryResources = (config?.documents && config.documents.length > 0) ||
    (config?.cachedResources && config.cachedResources.length > 0);

  if (!hasLibraryResources) {
    knowledgeBase = `
## 📚 FUENTES TEOLÓGICAS RECOMENDADAS (Conocimiento General)

Como no tienes acceso a la biblioteca personal del pastor, basa tu análisis en fuentes evangélicas reconocidas:

**Comentarios Bíblicos Estándar**:
- Nuevo Comentario Bíblico Siglo XXI
- Comentario Bíblico Mundo Hispano
- Comentario del Contexto Cultural de la Biblia (Craig Keener)
- Comentarios de la serie "Andamios" (Editorial Vida)

**Léxicos y Recursos Lingüísticos**:
- Léxico Griego-Español del Nuevo Testamento (Tuggy)
- Diccionario Expositivo de Palabras del AT y NT (Vine)
- Concordancia Strong

**Teología Sistemática Evangélica**:
- Teología Sistemática (Wayne Grudem)
- Teología Bíblica del Antiguo y Nuevo Testamento (Paul House)

**INSTRUCCIONES**:
1. Declara explícitamente: "Basado en conocimiento general de fuentes evangélicas estándar..."
2. Cuando cites, usa formato: "Como señalan comentaristas evangélicos..." o "Según el consenso exegético..."
3. NO inventes citas específicas de autores si no estás seguro
4. Mantén fidelidad al método histórico-gramatical-literal
`;
  }

  return `
${basePersona}
${JSON_INSTRUCTION}

FASE 1: ESTUDIO EXEGÉTICO - RESUMEN EJECUTIVO

Objetivo: Proporcionar un resumen ejecutivo conciso del estudio exegético que permita al pastor comenzar a trabajar inmediatamente.

Pasaje: "${passage}"

BASE DE CONOCIMIENTO (Usa esta información para enriquecer tu análisis):
${knowledgeBase}

## Estructura del Resumen Ejecutivo

Genera un análisis exegético que contenga:

### 1. Contexto General (2-3 párrafos máximo)
- Contexto histórico-cultural relevante
- Contexto literario (género, ubicación en el libro, flujo del argumento)
- Audiencia original y situación

### 2. Palabras Clave (3-5 términos máximo)
Para cada palabra clave:
- Término original (griego/hebreo con transliteración)
- Lema (Raíz Lexical) - ¡IMPORTANTE!
- Traducción Literal (Significado básico)
- Morfología básica (parte del discurso, tiempo verbal si aplica)
- Función sintáctica en el pasaje
- Significado teológico/exegético relevante

### 3. Proposición Exegética Tentativa
Una declaración clara y concisa (1-2 oraciones) que responda:
"¿Qué significó este texto para los oyentes originales?"

### 4. Consideraciones Pastorales (3-4 puntos clave)
Insights que el pastor debe tener en cuenta:
- Posibles malinterpretaciones comunes
- Tensiones teológicas o hermenéuticas
- Conexiones con otros pasajes bíblicos
- Aplicaciones contemporáneas potenciales (sin desarrollar aún)

Reglas Personalizadas del Usuario:
${rules.customInstructions || 'Ninguna'}
${rules.theologicalBias ? `Sesgo Teológico: ${rules.theologicalBias}` : ''}

Instrucciones Específicas del Usuario (Globales):
${userPrompts}

Formato de Salida (JSON):
{
  "passage": "${passage}",
  "context": {
    "historical": "Contexto histórico-cultural...",
    "literary": "Contexto literario y flujo del argumento...",
    "audience": "Audiencia original y situación..."
  },
  "keyWords": [
    {
      "original": "ἀποθέμενοι",
      "transliteration": "apothemenoi",
      "lemma": "ἀποτίθημι",
      "literalTranslation": "poner a un lado / desechar",
      "morphology": "Participio aoristo medio, nominativo plural masculino",
      "syntacticFunction": "Participio circunstancial de modo/manera",
      "significance": "Indica una acción decisiva y completa de 'despojarse' o 'desechar', enfatizando la totalidad del acto."
    }
  ],
  "exegeticalProposition": "Pedro exhorta a los creyentes recién nacidos espiritualmente a descartar radicalmente toda forma de maldad y engaño, para que puedan crecer en su salvación mediante el deseo puro de la Palabra de Dios.",
  "pastoralInsights": [
    "El lenguaje de 'recién nacidos' (1:23) conecta con la metáfora de crecimiento espiritual. No confundir inmadurez con incapacidad.",
    "La lista de vicios (v.1) es exhaustiva e intencional. Pedro enfatiza la incompatibilidad radical entre la nueva identidad en Cristo y estos comportamientos.",
    "El 'deseo' (ἐπιποθέω) de la leche espiritual no es pasivo sino activo y apasionado. Contrasta con la apatía espiritual."
  ],
  "ragSources": [
    {
      "title": "Nombre del documento usado",
      "author": "Autor si está disponible",
      "page": "Página o sección",
      "usedFor": "Breve descripción de cómo se usó este documento en el análisis"
    }
  ]
}

REGLAS DE GENERACIÓN:
1. Concisión: Prioriza claridad sobre exhaustividad. El pastor puede profundizar después vía chat.
2. Accesibilidad: Usa lenguaje técnico solo cuando sea necesario, y explícalo brevemente.
3. Relevancia Pastoral: Enfócate en lo que realmente impacta la predicación, no en detalles académicos oscuros.
4. Fidelidad al Texto: Toda interpretación debe estar anclada en el análisis del texto original.
5. Formato Estricto: Respeta exactamente la estructura JSON especificada.
6. Citas de Fuentes: Si usas información de los DOCUMENTOs proporcionados en la BASE DE CONOCIMIENTO, incluye en "ragSources" una entrada por cada documento que hayas consultado, indicando cómo lo usaste.
`;
}

export function buildHomileticsPrompt(exegesis: ExegeticalStudy, rules: GenerationRules, language?: SupportedLanguage): string {
  return withLanguage(language, buildHomileticsPromptBody(exegesis, rules));
}

function buildHomileticsPromptBody(exegesis: ExegeticalStudy, rules: GenerationRules): string {
  return `
${BASE_SYSTEM_PROMPT}

FASE 2: ANÁLISIS HOMILÉTICO
Objetivo: Construir un puente entre el mundo bíblico y el mundo contemporáneo.

Estudio Exegético Previo:
- Pasaje: ${exegesis.passage}
- Proposición Exegética: ${exegesis.exegeticalProposition}
- Palabras Clave: ${exegesis.keyWords.join(', ')}

Instrucciones:
1. Determina el mejor enfoque homilético (Expositivo, Temático, Narrativo, etc.) para este pasaje.
2. Genera aplicaciones contemporáneas relevantes para una audiencia: ${rules.targetAudience || 'General'}.
3. Define la Proposición Homilética: ¿Qué dice Dios hoy a través de este texto?
4. Crea un bosquejo estructurado.

Reglas Personalizadas del Usuario:
${rules.customInstructions || 'Ninguna'}
${rules.tone ? `Tono sugerido: ${rules.tone}` : ''}

Formato de Salida (JSON):
{
  "homileticalApproach": "expository",
  "contemporaryApplication": ["aplicación 1", "aplicación 2"],
  "homileticalProposition": "La proposición homilética...",
  "outline": {
    "mainPoints": [
      { "title": "Punto 1", "description": "Descripción...", "scriptureReferences": ["Ref 1"] }
    ]
  }
}
`;
}

export function buildSermonDraftPrompt(
  analysis: HomileticalAnalysis,
  rules: GenerationRules,
  language?: SupportedLanguage,
  manifest?: CitationManifest,
): string {
  return withLanguage(language, buildSermonDraftPromptBody(analysis, rules, manifest));
}

/**
 * Citation contract block for the sermon draft. Tells the LLM the EXACT set
 * of source IDs it may use and that it must attribute them NARRATIVELY in
 * the prose (07-citation-policy §4 / ADR-030) — sermons cite pastorally
 * ("Como resume la Confesión…"), NOT with `[Sn]` footnote markers (those
 * are paper-only). The S-IDs live solely in the `ragSources` JSON field,
 * which feeds the bibliography + legal attributions; `validateCitations`
 * still drops any `ragSources` entry whose `sourceId` is off-contract.
 *
 * Per ADR-030 the per-marker claim↔source fidelity pass is a paper/study
 * feature, not a sermon feature, so the sermon prose deliberately carries
 * no inline citation markers.
 *
 * Returns '' when the manifest is empty so the prompt stays clean for
 * sermons generated without retrieval context (manual flow, no library).
 */
function buildCitationContractBlock(manifest?: CitationManifest): string {
  if (!manifest || manifest.entries.length === 0) return '';
  const sourceList = manifest.entries
    .map((e) => {
      const author = e.author?.trim() ? ` — ${e.author}` : '';
      const page = e.page?.trim() ? ` (p. ${e.page})` : '';
      const excerpt = e.excerpt?.trim() ? `\n     Cita: "${e.excerpt}"` : '';
      return `  [${e.sourceId}] ${e.title}${author}${page}${excerpt}`;
    })
    .join('\n');
  return `
═══ FUENTES DISPONIBLES PARA CITAR (CONTRATO DE CITACIÓN) ═══
A continuación va la lista CERRADA de fuentes en las que puedes apoyarte en
este sermón. Cada fuente tiene un ID estable (S1, S2, …) que usarás SOLO en
el campo \`ragSources\` del JSON (alimenta la bibliografía y las atribuciones
legales del export), NUNCA en la prosa del sermón.

${sourceList}

REGLAS DE CITACIÓN (OBLIGATORIAS — el servidor valida y descarta lo que no cumpla):

1. **Atribución NARRATIVA (estilo sermón, NO académico)**: cuando te apoyes
   en una de estas fuentes, atribúyela TEJIDA EN LA PROSA, nombrando la
   fuente con naturalidad pastoral. El sermón se predica en voz alta: la
   atribución debe sonar natural dicha desde el púlpito. Ejemplos:
   - "Como resume la Confesión de Westminster, Dios quiso dejar su
     revelación por escrito…"
   - "Como observa Schreiner en su comentario sobre este pasaje, el verbo
     aquí denota una acción decisiva…"
   - "El pastor Subukjian lo expresa bien: la Escritura no nace de la
     voluntad humana sino del Espíritu."
2. **PROHIBIDO usar marcadores de nota al pie en la prosa**: NUNCA escribas
   \`[S1]\`, \`[1]\`, footnotes, superíndices ni corchetes de cita en el
   cuerpo del sermón. Eso es estilo de paper académico, no de sermón
   predicado. (Las referencias bíblicas SÍ usan su formato propio
   \`[📖 Juan 1:1](#bible-juan-1-1)\`.)
3. **IDs válidos únicamente en \`ragSources\`**: en el campo \`ragSources\`
   del JSON usa SOLO los IDs listados arriba (S1, S2, …). NUNCA inventes
   \`S99\`, \`Otro\`, \`Wallace\`, etc.
4. **\`ragSources\` debe reflejar lo que atribuiste**: por cada fuente que
   cites narrativamente en la prosa, incluye una entrada en \`ragSources\`
   con el campo \`"sourceId": "Sn"\` EXACTO (mismo string del contrato).
   Esto alimenta la bibliografía y las atribuciones legales del export. El
   servidor descarta entradas con \`sourceId\` faltante o desconocido.
5. **Cobertura**: apóyate en estas fuentes SOLO cuando el contenido del
   sermón realmente lo amerite. No es obligatorio usar todas; es obligatorio
   que toda afirmación atribuida esté respaldada por una de estas fuentes.
6. **Honestidad**: NUNCA atribuyas a una fuente algo que no dice. Si dudas
   de que la fuente respalde la afirmación, no la atribuyas.

═══════════════════════════════════════════════════════════════════

`;
}

function buildFacultyContextBlock(facultyContext?: GenerationRules['facultyContext']): string {
  if (!facultyContext) return '';
  const { sessionTitle, outline } = facultyContext;
  const pointsList = outline.points
    .map((p, i) => `  ${['I', 'II', 'III', 'IV', 'V'][i] ?? i + 1}. ${p.title} (${p.verses})`)
    .join('\n');
  return `
═══ CONTEXTO DE ORIGEN — FACULTAD ═══
**Sesión de origen:** ${sessionTitle}
**Bosquejo aprobado en la facultad (OBLIGATORIO respetar):**
- Título: ${outline.title}
- Pasaje: ${outline.passage}
- Proposición: ${outline.proposition}
- Puntos:
${pointsList}

Este sermón fue iniciado desde una conversación de la Facultad. El
usuario revisó y aprobó el bosquejo de arriba antes de pedir el sermón
completo. NO cambies el título, pasaje, proposición ni los puntos del
bosquejo. Si necesitas reorganizar internamente un punto, hazlo dentro
del título del punto aprobado.

═════════════════════════════════════

`;
}

function buildProjectContextBlock(projectContext?: GenerationRules['projectContext']): string {
  if (!projectContext?.contextNote?.trim()) return '';
  return `
═══ CONTEXTO DEL PROYECTO ═══
**Proyecto:** ${projectContext.name}
${projectContext.contextNote.trim()}

Considera este contexto al generar el sermón. Adapta el tono, la
profundidad y las aplicaciones a la descripción de la congregación y
serie de predicación de arriba.

═════════════════════════════

`;
}

function buildPaperContextBlock(paperContext?: GenerationRules['paperContext']): string {
  if (!paperContext?.assembledMarkdown?.trim()) return '';
  const briefLine = paperContext.assignmentBrief?.trim()
    ? `\n**Brief del trabajo:** ${paperContext.assignmentBrief.trim()}`
    : '';
  const titleLine = paperContext.title?.trim() ? ` — *${paperContext.title.trim()}*` : '';
  return `
═══ CONTEXTO DE ORIGEN — PAPER EXEGÉTICO ═══
**Pasaje del paper:** ${paperContext.passage}${titleLine}${briefLine}

A continuación va el paper exegético completo del cual este sermón
deriva. Usa su análisis exegético, sus citas reales de autoridad y su
desarrollo teológico como FUENTE PRIMARIA para el sermón. NO inventes
citas atribuidas — solo usa las que aparecen aquí.

--- BEGIN PAPER ---
${paperContext.assembledMarkdown}
--- END PAPER ---

═════════════════════════════════════════════

`;
}

/**
 * Pastoral Fidelity Phase 1 — PRIMARY VOICE block.
 *
 * Prepended ahead of every other context block so the LLM treats the
 * pastor's seed as the authoritative spine. `centralIdea` is required
 * verbatim in the final draft (post-gen check enforces it). Word
 * studies, parallels, anecdote, and doxological application are inputs
 * the LLM develops on top of — never replaces.
 *
 * Returns '' when no seed is supplied so legacy flows stay clean.
 */
function buildPastoralSeedBlock(seed?: GenerationRules['pastoralSeed']): string {
  if (!seed) return '';
  const observations = seed.observations.map((o, i) => `${i + 1}. "${o}"`).join('\n');
  const wordStudies = seed.wordStudies
    .map((w) => `  - ${w.word} (${w.reference}): ${w.discovery}`)
    .join('\n');
  const parallels = seed.parallels
    .map((p) => `  - ${p.reference} — ${p.relevance}`)
    .join('\n');
  const genreBlock = seed.genre
    ? `## Género literario (gobierna las reglas de lectura):
${seed.genre}${seed.genreImplication ? ` — ${seed.genreImplication}` : ''}
${seed.bookLocationNote ? `Ubicación en el libro: ${seed.bookLocationNote}\n` : ''}`
    : '';
  const principleBlock = seed.timelessPrinciple
    ? `## Principio teológico atemporal (la verdad transcultural — el puente exégesis→homilética):
"${seed.timelessPrinciple}"
El sermón debe permanecer fiel a este principio. La idea central de abajo es la
voz homilética del pastor para SU congregación; el principio es la verdad que la
sostiene. No los confundas ni reemplaces el principio por una generalización propia.
`
    : '';
  return `
═══ PRIMARY VOICE (LA VOZ DEL PASTOR — NO ANULAR) ═══

El pastor ha producido la siguiente semilla a través de 8 pasos de estudio
personal. Esta semilla ES la voz pastoral del sermón. Tu rol es DESARROLLAR,
no ORIGINAR. El asistente desarrolla, el asistente no origina.

${genreBlock}${principleBlock}## Idea central (palabras EXACTAS del pastor):
"${seed.centralIdea}"

## Observaciones del pastor (desarrolla cada una, no las reemplaces):
${observations}

## Pregunta abierta que el sermón debe responder:
"${seed.openQuestion}"

## Anécdota pastoral que el pastor quiere integrar:
"${seed.pastoralAnecdote}"

## Aplicación doxológica (manifiesto Paso 8 — lleva el sermón aquí):
"${seed.doxologicalApplication}"

## Hallazgos exegéticos del pastor (úsalos como fundamento):
- Cláusula principal: ${seed.mainClauseReference} — ${seed.mainClauseNote}
- Estudios de palabras:
${wordStudies}
- Paralelos canónicos marcados como relevantes (PRIMARIOS — puedes agregar otros, pero estos llevan precedencia):
${parallels}
- Función para la audiencia original: ${seed.originalAudienceFunction}

═══ INSTRUCCIONES DE DESARROLLO (OBLIGATORIAS) ═══

1. **No eres el autor**. Eres un asistente que desarrolla la semilla del pastor en un sermón estructurado.
2. **La idea central de arriba es el espine del sermón**. No introduzcas otra idea central.
3. **Cada sección mayor** del sermón debe conectar explícitamente con UNA de las observaciones del pastor o con la pregunta abierta.
4. **La frase exacta de la idea central debe aparecer VERBATIM al menos una vez** en el cuerpo del sermón. El servidor verifica esto y advierte al pastor si la omites.
5. **La anécdota pastoral debe integrarse** donde la lógica del pastor lo sostenga, no inventes una nueva.
6. **Paralelos del pastor son PRIMARIOS**. Puedes agregar otros, pero los del pastor van citados primero.
7. **La aplicación doxológica del pastor cierra el sermón**. No la sustituyas por aplicaciones generales.

═══════════════════════════════════════════════════════════════════

`;
}

function buildSermonDraftPromptBody(analysis: HomileticalAnalysis, rules: GenerationRules, manifest?: CitationManifest): string {
  // Format exegetical study for context
  const exegesisContext = analysis.exegeticalStudy ? `

CONTEXTO EXEGÉTICO (úsalo para enriquecer el sermón):
- Pasaje: ${analysis.exegeticalStudy.passage}
- Proposición Exegética: ${analysis.exegeticalStudy.exegeticalProposition}

Contexto del Pasaje:
  * Histórico: ${analysis.exegeticalStudy.context.historical}
  * Literario: ${analysis.exegeticalStudy.context.literary}
  * Audiencia Original: ${analysis.exegeticalStudy.context.audience}

Palabras Clave (úsalas para notas exegéticas):
${analysis.exegeticalStudy.keyWords.map(kw => `  - ${kw.original} (${kw.transliteration}): ${kw.significance}`).join('\n')}

Insights Pastorales:
${analysis.exegeticalStudy.pastoralInsights.map(insight => `  • ${insight}`).join('\n')}
` : '';

  const personalizationBlock = formatSermonPersonalizationBlock(rules.personalization);
  const paperContextBlock = buildPaperContextBlock(rules.paperContext);
  const facultyContextBlock = buildFacultyContextBlock(rules.facultyContext);
  const projectContextBlock = buildProjectContextBlock(rules.projectContext);
  const citationContractBlock = buildCitationContractBlock(manifest);
  // Pastoral Fidelity Phase 1: PRIMARY VOICE is the highest-priority
  // context. It precedes every other block (including base system
  // prompt instructions about tone/length) so the LLM's anchor is
  // the pastor's seed, not the homiletical analysis derived later.
  const pastoralSeedBlock = buildPastoralSeedBlock(rules.pastoralSeed);

  return `
${pastoralSeedBlock}${BASE_SYSTEM_PROMPT}
${projectContextBlock}${paperContextBlock}${facultyContextBlock}${personalizationBlock}${citationContractBlock}
FASE 3: REDACCIÓN DEL SERMÓN
Objetivo: Redactar el contenido completo del sermón basado en el análisis previo.
${exegesisContext}

Datos del Análisis Homilético:
- Proposición Homilética: ${analysis.homileticalProposition}
- Enfoque: ${analysis.homileticalApproach}
- Bosquejo: ${JSON.stringify(analysis.outline)}

═══════════════════════════════════════════════════════════════════
🎯 INSTRUCCIONES CRÍTICAS DE FORMATO PARA PREDICACIÓN
═══════════════════════════════════════════════════════════════════

**OBJETIVO PRINCIPAL**: El borrador DEBE ser FÁCIL DE SEGUIR AL PREDICAR.
Usa formato MARKDOWN con JERARQUIZACIÓN VISUAL CLARA en todos los campos de texto.

📋 REGLAS DE FORMATO OBLIGATORIAS:

1. **JERARQUIZACIÓN CON ENCABEZADOS**:
   - Usa ### para subsecciones dentro del contenido
   - Usa #### para sub-puntos o divisiones menores
   - Cada encabezado debe estar en su propia línea con espacio antes y después

2. **SEPARACIÓN VISUAL**:
   - SEPARA PÁRRAFOS con líneas en blanco (doble salto de línea)
   - NUNCA escribas párrafos continuos sin separación
   - Usa líneas horizontales (---) para separar secciones mayores

3. **ÉNFASIS Y DESTACADOS**:
   - Usa **negritas** para conceptos clave, términos teológicos y puntos principales
   - Usa *cursivas* para palabras en hebreo/griego y énfasis secundario
   - Usa > para bloques de citas bíblicas o citas de autoridad

4. **LISTAS Y ENUMERACIONES**:
   - Usa listas con viñetas (-, *) para múltiples puntos relacionados
   - Usa listas numeradas (1., 2.) para secuencias o pasos
   - Cada ítem de lista debe estar en su propia línea

5. **ESTRUCTURA DEL CONTENIDO DE CADA PUNTO**:
   Organiza el campo "content" con esta estructura clara:

   ### Exposición Bíblica
   [Explicación del texto con contexto exegético]

   **Palabras Clave**: 
   - *palabra original* (transliteración): significado

   **Nota Exegética**: 
   [Si aplica, explicación técnica accesible]

   ---
   
   IMPORTANTE: Las siguientes secciones NO van en "content", sino en campos JSON separados:
   - Referencias Cruzadas → campo "scriptureReferences" (array)
   - Cita de Autoridad → campo "authorityQuote" (string)  
   - Ilustración → campo "illustration" (string)
   - Implicaciones → campo "implications" (array)
   - Transición → campo "transition" (string)

═══════════════════════════════════════════════════════════════════

Instrucciones de Contenido:
  1. **INTRODUCCIÓN**: 
     - Estructura con encabezados claros (### Contexto Histórico, ### Conexión Actual, ### Proposición Homilética)
     - Separa párrafos visualmente
     - Usa negritas para conceptos clave
     - Explica el trasfondo del pasaje (quién, cuándo, dónde, por qué)
     - Conecta la situación de la audiencia original con el presente
     - INCLUYE al final la Proposición Homilética seguida de la lista de puntos del sermón como referencia
     
  2. **DESARROLLO DE CADA PUNTO** del bosquejo:
     En el campo "content", estructura así:
     
     ### Exposición Bíblica
     [Párrafo 1: Contexto del punto]
     
     [Párrafo 2: Profundización teológica]
     
     **Palabras Clave Relevantes**:
     - *original* (transliteración): **significado teológico**
     
     **Nota Exegética**: 
     [Si aplica, explicación técnica accesible]
     
     ---
     
     Luego, en campos separados:
     - **scriptureReferences** (array): Lista de referencias con TEXTO del versículo como blockquote
       Formato: "> \"[Texto del versículo]\" ([Referencia])"
       Ejemplo: "> \"En el principio era el Verbo\" (Juan 1:1)"
     
     - **authorityQuote** (string): PRIMERO el título sin blockquote, LUEGO la cita con blockquote
       Formato: "**Cita de Autoridad:**\\n\\n> \\"[Cita]\\"\\n> — *[Autor], [Fuente]*"
     
     - **illustration** (string): Ilustración relevante con título en negritas
     
     - **implications** (array): Al menos 2 implicaciones prácticas, cada una debe empezar con "**Implicación X:**"
     
     - **transition** (string): Frase de transición + recordatorio CON SALTOS DE LÍNEA
       Formato exacto: "[Frase]\\n\\n**Recordatorio:**\\nProposición: [texto]\\n\\n**Puntos:**\\n1. [Punto 1]\\n2. [Punto 2]\\n3. [Punto 3]"
     
  3. **CONCLUSIÓN**: 
     - Estructura con subsecciones (### Resumen Principal, ### Llamado Final)
     - Separa ideas en párrafos distintos
     - Usa negritas para el cierre principal
     - Cierra el arco desde el contexto original hasta hoy
  
  4. **LLAMADO A LA ACCIÓN**: 
     - Usa lista numerada si son múltiples acciones
     - Separa claramente cada paso o acción
     - Usa negritas para verbos de acción
  
  5. **TONO**: ${rules.tone || 'Inspirador'}
  
  6. **AUDIENCIA**: ${rules.targetAudience || 'General'}

  Reglas Personalizadas del Usuario:
  ${rules.customInstructions || 'Ninguna'}

  Formato de Salida (JSON):
  {
    "title": "Título Creativo",
    "introduction": "### Contexto Histórico\\n\\n[Párrafo 1]\\n\\n[Párrafo 2]\\n\\n### Conexión Actual\\n\\n[Conexión con audiencia]\\n\\n### Proposición Homilética\\n\\n[Proposición]\\n\\n**Puntos del Sermón:**\\n1. [Punto 1]\\n2. [Punto 2]\\n3. [Punto 3]",
    "body": [
      { 
        "point": "Título del Punto 1", 
        "content": "### Exposición Bíblica\\n\\n[Párrafo 1]\\n\\n[Párrafo 2]\\n\\n**Palabras Clave:**\\n- *original* (transliteración): **significado**\\n\\n**Nota Exegética:**\\n[Explicación técnica]\\n\\n---", 
        "scriptureReferences": [
          "> \\"Porque de tal manera amó Dios al mundo...\\" (Juan 3:16)",
          "> \\"Sabemos que a los que aman a Dios...\\" (Romanos 8:28)"
        ],
        "authorityQuote": null,
        "illustration": "**Ilustración:** [Título]\\n\\n[Desarrollo de la ilustración]",
        "implications": [
          "**Implicación 1:** Descripción de la primera implicación", 
          "**Implicación 2:** Descripción de la segunda implicación"
        ],
        "transition": "[Frase de transición natural]\\n\\n**Recordatorio:**\\nProposición: [proposición homilética]\\n\\n**Puntos:**\\n1. [Punto 1]\\n2. [Punto 2]\\n3. [Punto 3]"
      }
    ],
  "conclusion": "### Resumen Principal\\n\\n[Párrafo 1]\\n\\n### Llamado Final\\n\\n**Punto culminante**: [Cierre poderoso]",
  "callToAction": "**Pasos de Acción**:\\n\\n1. **[Acción 1]**: Descripción\\n2. **[Acción 2]**: Descripción\\n3. **[Acción 3]**: Descripción",
  "ragSources": [
    {
      "sourceId": "S1",
      "title": "Nombre del documento usado",
      "author": "Autor si está disponible",
      "page": "Página o sección",
      "usedFor": "Breve descripción de cómo se usó este documento"
    }
  ]
}

═══════════════════════════════════════════════════════════════════
⚠️ RECORDATORIOS FINALES DE FORMATO:
═══════════════════════════════════════════════════════════════════
✓ SIEMPRE separa párrafos con líneas en blanco (\\n\\n)
✓ SIEMPRE usa encabezados (###, ####) para subsecciones
✓ SIEMPRE usa **negritas** para conceptos clave
✓ SIEMPRE usa listas (-, 1.) para enumeraciones
✓ SIEMPRE usa > para citas y referencias bíblicas
✓ NUNCA escribas bloques de texto continuo sin jerarquización
✓ RECUERDA: El pastor debe poder seguir el borrador FÁCILMENTE al predicar

REGLAS DE GENERACIÓN:
1. Si usas información de documentos proporcionados, incluye en "ragSources" una entrada por cada documento consultado — con el campo \`sourceId\` igual al ID del CONTRATO DE CITACIÓN (\`S1\`, \`S2\`, …) cuando el contrato esté presente. Si no hay contrato (sermón sin biblioteca), omite \`sourceId\`.
2. Cada punto debe tener al menos 2 implicaciones prácticas con formato de lista.
3. Las ilustraciones deben ser culturalmente relevantes, memorables y estar formateadas con encabezados.
4. **Diversidad de ilustraciones**: NO uses la misma categoría (viaje/deporte/familia/cocina/transporte) en dos puntos consecutivos. Si Punto I usa transporte (avión, tren), Punto II DEBE usar otra categoría.
5. **authorityQuote es OPCIONAL** (null por defecto). Solo inclúyelo cuando uses una cita REAL y verificable de un autor cuyo texto esté presente en los documentos proporcionados o en la conversación. PROHIBIDO inventar citas atribuidas a Owen, Spurgeon, Calvino, Van Til, Edwards, MacArthur u otros autores. Si no hay una cita verificable disponible, deja authorityQuote en null. Una cita inventada en el pulpito destruye credibilidad.
6. **callToAction es OBLIGATORIO y no puede ser vacío**. Debe contener 1-3 acciones concretas y específicas (no genéricas) que el oyente pueda comenzar esta semana. Sin callToAction, el sermón no se considera completo.
7. **Balance de longitud OBLIGATORIO**: introduction 200-400 palabras (10-15%), body total 1800-2800 palabras (70-80%), conclusion 250-450 palabras (10-15%). La conclusion NUNCA puede ser menor a un cuarto de la introduction.
8. TODO el texto debe usar formato markdown con jerarquización clara.
9. **LENTE TEOLÓGICA — FCF Y CRISTOCENTRISMO (OBLIGATORIO)**:
   Todo sermón expositivo cristiano debe predicar a Cristo desde el texto, no usar el texto como pretexto para moralismo. Sigue el marco de Bryan Chapell (Christ-Centered Preaching):

   a. **FCF (Fallen Condition Focus)** — En la introducción Y al menos en el primer punto del cuerpo, identifica EXPLÍCITAMENTE la "condición caída" que el pasaje aborda: ¿qué quebrantamiento, necesidad, o incapacidad humana hace que necesitemos lo que este texto enseña? El FCF NO es "lo que el texto manda hacer" sino "por qué necesitamos esta enseñanza dada nuestra condición caída".
       Ejemplo: en Mateo 5:1-12, el FCF no es "imitar las Bienaventuranzas" sino "somos espiritualmente pobres, hambrientos, y perseguidos — incapaces por nosotros mismos de la rectitud que Cristo declara bendita."

   b. **Cristocentrismo** — La conclusión (o un punto del cuerpo cuando el texto lo demande) DEBE trazar cómo el pasaje encuentra resolución en la obra redentora de Cristo (encarnación, vida obediente, cruz, resurrección, ascensión, intercesión, o segunda venida). NO basta con "y por eso Jesús nos ayuda" — muestra cómo el evangelio cumple, completa, o restaura lo que el FCF expuso como roto.
       Pasajes del AT: traza la conexión via tipología, promesa-cumplimiento, o trayectoria redentora. Pasajes del NT: ancla la enseñanza en la persona y obra consumada de Cristo, no solo en mandamientos.

   PROHIBIDO: sermón puramente moralista ("haz X, evita Y") sin FCF explícito y sin centralidad cristológica. Eso convierte el púlpito en consejería moral, no en proclamación del evangelio.

10. **NIVEL DE RIGOR SEGÚN AUDIENCIA**: ${audienceRigorBlock(rules.audienceRigor)}
`;
}

function audienceRigorBlock(tier?: 'beginner' | 'seminary'): string {
  if (tier === 'seminary') {
    return `Predicador con formación seminarista (TMS / reformada / similar).
   - Profundiza en morfología y sintaxis del griego/hebreo cuando el texto lo amerite (aoristos, participios circunstanciales, géneros de la literatura, paralelismo hebreo, quiasmos).
   - Cita autores reformados / evangélicos consolidados cuando aporten (Calvino, Owen, Edwards, Spurgeon, Berkhof, Frame, Carson, Beale, Schreiner, Vanhoozer, Keller) — solo si están en las fuentes proporcionadas o son citas verificables; NUNCA inventes.
   - Asume conocimiento de categorías sistemáticas (justificación forense, unión con Cristo, pacto de gracia/obras, eclesiología reformada).
   - Permite densidad técnica mayor: notas exegéticas extensas, distinciones precisas, advertencias contra herejías históricas cuando relevante.`;
  }
  return `Predicador sin formación teológica formal (default).
   - Mantén el lenguaje accesible. Cuando uses un término técnico (justificación, propiciación, pacto), defínelo en una línea.
   - Limita las menciones de griego/hebreo a 1-2 palabras clave por punto, con transliteración + significado simple. Evita morfología densa.
   - Prefiere ilustraciones cotidianas (familia, trabajo, comunidad) sobre referencias académicas.
   - No asumas conocimiento previo de categorías sistemáticas reformadas; explica brevemente cuando uses una.
   - Las citas de autoridad son opcionales y deben venir solo de las fuentes proporcionadas.`;
}

export function buildChatSystemPrompt(phase: WorkflowPhase, context: any, language?: SupportedLanguage): string {
  return withLanguage(language, buildChatSystemPromptBody(phase, context));
}

function buildChatSystemPromptBody(phase: WorkflowPhase, context: any): string {
  const base = "Actúa como un experto teólogo y mentor. Tu objetivo es colaborar con el pastor en una mesa de trabajo.";

  // RAG Context Generation (Reusable for all phases)
  // Check if we have library context either via Cache, RAG chunks, or File Search Store
  const hasCacheContext = !!context.cacheName;
  const hasRAGContext = context.hasLibraryContext && context.relevantChunks?.length > 0;
  // 🎯 NEW: Check for Global File Search Store
  const hasFileSearchContext = !!context.fileSearchStoreId;

  let libraryContextSection = '';

  if (hasCacheContext) {
    // Using Gemini Cache - full book access
    const resourcesList = context.resources
      ?.filter((r: any) => r.metadata?.geminiUri)
      ?.map((r: any) => `- ${r.title} (${r.author})`)
      ?.join('\n') || '';

    libraryContextSection = `
## 📚 ACCESO COMPLETO A BIBLIOTECA DEL PASTOR (VÍA CACHÉ):
Tienes acceso al CONTENIDO COMPLETO (no solo fragmentos) de estos libros:

${resourcesList}

INSTRUCCIONES CRÍTICAS:
1. Estos libros están COMPLETAMENTE disponibles en tu contexto. Puedes consultar cualquier parte de ellos.
2. SIEMPRE que uses información de estos libros, DEBES citar la fuente.
3. Formato de cita: (Autor, Título) o "Como señala [Autor] en '[Título]'..."
4. Este es contenido REAL y COMPLETO. Úsalo con prioridad sobre tu conocimiento general.
5. No digas "no tengo acceso" a estos libros. Los tienes completos.`;

  } else if (hasFileSearchContext) {
    // 🎯 NEW: Using File Search Tool (Global Store)
    libraryContextSection = `
## 📚 ACCESO A BIBLIOTECA DEL PASTOR (VÍA FILE SEARCH):
Tienes acceso a la biblioteca EXEGÉTICA/HOMILÉTICA completa del pastor a través de la herramienta 'fileSearch'.

INSTRUCCIONES CRÍTICAS PARA USO DE HERRAMIENTA:
1. **USO OBLIGATORIO**: Para cada consulta teológica o bíblica, DEBES usar la herramienta 'fileSearch' provista por el sistema (tool calling/enrutamiento interno) para buscar en la biblioteca del pastor.
2. **NUNCA ESCRIBAS CÓDIGO PYTHON**: No escribas bloques de código intentando llamar a la herramienta (Ej. nada de \`print(file_search.query(...))\`). Usa el mecanismo de tools nativo de la API.
3. **PRIORIDAD**: La información recuperada de la biblioteca tiene PRIORIDAD ABSOLUTA sobre tu conocimiento general.
4. **CITAS**: Al usar información recuperada, cita la fuente (Libro/Autor) que la herramienta te indique.
5. **MANEJO DE RESULTADOS VACÍOS**: Si la herramienta 'fileSearch' no devuelve resultados relevantes, usa tu conocimiento general para responder como un teólogo experto.
`;

  } else if (hasRAGContext) {
    // Using Manual RAG - fragment access (Fallback)
    const chunksContext = context.relevantChunks.slice(0, 10).map((chunk: any, i: number) => {
      const pageInfo = chunk.metadata?.page ? `, p.${chunk.metadata.page}` : '';
      return `[${i + 1}] ${chunk.resourceAuthor} - "${chunk.resourceTitle}"${pageInfo}:
"${chunk.text.substring(0, 500)}..."`;
    }).join('\n\n');

    libraryContextSection = `
## CONTENIDO VERIFICADO DE LA BIBLIOTECA DEL PASTOR (FRAGMENTOS):
He encontrado estos fragmentos relevantes de los recursos indexados:

${chunksContext}

INSTRUCCIONES CRÍTICAS DE CITACIÓN:
1. Usa este contenido VERIFICADO para fundamentar tus respuestas.
2. SIEMPRE que uses una idea de estos textos, DEBES citar la fuente.
3. Formato de cita: (Autor, p.XX) o "Como señala Autor en 'Título'..."
4. Esto es contenido REAL de los libros del pastor. Úsalo con prioridad sobre tu conocimiento general.`;
  } else {
    // No library context available - provide recommended evangelical sources
    libraryContextSection = `
## 📚 FUENTES TEOLÓGICAS RECOMENDADAS (Conocimiento General):
NO se encontró información en la biblioteca personal del pastor para esta consulta.

**Basa tu respuesta en fuentes evangélicas reconocidas**:
- Comentarios bíblicos estándar (Nuevo Comentario Bíblico Siglo XXI, Mundo Hispano)
- Léxicos y concordancias (Strong, Vine, Tuggy)
- Teología sistemática evangélica (Grudem, Berkhof)
- Consenso exegético histórico-gramatical

**INSTRUCCIONES DE TRANSPARENCIA**:
1. Declara explícitamente: "Basado en mi conocimiento general de fuentes evangélicas..."
2. Cuando cites, usa formato genérico: "Como señalan comentaristas evangélicos..." o "Según el consenso exegético..."
3. NO inventes citas específicas de páginas o autores si no estás absolutamente seguro
4. Mantén fidelidad al método histórico-gramatical-literal de Dos Filos`;
  }

  switch (phase) {
    case WorkflowPhase.EXEGESIS:
      // Build exegesis context summary if available
      let exegesisContext = '';
      if (context.exegesisResult) {
        const ex = context.exegesisResult;
        exegesisContext = `
        
## 📖 CONTEXTO EXEGÉTICO ACTUAL:

**Pasaje**: ${ex.passage || context.passage}

**Proposición Exegética**: ${ex.exegeticalProposition || 'Pendiente'}

**Palabras Clave Analizadas**:
${ex.keyWords && ex.keyWords.length > 0
            ? ex.keyWords.map((kw: any) => `- ${kw.original} (${kw.transliteration}): ${kw.significance}`).join('\n')
            : 'Ninguna analizada aún'}

**Contexto**:
- Histórico-cultural: ${ex.context?.historical || 'Pendiente'}
- Literario: ${ex.context?.literary || 'Pendiente'}
- Audiencia original: ${ex.context?.audience || 'Pendiente'}

**Insights Pastorales**:
${ex.pastoralInsights && ex.pastoralInsights.length > 0
            ? ex.pastoralInsights.map((i: string) => `- ${i}`).join('\n')
            : 'Ninguno aún'}
`;
      }

      return `${base} Eres el EXPERTO EN EXÉGESIS. Tu trabajo es analizar el texto original, contexto histórico y literario.
      
**PASAJE EN ANÁLISIS**: "${context.passage}"
${exegesisContext}
${libraryContextSection}

**TU ROL**: Responde a las preguntas del pastor con profundidad académica pero claridad pastoral. 
SIEMPRE ten en cuenta el CONTEXTO EXEGÉTICO ACTUAL arriba. Si el pastor pregunta sobre una palabra, 
verifica primero si ya está en las "Palabras Clave Analizadas" y construye sobre ese análisis.`;

    case WorkflowPhase.HOMILETICS:
      // Build readable homiletics context
      const exegesisSummary = context.exegesisResult
        ? `**Pasaje**: ${context.exegesisResult.passage}
**Proposición Exegética**: ${context.exegesisResult.exegeticalProposition}
**Palabras Clave**: ${context.exegesisResult.keyWords?.map((kw: any) => kw.original).join(', ') || 'N/A'}`
        : 'Exégesis no disponible';

      const homileticsInfo = context.homileticsResult
        ? `**Proposición Homilética Actual**: ${context.homileticsResult.homileticalProposition || 'Pendiente'}
**Enfoque**: ${context.homileticsResult.homileticalApproach || 'Pendiente'}
**Puntos del Bosquejo**: ${context.homileticsResult.outline?.mainPoints?.length || 0} puntos`
        : '';

      return `${base} Eres el EXPERTO EN HOMILÉTICA. Tu trabajo es ayudar a estructurar el sermón.
      
## 📖 FUNDAMENTO EXEGÉTICO:
${exegesisSummary}

## 🎯 DESARROLLO HOMILÉTICO ACTUAL:
${homileticsInfo || 'Pendiente de desarrollo'}

${libraryContextSection}

**TU ROL**: Ayuda a encontrar el mejor ángulo, la proposición homilética y el bosquejo. 
Mantén coherencia con la proposición exegética y el pasaje original.`;

    case WorkflowPhase.DRAFTING:
      // Build sermon context summary
      const sermonContext = context.homileticsResult
        ? `**Pasaje**: ${context.exegesisResult?.passage || 'N/A'}
**Proposición Homilética**: ${context.homileticsResult.homileticalProposition}
**Enfoque**: ${context.homileticsResult.homileticalApproach}
**Bosquejo**: ${context.homileticsResult.outline?.mainPoints?.length || 0} puntos principales`
        : 'Análisis homilético no disponible';

      const draftInfo = context.draft
        ? `**Título**: ${context.draft.title}
**Estructura**: Introducción + ${context.draft.body?.length || 0} puntos + Conclusión`
        : '';

      return `${base} Eres el EDITOR Y REDACTOR. Tu trabajo es ayudar a escribir el sermón completo.
      
## 📖 BASE DEL SERMÓN:
${sermonContext}

## ✍️ BORRADOR ACTUAL:
${draftInfo || 'Pendiente de redacción'}

${libraryContextSection}

**TU ROL**: Ayuda a redactar, mejorar el estilo, buscar ilustraciones y afinar la retórica.
IMPORTANTE: Al redactar, integra las citas de la biblioteca de forma natural en el flujo del sermón.
Mantén coherencia con la proposición homilética y el enfoque elegido.`;

    case WorkflowPhase.PLANNING:
      // Use dynamic strategy from context, or default Socratic behavior
      const coachingInstructions = context.strategyPromptAdditions || `
## ESTILO DE COACHING: SOCRÁTICO (PREDETERMINADO)
Eres un mentor experto que guía al pastor a través de la reflexión profunda.
`;

      return `${base} Eres el EXPERTO EN PLANIFICACIÓN DE SERIES. Tu trabajo es ayudar al pastor a diseñar una serie de predicación coherente.
      
Contexto de la serie:
- Tipo: ${context.type === 'thematic' ? 'Serie Temática' : 'Serie Expositiva'}
- Tema/Libro: ${context.topicOrBook}
- Recursos de Biblioteca: ${context.resources?.map((r: any) => r.title).join(', ') || 'Ninguno'}
${libraryContextSection}
${coachingInstructions}

Sé conciso pero profundo. Cuando cites contenido de la biblioteca, hazlo con precisión.`;

    case 'brainstorming' as any:
      return `${base} Eres un MENTOR CREATIVO Y TEOLÓGICO. Tu trabajo es ayudar al pastor a "aterrizar" una idea para un sermón.
      
      ## 🎯 OBJETIVO DE ESTA SESIÓN:
      Ayudar al pastor a definir claramente:
      1. Un **Tema Central** o Idea Principal.
      2. Un **Pasaje Bíblico** base que respalde esa idea.
      
      ${libraryContextSection}
      
      ## TU ESTILO:
      - Sé breve y conversacional (como un colega tomando café).
      - Haz preguntas clarificadoras si la idea es vaga.
      - Sugiere pasajes bíblicos si el pastor tiene el tema pero no el texto.
      - Sugiere temas si el pastor tiene el texto pero no el enfoque.
      - Una vez que la idea y el pasaje estén claros, confirma con el pastor: "¿Te parece bien este pasaje y tema para generar el sermón?".
      
      TU META FINAL: Que el pastor tenga CLARO qué va a predicar (Idea + Pasaje).`;

    default:
      return base;
  }
}
