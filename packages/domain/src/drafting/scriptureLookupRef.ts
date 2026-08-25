/**
 * Convierte una referencia HOMILÉTICA en una consultable en la Biblia.
 *
 * Los bosquejos expositivos parten versículos: "Jonás 1:3a" es la primera mitad
 * del versículo 3, "3b" la segunda. Es notación estándar del predicador — y el
 * parser bíblico la rechaza, porque su expresión termina en el número.
 *
 * EL ARREGLO VA ACÁ Y NO EN EL PARSER, por dos razones. Primero, la Biblia no
 * puede devolver medio versículo: lo correcto es traer el versículo entero y que
 * la ETIQUETA siga diciendo "3a", para que el pastor vea qué mitad va a predicar.
 * Segundo, el parser está DUPLICADO en web e infraestructura, así que tocarlo
 * obliga a espejar el cambio en los dos o las superficies divergen en silencio.
 *
 * Se separa de la referencia visible a propósito: una para buscar, otra para
 * mostrar. Fundirlas perdería la mitad que el pastor eligió.
 */
const SUFIJO_PARTE = /(\d+)\s*[a-cA-C]\b/g;

export function scriptureLookupRef(ref: string | undefined): string | undefined {
    const limpio = ref?.trim();
    if (!limpio) return undefined;
    const normalizado = limpio.replace(SUFIJO_PARTE, '$1').trim();
    return normalizado || undefined;
}
