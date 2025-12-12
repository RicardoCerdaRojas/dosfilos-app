/**
 * Approach Development Prompt Builder
 * 
 * Implements the Builder Pattern for constructing prompts that develop
 * a selected homiletical approach preview into a complete approach with
 * homiletical proposition and detailed outline.
 * 
 * This is Phase 2 of the two-phase homiletics generation process.
 * 
 * NOW LOADS GUIDELINES FROM MARKDOWN FILES for maintainability.
 * 
 * @layer Infrastructure - Gemini-specific implementation
 * @pattern Builder Pattern
 * @solid SRP - Single Responsibility (only builds development prompts)
 * @solid OCP - Open/Closed (can be extended without modification)
 */

import { ExegeticalStudy, GenerationRules } from '@dosfilos/domain';
import { HomileticalApproachPreview } from '@dosfilos/domain';

// Import MD files as strings (Vite will handle this)
import propositionGuidelinesMD from '../../../config/prompts/homiletics/proposition-guidelines.md?raw';
import outlineInstructionsMD from '../../../config/prompts/homiletics/outline-instructions.md?raw';
import applicationTemplateMD from '../../../config/prompts/homiletics/application-template.md?raw';
import toneConsistencyMD from '../../../config/prompts/homiletics/tone-consistency.md?raw';
import scriptureReferencesMD from '../../../config/prompts/homiletics/scripture-references.md?raw';
import expositoryExamplesMD from '../../../config/prompts/homiletics/expository-examples.md?raw';

/**
 * Builder for constructing prompts to develop a selected approach
 * 
 * Usage:
 * ```typescript
 * const prompt = new ApproachDevelopmentPromptBuilder()
 *     .withExegesis(exegesis)
 *     .withSelectedPreview(selectedApproach)
 *     .withRules(rules)
 *     .build();
 * ```
 */
export class ApproachDevelopmentPromptBuilder {
    private exegesis?: ExegeticalStudy;
    private selectedPreview?: HomileticalApproachPreview;
    private rules?: GenerationRules;


    /**
     * Sets the exegetical study context
     */
    withExegesis(exegesis: ExegeticalStudy): this {
        this.exegesis = exegesis;
        return this;
    }

    /**
     * Sets the selected approach preview to develop
     */
    withSelectedPreview(preview: HomileticalApproachPreview): this {
        this.selectedPreview = preview;
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
            throw new Error('Exegesis is required to build development prompt');
        }
        if (!this.selectedPreview) {
            throw new Error('Selected preview is required to build development prompt');
        }

        return [
            this.buildSystemSection(),
            this.buildExegesisSection(),
            this.buildSelectedApproachSection(),
            this.buildInstructionsSection(),
            this.buildContextSection(),
            this.buildOutputFormatSection()
        ].filter(Boolean).join('\n\n');
    }

    /**
     * System prompt defining AI role and goals for Phase 2
     */
    private buildSystemSection(): string {
        return `
Eres un experto en homilética y preparación de sermones con profundo conocimiento teológico.

Tu especialidad es desarrollar proposiciones homiléticas y bosquejos detallados que:
- Sean fieles al texto bíblico
- Mantengan consistencia de tono y enfoque
- Sean prácticos y predicables
- Conecten el mundo bíblico con el contemporáneo
`.trim();
    }

    /**
     * Exegetical context section (same as Phase 1 for continuity)
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
     * Selected approach section - the direction chosen by the preacher
     */
    private buildSelectedApproachSection(): string {
        const preview = this.selectedPreview!;

        return `
## ENFOQUE HOMILÉTICO SELECCIONADO

El pastor ha seleccionado el siguiente enfoque para su sermón:

**ID:** ${preview.id}
**Tipo:** ${preview.type}
**Dirección:** ${preview.direction}
**Tono:** ${preview.tone}
**Propósito:** ${preview.purpose}
**Audiencia Objetivo:** ${preview.targetAudience}

**Estructura Sugerida:**
${preview.suggestedStructure}

**Justificación de este enfoque:**
${preview.rationale}

IMPORTANTE: Todo lo que generes (proposición y bosquejo) debe estar perfectamente 
alineado con este enfoque, especialmente su TONO (${preview.tone}) y PROPÓSITO.
`.trim();
    }

    /**
     * Detailed instructions for developing the approach
     * NOW LOADS FROM MD FILES via static imports (Vite)
     */
    private buildInstructionsSection(): string {
        const preview = this.selectedPreview!;
        const isExpository = preview.type?.toLowerCase().includes('expositiv');

        console.log(`🎯 Building instructions for approach: ${preview.type} (Expository: ${isExpository})`);

        // Use imported MD files directly
        const propositionGuidelines = propositionGuidelinesMD;
        const outlineInstructions = outlineInstructionsMD;
        const applicationTemplate = applicationTemplateMD;
        const toneConsistency = toneConsistencyMD;
        const scriptureCriteria = scriptureReferencesMD;
        const expositoryExamples = isExpository ? expositoryExamplesMD : '';

        console.log(`📊 Loaded MD files:`);
        console.log(`  - Proposition: ${propositionGuidelines.length} chars`);
        console.log(`  - Outline: ${outlineInstructions.length} chars`);
        console.log(`  - Application: ${applicationTemplate.length} chars`);
        console.log(`  - Tone: ${toneConsistency.length} chars`);
        console.log(`  - Scripture: ${scriptureCriteria.length} chars`);
        if (isExpository) {
            console.log(`  - Expository Examples: ${expositoryExamples.length} chars`);
        }

        // Build comprehensive instructions
        const sections = [
            '## TAREA: DESARROLLAR EL ENFOQUE SELECCIONADO',
            '',
            `Tu tarea es generar DOS elementos para este enfoque específico (${preview.type}):`,
            '',
        ];

        // 🚨 FOR EXPOSITORY: Add CRITICAL imperatives FIRST
        if (isExpository) {
            sections.push(
                '---',
                '',
                '# 🚨 IMPERATIVO CRÍTICO: ENFOQUE EXPOSITIVO',
                '',
                '**ESTE ES UN ENFOQUE EXPOSITIVO. DEBES SEGUIR EXACTAMENTE LA ESTRUCTURA SUSTANTIVADA DE 8 ELEMENTOS.**',
                '',
                '## ⚠️ ESTRUCTURA OBLIGATORIA PARA LA PROPOSICIÓN:',
                '',
                '```',
                'En [PASAJE EXACTO], [VERBO] [NÚMERO] [SUSTANTIVO PLURAL] que [LLAMADO ACCIÓN]',
                'y que [ELEMENTO PROPOSICIONAL] [1ª PERSONA PLURAL] [IDEA CENTRAL].',
                '```',
                '',
                '### Los 8 Elementos REQUERIDOS:',
                '1. **PASAJE:** "En Filipenses 2:5-11" (el pasaje exacto)',
                '2. **VERBO:** descubrirás, encontrarás, recibirás, aprenderás',
                '3. **NÚMERO:** dos, tres, cuatro (DEBE coincidir con cantidad de puntos del bosquejo)',
                '4. **SUSTANTIVO PLURAL:** verdades, motivos, pasos, promesas, exhortaciones, principios, lecciones, desafíos',
                '5. **LLAMADO ACCIÓN:** que debes obedecer, para confiar, que transformarán, a fin de vivir',
                '6. **PROPOSICIONAL:** que, para, a fin de, por lo que',
                '7. **1ª PLURAL:** vivamos, confiemos, obedezcamos, crezcamos',
                '8. **IDEA CENTRAL:** por la gloria de Dios, en Cristo, para Su reino',
                '',
                '### ❌ NO HAGAS ESTO (Estructuras que NO cumplen):',
                '- ❌ "Mediante el estudio de Filipenses..." (no empieza con "En [pasaje]")',
                '- ❌ "Este pasaje nos enseña que..." (no incluye número + sustantivo plural)',
                '- ❌ "La humillación de Cristo..." (no anticipa estructura del bosquejo)',
                '',
                '### ✅ SÍ HAZLO ASÍ (Ejemplos correctos):',
                '```',
                '"En Filipenses 2:5-11, descubrirás tres verdades sobre la humillación de Cristo',
                'que debes obedecer para que vivamos en unidad sacrificial por la gloria de Dios."',
                '',
                '"En Romanos 8:28-30, encontrarás cuatro verdades inquebrantables sobre la soberanía',
                'de Dios que debes creer para descansar plenamente en Su plan perfecto."',
                '',
                '"En el Salmo 23, descubrirás cinco motivos para confiar absolutamente en Jehová',
                'como tu Pastor, aun en medio del valle más oscuro de tu vida."',
                '```',
                '',
                '## ⚠️ SINCRONIZACIÓN OBLIGATORIA: PROPOSICIÓN ↔ TÍTULOS',
                '',
                '**Los títulos del bosquejo DEBEN estar en perfecta armonía con:**',
                '- El **SUSTANTIVO PLURAL** de la proposición',
                '- El **LLAMADO A ACCIÓN** de la proposición',
                '',
                '**Ejemplos de Sincronización:**',
                '',
                '**Si proposición dice:** "tres verdades que debes obedecer"',
                '**Entonces títulos:**',
                '```',
                'I. Debes cultivar la mentalidad de Cristo',
                'II. Debes abrazar la humillación voluntaria',
                'III. Debes confiar en la exaltación venidera',
                '```',
                '✅ TODOS empiezan con "Debes"',
                '',
                '**Si proposición dice:** "cuatro motivos para confiar en Dios"',
                '**Entonces títulos:**',
                '```',
                'I. La fidelidad de Dios te motiva a confiar',
                'II. Las promesas inquebrantables fundamentan tu confianza',
                'III. El carácter inmutable asegura que puedes confiar',
                'IV. El poder divino garantiza tu confianza perpetua',
                '```',
                '✅ TODOS conectan con "confiar/confianza"',
                '',
                '## 🎯 CHECKLIST DE VERIFICACIÓN ANTES DE GENERAR:',
                '',
                '- [ ] ¿La proposición empieza con "En [pasaje exacto]"?',
                '- [ ] ¿Incluye un número (dos, tres, cuatro)?',
                '- [ ] ¿Incluye un sustantivo plural (verdades, motivos, etc.)?',
                '- [ ] ¿Incluye un llamado a acción (debes obedecer, para confiar, etc.)?',
                '- [ ] ¿El número de la proposición coincide con cantidad de puntos del bosquejo?',
                '- [ ] ¿TODOS los títulos reflejan el llamado a acción?',
                '- [ ] ¿Los títulos están en paralelismo gramatical?',
                '',
                '**SI NO CUMPLES ESTOS ELEMENTOS, LA PROPOSICIÓN SERÁ RECHAZADA.**',
                '',
                '---',
                ''
            );
        }

        sections.push(
            '### 📋 1. PROPOSICIÓN HOMILÉTICA',
            '',
            propositionGuidelines || this.getFallbackPropositionInstructions(),
            '',
            '---',
            '',
            '### 📋 2. BOSQUEJO DETALLADO',
            '',
            outlineInstructions || this.getFallbackOutlineInstructions(),
            '',
            '---',
            '',
            '### 📋 3. APLICACIONES CONTEMPORÁNEAS',
            '',
            applicationTemplate || 'Genera 3-5 aplicaciones específicas y accionables.',
            '',
            '---',
            '',
            '### 📋 4. CONSISTENCIA DE TONO',
            '',
            toneConsistency || `Mantén el tono ${preview.tone} en TODOS los elementos.`,
            '',
            '---',
            '',
            '### 📋 5. REFERENCIAS BÍBLICAS',
            '',
            scriptureCriteria || 'Incluye 2-3 referencias por punto del bosquejo.'
        );

        // Add expository examples if available
        if (isExpository && expositoryExamples) {
            sections.push('', '---', '', '### 📚 EJEMPLOS DE REFERENCIA (EXPOSITIVOS)', '', expositoryExamples);
        }

        sections.push(
            '',
            '---',
            '',
            '## ⚠️ INSTRUCCIONES CRÍTICAS FINALES',
            '',
            `- El enfoque seleccionado es: **${preview.type}** con tono **${preview.tone}**`,
            `- La dirección es: "${preview.direction}"`,
            `- TODO debe estar perfectamente alineado con ese enfoque y tono`,
            isExpository
                ? '- **IMPORTANTE:** Como es EXPOSITIVO, usa la Estructura Sustantivada de 8 elementos para la proposición'
                : '- Usa estructura flexible apropiada para este tipo de enfoque',
            '- Verifica que proposición y bosquejo se sientan como UN SOLO sermón cohesivo',
            '- No pierdas el tono en ningún elemento'
        );

        return sections.filter(Boolean).join('\n');
    }

    /**
     * Fallback proposition instructions if MD file not found
     */
    private getFallbackPropositionInstructions(): string {
        return `
La proposición homilética es el corazón del sermón. Debe:

✅ Ser una oración completa y clara
✅ Capturar la idea central del pasaje aplicada a hoy
✅ Estar escrita en el TONO exacto del enfoque (${this.selectedPreview!.tone})
✅ Reflejar el PROPÓSITO del enfoque
✅ Ser memorable y predicable
✅ Conectar directamente con la audiencia objetivo

NO debe:
❌ Ser genérica o aplicable a cualquier pasaje
❌ Perder el tono específico del enfoque
❌ Ser demasiado académica o abstracta (a menos que el tono sea académico)
        `.trim();
    }

    /**
     * Fallback outline instructions if MD file not found
     */
    private getFallbackOutlineInstructions(): string {
        return `
El bosquejo debe tener:

✅ 2-4 puntos principales claros y progresivos
✅ Cada punto con:
   - Título impactante (en el tono del enfoque)
   - Descripción detallada (2-3 oraciones)
   - Referencias bíblicas pertinentes (el pasaje principal + referencias cruzadas)
✅ Flujo lógico que desarrolla la proposición
✅ Aplicaciones contemporáneas concretas (3-5 total)
✅ Todo en el mismo tono consistente

CRÍTICO: 
- La proposición y el bosquejo deben sentirse como un solo sermón cohesivo
- El tono debe ser consistente en cada palabra
- Debe ser fiel a la exégesis pero adaptado al enfoque elegido
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
            sections.push(`**Tono Preferido del Pastor:** ${rules.tone}`);
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

NOTA: Considera estas preferencias, pero prioriza siempre la fidelidad al texto bíblico
y la coherencia con el enfoque seleccionado.
`.trim();
    }

    /**
     * Output format specification with JSON schema
     */
    private buildOutputFormatSection(): string {
        const exampleJson = {
            homileticalProposition: "Proposición completa que refleja el tono y propósito del enfoque seleccionado...",
            outlinePreview: [
                "I. Título del Punto 1 (v. 1-4)",
                "II. Título del Punto 2 (vv. 5-8)",
                "III. Título del Punto 3 (vv. 9-11)"
            ],
            contemporaryApplication: [
                "Aplicación concreta 1 para la audiencia objetivo",
                "Aplicación concreta 2 que sea accionable",
                "Aplicación concreta 3 relevante al contexto contemporáneo",
                "Aplicación concreta 4 (opcional)",
                "Aplicación concreta 5 (opcional)"
            ],
            outline: {
                mainPoints: [
                    {
                        title: "I. Título del Punto 1 (impactante, en el tono del enfoque)",
                        description: "Descripción detallada de 2-3 oraciones explicando este punto y cómo se desarrolla.",
                        scriptureReferences: ["Filipenses 2:1-4", "Romanos 12:3-5"]
                    },
                    {
                        title: "II. Título del Punto 2",
                        description: "Descripción detallada que fluye del punto anterior...",
                        scriptureReferences: ["Filipenses 2:5-8", "Juan 13:3-5"]
                    },
                    {
                        title: "III. Título del Punto 3",
                        description: "Descripción que concluye el desarrollo...",
                        scriptureReferences: ["Filipenses 2:9-11", "Apocalipsis 5:11-14"]
                    }
                ]
            }
        };

        return `
## FORMATO DE SALIDA (JSON)

Devuelve ÚNICAMENTE un objeto JSON válido. NO uses bloques de markdown.

Estructura esperada:
${JSON.stringify(exampleJson, null, 2)}

INSTRUCCIONES CRÍTICAS:
- Retorna SOLO el objeto JSON, sin texto adicional
- NO uses bloques de código markdown
- La proposición debe estar escrita en el tono: "${this.selectedPreview!.tone}"
- El bosquejo debe tener 2-4 puntos principales
- Todos los campos son requeridos
- Mantén consistencia de tono en TODOS los elementos

**IMPORTANTE: outlinePreview**
- Es un array de strings con los títulos del bosquejo + versículos
- Formato: "I. Título completo del punto (v. X)" o "(vv. X-Y)"
- Debe coincidir con los títulos de outline.mainPoints
- Propósito: Dar a la congregación un "mapa" del sermón desde el inicio
- Ejemplo: ["I. Debes asimilar la gloria divina (v. 6)", "II. Debes asimilar la humillación voluntaria (vv. 7-8)"]
`.trim();
    }
}
