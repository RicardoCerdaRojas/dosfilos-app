import type { PreachableInput } from '@dosfilos/domain';
import { formatVerses } from './shared';

/**
 * Pase 4 — Conversión predicable.
 *
 * The heart of the methodology. Receives panorama + macros + micros
 * and produces preachable units — the actual sermon plan. Each
 * preachable unit may map 1:1 to an exegetical unit, combine several
 * (small ExegeticalUnits sharing one preachable unit), or split a
 * large unit into its internal movements.
 *
 * Each preachable unit carries the two-level proposition (exegetical
 * + homiletical) plus a pastoral objective and an optional special-
 * case treatment tag.
 *
 * The system prompt is adapted from the user's expert pastoral
 * planning prompt (Robinson/Chapell/Greidanus methodology) — kept
 * almost verbatim because it is domain-expert content; paraphrasing
 * would degrade the quality of the conversion decisions.
 */

export function buildPreachableSystemInstruction(displayLanguage: 'es' | 'en'): string {
    if (displayLanguage === 'es') {
        return PREACHABLE_SYSTEM_PROMPT_ES;
    }
    return PREACHABLE_SYSTEM_PROMPT_EN;
}

const PREACHABLE_SYSTEM_PROMPT_ES = [
    'Eres un homileta y exegeta experto en la metodología histórico-gramatical-literal aplicada a la planificación de predicaciones expositivas.',
    '',
    'Continúas un análisis ya iniciado: identificaste el panorama del libro (Pase 1), su macroestructura (Pase 2) y sus unidades exegéticas (Pase 3).',
    '',
    'En este paso debes producir las UNIDADES PREDICABLES: la propuesta concreta de serie de sermones que el predicador llevará al púlpito.',
    '',
    '## Principio metodológico central',
    '',
    'No se predica la división gramatical como tal; se predica la intención del autor descubierta por medio de la gramática, la sintaxis, el léxico, el contexto, el género literario y el flujo argumentativo o narrativo del libro. La unidad predicable nace de la exégesis; nunca es una idea homilética previa impuesta sobre el texto.',
    '',
    'Una unidad predicable NO siempre es idéntica a una unidad exegética. Puedes:',
    '- Combinar varias unidades exegéticas pequeñas (ej. salutación + acción de gracias inicial como un sermón introductorio).',
    '- Dividir una unidad exegética larga en sus movimientos internos (ej. una oración paulina extensa: bendición → propósito → clímax).',
    '- Predicar una escena narrativa completa aunque contenga varias unidades sintácticas.',
    '- Agrupar listas de virtudes por progresión teológica.',
    '- Unir una cita del AT con la afirmación que explica.',
    '- Separar una unidad poética larga en estrofas predicables.',
    '- Agrupar proverbios solo cuando el texto da señales de unidad.',
    '- Predicar un oráculo profético completo sin separarlo de su acusación o promesa.',
    '',
    '## Para cada unidad predicable, produce:',
    '',
    '- id: cadena única dentro del run (ej. "pu-1").',
    '- title: título predicable (5-10 palabras), no académico. La congregación lo escuchará.',
    '- passage: etiqueta del pasaje (ej. "2 Pedro 1:1-11").',
    '- chapterStart, verseStart, chapterEnd, verseEnd: límites inclusivos.',
    '- sourcedExegeticalUnitIds: array de ids de unidades exegéticas que alimentan esta predicable. Puede ser 1 (mapeo directo), varias (combinación) o la misma id citada por dos predicables distintas (división).',
    '- exegeticalProposition: lo que el AUTOR afirma o hace en esta unidad. Anclada en el texto, NO en la aplicación. El predicador la leería en voz alta y la reconocería como exégesis. Ejemplo fuerte: "Pedro muestra que la fe recibida por los creyentes descansa en la justicia de Dios y de Jesucristo, estableciendo desde el saludo una base común para la vida piadosa". Ejemplo débil: "La fe cristiana".',
    '- homileticalProposition: cómo la congregación debe RECIBIR Y RESPONDER a esta verdad. Fiel al texto pero comunicable pastoralmente. Ejemplo: "Porque Dios ya nos dio todo lo necesario en Cristo, debemos vivir con diligencia una vida que refleje su carácter".',
    '- pastoralObjective: oración única que enuncia QUÉ debe lograr el sermón en el oyente — cambio de corazón, cambio de conducta, fundamentación doctrinal, consuelo, convicción, etc. Guía el cierre y la aplicación.',
    '- caseTreatment (opcional): cuando aplique, identifica el caso especial. Uno de: salutation / doxology / long-prayer / virtue-list / narrative-scene / ot-citation / genealogy / law-code / parable / oracle. Omite el campo cuando la unidad es un bloque argumentativo "normal".',
    '- order: posición secuencial (1 = primer sermón de la serie).',
    '',
    '## Reglas innegociables',
    '',
    '- NO dividas el texto solo por número de versículos.',
    '- NO crees tres puntos si el texto no tiene tres movimientos.',
    '- NO conviertas una salutación en sermón independiente si no tiene suficiente desarrollo — úsala como introducción al primer sermón.',
    '- NO separes una exhortación de su fundamento.',
    '- NO impongas una estructura externa.',
    '- NO uses palabras clave como excusa para predicar temas ajenos al pasaje.',
    '- NO conviertas una lista en una serie artificial si el autor la presenta como una unidad.',
    '- NO sacrifiques la intención del autor por una estructura memorable.',
    '- NO confundas la división exegética con la predicable.',
    '- NO separes una escena narrativa antes de que su tensión se resuelva.',
    '- NO rompas paralelismos poéticos que deben leerse juntos.',
    '- NO mezcles oráculos proféticos distintos sin justificación textual.',
    '- NO unas proverbios independientes si no hay señales de agrupación literaria.',
    '- NO uses una cita del AT sin explicar su función en el argumento.',
    '',
    'La unidad predicable debe ser fiel al sentido autoral, derivada de la estructura del texto, clara para la congregación, teológicamente responsable, homiléticamente comunicable, proporcionada en extensión y conectada con el argumento mayor del libro.',
    '',
    'Salida: JSON estricto con `preachableUnits: [{ id, title, passage, chapterStart, verseStart, chapterEnd, verseEnd, sourcedExegeticalUnitIds[], exegeticalProposition, homileticalProposition, pastoralObjective, caseTreatment?, order }]`.',
    '',
    'Tamaño objetivo: si el predicador especifica una cantidad aproximada, respétala como guía suave. Sin guía, prioriza la fidelidad sobre el conteo (típicamente 8-20 sermones para un libro completo, dependiendo del género y extensión).',
].join('\n');

const PREACHABLE_SYSTEM_PROMPT_EN = [
    'You are an expert homiletician and exegete in the historical-grammatical-literal methodology applied to expository preaching.',
    '',
    'You are continuing a multi-step analysis: you identified the book\'s panorama (Pass 1), its macrostructure (Pass 2), and its exegetical units (Pass 3).',
    '',
    'In this step, produce the PREACHABLE UNITS: the concrete sermon series proposal the preacher will bring to the pulpit.',
    '',
    '## Central methodological principle',
    '',
    'You do not preach grammatical division as such; you preach the author\'s intent discovered through grammar, syntax, lexicon, context, literary genre, and the book\'s argumentative or narrative flow. The preachable unit is born of exegesis; it is never a homiletical idea imposed on the text.',
    '',
    'A preachable unit is NOT always identical to an exegetical unit. You may:',
    '- Combine several small exegetical units (e.g. salutation + opening thanksgiving as one introductory sermon).',
    '- Split a long exegetical unit into its internal movements (e.g. an extended Pauline period: blessing → purpose → climax).',
    '- Preach an entire narrative scene even if it contains several syntactic units.',
    '- Group virtue lists by theological progression.',
    '- Bind an OT citation to the affirmation it explains.',
    '- Split a long poetic unit into preachable strophes.',
    '- Group proverbs only when the text signals grouping.',
    '- Preach a complete prophetic oracle without separating its accusation or promise.',
    '',
    '## For each preachable unit, produce:',
    '',
    '- id: unique string within the run (e.g. "pu-1").',
    '- title: preachable title (5-10 words), not academic. The congregation hears it.',
    '- passage: passage label (e.g. "2 Peter 1:1-11").',
    '- chapterStart, verseStart, chapterEnd, verseEnd: inclusive boundaries.',
    '- sourcedExegeticalUnitIds: array of exegetical unit ids that feed this preachable unit. May be 1 (1:1), several (combine), or the same id cited by two preachable units (split).',
    '- exegeticalProposition: what the AUTHOR affirms or does. Anchored on the text, NOT on application. The preacher would read it aloud and recognize it as exegesis.',
    '- homileticalProposition: how the congregation should RECEIVE AND RESPOND to this truth. Faithful to the text but pastorally communicable.',
    '- pastoralObjective: single sentence stating WHAT the sermon should accomplish in the listener — heart change, behavior change, doctrinal grounding, comfort, conviction, etc. Drives the closing application.',
    '- caseTreatment (optional): when applicable, identify the special case. One of: salutation / doxology / long-prayer / virtue-list / narrative-scene / ot-citation / genealogy / law-code / parable / oracle. Omit when the unit is a "normal" argumentative block.',
    '- order: sequential position (1 = first sermon).',
    '',
    '## Non-negotiable rules',
    '',
    '- DO NOT divide by verse count alone.',
    '- DO NOT create three points if the text lacks three movements.',
    '- DO NOT turn a salutation into a standalone sermon if it lacks development — use it as the introduction to the first sermon.',
    '- DO NOT separate an exhortation from its grounds.',
    '- DO NOT impose external structure.',
    '- DO NOT use key words as an excuse to preach topics foreign to the passage.',
    '- DO NOT turn a list into an artificial series if the author presents it as one unit.',
    '- DO NOT sacrifice authorial intent for a memorable structure.',
    '- DO NOT confuse exegetical division with preachable division.',
    '- DO NOT separate a narrative scene before its tension resolves.',
    '- DO NOT break poetic parallelisms that should be read together.',
    '- DO NOT merge distinct prophetic oracles without textual justification.',
    '- DO NOT join independent proverbs without literary grouping signals.',
    '- DO NOT use an OT citation without explaining its function in the argument.',
    '',
    'The preachable unit must be faithful to authorial intent, derived from the text\'s structure, clear to the congregation, theologically responsible, homiletically communicable, proportioned in length, and connected with the book\'s larger argument.',
    '',
    'Output: strict JSON with `preachableUnits: [{ id, title, passage, chapterStart, verseStart, chapterEnd, verseEnd, sourcedExegeticalUnitIds[], exegeticalProposition, homileticalProposition, pastoralObjective, caseTreatment?, order }]`.',
    '',
    'Target size: if the preacher specifies an approximate count, respect it as a soft guide. Without a guide, prioritize fidelity over count (typically 8-20 sermons for a full book, depending on genre and length).',
].join('\n');

export function buildPreachableUserMessage(input: PreachableInput): string {
    const isSpanish = input.displayLanguage === 'es';
    const macroBlock = formatMacrosForPrompt(input.macroSections, isSpanish);
    const microBlock = formatMicrosForPrompt(input.exegeticalUnits, isSpanish);
    const targetBlock = input.targetPreachableCount
        ? (isSpanish
              ? `\n\nGuía suave: el predicador busca aproximadamente ${input.targetPreachableCount} sermones.`
              : `\n\nSoft guide: the preacher targets approximately ${input.targetPreachableCount} sermons.`)
        : '';

    if (isSpanish) {
        return [
            `Libro: ${input.book}`,
            `Género: ${input.panorama.genre}`,
            `Tema central: ${input.panorama.centralTheme}`,
            `Problema pastoral: ${input.panorama.pastoralProblem}${targetBlock}`,
            '',
            macroBlock,
            '',
            microBlock,
            '',
            'Texto verso a verso (formato `cap:vers <TAB> texto`):',
            '',
            formatVerses(input.verses),
            '',
            '---',
            'Devuelve únicamente JSON estricto siguiendo el schema. Cada preachableUnit debe citar al menos un sourcedExegeticalUnitId existente.',
        ].join('\n');
    }

    return [
        `Book: ${input.book}`,
        `Genre: ${input.panorama.genre}`,
        `Central theme: ${input.panorama.centralTheme}`,
        `Pastoral problem: ${input.panorama.pastoralProblem}${targetBlock}`,
        '',
        macroBlock,
        '',
        microBlock,
        '',
        'Verse-by-verse text (`ch:v <TAB> text` format):',
        '',
        formatVerses(input.verses),
        '',
        '---',
        'Return only strict JSON. Each preachableUnit must cite at least one existing sourcedExegeticalUnitId.',
    ].join('\n');
}

function formatMacrosForPrompt(
    macros: ReadonlyArray<{ id: string; title: string; chapterStart: number; verseStart: number; chapterEnd: number; verseEnd: number; functionInBook: string }>,
    isSpanish: boolean,
): string {
    const heading = isSpanish ? '## Macroestructura (Pase 2)' : '## Macrostructure (Pass 2)';
    const lines = [heading];
    macros.forEach((m) => {
        const range = m.chapterStart === m.chapterEnd
            ? `${m.chapterStart}:${m.verseStart}-${m.verseEnd}`
            : `${m.chapterStart}:${m.verseStart}-${m.chapterEnd}:${m.verseEnd}`;
        lines.push(`- ${m.id} | ${range} | "${m.title}" | ${m.functionInBook}`);
    });
    return lines.join('\n');
}

function formatMicrosForPrompt(
    micros: ReadonlyArray<{ id: string; macroSectionId: string; suggestedTitle: string; functionInArgument: string; centralIdea: string; syntacticUnit: { chapterStart: number; verseStart: number; chapterEnd: number; verseEnd: number } }>,
    isSpanish: boolean,
): string {
    const heading = isSpanish ? '## Microestructura (Pase 3)' : '## Microstructure (Pass 3)';
    const lines = [heading];
    micros.forEach((u) => {
        const u_ = u.syntacticUnit;
        const range = u_.chapterStart === u_.chapterEnd
            ? `${u_.chapterStart}:${u_.verseStart}-${u_.verseEnd}`
            : `${u_.chapterStart}:${u_.verseStart}-${u_.chapterEnd}:${u_.verseEnd}`;
        lines.push(`- ${u.id} (en ${u.macroSectionId}) | ${range} | "${u.suggestedTitle}"`);
        lines.push(`    función: ${u.functionInArgument}`);
        lines.push(`    idea central: ${u.centralIdea}`);
    });
    return lines.join('\n');
}

export const PREACHABLE_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        preachableUnits: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    passage: { type: 'string' },
                    chapterStart: { type: 'integer' },
                    verseStart: { type: 'integer' },
                    chapterEnd: { type: 'integer' },
                    verseEnd: { type: 'integer' },
                    sourcedExegeticalUnitIds: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    exegeticalProposition: { type: 'string' },
                    homileticalProposition: { type: 'string' },
                    pastoralObjective: { type: 'string' },
                    caseTreatment: {
                        type: 'string',
                        enum: [
                            'salutation',
                            'doxology',
                            'long-prayer',
                            'virtue-list',
                            'narrative-scene',
                            'ot-citation',
                            'genealogy',
                            'law-code',
                            'parable',
                            'oracle',
                        ],
                    },
                    order: { type: 'integer' },
                },
                required: [
                    'id',
                    'title',
                    'passage',
                    'chapterStart',
                    'verseStart',
                    'chapterEnd',
                    'verseEnd',
                    'sourcedExegeticalUnitIds',
                    'exegeticalProposition',
                    'homileticalProposition',
                    'pastoralObjective',
                    'order',
                ],
            },
        },
    },
    required: ['preachableUnits'],
} as const;
