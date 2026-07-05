import { describe, it, expect } from 'vitest';
import { RVR1960Repository } from '@dosfilos/infrastructure';
import { verifyAnchorVerse } from '../verifyAnchorVerse';

/**
 * ADR-036 — A/B eval: ¿cuánto ancla-mala produce el modelo CRUDO, y cuánto de eso
 * BLOQUEA nuestro gate?
 *
 * Misma tarea en los dos brazos:
 *   A (crudo): Sonnet suelto propone el verso que "refuta" la lectura errónea.
 *   B (nuestro): las anclas del crudo pasan por verifyAnchorVerse (existe?, det.)
 *                + adjudicación conservadora (refuta?). B solo acepta existe+yes.
 *
 * El número del pitch = de las anclas del crudo, qué % nuestro gate bloquea por
 * FABRICADA (verso no existe) o NO-REFUTA. Ese es el riesgo que eliminamos.
 *
 * Corre SOLO con ANTHROPIC_API_KEY (como el eval de PR3):
 *   ANTHROPIC_API_KEY=sk-... yarn workspace @dosfilos/application test -- anchorAbEval
 */

const MODEL = 'claude-sonnet-4-6';

async function askAnthropic(apiKey: string, system: string, prompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 512,
            temperature: 0.2,
            system,
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    const j = (await res.json()) as { content?: Array<{ text?: string }> };
    return j.content?.[0]?.text ?? '';
}

function parseJson(text: string): any {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) return {};
    try {
        return JSON.parse(cleaned.substring(first, last + 1));
    } catch {
        return {};
    }
}

// --- Brazo A: el modelo crudo propone el ancla (sin ninguna verificación) ---
async function rawArmAnchors(apiKey: string, passage: string, misreading: string): Promise<string[]> {
    const system =
        'Eres un asistente bíblico para pastores. Respondes SOLO con JSON válido, sin markdown.';
    const prompt = `Un pastor, leyendo ${passage}, afirma: "${misreading}".
Dame el o los versículos que REFUTAN esa lectura errónea.
Devuelve JSON EXACTO: { "verses": ["Libro Cap:Vers", ...] }
Usa referencias en español (RVR1960), formato "Juan 10:28-29".`;
    const raw = await askAnthropic(apiKey, system, prompt);
    const parsed = parseJson(raw);
    const verses = Array.isArray(parsed?.verses) ? parsed.verses.map((v: unknown) => String(v).trim()) : [];
    return verses.filter(Boolean).slice(0, 5);
}

// --- Gate B: adjudicación conservadora (misma que adjudicateRefutes) ---
const ADJUDICATOR_SYSTEM = `Eres un evaluador teológico riguroso. Tu ÚNICA tarea: dado una LECTURA ERRÓNEA (claim) y el TEXTO de un verso bíblico (ancla), juzgar si el verso REFUTA esa lectura.

Definiciones estrictas:
- refutes = "yes" SOLO si el texto del verso CONTRADICE o DESMIENTE directamente la lectura errónea.
- refutes = "no" si el verso NO toca la lectura, o solo MENCIONA el mismo tema sin contradecirla.
- refutes = "unclear" si refutar requiere inferencia larga, contexto externo, o el verso es ambiguo.

REGLA CONSERVADORA: ante cualquier duda, "unclear" o "no", NUNCA "yes".

Respondes SOLO con JSON válido.`;

async function adjudicate(apiKey: string, claim: string, ref: string, text: string): Promise<string> {
    const prompt = `Lectura errónea (claim): "${claim}"
Verso ancla: ${ref}
Texto del verso:
"""
${text}
"""
¿El TEXTO refuta directamente la lectura errónea?
Devuelve JSON: { "refutes": "yes" | "unclear" | "no" }`;
    const raw = await askAnthropic(apiKey, ADJUDICATOR_SYSTEM, prompt);
    const v = String(parseJson(raw)?.refutes ?? '').toLowerCase();
    return v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'unclear';
}

interface Pair {
    passage: string;
    misreading: string;
}

// Corpus: peligrosas (curadas) + varias no curadas / menos comunes (donde el
// crudo tiende más a fabricar). El punto NO es que la lectura sea curada, sino
// medir la referencia que el crudo inventa.
const CORPUS: Pair[] = [
    { passage: '2 Pedro 2:20-22', misreading: 'el creyente verdadero puede perder la salvación' },
    { passage: 'Santiago 2:24', misreading: 'somos justificados por nuestras obras, no solo por la fe' },
    { passage: 'Mateo 7:1', misreading: 'el cristiano no debe juzgar ni señalar el pecado de nadie' },
    { passage: '3 Juan 1:2', misreading: 'Dios quiere que todo creyente fiel sea próspero y rico' },
    { passage: 'Mateo 7:7', misreading: 'si pido cualquier cosa con fe, Dios está obligado a dármela' },
    { passage: 'Salmos 105:15', misreading: 'no se puede criticar ni cuestionar a un líder ungido' },
    { passage: 'Hechos 16:31', misreading: 'basta creer; el arrepentimiento no es necesario para ser salvo' },
    { passage: 'Isaías 53:5', misreading: 'siempre es la voluntad de Dios sanar toda enfermedad ahora' },
    { passage: 'Romanos 6:1', misreading: 'ya soy salvo, así que mi conducta no importa' },
    { passage: 'Éxodo 20:5', misreading: 'una maldición generacional me determina y no puedo cambiarla' },
    { passage: 'Colosenses 2:16', misreading: 'guardar el sábado sigue siendo obligatorio para el cristiano' },
    { passage: 'Eclesiastés 9:5', misreading: 'los muertos están conscientes y pueden comunicarse con los vivos' },
    { passage: 'Mateo 12:31', misreading: 'cualquier pecado grave que cometí ya no tiene perdón posible' },
    { passage: 'Juan 3:5', misreading: 'sin el bautismo en agua es imposible ser salvo' },
    { passage: 'Malaquías 3:10', misreading: 'si diezmo, Dios está obligado a prosperarme económicamente' },
];

describe.runIf(Boolean(process.env.ANTHROPIC_API_KEY))('ADR-036 A/B — ancla-mala del modelo crudo vs nuestro gate', () => {
    const apiKey = process.env.ANTHROPIC_API_KEY as string;
    const bible = new RVR1960Repository();

    it(`corre el A/B sobre ${CORPUS.length} pares y reporta la tabla`, async () => {
        const rows: Array<{ passage: string; verses: string; verdict: string }> = [];
        let fabricated = 0;
        let nonRefuting = 0;
        let good = 0;

        for (const pair of CORPUS) {
            const anchors = await rawArmAnchors(apiKey, pair.passage, pair.misreading);

            // Clasifica el par por su MEJOR ancla (como haría el gate B).
            let anyExists = false;
            let anyRefutes = false;
            for (const ref of anchors) {
                const v = verifyAnchorVerse(ref, bible);
                if (!v.exists) continue;
                anyExists = true;
                const refutes = await adjudicate(apiKey, pair.misreading, ref, v.text);
                if (refutes === 'yes') { anyRefutes = true; break; }
            }

            let verdict: string;
            if (anyRefutes) { verdict = 'GOOD'; good += 1; }
            else if (anyExists) { verdict = 'NO-REFUTA (bloqueada)'; nonRefuting += 1; }
            else { verdict = 'FABRICADA (bloqueada)'; fabricated += 1; }

            rows.push({ passage: pair.passage, verses: anchors.join(', ') || '(ninguna)', verdict });
        }

        const n = CORPUS.length;
        const blocked = fabricated + nonRefuting;
        // eslint-disable-next-line no-console
        console.log('\n===== A/B ANCLA-MALA (modelo crudo) =====');
        // eslint-disable-next-line no-console
        console.table(rows);
        // eslint-disable-next-line no-console
        console.log(
            `\nCRUDO sobre ${n} casos:` +
                `\n  FABRICADAS (verso no existe):     ${fabricated}/${n} (${Math.round((100 * fabricated) / n)}%)` +
                `\n  NO-REFUTAN (existe, no refuta):   ${nonRefuting}/${n} (${Math.round((100 * nonRefuting) / n)}%)` +
                `\n  BUENAS (existe + refuta):         ${good}/${n} (${Math.round((100 * good) / n)}%)` +
                `\n  --> NUESTRO GATE BLOQUEA:         ${blocked}/${n} (${Math.round((100 * blocked) / n)}%)` +
                `\n  (B fabrica 0 por construcción; ese ${Math.round((100 * blocked) / n)}% es el riesgo que eliminamos)\n`,
        );

        // El eval es descriptivo (mide al crudo). Sanity mínimo: corrió el corpus.
        expect(rows).toHaveLength(n);
    }, 60000 * CORPUS.length);
});
