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
import {
    GENRE_SERMON_STRUCTURE_GENRES,
    sermonStructureFor,
    type LiteraryGenre,
} from '@dosfilos/domain';

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

        // ADR-035 R3 — paralelos canónicos que marcó el pastor. Van en el BOSQUEJO
        // (no solo en el borrador): el esqueleto debe preferirlos en los
        // scriptureReferences de cada punto, en vez de inventar otros.
        const parallels = exegesis.canonicalParallels ?? [];
        const parallelsBlock = parallels.length > 0
            ? `

**Paralelos canónicos marcados por el pastor (PRIORÍZALOS en los scriptureReferences de los puntos; no inventes otros en su lugar):**
${parallels.map(p => `- ${p.reference}${p.relevanceNote ? `: ${p.relevanceNote}` : ''}`).join('\n')}`
            : '';

        // EL GÉNERO GOBIERNA LAS REGLAS DE LECTURA (Phase 1.6, ADR-022/024) y
        // hasta ahora no llegaba al prompt. Viajaba en `rules.pastoralSeed`
        // hasta la puerta de este builder y se quedaba afuera: la sección se
        // llamaba "ESTUDIO EXEGÉTICO COMPLETO" y omitía justamente el campo
        // cuya documentación dice que gobierna cómo se lee el texto.
        //
        // Sin él, el generador pedía la misma forma de bosquejo para una
        // epístola, una narrativa y un proverbio. Los puntos de una narrativa
        // son GIROS DE LA TRAMA; los de una epístola, movimientos del
        // argumento. No es lo mismo y el modelo no tenía cómo saberlo.
        //
        // `genreImplication` es la lectura del PASTOR sobre lo que ese género
        // implica — su voz, no una inferencia — así que va junto al género.
        const seed = this.rules?.pastoralSeed;
        const genreBlock = seed?.genre
            ? `

**Género del pasaje (gobierna las reglas de lectura):** ${seed.genre}${
                  seed.genreImplication
                      ? `
**Lo que el pastor concluyó que ese género implica:**
${seed.genreImplication}`
                      : ''
              }`
            : '';

        return `
## ESTUDIO EXEGÉTICO COMPLETO

**Pasaje:** ${exegesis.passage}${genreBlock}

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
${exegesis.pastoralInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}${parallelsBlock}
`.trim();
    }

    /**
     * Lo que el GÉNERO pide de la estructura del sermón (Redacción v2 §6).
     *
     * Reemplaza al rango plano "mínimo 2, óptimo 3, máximo 4" que se aplicaba
     * igual a una epístola, una narrativa y un proverbio. Cada género rinde sus
     * puntos de otra fuente: la epístola de los movimientos del argumento
     * (conectores lógicos, cláusulas principales), la narrativa de los GIROS DE
     * LA TRAMA, la parábola de una sola comparación central.
     *
     * LO MÁS IMPORTANTE QUE DICE ESTE BLOQUE ES QUE EL RANGO NO ES UNA REGLA DE
     * CONTEO. La vara sellada es cobertura + anclaje: fusionar movimientos
     * afines o dividir uno profundo es libertad homilética; lo que no se puede
     * es un punto que no rastree al texto. Sin esa aclaración, dar un rango
     * invita al modelo a rellenar hasta el número.
     *
     * Devuelve '' cuando no hay género o no es uno del catálogo: sin género no
     * se inventa estructura, se cae al criterio general de más arriba.
     */
    private buildGenreStructureSection(): string {
        const raw = this.rules?.pastoralSeed?.genre;
        if (!raw) return '';
        if (!(GENRE_SERMON_STRUCTURE_GENRES as readonly string[]).includes(raw)) return '';
        const st = sermonStructureFor(raw as LiteraryGenre);
        if (!st) return '';

        const rango = st.puntos.min === st.puntos.max
            ? `${st.puntos.min}`
            : `${st.puntos.min} a ${st.puntos.max}`;

        return [
            `## 📐 LO QUE EL GÉNERO **${raw}** PIDE DE LA ESTRUCTURA`,
            '',
            '**Esto MANDA sobre el rango genérico de puntos indicado más arriba.**',
            '',
            `- **Cantidad de puntos:** ${rango}. ${st.puntos.razon}`,
            `- **De dónde salen los puntos:** ${st.fuenteDeLosPuntos}`,
            `- **Cómo se realiza la explicación:** ${st.realizacionDeLaExplicacion}`,
            `- **Forma de la proposición:** sustantivo ${st.proposicion.sustantivo}. ${st.proposicion.nota}`,
            ...(st.confrontaMultiplicacion
                ? [
                      '',
                      '⚠️ **Este género enseña por UN punto mayor de comparación.** No multipliques los puntos: si crees que hacen falta varios, probablemente estés fragmentando la única verdad.',
                  ]
                : []),
            '',
            '### ⚠️ El rango es GUÍA, no una regla de conteo',
            '',
            'La vara real es **cobertura + anclaje**, no el número:',
            '- Fusionar movimientos afines en un punto, o dividir uno profundo en varios, es libertad homilética legítima.',
            '- Lo que NO es legítimo es un punto que no rastree a ningún movimiento del texto: eso es el predicador imponiendo su idea.',
            '- **NO rellenes hasta llegar al número.** Si el pasaje rinde menos movimientos de los que sugiere el rango, entrega menos puntos. El texto manda sobre el rango.',
            '',
            '---',
            '',
        ].join('\n');
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
        // 2026-08-22 — SE QUITÓ EL GATE `isExpository`.
        //
        // La estructura sustantivada de 8 elementos estaba detrás de
        // `preview.type.includes('expositiv')`, y para cualquier otra forma el
        // prompt terminaba diciendo "usa estructura flexible". O sea: el pastor
        // elegía `pastoral` y el modelo recibía permiso explícito para no seguir
        // el método. No era un fallo del modelo; obedecía.
        //
        // Peor: `expositivo` DEJÓ DE SER UNA FORMA en la corrección de categoría
        // (2026-07-06) — la expositividad es la condición que toda forma debe
        // cumplir (el descalificador global G3), no una forma paralela. Las seis
        // formas son temático, pastoral, teológico, apologético, evangelístico y
        // narrativo. Ninguna contiene "expositiv", así que el gate se había
        // vuelto una puerta que ya no se podía abrir y la estructura quedaba
        // muerta para TODAS las formas vivas.
        //
        // La sustantivada es ahora el default de las seis. El tono adapta las
        // palabras; no elimina el andamiaje. Ver proposition-guidelines.md.

        // Use imported MD files directly
        const propositionGuidelines = propositionGuidelinesMD;
        const outlineInstructions = outlineInstructionsMD;
        const applicationTemplate = applicationTemplateMD;
        const toneConsistency = toneConsistencyMD;
        const scriptureCriteria = scriptureReferencesMD;
        const structureExamples = expositoryExamplesMD;

        // Build comprehensive instructions
        const sections = [
            '## TAREA: DESARROLLAR EL ENFOQUE SELECCIONADO',
            '',
            `Tu tarea es generar DOS elementos para este enfoque específico (${preview.type}):`,
            '',
        ];

        // La estructura sustantivada va SIEMPRE y va PRIMERO.
        {
            sections.push(
                '---',
                '',
                '# 🚨 IMPERATIVO CRÍTICO: ESTRUCTURA DE LA PROPOSICIÓN',
                '',
                `**DEBES SEGUIR EXACTAMENTE LA ESTRUCTURA SUSTANTIVADA DE 8 ELEMENTOS**, sea cual sea el enfoque — este es *${preview.type}*. El tono adapta las PALABRAS; no elimina la estructura.`,
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
                '2. **VERBO, EN 1ª PERSONA PLURAL:** veremos (el más usado), aprenderemos, descubriremos, consideraremos. NUNCA 2ª persona singular ("descubrirás"): el predicador se incluye con la congregación.',
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
            // Va DESPUÉS del rango genérico a propósito: lo corrige, y para
            // corregirlo tiene que haberse leído primero.
            this.buildGenreStructureSection(),
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

        // La galería de ejemplos de la estructura va siempre, no solo para una forma.
        if (structureExamples) {
            sections.push('', '---', '', '### 📚 EJEMPLOS DE REFERENCIA (ESTRUCTURA SUSTANTIVADA)', '', structureExamples);
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
            '- **IMPORTANTE:** Usa la Estructura Sustantivada de 8 elementos para la proposición, sea cual sea el enfoque',
            `- Lo que el enfoque **${preview.type}** cambia es el SUSTANTIVO PLURAL elegido y el registro del lenguaje, NO el andamiaje de la proposición`,
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
