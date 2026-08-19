import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GeminiLlmClient } from '../llm/GeminiLlmClient';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * ADR-035 — detector del perfil del pasaje (Capa 1), modo SHADOW.
 *
 * Callable fino que LEE el texto del pasaje y devuelve features CRUDAS:
 * movimientos + alusiones AT (taxonomía Hays) + lecturas erróneas frecuentes.
 * Es mecánico → `gemini-2.5-flash` (el juicio fino de engagement de CA1 va a un
 * tier más fuerte, en PR2). El ensamblado + la regla anti-alucinación (descartar
 * features sin ancla) viven en el dominio (`assemblePassageProfile`), no aquí.
 *
 * functions NO depende de `@dosfilos/domain`: la forma de salida espeja
 * `RawPassageProfile`/`DetectedFeature` de `packages/domain/src/entities/PassageProfile.ts`.
 * Mantener ambas en sync.
 */

// --- Forma de salida (espejo de domain/PassageProfile.ts) -------------------

interface RawMovement {
    reference: string;
    summary: string;
}

interface RawOtAllusion {
    typeKey: 'ot-allusion';
    hays: 'quotation' | 'allusion' | 'echo';
    verseRef: string;
    summary: string;
    anchor: { reference: string; note?: string };
}

interface RawCommonMisreading {
    typeKey: 'common-misreading';
    verseRef: string;
    claim: string;
    whyWrong: string;
    correctiveAnchor: Array<{ reference: string; note?: string }>;
}

interface RawIllustration {
    typeKey: 'illustration';
    verseRef: string;
    summary: string;
}

interface RawParallelism {
    typeKey: 'parallelism';
    verseRef: string;
    summary: string;
}

interface RawNamedEntity {
    typeKey: 'named-entity';
    verseRef: string;
    name: string;
    note?: string;
}

interface RawTextualCrux {
    typeKey: 'textual-crux';
    verseRef: string;
    summary: string;
}

type RawFeature =
    | RawOtAllusion
    | RawCommonMisreading
    | RawIllustration
    | RawParallelism
    | RawNamedEntity
    | RawTextualCrux;

interface RawProfile {
    passage: string;
    movements: RawMovement[];
    features: RawFeature[];
}

// --- Prompt -----------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un asistente de exégesis. Recibes un pasaje bíblico y su TEXTO, y devuelves un análisis ESTRUCTURADO de lo que el pasaje contiene para que un pastor no se le escape nada al estudiarlo. NO interpretas por él ni escribes su sermón: solo señalas datos verificables y lecturas erróneas conocidas. Respondes SOLO con JSON válido.`;

function buildPrompt(passage: string, passageText: string): string {
    return `Pasaje: ${passage}

Texto del pasaje:
"""
${passageText}
"""

Analiza el TEXTO y devuelve un objeto JSON con esta forma EXACTA:
{
  "passage": "${passage}",
  "movements": [ { "reference": "<rango, ej. '${passage}' o un sub-rango>", "summary": "<etiqueta breve del movimiento>" } ],
  "features": [
    // Alusiones/citas del AT embebidas en el texto. Usa la taxonomía de Hays:
    // 'quotation' (con fórmula tipo γέγραπται), 'allusion', 'echo'. SOLO incluye
    // una si puedes nombrar el pasaje fuente del AT (anchor.reference). Si no hay
    // fuente concreta, NO la incluyas.
    { "typeKey": "ot-allusion", "hays": "allusion", "verseRef": "<vers. del pasaje>", "summary": "<qué alude>", "anchor": { "reference": "<pasaje AT fuente>", "note": "<opcional>" } },
    // Lecturas erróneas frecuentes de este pasaje. SOLO incluye una si puedes dar
    // al menos un ancla correctiva verificable (un verso o cross-ref que la refute).
    { "typeKey": "common-misreading", "verseRef": "<vers.>", "claim": "<la lectura errónea>", "whyWrong": "<por qué es errónea, breve>", "correctiveAnchor": [ { "reference": "<verso/cross-ref que la refuta>" } ] },
    // Ilustraciones/metáforas DIRECTAS del texto (ej. "el perro que vuelve a su
    // vómito", "fuentes sin agua"). SOLO las que están explícitamente en el texto;
    // no inventes imágenes que no aparecen.
    { "typeKey": "illustration", "verseRef": "<vers. donde aparece>", "summary": "<la imagen tal cual la usa el texto>" },
    // Paralelismos poéticos (poesía/sabiduría): pares que dicen lo mismo con
    // palabras distintas, o quiasmos. SOLO si el texto es poético y el par está.
    { "typeKey": "parallelism", "verseRef": "<vers.>", "summary": "<el par, ej. 'delicados pastos // aguas de reposo'>" },
    // Personas/lugares nombrados que piden trasfondo histórico-cultural (ej.
    // Balaam, Sodoma). SOLO los nombrados explícitamente en el texto.
    { "typeKey": "named-entity", "verseRef": "<vers.>", "name": "<el nombre tal cual>", "note": "<por qué pide trasfondo, opcional>" },
    // Cruces/variantes textuales relevantes para la interpretación. SOLO si hay
    // una variante real conocida; no inventes crítica textual.
    { "typeKey": "textual-crux", "verseRef": "<vers.>", "summary": "<la variante y su efecto>" }
  ]
}

Reglas:
- Divide el pasaje en sus movimientos reales (1 si es corto; varios si es un argumento largo).
- NO inventes alusiones AT: si el texto no remite a un pasaje concreto del AT, deja "features" sin esa entrada.
- NO inventes lecturas erróneas: solo las recurrentes y peligrosas, y siempre con ancla correctiva.
- NO inventes ilustraciones, paralelismos, personas/lugares ni variantes: solo lo que el texto contiene explícitamente.
- Devuelve SOLO el JSON, sin texto adicional.`;
}

// --- Parsing + shaping ------------------------------------------------------

function safeParseJson(text: string): unknown {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) throw new Error('Respuesta del modelo sin JSON detectable.');
    return JSON.parse(cleaned.substring(first, last + 1));
}

function str(v: unknown): string {
    return String(v ?? '').trim();
}

function shapeMovement(raw: unknown): RawMovement | null {
    const r = raw as Record<string, unknown>;
    const reference = str(r?.reference);
    const summary = str(r?.summary);
    if (!reference || !summary) return null;
    return { reference, summary };
}

function shapeFeature(raw: unknown): RawFeature | null {
    const r = raw as Record<string, unknown>;
    if (r?.typeKey === 'ot-allusion') {
        const anchorRef = str((r.anchor as Record<string, unknown>)?.reference);
        const summary = str(r.summary);
        if (!anchorRef || !summary) return null; // anti-alucinación: sin fuente, fuera
        const hays = ['quotation', 'allusion', 'echo'].includes(String(r.hays)) ? (r.hays as RawOtAllusion['hays']) : 'allusion';
        return {
            typeKey: 'ot-allusion',
            hays,
            verseRef: str(r.verseRef),
            summary,
            anchor: { reference: anchorRef, note: str((r.anchor as Record<string, unknown>)?.note) || undefined },
        };
    }
    if (r?.typeKey === 'common-misreading') {
        const claim = str(r.claim);
        const anchors = Array.isArray(r.correctiveAnchor)
            ? r.correctiveAnchor.map((a) => ({ reference: str((a as Record<string, unknown>)?.reference) })).filter((a) => a.reference)
            : [];
        if (!claim || anchors.length === 0) return null; // anti-alucinación: sin ancla correctiva, fuera
        return {
            typeKey: 'common-misreading',
            verseRef: str(r.verseRef),
            claim,
            whyWrong: str(r.whyWrong),
            correctiveAnchor: anchors,
        };
    }
    if (r?.typeKey === 'illustration') {
        const summary = str(r.summary);
        const verseRef = str(r.verseRef);
        if (!summary || !verseRef) return null; // anti-alucinación: sin imagen+verso, fuera
        return { typeKey: 'illustration', verseRef, summary };
    }
    if (r?.typeKey === 'parallelism') {
        const summary = str(r.summary);
        const verseRef = str(r.verseRef);
        if (!summary || !verseRef) return null;
        return { typeKey: 'parallelism', verseRef, summary };
    }
    if (r?.typeKey === 'named-entity') {
        const name = str(r.name);
        const verseRef = str(r.verseRef);
        if (!name || !verseRef) return null;
        return { typeKey: 'named-entity', verseRef, name, note: str(r.note) || undefined };
    }
    if (r?.typeKey === 'textual-crux') {
        const summary = str(r.summary);
        const verseRef = str(r.verseRef);
        if (!summary || !verseRef) return null;
        return { typeKey: 'textual-crux', verseRef, summary };
    }
    return null;
}

// --- Callable ---------------------------------------------------------------

export const profilePassage = onCall(
    { ...appCheckCallableOptions(), secrets: ['GEMINI_API_KEY'], timeoutSeconds: 60 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }
        const data = request.data ?? {};
        const passage = str(data.passage);
        const passageText = str(data.passageText);
        if (!passage) throw new HttpsError('invalid-argument', 'passage is required');
        if (!passageText) throw new HttpsError('invalid-argument', 'passageText is required');

        // Vía el port: el adapter mide el consumo (tokens → USD) que antes se
        // perdía al llamar al SDK directo. Mismo modelo, misma config.
        const llm = new GeminiLlmClient(apiKey, 'gemini-2.5-flash', {
            feature: 'profilePassage',
            userId: request.auth?.uid,
        });

        try {
            const raw = await llm.generate({
                system: SYSTEM_PROMPT,
                prompt: buildPrompt(passage, passageText.slice(0, 12000)),
                responseMimeType: 'application/json',
                temperature: 0.2,
            });
            const parsed = safeParseJson(raw) as Record<string, unknown>;
            const movements = Array.isArray(parsed?.movements)
                ? parsed.movements.map(shapeMovement).filter((m): m is RawMovement => m !== null)
                : [];
            const features = Array.isArray(parsed?.features)
                ? parsed.features.map(shapeFeature).filter((f): f is RawFeature => f !== null)
                : [];
            const profile: RawProfile = { passage, movements, features };
            return { profile };
        } catch (err) {
            if (err instanceof HttpsError) throw err;
            console.error('[profilePassage] failed', err);
            throw new HttpsError('internal', err instanceof Error ? err.message : 'profilePassage failed');
        }
    },
);
