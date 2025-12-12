/**
 * Homiletics Prompt Builder
 * 
 * Implements the Builder Pattern for constructing complex prompts for
 * generating multiple homiletical approaches.
 * 
 * @layer Infrastructure - Gemini-specific implementation
 * @pattern Builder Pattern
 * @solid Single Responsibility - Only builds homiletics prompts
 */

import { ExegeticalStudy, GenerationRules } from '@dosfilos/domain';

/**
 * Builder for constructing homiletics generation prompts
 * 
 * Usage:
 * ```typescript
 * const prompt = new HomileticsPromptBuilder()
 *     .withExegesis(exegesis)
 *     .withRules(rules)
 *     .build();
 * ```
 */
export class HomileticsPromptBuilder {
  private exegesis?: ExegeticalStudy;
  private rules?: GenerationRules;

  /**
   * Sets the exegetical study context
   */
  withExegesis(exegesis: ExegeticalStudy): this {
    this.exegesis = exegesis;
    return this;
  }

  /**
   * Sets the generation rules
   */
  withRules(rules: GenerationRules): this {
    this.rules = rules;
    return this;
  }

  /**
   * Builds the complete prompt
   * @throws Error if required fields are missing
   */
  build(): string {
    if (!this.exegesis) {
      throw new Error('Exegesis is required to build homiletics prompt');
    }

    return [
      this.buildSystemSection(),
      this.buildExegesisSection(),
      this.buildInstructionsSection(),
      this.buildContextSection(),
      this.buildOutputFormatSection()
    ].filter(Boolean).join('\n\n');
  }

  /**
   * System prompt defining AI role and goals
   */
  private buildSystemSection(): string {
    return `
Eres un experto en homilética y preparación de sermones con profundo conocimiento:
- Teológico y exegético
- De diferentes enfoques y tradiciones homiléticas
- De aplicación práctica contemporánea
- De estructuras y dinámicas de predicación efectiva

Tu especialidad es ayudar a pastores a conectar el mundo bíblico con el mundo contemporáneo.
`.trim();
  }

  /**
   * Exegetical context section
   */
  private buildExegesisSection(): string {
    const exegesis = this.exegesis!;

    const keyWordsText = exegesis.keyWords
      .map(kw => `- ${kw.original}: ${kw.significance}`)
      .join('\n');

    return `
## ESTUDIO EXEGÉTICO COMPLETO

**Pasaje:** ${exegesis.passage}

**Proposición Exegética:**
${exegesis.exegeticalProposition}

**Contexto Histórico:**
${exegesis.context.historical}

**Contexto Literario:**
${exegesis.context.literary}

**Audiencia Original:**
${exegesis.context.audience}

**Palabras Clave Analizadas:**
${keyWordsText}

**Insights Pastorales:**
${exegesis.pastoralInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}
`.trim();
  }

  /**
   * Core instructions for generating multiple approaches
   */
  private buildInstructionsSection(): string {
    return `
## TAREA: GENERAR ENFOQUES HOMILÉTICOS MÚLTIPLES

Tu tarea es generar **4-5 ENFOQUES HOMILÉTICOS DIFERENTES** para predicar este pasaje.
Cada enfoque debe ofrecer una DIRECCIÓN ÚNICA y VIABLE para el sermón.

Con 7 tipos de enfoques disponibles, selecciona los más apropiados para este pasaje específico.

### TIPOS DE ENFOQUES A CONSIDERAR:

1. **Pastoral**: Enfocado en el cuidado, consuelo y fortalecimiento espiritual
   - Tono: Exhortativo, cálido
   - Para: Congregación enfrentando desafíos

2. **Pastoral con tono de ánimo**: Enfocado en traer esperanza y fortalecer la confianza
   - Tono: De ánimo, consolador
   - Para: Creyentes que necesitan consuelo, esperanza y fortalecimiento de la fe
   - Nota: A través de la doctrina, busca animar y dar seguridad espiritual

3. **Teológico**: Profundización doctrinal y conceptual
   - Tono: Didáctico, académico
   - Para: Líderes, maestros, estudiantes serios

4. **Apologético**: Defensa de la fe, confrontación de objeciones
   - Tono: Frontal, persuasivo
   - Para: Contextos seculares, escépticos

5. **Evangelístico**: Llamado a la salvación/conversión
   - Tono: Inspiracional, convincente
   - Para: No creyentes, visitantes

6. **Expositivo**: Análisis verso por verso
   - Tono: Didáctico, estructurado
   - Para: Estudio profundo de la Escritura

7. **Narrativo**: Énfasis en la historia y el relato
   - Tono: Conversacional, envolvente
   - Para: Audiencias que responden a historias

### REQUISITOS CRÍTICOS:

✅ Genera 4-5 enfoques BIEN DIFERENCIADOS (selecciona los más apropiados para este pasaje)
✅ Cada enfoque debe ser COMPLETO y PREDICABLE
✅ Todos deben ser FIELES al texto bíblico
✅ Cada uno debe tener una ESTRUCTURA CLARA
✅ Incluye APLICACIONES CONTEMPORÁNEAS específicas
✅ Explica POR QUÉ recomiendas ese enfoque para este pasaje

### PARA CADA ENFOQUE, DEFINE:

1. **Tipo**: pastoral, teológico, apologético, evangelístico, expositivo, o narrativo
2. **Dirección**: La orientación específica (ej: "Consolar en la tribulación")
3. **Tono**: exhortativo, de ánimo, didáctico, frontal, académico, conversacional, o persuasivo
4. **Propósito**: El objetivo principal del sermón
5. **Estructura Sugerida**: Flujo del sermón (intro → desarrollo → conclusión)
6. **Audiencia Objetivo**: Para quién es más apropiado
7. **Razón (Rationale)**: Por qué este enfoque funciona con este pasaje
8. **Proposición Homilética**: Adaptada al enfoque específico
9. **Aplicaciones Contemporáneas**: 3-5 aplicaciones concretas y ACCIONABLES
10. **Bosquejo**: 2-4 puntos principales con descripción y referencias bíblicas

IMPORTANTE: Los enfoques deben ser DISTINTOS entre sí, no variaciones menores.
`.trim();
  }

  /**
   * User context and preferences
   */
  private buildContextSection(): string {
    const rules = this.rules;

    if (!rules) {
      return '';
    }

    const sections: string[] = [];

    if (rules.targetAudience) {
      sections.push(`**Audiencia General del Pastor:** ${rules.targetAudience}`);
    }

    if (rules.tone) {
      sections.push(`**Tono Preferido:** ${rules.tone}`);
    }

    if (rules.theologicalBias) {
      sections.push(`**Orientación Teológica:** ${rules.theologicalBias}`);
    }

    if (rules.customInstructions) {
      sections.push(`**Instrucciones Personalizadas del Pastor:**\n${rules.customInstructions}`);
    }

    if (sections.length === 0) {
      return '';
    }

    return `
## CONTEXTO DEL PASTOR

${sections.join('\n\n')}

NOTA: Considera estas preferencias al generar los enfoques, pero prioriza siempre la fidelidad al texto bíblico y la variedad de opciones.
`.trim();
  }

  /**
   * Output format specification with JSON schema
   */
  private buildOutputFormatSection(): string {
    const exampleJson = {
      homileticalApproaches: [
        {
          id: "pastoral-1",
          type: "pastoral",
          direction: "Consolar y fortalecer a creyentes en aflicción",
          tone: "exhortativo",
          purpose: "Animar a la iglesia a perseverar con esperanza",
          suggestedStructure: "Introducción → Desarrollo → Aplicación",
          targetAudience: "Creyentes en crisis",
          rationale: "Este enfoque es apropiado porque...",
          homileticalProposition: "La proposición principal...",
          contemporaryApplication: ["App 1", "App 2", "App 3"],
          outline: {
            mainPoints: [
              {
                title: "Punto 1",
                description: "Descripción del punto",
                scriptureReferences: ["Ref 1"]
              }
            ]
          }
        },
        {
          id: "pastoral-2",
          type: "pastoral",
          direction: "Traer esperanza y fortalecer la confianza en Dios",
          tone: "de ánimo",
          purpose: "Consolar y animar a través de la doctrina de la fidelidad de Dios",
          suggestedStructure: "Introducción empática → Verdades doctrinales → Aplicación esperanzadora",
          targetAudience: "Creyentes desanimados que necesitan fortalecimiento de fe",
          rationale: "Este enfoque trae consuelo a través de verdades teológicas sólidas...",
          homileticalProposition: "Proposición enfocada en la esperanza...",
          contemporaryApplication: ["App 1", "App 2", "App 3"],
          outline: {
            mainPoints: [
              {
                title: "Punto 1",
                description: "Descripción del punto",
                scriptureReferences: ["Ref 1"]
              }
            ]
          }
        },
        {
          id: "teologico-1",
          type: "teológico",
          direction: "Profundizar en la doctrina X",
          tone: "didáctico",
          purpose: "Enseñar con profundidad teológica",
          suggestedStructure: "Estructura didáctica...",
          targetAudience: "Líderes y maestros",
          rationale: "Este pasaje ofrece riqueza teológica...",
          homileticalProposition: "Proposición doctrinal...",
          contemporaryApplication: ["App 1", "App 2", "App 3"],
          outline: {
            mainPoints: [
              {
                title: "Punto 1",
                description: "Descripción del punto",
                scriptureReferences: ["Ref 1"]
              }
            ]
          }
        },
        // ... 1-2 enfoques más (total: 4-5 enfoques)
      ]
    };

    return `
## FORMATO DE SALIDA (JSON)

Devuelve ÚNICAMENTE un objeto JSON válido. NO uses bloques de markdown.

Estructura esperada:
${JSON.stringify(exampleJson, null, 2)}

INSTRUCCIONES CRÍTICAS:
- Retorna SOLO el objeto JSON, sin texto adicional
- NO uses bloques de código markdown
- Incluye 4-5 enfoques completos
- Todos los campos son requeridos
`.trim();
  }
}
