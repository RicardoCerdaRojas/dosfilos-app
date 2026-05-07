/**
 * Prompt scaffolding for the source-type classifier. Kept small +
 * deterministic — the goal is fast, accurate single-label
 * classification, not extended reasoning.
 */

const ES_INSTRUCTION = `Eres un clasificador académico de bibliografía bíblica. Recibes el comienzo de un documento (título, autor, primeras páginas) y decides qué TIPO académico de fuente es, eligiendo UNO de:

- biblical-text-edition: edición crítica del texto bíblico (NA28, BHS, Rahlfs LXX).
- critical-apparatus: aparato crítico textual (variantes, testigos manuscritos).
- lexicon-technical: léxico técnico de palabras (BDAG, HALOT, LSJ, Tuggy).
- theological-dictionary: diccionario teológico multivolumen (TDNT/Kittel, NIDNTTE/NIDOTTE, EDNT).
- grammar-syntax: gramática del griego/hebreo bíblico (BDF, Wallace, Robertson).
- commentary-critical: comentario crítico técnico (WBC, NIGTC, ICC, Hermeneia, Anchor Yale).
- commentary-expository: comentario expositivo de nivel medio (NICNT/NICOT, BECNT, Pillar, Tyndale, NIVAC).
- historical-background: trasfondo histórico-cultural (deSilva, Sanders, Keener Backgrounds, ABD).
- theological-monograph: monografía académica enfocada en un tema teológico.
- journal-article: artículo en revista académica peer-review.
- primary-source-ancient: fuente primaria antigua (Josefo, Filón, Padres Apostólicos, OTP).
- style-template-paper: trabajo modelo del seminario usado solo como plantilla de estilo.
- other: no encaja en ninguna de las anteriores.

Responde SOLO en JSON con: sourceType, confidence (high/medium/low), reasoning (una frase corta en español).

Reglas:
- Confianza alta = título + tipo de contenido coinciden inequívocamente con la categoría.
- Confianza media = el contenido sugiere la categoría pero el título es ambiguo (o viceversa).
- Confianza baja = solo tienes pistas indirectas; el alumno DEBE confirmar.
- Nunca inventes una categoría fuera de la lista. Si no encaja claramente en una, usa 'other'.`;

const EN_INSTRUCTION = `You are an academic bibliography classifier for biblical-studies sources. You receive the beginning of a document (title, author, first pages) and pick ONE academic TYPE:

- biblical-text-edition: critical edition of the biblical text (NA28, BHS, Rahlfs LXX).
- critical-apparatus: textual-critical apparatus (variants, manuscript witnesses).
- lexicon-technical: technical word lexicon (BDAG, HALOT, LSJ).
- theological-dictionary: multivolume theological dictionary (TDNT/Kittel, NIDNTTE/NIDOTTE, EDNT).
- grammar-syntax: biblical Greek/Hebrew grammar (BDF, Wallace, Robertson).
- commentary-critical: critical / technical commentary (WBC, NIGTC, ICC, Hermeneia, Anchor Yale).
- commentary-expository: mid-level expository commentary (NICNT/NICOT, BECNT, Pillar, Tyndale, NIVAC).
- historical-background: historical-cultural background (deSilva, Sanders, Keener Backgrounds, ABD).
- theological-monograph: focused theological monograph.
- journal-article: peer-reviewed journal article.
- primary-source-ancient: ancient primary source (Josephus, Philo, Apostolic Fathers, OTP).
- style-template-paper: a sample paper used solely as a style template.
- other: fits none of the above.

Respond JSON-only with: sourceType, confidence (high/medium/low), reasoning (one short English sentence).

Rules:
- High confidence = title + content unambiguously match the category.
- Medium = content suggests the category but the title is ambiguous (or vice versa).
- Low = only indirect signals; the student MUST confirm.
- Never invent a type outside the list. When unsure, return 'other'.`;

export interface ClassifierPromptInput {
    rawText: string;
    title?: string | null;
    author?: string | null;
    language: 'es' | 'en';
}

export function buildClassifierPrompt(input: ClassifierPromptInput): {
    systemInstruction: string;
    userMessage: string;
} {
    const systemInstruction = input.language === 'en' ? EN_INSTRUCTION : ES_INSTRUCTION;
    const titleLine = input.title ? `Título: ${input.title}` : 'Título: (sin metadato)';
    const authorLine = input.author ? `Autor: ${input.author}` : 'Autor: (sin metadato)';
    const userMessage = [
        titleLine,
        authorLine,
        '',
        'Primeras páginas:',
        '"""',
        input.rawText,
        '"""',
    ].join('\n');
    return { systemInstruction, userMessage };
}
