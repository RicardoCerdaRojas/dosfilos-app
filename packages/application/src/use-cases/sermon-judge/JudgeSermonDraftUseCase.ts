import {
    composeJudgeRubric,
    evaluateCompliance,
    type AdjudicacionCriterio,
    type AdjudicacionDescalificador,
    type Adjudicaciones,
    type ApproachType,
    type ILlmClient,
    type JudgeRubric,
    type LiteraryGenre,
    type Veredicto,
} from '@dosfilos/domain';
import type { DraftShadowSignal } from '../exegesis/sermonDraftSignals';
import { judgeVerdictSignals } from './judgeDraftSignals';

/**
 * Redacción v2 §8.1/§8.5 — el juez de fidelidad homilética, EN SOMBRA.
 *
 * MIDE, NO CONFRONTA. Nada de lo que devuelve se le muestra al pastor todavía.
 * La confrontación se enciende cuando los datos muestren que adjudica bien.
 *
 * EL LLM ADJUDICA CONTRA UNA VARA ESTRUCTURADA, NO EMITE JUICIO LIBRE
 * (disciplina 036). Recibe los criterios y descalificadores con sus ids y solo
 * puede responder `yes|unclear|no` y `disparado|no-disparado|unclear` sobre
 * ESOS. Todo lo que no reconozca se descarta; todo lo que falte queda `unclear`,
 * que va a cola de revisión y NO infla la tasa de falla.
 *
 * LA VARA SE COMPONE EN EL CLIENTE, no en el servidor: `packages/functions` no
 * depende de `@dosfilos/domain` (decoupling intencional; importarlo revienta el
 * build), así que los catálogos no existen allá. El servidor solo presta el
 * modelo. Mismo reparto que la vara de suficiencia estructural: el veredicto se
 * calcula de este lado, el callable solo ejecuta y registra.
 */

export interface JudgeSermonDraftInput {
    sermonId: string;
    passage?: string;
    approach: ApproachType;
    /** Del `PassageProfile`. Sin género, la vara corre sin piso de género. */
    genre?: LiteraryGenre;
    draftText: string;
}

export interface JudgeSermonDraftResult {
    rubric: JudgeRubric;
    veredicto: Veredicto;
    signals: DraftShadowSignal[];
}

/** Puerta al recorder de sombra. Se inyecta para poder testear sin Firebase. */
export interface IDraftShadowRecorder {
    record(args: {
        sermonId: string;
        passage?: string;
        approachType?: string;
        collector: 'deterministic' | 'judged';
        signals: DraftShadowSignal[];
    }): Promise<void>;
}

const CRITERIO_VALUES: readonly AdjudicacionCriterio[] = ['yes', 'unclear', 'no'];
const DESC_VALUES: readonly AdjudicacionDescalificador[] = ['disparado', 'no-disparado', 'unclear'];

function buildPrompt(rubric: JudgeRubric, draftText: string): string {
    const criterios = rubric.criterios
        .map(c => `- ${c.id} [${c.severidad}]: ${c.text}`)
        .join('\n');
    const descalificadores = rubric.descalificadores
        .map(d => `- ${d.claveVara}: ${d.text}`)
        .join('\n');

    return `SERMÓN A EVALUAR (forma homilética: ${rubric.approach}${rubric.genre ? `; género del pasaje: ${rubric.genre}` : ''}):

${draftText}

---

CRITERIOS DE CUMPLIMIENTO — adjudica cada uno como "yes", "unclear" o "no":
${criterios}

DESCALIFICADORES — adjudica cada uno como "disparado", "no-disparado" o "unclear":
${descalificadores}`;
}

const SYSTEM = `Eres el juez de fidelidad homilética de Preach. Adjudicas un sermón CONTRA una vara explícita que se te entrega. No opinas fuera de ella.

Reglas inviolables:
- Adjudicas SOLO los ids que se te dan. No inventes criterios ni descalificadores.
- Si no puedes decidir con lo que el sermón dice, responde "unclear". Es una respuesta legítima y preferible a adivinar: lo dudoso va a revisión humana.
- NO te metes en interpretaciones doctrinales legítimamente abiertas entre tradiciones fieles. Eso no es infidelidad.
- Un descalificador "disparado" exige evidencia en el TEXTO del sermón, no una sospecha.

Devuelves SIEMPRE JSON válido, sin Markdown:
{
  "criterios": { "C1": "yes" | "unclear" | "no", ... },
  "descalificadores": { "global:G1": "disparado" | "no-disparado" | "unclear", ... }
}`;

/**
 * Parseo FAIL-CLOSED: lo que no se reconoce no entra. Un id desconocido se
 * descarta (el modelo no puede ampliar la vara) y un valor fuera del enum se
 * ignora, con lo que ese criterio queda ausente → `unclear` aguas abajo.
 */
function parseAdjudicaciones(raw: string, rubric: JudgeRubric): Adjudicaciones {
    const criterios: Record<string, AdjudicacionCriterio> = {};
    const descalificadores: Record<string, AdjudicacionDescalificador> = {};

    let parsed: unknown;
    try {
        // `fenced[1]` es opcional bajo noUncheckedIndexedAccess: si el fence
        // existe pero no capturó, se cae al texto crudo en vez de a `undefined`.
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        parsed = JSON.parse((fenced?.[1] ?? raw).trim());
    } catch {
        // Respuesta ilegible: TODO queda unclear. El veredicto saldrá
        // indeterminado, que es la verdad, en vez de un falso "limpio".
        return { criterios, descalificadores };
    }
    if (!parsed || typeof parsed !== 'object') return { criterios, descalificadores };

    const obj = parsed as { criterios?: unknown; descalificadores?: unknown };
    const idsCriterio = new Set(rubric.criterios.map(c => c.id));
    const idsDesc = new Set(rubric.descalificadores.map(d => d.claveVara));

    if (obj.criterios && typeof obj.criterios === 'object') {
        for (const [k, v] of Object.entries(obj.criterios as Record<string, unknown>)) {
            if (!idsCriterio.has(k)) continue;
            if (CRITERIO_VALUES.includes(v as AdjudicacionCriterio)) {
                criterios[k] = v as AdjudicacionCriterio;
            }
        }
    }
    if (obj.descalificadores && typeof obj.descalificadores === 'object') {
        for (const [k, v] of Object.entries(obj.descalificadores as Record<string, unknown>)) {
            if (!idsDesc.has(k)) continue;
            if (DESC_VALUES.includes(v as AdjudicacionDescalificador)) {
                descalificadores[k] = v as AdjudicacionDescalificador;
            }
        }
    }
    return { criterios, descalificadores };
}

export class JudgeSermonDraftUseCase {
    constructor(
        private readonly llm: ILlmClient,
        private readonly recorder?: IDraftShadowRecorder,
    ) {}

    async execute(input: JudgeSermonDraftInput): Promise<JudgeSermonDraftResult> {
        const rubric = composeJudgeRubric(input.approach, input.genre);

        let raw = '';
        try {
            raw = await this.llm.generate({
                system: SYSTEM,
                prompt: buildPrompt(rubric, input.draftText),
                temperature: 0.2,
                responseMimeType: 'application/json',
            });
        } catch {
            // El juez es caro y probabilístico; su caída NO puede tumbar nada.
            // Sin respuesta, todo queda unclear y el veredicto sale
            // indeterminado — se mide que no se pudo medir.
            raw = '';
        }

        const adj = parseAdjudicaciones(raw, rubric);
        const veredicto = evaluateCompliance(rubric, adj);
        const signals = judgeVerdictSignals(rubric, veredicto, adj);

        if (this.recorder) {
            // Fire-and-forget: registrar la sombra nunca debe romper el flujo
            // del pastor ni contaminar al colector determinista.
            try {
                await this.recorder.record({
                    sermonId: input.sermonId,
                    ...(input.passage ? { passage: input.passage } : {}),
                    approachType: input.approach,
                    collector: 'judged',
                    signals,
                });
            } catch {
                // silencio deliberado
            }
        }

        return { rubric, veredicto, signals };
    }
}
