/**
 * Homiletics Preview Prompt Builder
 * 
 * Implements the Builder Pattern for constructing prompts that generate
 * lightweight homiletical approach previews WITHOUT full proposition or outline.
 * 
 * This is Phase 1 of the two-phase homiletics generation process.
 * 
 * @layer Infrastructure - Gemini-specific implementation
 * @pattern Builder Pattern
 * @solid SRP - Single Responsibility (only builds preview prompts)
 * @solid OCP - Open/Closed (extends the original builder concept)
 */

import { ExegeticalStudy, GenerationRules } from '@dosfilos/domain';

/**
 * Builder for constructing homiletics preview generation prompts
 * 
 * Usage:
 * ```typescript
 * const prompt = new HomileticsPreviewPromptBuilder()
 *     .withExegesis(exegesis)
 *     .withRules(rules)
 *     .build();
 * ```
 */
export class HomileticsPreviewPromptBuilder {
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
            throw new Error('Exegesis is required to build homiletics preview prompt');
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
     * Core instructions for generating approach PREVIEWS (not full approaches)
     */
    private buildInstructionsSection(): string {
        return `
## TAREA: GENERAR VISTAS PREVIAS DE ENFOQUES HOMILÉTICOS

Tu tarea es generar **4-5 VISTAS PREVIAS** de enfoques homiléticos diferentes para predicar este pasaje.

⚠️ IMPORTANTE: En esta fase, NO generes:
   - Proposición homilética detallada
   - Bosquejo completo con puntos
   - Aplicaciones contemporáneas completas

Solo genera la información necesaria para que el pastor ELIJA el mejor enfoque para su contexto.

### 🚨 REQUISITO CRÍTICO OBLIGATORIO:

**EL PRIMER ENFOQUE DEBE SER SIEMPRE EXPOSITIVO.**

El enfoque expositivo es RECOMENDADO por defecto porque:
- Es el más fiel al texto bíblico
- Permite análisis profundo verso por verso
- Es estructurado y didáctico
- Desarrolla el pasaje de manera orgánica

INSTRUCCIÓN IMPERATIVA:
1. El primer enfoque DEBE ser expositivo (id: "expositivo-1")
2. Los otros 3-4 enfoques pueden ser de cualquier otro tipo
3. Total: 4-5 enfoques (1 expositivo obligatorio + 3-4 variados)

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

6. **🎯 Expositivo** (OBLIGATORIO COMO PRIMER ENFOQUE): Análisis verso por verso
   - Tono: Didáctico, estructurado
   - Para: Estudio profundo de la Escritura
   - **ESTE DEBE SER SIEMPRE EL PRIMER ENFOQUE GENERADO**

7. **Narrativo**: Énfasis en la historia y el relato
   - Tono: Conversacional, envolvente
   - Para: Audiencias que responden a historias

### REQUISITOS CRÍTICOS:

✅ El primer enfoque SIEMPRE debe ser expositivo (obligatorio)
✅ Genera 3-4 vistas previas adicionales BIEN DIFERENCIADAS
✅ Cada vista previa debe dar suficiente información para tomar una decisión informada
✅ Todos deben ser FIELES al texto bíblico
✅ Explica POR QUÉ recomiendas ese enfoque para este pasaje

### PARA CADA VISTA PREVIA, DEFINE ÚNICAMENTE:

1. **Tipo**: pastoral, teológico, apologético, evangelístico, expositivo, o narrativo
2. **Dirección**: La orientación específica (ej: "Consolar en la tribulación")
3. **Tono**: exhortativo, de ánimo, didáctico, frontal, académico, conversacional, o persuasivo
4. **Propósito**: El objetivo principal del sermón
5. **Estructura Sugerida**: DESCRIPCIÓN BREVE del flujo (NO puntos completos)
   - Ejemplo: "Introducción empática → Verdades doctrinales → Aplicación esperanzadora"
6. **Audiencia Objetivo**: Para quién es más apropiado
7. **Razón (Rationale)**: Por qué este enfoque funciona con este pasaje

IMPORTANTE: 
- El primer enfoque debe ser expositivo (id: "expositivo-1")
- Los demás enfoques deben ser DISTINTOS entre sí, no variaciones menores
- NO incluyas proposición homilética ni bosquejo detallado
- Esta es una fase de SELECCIÓN, no de desarrollo completo
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
     * Output format specification with JSON schema for PREVIEWS
     */
    private buildOutputFormatSection(): string {
        const exampleJson = {
            homileticalApproaches: [
                // 🚨 PRIMER ENFOQUE SIEMPRE EXPOSITIVO
                {
                    id: "expositivo-1",
                    type: "expositivo",
                    direction: "Análisis sistemático del himno cristológico",
                    tone: "didáctico",
                    purpose: "Profundizar en la naturaleza de Cristo y la humildad cristiana",
                    suggestedStructure: "Contexto del pasaje → Análisis verso por verso → Aplicación doctrinal progresiva",
                    targetAudience: "Congregación general que busca estudio profundo",
                    rationale: "Este enfoque permite desentrañar la riqueza teológica del himno cristológico de manera ordenada y profunda..."
                },
                // Otros 3-4 enfoques variados
                {
                    id: "pastoral-1",
                    type: "pastoral",
                    direction: "Consolar y fortalecer a creyentes en aflicción",
                    tone: "exhortativo",
                    purpose: "Animar a la iglesia a perseverar con esperanza",
                    suggestedStructure: "Introducción empática → Promesas bíblicas → Testimonios contemporáneos → Aplicación práctica",
                    targetAudience: "Creyentes en crisis",
                    rationale: "Este enfoque es apropiado porque el contexto de Filipenses 2 muestra a Cristo como ejemplo en medio del sufrimiento..."
                },
                {
                    id: "teologico-1",
                    type: "teológico",
                    direction: "Profundizar en la doctrina de la kenosis",
                    tone: "didáctico",
                    purpose: "Enseñar la profundidad de la humillación de Cristo",
                    suggestedStructure: "Contexto doctrinal → Análisis del texto → Implicaciones teológicas",
                    targetAudience: "Líderes y maestros",
                    rationale: "Este pasaje ofrece riqueza teológica sobre la naturaleza de Cristo..."
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
- 🚨 EL PRIMER ENFOQUE DEBE SER SIEMPRE EXPOSITIVO (id: "expositivo-1")
- Retorna SOLO el objeto JSON, sin texto adicional
- NO uses bloques de código markdown
- Incluye 4-5 vistas previas completas (1 expositivo + 3-4 otros)
- NO incluyas "homileticalProposition", "contemporaryApplication" ni "outline" detallado
- Solo incluye los 7 campos especificados para cada vista previa
- Todos los campos son requeridos
`.trim();
    }
}
