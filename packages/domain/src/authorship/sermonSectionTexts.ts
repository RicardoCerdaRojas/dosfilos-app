import type { SermonContent } from '../entities/SermonGenerator';

/**
 * El texto de cada sección, en la MISMA forma a los dos lados del diff.
 *
 * POR QUÉ EXISTE Y NO SE COMPARA EL OBJETO: el sermón no es texto plano. La
 * introducción es un string, el cuerpo es un arreglo de puntos con contenido,
 * ilustración, implicaciones y transición. Comparar estructuras distintas —o
 * serializarlas con `JSON.stringify`— metería llaves y nombres de campo al
 * conteo de palabras, y el pastor recibiría autoría por texto que nunca vio.
 *
 * QUÉ SE INCLUYE Y QUÉ NO. Entra lo que el pastor REDACTA o puede reescribir:
 * el título del punto, la exposición, la ilustración, las implicaciones y la
 * transición. NO entran:
 *
 * - Las referencias cruzadas, que son texto bíblico citado: reescribirlas sería
 *   un error, y contarlas premiaría al pastor por no tocar la Escritura.
 * - Las citas de autoridad, que son verbatim de su biblioteca por diseño — el
 *   ancla verificable que el sistema inyecta y nadie debe editar.
 *
 * Contar esas dos ARRASTRARÍA la autoría hacia abajo por hacer lo correcto.
 */
export function sermonSectionTexts(content: SermonContent | null | undefined): Record<string, string> {
    if (!content) return {};

    const cuerpo = (content.body ?? [])
        .map((p) =>
            [
                p.point ?? '',
                p.content ?? '',
                p.illustration ?? '',
                ...(p.implications ?? []),
                p.transition ?? '',
            ]
                .filter((t) => t.trim())
                .join('\n\n'),
        )
        .join('\n\n');

    return {
        introduction: content.introduction ?? '',
        body: cuerpo,
        conclusion: content.conclusion ?? '',
    };
}
