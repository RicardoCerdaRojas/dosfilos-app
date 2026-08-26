import type { GreekWordToken } from './morphGntToken';

/** Expande el tag a texto plano para el prompt, sin códigos crípticos. */
const TENSE: Record<string, string> = { P: 'presente', I: 'imperfecto', F: 'futuro', A: 'aoristo', X: 'perfecto', Y: 'pluscuamperfecto' };
const VOICE: Record<string, string> = { A: 'activa', M: 'media', P: 'pasiva' };
const MOOD: Record<string, string> = { I: 'indicativo', D: 'imperativo', S: 'subjuntivo', O: 'optativo', N: 'infinitivo', P: 'participio' };
const CASE: Record<string, string> = { N: 'nominativo', G: 'genitivo', D: 'dativo', A: 'acusativo', V: 'vocativo' };
const POS: Record<string, string> = {
    N: 'sustantivo', V: 'verbo', A: 'adjetivo', D: 'adverbio', P: 'preposición', C: 'conjunción',
    X: 'partícula', I: 'interjección', RA: 'artículo', RP: 'pronombre personal', RR: 'pronombre relativo',
    RD: 'pronombre demostrativo', RI: 'pronombre interrogativo/indefinido',
};

function describirTag(t: GreekWordToken): string {
    const g = t.tag;
    const partes = [
        POS[t.pos],
        g.tense && TENSE[g.tense],
        g.voice && VOICE[g.voice],
        g.mood && MOOD[g.mood],
        g.person && `${g.person}ª persona`,
        g.case && CASE[g.case],
        g.number && (g.number === 'S' ? 'singular' : 'plural'),
        g.gender && (g.gender === 'M' ? 'masculino' : g.gender === 'F' ? 'femenino' : 'neutro'),
    ].filter(Boolean);
    return partes.join(', ');
}

/**
 * Pide al modelo SÓLO lo que la morfología no da.
 *
 * LA MORFOLOGÍA VA COMO DATO RESUELTO, no como tarea: viene de MorphGNT, la
 * fuente de verdad, y el prompt lo dice para que el modelo la USE en la
 * función sintáctica en vez de recalcularla — recalcularla es la puerta por
 * la que entraría a contradecir el dataset.
 */
export function buildGreekInsightPrompt(input: {
    reference: string;
    tokens: readonly GreekWordToken[];
}): string {
    const lista = input.tokens
        .map((t, i) => `${i + 1}. ${t.text} — lema ${t.lemma} — ${describirTag(t)}`)
        .join('\n');

    return `Eres un gramático de griego koiné asistiendo a un pastor hispanohablante que estudia el texto original.

VERSÍCULO: ${input.reference}
${input.tokens.map((t) => t.text).join(' ')}

PALABRAS CON SU MORFOLOGÍA YA RESUELTA (MorphGNT — es la fuente de verdad, NO la recalcules ni la contradigas; úsala para explicar la función):

${lista}

TAREA — para el versículo:
1. "literalTranslation": traducción LITERAL al español, calcando el orden y la
   sintaxis del griego tanto como el español lo tolere.
2. "fluidTranslation": traducción FLUIDA, español natural.

Y para CADA palabra, en el MISMO ORDEN de la lista:
- "text": la palabra tal como aparece arriba (verbatim, con puntuación).
- "semanticRange": el rango semántico del LEMA — los sentidos que puede tener,
  separados por " / ". Rango real del léxico, no uno solo ni inventados.
- "syntacticFunction": cómo funciona ESTA palabra en ESTA frase, en una línea
  ("sujeto de ἡγήσασθε", "objeto directo", "genitivo de relación…"). Apóyate
  en la morfología dada.
- "translation": su traducción contextual en este versículo.

Y ADEMÁS, "keyInsights": elige las 2 o 3 palabras que cargan el PESO
TEOLÓGICO del versículo y explica su SIGNIFICANCIA para la predicación — el
paso del dato a la consecuencia: por qué importa que ese verbo sea aoristo y
no presente, qué pierde el oyente si el matiz del lema se traduce plano.
2 a 4 frases por palabra, concretas y predicables. NO repitas la morfología
(ya está arriba): explica qué SE SIGUE de ella.

REGLAS:
- Todo en español, salvo las palabras griegas.
- NO inventes sentidos que el lema no tiene: el pastor va a predicar con esto.
- La lista de salida tiene EXACTAMENTE ${input.tokens.length} palabras, en el mismo orden.

FORMATO DE SALIDA (JSON, sin texto alrededor):
{
  "literalTranslation": "…",
  "fluidTranslation": "…",
  "words": [
    { "text": "…", "semanticRange": "sentido A / sentido B", "syntacticFunction": "…", "translation": "…" }
  ],
  "keyInsights": [
    { "text": "…", "significance": "Por qué esta palabra importa al predicar este versículo." }
  ]
}`;
}
