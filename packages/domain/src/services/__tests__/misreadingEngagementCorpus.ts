/**
 * ADR-035 CA3 — corpus dorado de ENGAGEMENT (fila A/B/C/D) para el confront de
 * `common-misreading`. Caso 2 Pe 2:22, ancla = v.22 ("la naturaleza nunca
 * cambió") + Juan 10:28-29.
 *
 * Doble rol:
 *  1. `judgment` + `expected*` → contrato de la decisión PURA (`decideMisreadingTurn`),
 *     corre en CI.
 *  2. `pastorMessage` → prosa contra la que el detector LLM (tier Sonnet, PR2
 *     functions) se mide en el shadow (Corte 2): falsos re-confront ≤10 %. La
 *     fila D es la que prueba que juzga engagement y no corrección.
 */

import type { MisreadingJudgment, MisreadingTurnOutcome } from '../misreadingTurn';

export interface EngagementCase {
    row: 'A' | 'B' | 'C' | 'D-1' | 'D-final';
    name: string;
    pastorMessage: string;
    /** Lo que el detector LLM DEBERÍA producir para esta prosa. */
    judgment: MisreadingJudgment;
    attemptIndex: number;
    cap: number;
    expectedOutcome: MisreadingTurnOutcome;
}

export const MISREADING_ENGAGEMENT_CORPUS: readonly EngagementCase[] = [
    {
        row: 'A',
        name: 'enganchó el ancla, NO contradice (postura coherente con la tensión)',
        pastorMessage:
            'Trabajé v.22 y Juan 10:28-29: la naturaleza del perro nunca cambió, así que leo esto como advertencia a falsos maestros que nunca fueron regenerados, aunque reconozco la tensión de "habían escapado".',
        judgment: { substantive: true, engagedAnchor: true, contradictsAnchor: false },
        attemptIndex: 0,
        cap: 1,
        expectedOutcome: 'accept',
    },
    {
        row: 'B',
        name: 'IGNORÓ el ancla (conclusión sin tocar v.22/Jn10)',
        pastorMessage: 'Sí, se pierde la salvación, el texto lo dice claramente.',
        judgment: { substantive: true, engagedAnchor: false, contradictsAnchor: true },
        attemptIndex: 0,
        cap: 1,
        expectedOutcome: 're-confront',
    },
    {
        row: 'C',
        name: 'sin sustancia',
        pastorMessage: 'es complicado',
        judgment: { substantive: false, engagedAnchor: false, contradictsAnchor: false },
        attemptIndex: 0,
        cap: 1,
        expectedOutcome: 'gate-minimo',
    },
    {
        row: 'D-1',
        name: 'enganchó a fondo PERO contradice — primera ronda',
        pastorMessage:
            'Cité y razoné v.22 y Juan 10:28-29 a fondo, y aun así concluyo que sí se puede perder la salvación porque "habían escapado de las contaminaciones".',
        judgment: { substantive: true, engagedAnchor: true, contradictsAnchor: true },
        attemptIndex: 0,
        cap: 1,
        expectedOutcome: 're-confront',
    },
    {
        row: 'D-final',
        name: 'enganchó a fondo, contradice, sostiene tras el tope → override floor ACEPTA',
        pastorMessage:
            'Insisto: trabajé el ancla pero mantengo mi lectura de que se puede perder la salvación.',
        judgment: { substantive: true, engagedAnchor: true, contradictsAnchor: true },
        attemptIndex: 1,
        cap: 1,
        expectedOutcome: 'accept-override',
    },
];
