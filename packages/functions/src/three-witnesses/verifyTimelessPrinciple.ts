import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GeminiLlmClient } from '../llm/GeminiLlmClient';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { MODEL_FAST } from '../llm/modelCatalog';

/**
 * Pastoral Fidelity Phase 1.6 (ADR-023) — timeless-principle verifier.
 *
 * The principle (paso 7) is the Kaiser/Robinson bridge between exégesis
 * and homilética. The pastor writes it; this callable only VERIFIES it
 * (never generates it), referring back to the pastor's own steps 1-6:
 *
 *   - grounding: is the principle grounded in the pastor's study?
 *   - eisegesisRisk: does it read meaning INTO the text?
 *   - generalization: too abstract / too specific / well-calibrated?
 *
 * Single Flash call. Verifier, not generator — the prompt is forbidden
 * from proposing a "better" principle.
 */

const SYSTEM = `Eres un verificador del "principio teológico atemporal" en un mecanismo pastoral de fidelidad.

El pastor YA escribió su principio. Tu tarea NO es escribir uno mejor ni proponer alternativas — es VERIFICAR el suyo contra su propio estudio (pasos 1-6) y devolver un diagnóstico.

Evalúas tres cosas:
1. grounding: en 1-2 frases, cómo el principio se funda (o NO) en el estudio del pastor (oración principal, estudios de palabras, paralelos, función original). Español.
2. eisegesisRisk: "low" | "medium" | "high" — riesgo de que el principio lea significado HACIA el texto en vez de extraerlo.
3. generalization: "too-abstract" (tan general que podría ser de cualquier texto), "too-specific" (tan atado al detalle que no transfiere), "well-calibrated", o "unknown".

NUNCA propongas el principio "correcto". Solo diagnostica. Si todo está bien, dilo (eisegesisRisk="low", generalization="well-calibrated").`;

function safeParseJson(text: string): Record<string, unknown> {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) throw new Error('Respuesta sin JSON detectable.');
    return JSON.parse(cleaned.substring(first, last + 1));
}

export const verifyTimelessPrinciple = onCall(
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
        const passage = String(data.passage ?? '').trim();
        const principle = String(data.principle ?? '').trim();
        if (!passage || !principle) {
            throw new HttpsError('invalid-argument', 'passage y principle son requeridos.');
        }

        const centralIdea = String(data.centralIdea ?? '');
        const mainClauseNote = String(data.mainClauseNote ?? '');
        const originalAudienceFunction = String(data.originalAudienceFunction ?? '');
        const wordStudies: Array<{ word: string; discovery: string }> = Array.isArray(data.wordStudies)
            ? data.wordStudies.map((w: any) => ({ word: String(w?.word ?? ''), discovery: String(w?.discovery ?? '') }))
            : [];
        const parallels: Array<{ reference: string; note: string }> = Array.isArray(data.parallels)
            ? data.parallels.map((p: any) => ({ reference: String(p?.reference ?? ''), note: String(p?.note ?? '') }))
            : [];

        const studiesBlock = wordStudies.length
            ? wordStudies.map((w) => `- ${w.word}: ${w.discovery}`).join('\n')
            : '(sin estudios de palabras)';
        const parallelsBlock = parallels.length
            ? parallels.map((p) => `- ${p.reference}: ${p.note}`).join('\n')
            : '(sin paralelos)';

        const prompt = `Pasaje: ${passage}

Estudio del pastor (pasos 1-6):
- Oración principal (estructura): ${mainClauseNote || '(sin nota)'}
- Estudios de palabras:
${studiesBlock}
- Paralelos canónicos:
${parallelsBlock}
- Función para la audiencia original: ${originalAudienceFunction || '(sin nota)'}
- Idea central homilética (paso 8): ${centralIdea || '(aún no escrita)'}

Principio teológico atemporal a verificar (paso 7):
"${principle}"

Devuelve SIEMPRE JSON válido (sin Markdown):
{
  "grounding": "español, 1-2 frases",
  "eisegesisRisk": "low"|"medium"|"high",
  "generalization": "too-abstract"|"too-specific"|"well-calibrated"|"unknown",
  "notes": "español, 1 frase opcional; nunca propongas el principio correcto"
}`;

        try {
            // Vía el port: el adapter mide el consumo (tokens → USD) que antes se
            // perdía al llamar al SDK directo. Mismo modelo, misma config.
            const llm = new GeminiLlmClient(apiKey, MODEL_FAST, {
                feature: 'verifyTimelessPrinciple',
                userId: request.auth?.uid,
            });
            const raw = await llm.generate({
                system: SYSTEM,
                prompt,
                responseMimeType: 'application/json',
                temperature: 0.2,
            });
            const parsed = safeParseJson(raw);
            const risk = parsed.eisegesisRisk;
            const gen = parsed.generalization;
            return {
                grounding: String(parsed.grounding ?? ''),
                eisegesisRisk:
                    risk === 'high' || risk === 'medium' || risk === 'low' ? risk : 'low',
                generalization:
                    gen === 'too-abstract' || gen === 'too-specific' || gen === 'well-calibrated'
                        ? gen
                        : 'unknown',
                notes: String(parsed.notes ?? ''),
            };
        } catch (err) {
            console.error('[verifyTimelessPrinciple] gemini failed', err);
            throw new HttpsError('internal', err instanceof Error ? err.message : 'Principle verification failed');
        }
    },
);
