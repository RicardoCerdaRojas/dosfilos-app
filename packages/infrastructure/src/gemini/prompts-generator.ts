import { GenerationRules, ExegeticalStudy, HomileticalAnalysis, WorkflowPhase, PhaseConfiguration } from '@dosfilos/domain';

const JSON_INSTRUCTION = `IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido. No incluyas NADA de texto antes ni después del JSON (ni "Aquí está el JSON", ni bloques de código markdown como \`\`\`json). Solo el objeto JSON crudo.`;

const DEFAULT_BASE_PROMPT = `Actúa como un experto teólogo, exégeta bíblico y predicador evangélico con décadas de experiencia.

**MÉTODO HERMENÉUTICO DE DOS FILOS**:
Utiliza un enfoque histórico-gramatical-literal, priorizando:
1. La intención del autor original en su contexto histórico
2. El significado literal del texto en sus idiomas originales (griego/hebreo)
3. La gramática y estructura del texto como guía interpretativa
4. El testimonio coherente de toda la Escritura

Tu objetivo es ayudar a pastores a crear sermones bíblicamente fieles, teológicamente sólidos y culturalmente relevantes.`;

const BASE_SYSTEM_PROMPT = `${DEFAULT_BASE_PROMPT}\n${JSON_INSTRUCTION}`;

export function buildExegesisPrompt(passage: string, rules: GenerationRules, config?: PhaseConfiguration): string {
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

export function buildHomileticsPrompt(exegesis: ExegeticalStudy, rules: GenerationRules): string {
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

export function buildSermonDraftPrompt(analysis: HomileticalAnalysis, rules: GenerationRules): string {
  return `
${BASE_SYSTEM_PROMPT}

FASE 3: REDACCIÓN DEL SERMÓN
Objetivo: Redactar el contenido completo del sermón basado en el análisis previo.

Datos del Análisis:
- Proposición Homilética: ${analysis.homileticalProposition}
- Enfoque: ${analysis.homileticalApproach}
- Bosquejo: ${JSON.stringify(analysis.outline)}

Instrucciones:
  1. Escribe una introducción cautivadora.
  2. Desarrolla cada punto del bosquejo con:
     - Contenido profundo y teológico
     - Referencias cruzadas (scriptureReferences)
     - Una ilustración relevante
     - Al menos 2 implicaciones prácticas (implications)
     - Una cita de autoridad (teólogo, comentarista) (authorityQuote)
     - Una transición suave al siguiente punto (transition)
  3. Escribe una conclusión poderosa y un llamado a la acción.
  4. Usa un tono: ${rules.tone || 'Inspirador'}.
  5. Dirígete a una audiencia: ${rules.targetAudience || 'General'}.

  Reglas Personalizadas del Usuario:
  ${rules.customInstructions || 'Ninguna'}

  Formato de Salida (JSON):
  {
    "title": "Título Creativo",
    "introduction": "Texto de la introducción...",
    "body": [
      { 
        "point": "Título del Punto 1", 
        "content": "Contenido desarrollado...", 
        "scriptureReferences": ["Ref 1", "Ref 2"],
        "illustration": "Ilustración...",
        "implications": ["Implicación práctica 1", "Implicación práctica 2"],
        "authorityQuote": "Cita de un autor reconocido...",
        "transition": "Frase de transición..."
      }
    ],
  "conclusion": "Texto de la conclusión...",
  "callToAction": "Llamado a la acción...",
  "ragSources": [
    {
      "title": "Nombre del documento usado",
      "author": "Autor si está disponible",
      "page": "Página o sección",
      "usedFor": "Breve descripción de cómo se usó este documento"
    }
  ]
}

REGLAS DE GENERACIÓN:
1. Si usas información de documentos proporcionados, incluye en "ragSources" una entrada por cada documento consultado.
2. Cada punto debe tener al menos 2 implicaciones prácticas.
3. Las ilustraciones deben ser culturalmente relevantes y memorables.
`;
}

export function buildChatSystemPrompt(phase: WorkflowPhase, context: any): string {
  const base = "Actúa como un experto teólogo y mentor. Tu objetivo es colaborar con el pastor en una mesa de trabajo.";

  // RAG Context Generation (Reusable for all phases)
  // Check if we have library context either via Cache OR via RAG chunks
  const hasCacheContext = !!context.cacheName;
  const hasRAGContext = context.hasLibraryContext && context.relevantChunks?.length > 0;

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
  } else if (hasRAGContext) {
    // Using Manual RAG - fragment access
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

    default:
      return base;
  }
}
