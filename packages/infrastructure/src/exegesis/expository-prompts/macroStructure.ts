import type { BookPanorama, MacroInput } from '@dosfilos/domain';
import { formatVerses } from './shared';

/**
 * Pase 2 — Macroestructura.
 *
 * Receives the panorama from Pase 1 + the full verse text. Divides
 * the book into 3-7 macro-sections, each carrying a function from
 * the curated MacroFunction set (introduction / thesis /
 * argument-development / narrative-arc / climax / application /
 * closing / transition / digression).
 *
 * The panorama's `movements` field is a HINT (the LLM may rename or
 * regroup), not a constraint.
 */

export function buildMacroSystemInstruction(displayLanguage: 'es' | 'en'): string {
    if (displayLanguage === 'es') {
        return [
            'Eres un homileta y exegeta experto. Continúas un análisis ya iniciado: en el paso anterior identificaste el panorama del libro (género, propósito, problema pastoral, tema, movimientos, palabras clave).',
            '',
            'En este paso debes producir la MACROESTRUCTURA: dividir el libro en 3-7 macro-secciones grandes, cada una con su función dentro del flujo del libro.',
            '',
            'Una macro-sección NO es una perícopa ni un capítulo. Es un BLOQUE GRANDE que cumple una función dentro del argumento o narración del libro completo. Los sermones vivirán DENTRO de las macro-secciones, no entre ellas.',
            '',
            'Para cada macro-sección, identifica:',
            '- title: etiqueta corta del bloque (3-7 palabras).',
            '- chapterStart, verseStart, chapterEnd, verseEnd: límites inclusivos del bloque.',
            '- theme: sobre qué trata el bloque (1-2 oraciones).',
            '- functionInBook: rol del bloque dentro del libro. Elige UNO de:',
            '  • introduction — saludo, prólogo, presentación de autor o destinatarios.',
            '  • thesis — afirmación teológica que el resto del libro desarrolla.',
            '  • argument-development — bloques de exposición que sostienen la tesis.',
            '  • narrative-arc — tramo narrativo con tensión propia (apertura/desarrollo/clímax).',
            '  • climax — punto culminante de la argumentación o narración.',
            '  • application — exhortaciones, mandatos, consecuencias éticas.',
            '  • closing — saludos finales, doxología, despedida.',
            '  • transition — bisagra entre dos secciones grandes.',
            '  • digression — paréntesis explicativo o ilustrativo.',
            '- order: posición secuencial (1 = primera macro-sección del libro).',
            '',
            'Reglas innegociables:',
            '- Las macro-secciones cubren TODO el libro sin huecos y sin solaparse.',
            '- Mínimo 3, máximo 7. Menos esconde la estructura; más confunde con perícopas.',
            '- La función debe reflejar lo que el bloque HACE en el flujo del libro, no solo el tema.',
            '- Respeta el género detectado en el panorama: una narrativa probablemente tendrá narrative-arc + climax, una epístola tendrá introduction + thesis + argument-development + application + closing, etc.',
            '- Los movimientos del panorama son una sugerencia inicial — puedes renombrar, regrupar o subdividir si la estructura del texto lo pide.',
            '',
            'Salida: JSON estricto con `macroSections: [{ id, title, chapterStart, verseStart, chapterEnd, verseEnd, theme, functionInBook, order }]`.',
            '- id: cadena única dentro del run (ej. "ms-1", "ms-2").',
        ].join('\n');
    }

    return [
        'You are an expert homiletician and exegete. You are continuing a multi-step analysis: in the previous step you identified the book\'s panorama (genre, purpose, pastoral problem, theme, movements, key terms).',
        '',
        'In this step, produce the MACROSTRUCTURE: divide the book into 3-7 large macro-sections, each with its function within the book\'s flow.',
        '',
        'A macro-section is NOT a pericope or a chapter. It is a LARGE BLOCK that performs a function within the book\'s overall argument or narrative. Sermons will live INSIDE macro-sections, not across them.',
        '',
        'For each macro-section, identify:',
        '- title: short block label (3-7 words).',
        '- chapterStart, verseStart, chapterEnd, verseEnd: inclusive boundaries.',
        '- theme: what the block is about (1-2 sentences).',
        '- functionInBook: role within the book. Choose ONE of:',
        '  • introduction — greeting, prologue, presentation of author or recipients.',
        '  • thesis — theological affirmation the rest of the book develops.',
        '  • argument-development — exposition blocks supporting the thesis.',
        '  • narrative-arc — narrative stretch with its own tension (opening/development/climax).',
        '  • climax — culminating point of the argument or narrative.',
        '  • application — exhortations, commands, ethical consequences.',
        '  • closing — final greetings, doxology, farewell.',
        '  • transition — hinge between two large sections.',
        '  • digression — explanatory or illustrative parenthesis.',
        '- order: sequential position (1 = first macro-section of the book).',
        '',
        'Non-negotiable rules:',
        '- Macro-sections cover the ENTIRE book without gaps or overlaps.',
        '- Minimum 3, maximum 7. Fewer hides the structure; more conflates with pericopes.',
        '- The function must reflect what the block DOES in the book\'s flow, not just the topic.',
        '- Respect the genre detected in the panorama: a narrative likely has narrative-arc + climax, an epistle likely has introduction + thesis + argument-development + application + closing, etc.',
        '- The panorama\'s movements are an initial suggestion — you may rename, regroup, or subdivide if the text\'s structure calls for it.',
        '',
        'Output: strict JSON with `macroSections: [{ id, title, chapterStart, verseStart, chapterEnd, verseEnd, theme, functionInBook, order }]`.',
        '- id: unique string within the run (e.g. "ms-1", "ms-2").',
    ].join('\n');
}

export function buildMacroUserMessage(input: MacroInput): string {
    const isSpanish = input.displayLanguage === 'es';
    const panoramaBlock = formatPanoramaForPrompt(input.panorama, isSpanish);

    if (isSpanish) {
        return [
            `Libro: ${input.book}`,
            '',
            panoramaBlock,
            '',
            'Texto verso a verso (formato `cap:vers <TAB> texto`):',
            '',
            formatVerses(input.verses),
            '',
            '---',
            'Devuelve únicamente JSON estricto siguiendo el schema del system prompt.',
        ].join('\n');
    }

    return [
        `Book: ${input.book}`,
        '',
        panoramaBlock,
        '',
        'Verse-by-verse text (`ch:v <TAB> text` format):',
        '',
        formatVerses(input.verses),
        '',
        '---',
        'Return only strict JSON conforming to the system prompt schema.',
    ].join('\n');
}

function formatPanoramaForPrompt(panorama: BookPanorama, isSpanish: boolean): string {
    const lines: string[] = [];
    if (isSpanish) {
        lines.push('## Panorama del libro (Pase 1)');
        lines.push(`- Género: ${panorama.genre}`);
        lines.push(`- Propósito: ${panorama.purpose}`);
        lines.push(`- Problema pastoral: ${panorama.pastoralProblem}`);
        lines.push(`- Tema central: ${panorama.centralTheme}`);
        lines.push(`- Movimientos sugeridos: ${panorama.movements.join(' / ')}`);
        if (panorama.keyTerms.length > 0) {
            lines.push(`- Términos clave: ${panorama.keyTerms.join(', ')}`);
        }
        if (panorama.redemptiveHistoryNote) {
            lines.push(`- Historia redentora: ${panorama.redemptiveHistoryNote}`);
        }
    } else {
        lines.push('## Book panorama (Pass 1)');
        lines.push(`- Genre: ${panorama.genre}`);
        lines.push(`- Purpose: ${panorama.purpose}`);
        lines.push(`- Pastoral problem: ${panorama.pastoralProblem}`);
        lines.push(`- Central theme: ${panorama.centralTheme}`);
        lines.push(`- Suggested movements: ${panorama.movements.join(' / ')}`);
        if (panorama.keyTerms.length > 0) {
            lines.push(`- Key terms: ${panorama.keyTerms.join(', ')}`);
        }
        if (panorama.redemptiveHistoryNote) {
            lines.push(`- Redemptive history: ${panorama.redemptiveHistoryNote}`);
        }
    }
    return lines.join('\n');
}

export const MACRO_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        macroSections: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    chapterStart: { type: 'integer' },
                    verseStart: { type: 'integer' },
                    chapterEnd: { type: 'integer' },
                    verseEnd: { type: 'integer' },
                    theme: { type: 'string' },
                    functionInBook: {
                        type: 'string',
                        enum: [
                            'introduction',
                            'thesis',
                            'argument-development',
                            'narrative-arc',
                            'climax',
                            'application',
                            'closing',
                            'transition',
                            'digression',
                        ],
                    },
                    order: { type: 'integer' },
                },
                required: [
                    'id',
                    'title',
                    'chapterStart',
                    'verseStart',
                    'chapterEnd',
                    'verseEnd',
                    'theme',
                    'functionInBook',
                    'order',
                ],
            },
        },
    },
    required: ['macroSections'],
} as const;
