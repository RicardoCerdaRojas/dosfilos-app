import type { TFunction } from 'i18next';
import { scriptureLookupRef, sermonPointBlocks, type SermonContent } from '@dosfilos/domain';
import { LocalBibleService } from '@/services/LocalBibleService';

/**
 * EL TIPO ES EL DEL DOMINIO, no una copia local.
 *
 * Este archivo declaraba su propio `SermonDraft` con los cuatro campos que
 * usaba. Mientras tanto el borrador real es `SermonContent`, y las dos formas
 * fueron divergiendo: un campo nuevo en el dominio no llegaba acá, y el paso que
 * pasa el borrador tenía que cargar con un error de tipos para que compilara.
 */

/**
 * Serialises a sermon draft to a markdown-ish string used by the preview
 * dialog and the publish flow. Keeps the side-effect-free transformation out
 * of the React component and away from i18n state changes.
 */
export function buildFullContent(draft: SermonContent | null, t: TFunction): string {
    if (!draft) return '';

    const body = draft.body
        .map((point) => {
            // LA FORMA DEL PUNTO LA DEFINE EL DOMINIO, no este serializador.
            // Antes la definía acá y otra vez en el lienzo de edición, y las dos
            // divergieron: el pastor revisaba una cosa y su congregación recibía
            // otra.
            const bloques = sermonPointBlocks(point)
                .map((bloque) => {
                    const encabezado = bloque.headingKey ? `### ${t(bloque.headingKey)}\n` : '';

                    if (bloque.kind === 'mainPassage') {
                        const ref = bloque.text ?? '';
                        const texto = LocalBibleService.getVerses(scriptureLookupRef(ref) ?? '');
                        return texto ? `> **${ref}** — ${texto}` : `> ${ref}`;
                    }

                    if (bloque.kind === 'crossReferences') {
                        // CON EL TEXTO DEL VERSÍCULO: sin él hay que abrir cada
                        // cita para saber qué dice, también en el publicado.
                        const items = (bloque.items ?? []).map((ref) => {
                            const texto = LocalBibleService.getVerses(scriptureLookupRef(ref) ?? '');
                            return texto ? `- **${ref}** — ${texto}` : `- ${ref}`;
                        });
                        return `${encabezado}${items.join('\n')}`;
                    }

                    if (bloque.items) {
                        // Las palabras clave van con viñeta: no tienen orden.
                        // Numerarlas les inventaría una secuencia.
                        if (bloque.kind === 'keyWords') {
                            return `${encabezado}${bloque.items.map((i) => `- ${i}`).join('\n')}`;
                        }
                        return `${encabezado}${bloque.items.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`;
                    }

                    return `${encabezado}${bloque.text ?? ''}`;
                })
                .join('\n<br/>\n');

            return `## ${point.point}\n<br/>\n${bloques}`;
        })
        .join('\n<br/>\n---\n<br/>\n');

    const callToActionBlock = draft.callToAction
        ? `\n<br/>\n> **${t('drafting.callToActionLabel')}:** ${draft.callToAction}`
        : '';

    return `
${draft.introduction}
<br/>
${body}
<br/>
## ${t('drafting.conclusionLabel')}
${draft.conclusion}${callToActionBlock}
    `.trim();
}
