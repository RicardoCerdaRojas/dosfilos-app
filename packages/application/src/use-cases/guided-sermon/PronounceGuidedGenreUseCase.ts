/**
 * Redacción v2 0b-B (§4.4) — el pastor se PRONUNCIA sobre el género en el paso 2
 * del flujo guiado (Faculty).
 *
 * Antes de esto el flujo conversacional no tenía forma de confirmar el género:
 * el seed nacía con el género inferido del libro y `genreProvenance: 'aiProposed'`,
 * y la procedencia se intentaba deducir escaneando la prosa del pastor con un
 * match de keywords — que casi nunca acierta. Resultado medido en prod: CERO
 * filas `userConfirmed`, y la calibración del gate de suficiencia en pausa por
 * falta de dato.
 *
 * Este caso de uso registra el ACTO: el pastor elige un género predicable en el
 * selector y eso ES la confirmación. Es una escritura al seed, no un turno del
 * chat — el turno socrático sigue su curso y la implicancia se escribe después.
 * La derivación vive en el dominio (`pronounceGenre`, fail-closed ante
 * centinelas y stubs); aquí solo se orquesta lectura → dominio → persistencia.
 */

import { pronounceGenre, type IPastoralSeedRepository } from '@dosfilos/domain';

export interface PronounceGuidedGenreInput {
    seedId: string;
    /** Género que el sistema infirió del libro. Puede ser centinela. */
    proposedGenre?: string;
    /** Género predicable que el pastor eligió. */
    chosenGenre: string;
}

export interface PronounceGuidedGenreResult {
    accepted: boolean;
    /** Procedencia resultante — `undefined` cuando el acto fue rechazado. */
    provenance?: 'aiProposed' | 'userConfirmed' | 'userOverride';
    reason?: string;
}

export class PronounceGuidedGenreUseCase {
    constructor(private readonly seedRepo: IPastoralSeedRepository) {}

    async execute(input: PronounceGuidedGenreInput): Promise<PronounceGuidedGenreResult> {
        const act = pronounceGenre({
            proposedGenre: input.proposedGenre,
            chosenGenre: input.chosenGenre,
        });
        // Fail-closed: un centinela (gospel/mixed) o un stub (parable) no es una
        // elección válida. No se escribe nada — mejor sin dato que con dato falso.
        if (!act) {
            return { accepted: false, reason: `Género no seleccionable: ${input.chosenGenre}` };
        }

        const seed = await this.seedRepo.getById(input.seedId);
        if (!seed) {
            return { accepted: false, reason: `Seed ${input.seedId} no encontrado` };
        }

        await this.seedRepo.update(input.seedId, {
            contextGenre: {
                ...seed.contextGenre,
                ...act,
            },
        });

        return { accepted: true, provenance: act.genreProvenance };
    }
}
