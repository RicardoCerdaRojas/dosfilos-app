import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * ADR-035 / Redacción v2 — fachada única del recorder de sombra de la fase de
 * ESTUDIO (`passageProfileShadow/`). Hermana de `SermonDraftShadowService`, que
 * recoge las señales de la fase de DRAFT; los dos colectores están aislados por
 * fase y NUNCA se cruzan.
 *
 * Existe por dos razones:
 * 1. Mantiene el SDK de firebase fuera de `web/src` (compliance C7.3).
 * 2. Es la ÚNICA puerta al callable. Antes cada superficie llamaba
 *    `httpsCallable('recordPassageProfileShadow')` por su cuenta, y la segunda
 *    superficie del spine de 8 pasos (el wizard) simplemente no llamaba a nadie:
 *    su estudio no dejaba ninguna fila de sombra. Una puerta, dos spines.
 *
 * Cada señal viaja como sibling con su propio `signalType` — no se mezclan.
 */

export interface StructuralSufficiencyShadowArgs {
    seedId: string;
    passage: string;
    /** El género contra el que se calificó la vara. */
    qualifiedGenre: string;
    /** Cómo llegó ese género: aiProposed | userConfirmed | userOverride. */
    provenance: string;
    /** Veredicto determinista de la vara (sin LLM). */
    verdict: string;
    /** Género destino del override, si el pastor corrigió en el paso 2. */
    overrideTargetGenre?: string | null;
}

export interface GenreOverrideShadowArgs {
    seedId: string;
    passage: string;
    proposedGenre: string;
    criteria?: string;
    verdict: string;
    sustained: boolean;
}

export class PassageProfileShadowService {
    private call(payload: Record<string, unknown>): Promise<unknown> {
        const fn = httpsCallable(getFunctions(), 'recordPassageProfileShadow');
        return fn(payload);
    }

    /** Perfil del pasaje (Capa 1, ADR-035) + cortes de fidelidad del ancla (036). */
    async recordProfile(payload: Record<string, unknown>): Promise<void> {
        await this.call(payload);
    }

    /** Redacción v2 §4.4 — veredicto del juez de engagement de género (paso 2). */
    async recordGenreOverride(args: GenreOverrideShadowArgs): Promise<void> {
        const { seedId, passage, proposedGenre, criteria, verdict, sustained } = args;
        await this.call({
            seedId,
            passage,
            genreOverride: { proposedGenre, criteria, verdict, sustained },
        });
    }

    /**
     * Redacción v2 §4.5 — vara de suficiencia estructural del paso 3.
     * DETERMINISTA: el veredicto se calcula antes de llamar; esto solo registra.
     */
    async recordStructuralSufficiency(args: StructuralSufficiencyShadowArgs): Promise<void> {
        const { seedId, passage, qualifiedGenre, provenance, verdict, overrideTargetGenre } = args;
        await this.call({
            seedId,
            passage,
            structuralSufficiency: {
                qualifiedGenre,
                provenance,
                verdict,
                overrideTargetGenre: overrideTargetGenre ?? null,
            },
        });
    }
}

export const passageProfileShadowService = new PassageProfileShadowService();
