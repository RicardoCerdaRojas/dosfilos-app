/**
 * Paso 8 (Insight) ESTRUCTURADO — submit directo desde el formulario, sin pasar
 * por texto + re-parseo ni por el LLM. El Insight es AI-forbidden de generación:
 * el agente solo valida estructura + longitud, así que aquí validamos
 * DETERMINISTAMENTE (`validateInsight`) sobre los campos del formulario y, si
 * pasa, persistimos estructurado + avanzamos la sesión + afirmamos con un
 * mensaje templado. Más robusto que el round-trip por texto del chat (que era
 * frágil ante contenido que rompía el patrón del parser).
 *
 * Reusa la fuente única de verdad: `completed` se computa con
 * `evaluatePastoralSeed`, NO se hardcodea.
 */

import {
    advance,
    evaluatePastoralSeed,
    validateInsight,
    buildCoverageContract,
    buildCoverageStepTexts,
    computeCoverageSummary,
    type AIChatMessage,
    type CoverageReport,
    type IAIChatRepository,
    type InsightStepData,
    type IPastoralSeedRepository,
} from '@dosfilos/domain';

function genId(prefix: string): string {
    try {
        return `${prefix}_${crypto.randomUUID()}`;
    } catch {
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    }
}

export interface SubmitGuidedInsightInput {
    userId: string;
    sessionId: string;
    /** Campos estructurados del formulario (los escribe el pastor). */
    insight: {
        centralIdea: string;
        observations: string[];
        openQuestion: string;
        pastoralAnecdote: string;
        doxologicalApplication: string;
    };
    /** Texto rendereado del insight para el transcript (mensaje del pastor). */
    renderedInsightText: string;
    /** Afirmación templada (locale-aware, la compone el cliente). */
    affirmationText: string;
    /** ADR-035 enforce (E) — gatea el colector de cobertura al cierre. */
    enforceCoverage?: boolean;
}

export interface SubmitGuidedInsightResult {
    accepted: boolean;
    /** Razones de `validateInsight` cuando no pasa (el form las muestra). */
    reasons: string[];
    sermonReady: boolean;
    /**
     * ADR-035 E — colector de cobertura al CIERRE real del estudio (insight es el
     * último paso). Presente solo al completar + enforce + perfil. Si quedó un
     * must-touch sin tratar (`gateStatus: 'soft-block'`), el web nudgea. No bloquea.
     */
    coverageReport?: CoverageReport;
}

export class SubmitGuidedInsightUseCase {
    constructor(
        private readonly chatRepo: IAIChatRepository,
        private readonly seedRepo: IPastoralSeedRepository,
    ) {}

    async execute(input: SubmitGuidedInsightInput): Promise<SubmitGuidedInsightResult> {
        const session = await this.chatRepo.getSession(input.userId, input.sessionId);
        const gss = session?.guidedSermonSession;
        if (!gss) throw new Error('No hay sesión de sermón guiado activa.');
        if (gss.currentStep !== 'insight') {
            throw new Error(`El paso actual no es Insight (es "${gss.currentStep}").`);
        }
        const seed = await this.seedRepo.getById(gss.seedId);
        if (!seed) throw new Error('Semilla no encontrada.');

        const insightData: InsightStepData = {
            centralIdea: input.insight.centralIdea.trim(),
            observations: input.insight.observations.map((o) => o.trim()).filter(Boolean),
            openQuestion: input.insight.openQuestion.trim(),
            pastoralAnecdote: input.insight.pastoralAnecdote.trim(),
            doxologicalApplication: input.insight.doxologicalApplication.trim(),
            pasteEvents: seed.insight?.pasteEvents ?? [],
            timeSpentSeconds: seed.insight?.timeSpentSeconds ?? 0,
        };

        const validation = validateInsight(insightData);
        if (!validation.valid) {
            return { accepted: false, reasons: validation.reasons, sermonReady: false };
        }

        // Persistir estructurado + `completed` desde los 8 validadores (fuente única).
        const merged = { ...seed, insight: insightData };
        const completed = evaluatePastoralSeed(merged).completed;
        const now = new Date();
        await this.seedRepo.update(seed.id, {
            insight: { ...insightData, completedAt: now },
            completed,
            ...(completed ? { completedAt: now } : {}),
        });

        // Avanzar la sesión (insight es el último paso → status 'completed').
        const nextState = advance(gss);
        await this.chatRepo.updateGuidedSermonSession(input.userId, input.sessionId, nextState);
        const sermonReady = nextState.status === 'completed' && completed;

        // Transcript: mensaje del pastor (estructurado, rendereado) + afirmación.
        const pastorMessage: AIChatMessage = {
            id: genId('msg'),
            role: 'user',
            content: input.renderedInsightText,
            timestamp: now,
        };
        await this.chatRepo.addMessageToSession(input.userId, input.sessionId, pastorMessage);
        const agentMessage: AIChatMessage = {
            id: genId('msg'),
            role: 'model',
            content: input.affirmationText,
            timestamp: new Date(),
        };
        await this.chatRepo.addMessageToSession(input.userId, input.sessionId, agentMessage);

        await this.seedRepo.appendAiAssistLog(seed.id, {
            userId: input.userId,
            stepKey: 'insight',
            assistType: 'socraticGuidance',
            outputWasEditedByUser: false,
        });

        // ADR-035 E — colector de cobertura al cierre (red de seguridad sobre el
        // Motor B). Solo al completar + enforce + perfil. soft-block ⇒ el web
        // nudgea los must-touch sin tratar; no bloquea (D1).
        let coverageReport: CoverageReport | undefined;
        if (nextState.status === 'completed' && input.enforceCoverage && merged.passageProfile) {
            coverageReport = computeCoverageSummary(
                buildCoverageContract(merged.passageProfile),
                buildCoverageStepTexts(merged),
            );
        }

        return { accepted: true, reasons: [], sermonReady, ...(coverageReport ? { coverageReport } : {}) };
    }
}
