/**
 * Prompt templates for Gemini AI sermon generation
 */

import { GenerateSermonOptions } from '@dosfilos/domain';

export function buildSermonPrompt(options: GenerateSermonOptions): string {
    const {
        topic = 'un tema bíblico relevante',
        bibleReferences = [],
        targetAudience = 'general',
        tone = 'inspirational',
        length = 'medium',
        includeIntroduction = true,
        includeConclusion = true,
        includeCallToAction = true,
    } = options;

    const audienceMap = {
        general: 'una congregación general con personas de todas las edades',
        youth: 'jóvenes entre 15-25 años',
        children: 'niños entre 6-12 años',
        adults: 'adultos entre 25-60 años',
        seniors: 'adultos mayores de 60+ años',
    };

    const toneMap = {
        formal: 'formal y académico, con profundidad teológica',
        casual: 'cercano y conversacional, fácil de entender',
        inspirational: 'inspirador y motivador, que eleve el espíritu',
        educational: 'educativo y didáctico, enfocado en enseñanza',
    };

    const lengthMap = {
        short: '5-7 minutos (aproximadamente 800-1000 palabras)',
        medium: '15-20 minutos (aproximadamente 2000-2500 palabras)',
        long: '30-35 minutos (aproximadamente 4000-5000 palabras)',
    };

    const bibleRefsText = bibleReferences.length > 0
        ? `Debes incluir y desarrollar estas referencias bíblicas: ${bibleReferences.join(', ')}`
        : 'Sugiere referencias bíblicas apropiadas y relevantes';

    return `Eres un pastor experimentado y teólogo que ayuda a crear sermones bíblicos profundos, relevantes y transformadores.

TAREA: Genera un sermón completo sobre el tema: "${topic}"

AUDIENCIA: ${audienceMap[targetAudience]}
TONO: ${toneMap[tone]}
DURACIÓN APROXIMADA: ${lengthMap[length]}

ESTRUCTURA REQUERIDA:
${includeIntroduction ? '1. Introducción (2-3 párrafos que capten la atención y presenten el tema)' : ''}
2. 3-4 Puntos principales, cada uno con:
   - Subtítulo claro y memorable
   - Desarrollo del punto (2-4 párrafos)
   - Referencias bíblicas específicas con contexto
   - Aplicación práctica a la vida diaria
${includeConclusion ? '3. Conclusión (2 párrafos que resuman y refuercen el mensaje)' : ''}
${includeCallToAction ? '4. Llamado a la acción (invitación específica y práctica)' : ''}

REFERENCIAS BÍBLICAS:
${bibleRefsText}

IMPORTANTE:
- Usa un lenguaje claro y accesible
- Incluye ejemplos prácticos y aplicaciones concretas
- Mantén fidelidad bíblica y teológica
- Sé relevante para el contexto actual
- Evita clichés religiosos

FORMATO DE SALIDA: Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin \`\`\`json) con esta estructura exacta:
{
  "title": "Título atractivo y relevante del sermón",
  "introduction": "Texto completo de la introducción (si aplica)",
  "mainPoints": [
    {
      "title": "Título del punto principal",
      "content": "Desarrollo completo del punto con párrafos bien estructurados",
      "bibleReferences": ["Referencia 1", "Referencia 2"]
    }
  ],
  "conclusion": "Texto completo de la conclusión (si aplica)",
  "callToAction": "Llamado a la acción específico (si aplica)",
  "suggestedBibleReferences": ["Lista de todas las referencias usadas"],
  "suggestedTags": ["etiqueta1", "etiqueta2", "etiqueta3"]
}`;
}

export function buildOutlinePrompt(options: GenerateSermonOptions): string {
    const { topic = 'un tema bíblico', bibleReferences = [] } = options;

    return `Eres un pastor que ayuda a estructurar sermones.

TAREA: Crea un esquema/outline para un sermón sobre: "${topic}"

${bibleReferences.length > 0 ? `Incluye estas referencias: ${bibleReferences.join(', ')}` : ''}

FORMATO DE SALIDA: Responde ÚNICAMENTE con un objeto JSON válido (sin markdown) con esta estructura:
{
  "title": "Título sugerido del sermón",
  "mainPoints": [
    "Punto principal 1",
    "Punto principal 2",
    "Punto principal 3"
  ],
  "suggestedReferences": ["Referencia 1", "Referencia 2"]
}`;
}

export function buildExpandSectionPrompt(
    sectionTitle: string,
    context: string,
    bibleReferences?: string[]
): string {
    const refsText = bibleReferences?.length
        ? `Desarrolla especialmente estas referencias: ${bibleReferences.join(', ')}`
        : '';

    return `Eres un pastor que ayuda a desarrollar secciones de sermones.

CONTEXTO DEL SERMÓN: ${context}

TAREA: Expande y desarrolla en profundidad la sección titulada: "${sectionTitle}"

${refsText}

REQUISITOS:
- Escribe 3-4 párrafos bien desarrollados
- Incluye referencias bíblicas con contexto
- Agrega aplicaciones prácticas
- Usa ejemplos concretos
- Mantén coherencia con el contexto del sermón

Responde ÚNICAMENTE con el texto expandido (sin JSON, sin formato especial).`;
}

export function buildBibleReferencesPrompt(topic: string, count: number = 5): string {
    return `Eres un experto en Biblia que ayuda a encontrar referencias relevantes.

TAREA: Sugiere ${count} referencias bíblicas altamente relevantes para un sermón sobre: "${topic}"

REQUISITOS:
- Referencias específicas (libro, capítulo, versículo)
- Variedad de Antiguo y Nuevo Testamento
- Directamente relacionadas con el tema
- Apropiadas para predicación

FORMATO DE SALIDA: Responde ÚNICAMENTE con un array JSON (sin markdown):
["Referencia 1", "Referencia 2", "Referencia 3"]`;
}

export function buildRefineContentPrompt(content: string, instructions?: string): string {
    const instructionsText = instructions || 'Mejora la claridad, profundidad y aplicación práctica';

    return `Eres un editor experto de contenido pastoral.

CONTENIDO ORIGINAL:
${content}

INSTRUCCIONES DE MEJORA:
${instructionsText}

TAREA: Mejora el contenido manteniendo su esencia pero haciéndolo más:
- Claro y comprensible
- Profundo teológicamente
- Práctico y aplicable
- Inspirador y relevante

Responde ÚNICAMENTE con el contenido mejorado (sin JSON, sin formato especial).`;
}

export function buildTitleSuggestionsPrompt(topic: string, count: number = 5): string {
    return `Eres un creativo experto en títulos de sermones.

TEMA: ${topic}

TAREA: Genera ${count} títulos creativos, atractivos y memorables para un sermón sobre este tema.

REQUISITOS:
- Títulos cortos (máximo 8 palabras)
- Creativos pero no sensacionalistas
- Bíblicamente apropiados
- Que generen curiosidad
- Variedad de estilos

FORMATO DE SALIDA: Responde ÚNICAMENTE con un array JSON (sin markdown):
["Título 1", "Título 2", "Título 3"]`;
}
