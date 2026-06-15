/**
 * Examen del corazón (manifiesto v1.3 §4 + §4.1). Corre en la cristalización,
 * sobre el MOTOR ÚNICO de testigos — colector nuevo + filtro previo, sin tocar
 * el motor. Esta capa es PURA: los verdicts del LLM (Cond 4 admisibilidad +
 * Cond 1/2/3 testigos reapuntados) los INYECTA el callable `examenCorazon`; aquí
 * se computa lo estructural (huérfanos, herencia) y se compone todo.
 *
 * REGLA DURA: el examen confronta SUSTANCIA, no presencia de campos. La traza
 * `conduccionCorazon` HABILITA el examen (da proposición, raíz y puente que
 * confrontar); no lo reemplaza. Tres estados distintos, NO colapsar:
 *   - reformular  (Cond 4: el afecto es emoción) → devolver a reformular C5, sin
 *                  objeción registrada; redirige ANTES de examinar.
 *   - hard-block  (huérfano: sin traza o proposición irresoluble; o raíz ausente
 *                  según los testigos) → no cristaliza.
 *   - soft-block  (raíz débil / puente dudoso) → advierte, objeción al historial.
 */

import {
    aggregateWitnessResult,
    canProceedFromWitnesses,
    escalateWitnessedClaim,
    type ProceedDecision,
    type WitnessResult,
    type WitnessVerdict,
} from '../entities/WitnessValidation';
import type { DoctrineLevel } from '../entities/Confession';
import type { ElementoEstudio } from './types';

// ── Colector: aplicacion:corazon → afecto claims (eje textual/temporal/raíz) ──

/**
 * Un afecto a examinar. La afección (C5) es el `text`; la traza C1–C4 viaja como
 * contexto para los testigos reapuntados (incluye el TEXTO de la proposición ya
 * resuelto, para que Cond 1 confronte la intención autoral, no solo el id).
 */
export interface AfectoClaim {
    /** Estable: el id del elemento `aplicacion:corazon`. */
    key: string;
    /** La afección, en las palabras del docente (C5). */
    afeccion: string;
    /** C1 — id del `idea_central` ancla. */
    proposicionElementoId: string;
    /** C1 — texto de esa proposición (resuelto), para confrontar la intención autoral. */
    proposicionText: string;
    /** C2. */
    caraAfectiva: string;
    /** C3 — raíz teocéntrica declarada. */
    raizTeocentrica: string;
    /** C4 — el puente a la congregación. */
    puenteCongregacion: string;
}

export interface CollectAfectoResult {
    /** Afectos examinables: con traza y proposición resoluble. */
    claims: AfectoClaim[];
    /**
     * Afectos HUÉRFANOS estructurales: `corazon` sin traza, o cuya proposición no
     * resuelve a un `idea_central` con contenido. No se pueden trazar → hard-block
     * sin necesidad de LLM.
     */
    huerfanos: string[];
}

/**
 * Mapea los `aplicacion:corazon` a afecto claims, resolviendo el texto de la
 * proposición desde `proposicionElementoId`. Separa los huérfanos estructurales
 * (sin traza o sin proposición válida): el manifiesto los confronta sin examen.
 */
export function collectAfectoClaims(elementos: ElementoEstudio[]): CollectAfectoResult {
    const ideaCentralPorId = new Map(
        elementos
            .filter((e) => e.tipo === 'idea_central' && e.contenido.trim().length > 0)
            .map((e) => [e.id, e.contenido.trim()]),
    );

    const claims: AfectoClaim[] = [];
    const huerfanos: string[] = [];
    for (const e of elementos) {
        if (!(e.tipo === 'aplicacion' && e.subtipo === 'corazon')) continue;
        if (e.contenido.trim().length === 0) continue; // sin afección formulada: nada que examinar
        const tr = e.conduccionCorazon;
        const proposicionText = tr ? ideaCentralPorId.get(tr.proposicionElementoId) : undefined;
        if (!tr || !proposicionText) {
            huerfanos.push(e.id);
            continue;
        }
        claims.push({
            key: e.id,
            afeccion: e.contenido.trim(),
            proposicionElementoId: tr.proposicionElementoId,
            proposicionText,
            caraAfectiva: tr.caraAfectiva,
            raizTeocentrica: tr.raizTeocentrica,
            puenteCongregacion: tr.puenteCongregacion,
        });
    }
    return { claims, huerfanos };
}

// ── Verdicts inyectados por el callable examenCorazon ───────────────────────

/**
 * Resultado del callable por afecto. Cond 4 (admisibilidad) es PREVIA y binaria:
 * `admisible:false` ⇒ emoción ⇒ reformular (no entra al motor). Para los
 * admisibles, `verdicts` trae las 3 confrontaciones reapuntadas (textual+guarda
 * de intención autoral / temporal / raíz) que el motor escala.
 */
export interface AfectoVerdicts {
    /** key del afecto (= id del `aplicacion:corazon`). */
    claimKey: string;
    /** Cond 4: ¿es una afección asentada? `false` = emoción → reformular. */
    admisible: boolean;
    /** Nivel doctrinal detectado por el testigo de raíz (confesión); null si no aplica. */
    detectedLevel: DoctrineLevel | null;
    /** Cond 1/2/3 reapuntadas (solo si `admisible`). */
    verdicts: WitnessVerdict[];
}

// ── Herencia: conducta ← corazón validado ───────────────────────────────────

export type RazonMoralismo =
    /** La conducta no declara de qué afecto se desprende. */
    | 'sin_vinculo'
    /** El vínculo no apunta a un `aplicacion:corazon`. */
    | 'vinculo_invalido'
    /** El afecto del que dice desprenderse aún no está validado por el examen. */
    | 'afecto_no_validado';

export interface ConductaMoralismo {
    /** id del `aplicacion:conducta`. */
    id: string;
    razon: RazonMoralismo;
}

/**
 * Confronta la herencia (manifiesto §3.3): cada `aplicacion:conducta` debe
 * DECLARAR el `aplicacion:corazon` validado del que se desprende. MVP estructural:
 * verifica la declaración del vínculo y el estado del afecto enlazado, NO la
 * sustancia ("¿es esta conducta este afecto en movimiento?" = testigo LLM, deuda
 * v1). El mensaje no afirma más de lo que verifica.
 */
export function evaluarHerenciaConducta(
    elementos: ElementoEstudio[],
    afectosValidados: ReadonlySet<string>,
): ConductaMoralismo[] {
    const corazonIds = new Set(
        elementos.filter((e) => e.tipo === 'aplicacion' && e.subtipo === 'corazon').map((e) => e.id),
    );
    const moralismo: ConductaMoralismo[] = [];
    for (const e of elementos) {
        if (!(e.tipo === 'aplicacion' && e.subtipo === 'conducta')) continue;
        if (e.contenido.trim().length === 0) continue;
        const link = e.derivaDeElementoId;
        if (!link) {
            moralismo.push({ id: e.id, razon: 'sin_vinculo' });
        } else if (!corazonIds.has(link)) {
            moralismo.push({ id: e.id, razon: 'vinculo_invalido' });
        } else if (!afectosValidados.has(link)) {
            moralismo.push({ id: e.id, razon: 'afecto_no_validado' });
        }
    }
    return moralismo;
}

// ── Composición del examen del corazón ──────────────────────────────────────

export interface ExamenCorazonResult {
    /** Cond 4: afectos que son emoción → devolver a reformular C5 (NO objeción). */
    reformular: string[];
    /** Huérfanos estructurales (sin traza/proposición) → hard-block. */
    huerfanos: string[];
    /** Afectos con traza pero sin verdict inyectado aún (examen no corrido). */
    sinExaminar: string[];
    /** Testigos reapuntados sobre los afectos admisibles (forma reusada del motor). */
    testigos: WitnessResult | null;
    proceed: ProceedDecision | null;
    /** Conductas que no declaran/validan su vínculo a un afecto (moralismo). */
    herencia: ConductaMoralismo[];
    /** Afectos que pasaron el examen (admisibles + testigos sin pendientes/bloqueo). */
    validados: string[];
}

export interface ExamenCorazonInput {
    elementos: ElementoEstudio[];
    /** Verdicts del callable por afecto. Ausente ⇒ el examen aún no se corrió. */
    afectoVerdicts?: AfectoVerdicts[] | null;
    /** Respuestas del docente a los soft/hard-block de afectos. */
    resolutions?: ReadonlyArray<{ claimKey: string; response: string }>;
    estudioId: string;
}

/**
 * Compone el examen del corazón: filtro de admisibilidad (Cond 4) + testigos
 * reapuntados (Cond 1/2/3) sobre el motor único + herencia. Devuelve los tres
 * estados por separado para que el orquestador y la UI no los colapsen.
 */
export function evaluarExamenCorazon(input: ExamenCorazonInput): ExamenCorazonResult {
    const { elementos, afectoVerdicts, resolutions = [], estudioId } = input;
    const { claims, huerfanos } = collectAfectoClaims(elementos);
    const porKey = new Map((afectoVerdicts ?? []).map((v) => [v.claimKey, v]));

    const reformular: string[] = [];
    const sinExaminar: string[] = [];
    const escalados = [];
    for (const c of claims) {
        const v = porKey.get(c.key);
        if (!v) {
            sinExaminar.push(c.key);
            continue;
        }
        if (!v.admisible) {
            reformular.push(c.key);
            continue;
        }
        escalados.push(
            escalateWitnessedClaim({
                key: c.key,
                kind: 'afecto',
                text: c.afeccion,
                detectedLevel: v.detectedLevel,
                verdicts: v.verdicts,
            }),
        );
    }

    const testigos =
        escalados.length > 0
            ? aggregateWitnessResult({
                  seedId: estudioId,
                  sermonId: estudioId,
                  claims: escalados,
                  confessionalWitnessesEnabled: true,
              })
            : null;
    const proceed = testigos ? canProceedFromWitnesses(testigos, resolutions) : null;

    // Validado = admisible + examinado + sin pendiente de respuesta y sin bloqueo
    // absoluto. (No afirma sustancia; solo que pasó las confrontaciones.)
    const conflictivos = new Set<string>(proceed ? proceed.pendingKeys : []);
    if (testigos) {
        for (const c of testigos.claims) {
            if (c.escalation === 'absolute-block') conflictivos.add(c.key);
        }
    }
    const validados = escalados.map((c) => c.key).filter((k) => !conflictivos.has(k));

    const herencia = evaluarHerenciaConducta(elementos, new Set(validados));

    return { reformular, huerfanos, sinExaminar, testigos, proceed, herencia, validados };
}
