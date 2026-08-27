import { sermonService } from '@dosfilos/application';
import { selectVoiceSamples, type VoiceSample } from '@dosfilos/domain';

/**
 * Trae los sermones del pastor de los que se puede aprender su voz.
 *
 * SE MIRA `authorshipSnapshot`, NO `assembledFrom`, y el motivo es concreto: la
 * copia publicada NO lleva `wizardProgress`, así que `assembledFrom` —que vive
 * en el borrador— no sobrevive a la publicación. El snapshot de autoría sí, y
 * sólo se graba cuando hubo decisiones en el taller. Presente ⇒ lo armó él.
 *
 * SÓLO PUBLICADOS. Un borrador a medias no representa cómo escribe: representa
 * dónde lo dejó. Los publicados son los que dio por buenos y predicó.
 *
 * BEST-EFFORT, Y ESO NO ES PEREZA: si esta lectura falla, el sermón se genera
 * igual, sin voz aprendida. Es una mejora del resultado, no un requisito para
 * obtenerlo — hacerla bloqueante convertiría un lujo en un punto de fallo.
 */
export async function loadVoiceSamples(opts: {
    userId: string | undefined;
    /** Pasaje en curso: no se aprende de un sermón del mismo texto. */
    currentPassage?: string;
}): Promise<VoiceSample[]> {
    if (!opts.userId) return [];
    try {
        const sermones = await sermonService.getUserSermons(opts.userId, {
            status: 'published',
            orderBy: 'publishedAt',
            order: 'desc',
            limit: 8,
        } as never);

        return selectVoiceSamples(
            sermones.map((s) => ({
                id: s.id,
                title: s.title,
                content: s.content ?? '',
                // Ver la nota de arriba: el snapshot es lo que sobrevive.
                assembledFrom: s.authorshipSnapshot ? ('workshop' as const) : undefined,
                publishedAt: s.publishedAt,
                bibleReferences: s.bibleReferences,
            })),
            { currentPassage: opts.currentPassage },
        );
    } catch (error) {
        console.warn('[draft] no se pudo leer el corpus de voz — se genera sin él', error);
        return [];
    }
}
