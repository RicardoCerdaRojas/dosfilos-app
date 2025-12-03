import { GenerationRules, ExegeticalStudy, HomileticalAnalysis, WorkflowPhase, PhaseConfiguration } from '@dosfilos/domain';

const JSON_INSTRUCTION = `IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido. No incluyas NADA de texto antes ni después del JSON (ni "Aquí está el JSON", ni bloques de código markdown como \`\`\`json). Solo el objeto JSON crudo.`;

const DEFAULT_BASE_PROMPT = `Actúa como un experto teólogo, exégeta bíblico y predicador con décadas de experiencia. Tu objetivo es ayudar a pastores a crear sermones bíblicamente fieles y culturalmente relevantes.`;

const BASE_SYSTEM_PROMPT = `${DEFAULT_BASE_PROMPT}\n${JSON_INSTRUCTION}`;

export function buildExegesisPrompt(passage: string, rules: GenerationRules, config?: PhaseConfiguration): string {
  const basePersona = config?.basePrompt || DEFAULT_BASE_PROMPT;
  const userPrompts = config?.userPrompts?.map(p => `- ${p}`).join('\n') || 'Ninguna';

  const knowledgeBase = config?.documents?.map(doc =>
    `--- DOCUMENTO: ${doc.name} ---\n${doc.content?.substring(0, 10000) || ''}\n--- FIN DOCUMENTO ---`
  ).join('\n\n') || '';

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
  ]
}

REGLAS DE GENERACIÓN:
1. Concisión: Prioriza claridad sobre exhaustividad. El pastor puede profundizar después vía chat.
2. Accesibilidad: Usa lenguaje técnico solo cuando sea necesario, y explícalo brevemente.
3. Relevancia Pastoral: Enfócate en lo que realmente impacta la predicación, no en detalles académicos oscuros.
4. Fidelidad al Texto: Toda interpretación debe estar anclada en el análisis del texto original.
5. Formato Estricto: Respeta exactamente la estructura JSON especificada.
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
2. Desarrolla cada punto del bosquejo con contenido profundo, ilustraciones y aplicaciones.
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
    { "point": "Título del Punto 1", "content": "Contenido desarrollado...", "illustration": "Ilustración opcional..." }
  ],
  "conclusion": "Texto de la conclusión...",
  "callToAction": "Llamado a la acción..."
}
`;
}

export function buildChatSystemPrompt(phase: WorkflowPhase, context: any): string {
  const base = "Actúa como un experto teólogo y mentor. Tu objetivo es colaborar con el pastor en una mesa de trabajo.";

  switch (phase) {
    case WorkflowPhase.EXEGESIS:
      return `${base} Eres el EXPERTO EN EXÉGESIS. Tu trabajo es analizar el texto original (Griego/Hebreo), el contexto histórico y literario.
      Pasaje a analizar: "${context.passage}".
      Responde a las preguntas del pastor con profundidad académica pero claridad pastoral.`;

    case WorkflowPhase.HOMILETICS:
      return `${base} Eres el EXPERTO EN HOMILÉTICA. Tu trabajo es ayudar a estructurar el sermón.
      Basado en la exégesis previa: ${JSON.stringify(context.exegesisResult)}.
      Ayuda a encontrar el mejor ángulo, la proposición homilética y el bosquejo.`;

    case WorkflowPhase.DRAFTING:
      return `${base} Eres el EDITOR Y REDACTOR. Tu trabajo es ayudar a escribir el sermón completo.
      Basado en el bosquejo: ${JSON.stringify(context.homileticsResult)}.
      Ayuda a redactar, mejorar el estilo, buscar ilustraciones y afinar la retórica.`;

    default:
      return base;
  }
}
