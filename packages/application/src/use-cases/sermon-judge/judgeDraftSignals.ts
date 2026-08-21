import type {
    Adjudicaciones,
    DescalificadorEnVara,
    JudgeRubric,
    Veredicto,
} from '@dosfilos/domain';
import type { DraftShadowSignal } from '../exegesis/sermonDraftSignals';

/**
 * Redacción v2 §8.5 — el veredicto del juez homilético, traducido a señales de
 * sombra.
 *
 * SHADOW PRIMERO, DISCIPLINA INNEGOCIABLE: el juez arranca MIDIENDO, no
 * confrontando. Nada de lo que sale de acá se le muestra al pastor todavía; la
 * confrontación se enciende cuando los datos muestren que adjudica bien. Se
 * cierra el círculo: la instrumentación construida para auditar el generador
 * viejo es la que mide —y después gobierna— al juez nuevo.
 *
 * Emite al MISMO recorder que el colector determinista bajo el mismo contrato,
 * pero con `kind: 'judged'`: son colectores AISLADOS. El determinista es barato
 * y confiable y corre siempre; este es caro, muestreado, y su caída nunca debe
 * afectar al otro.
 */

/** Prefijo estable para que las señales del juez se agreguen por separado. */
const P = 'judge';

function verdictOf(d: DescalificadorEnVara, adj: Adjudicaciones): 'yes' | 'unclear' | 'no' {
    const v = adj.descalificadores[d.claveVara] ?? 'unclear';
    // `yes` = disparó. Se lee como "¿se cumplió esta condición de falla?", que es
    // la pregunta que el contrato `DraftShadowSignal.verdict` sabe expresar.
    if (v === 'disparado') return 'yes';
    if (v === 'no-disparado') return 'no';
    return 'unclear';
}

/**
 * Una señal por descalificador de la vara y por criterio, más los agregados.
 *
 * Se emite la vara COMPLETA, no solo lo que disparó: saber que un descalificador
 * corrió y NO disparó es dato, y sin él no se puede distinguir "no pasó" de "no
 * se midió". Esa distinción es la que permite calibrar después.
 */
export function judgeVerdictSignals(
    rubric: JudgeRubric,
    veredicto: Veredicto,
    adj: Adjudicaciones,
): DraftShadowSignal[] {
    const signals: DraftShadowSignal[] = [];

    for (const d of rubric.descalificadores) {
        signals.push({
            key: `${P}.disqualifier.${d.claveVara}`,
            kind: 'judged',
            value: d.resuelto.severidad,
            verdict: verdictOf(d, adj),
            // Marca de honestidad: la severidad salió de un default, no de una
            // decisión sellada del fundador. Sin esto, al calibrar se leería como
            // vara firme y no lo es.
            ...(d.resuelto.pendienteDeSellado ? { proxy: true } : {}),
        });
    }

    for (const c of rubric.criterios) {
        signals.push({
            key: `${P}.criterion.${rubric.approach}.${c.id}`,
            kind: 'judged',
            value: c.severidad,
            verdict: adj.criterios[c.id] ?? 'unclear',
        });
    }

    signals.push(
        { key: `${P}.estado`, kind: 'judged', value: veredicto.estado },
        { key: `${P}.cumple`, kind: 'judged', value: veredicto.cumple },
        // INDETERMINADO viaja aparte de `cumple` a propósito: un veredicto que no
        // se pudo decidir NO es un incumplimiento, y fundirlos inflaría la tasa
        // de falla — justo lo que §8.4 prohíbe.
        { key: `${P}.indeterminado`, kind: 'judged', value: veredicto.indeterminado },
        { key: `${P}.colaDeRevision`, kind: 'judged', value: veredicto.colaDeRevision.length },
        { key: `${P}.genero`, kind: 'judged', value: rubric.genre ?? 'sin-genero' },
    );

    return signals;
}
