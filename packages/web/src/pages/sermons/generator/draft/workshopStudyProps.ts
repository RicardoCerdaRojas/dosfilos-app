/**
 * Lo que el ESTUDIO le presta al TALLER.
 *
 * El taller no lee la exégesis entera: toma las cuatro piezas que sirven para
 * decidir (proposición exegética y los tres contextos) más las palabras clave.
 */
export function studyFromExegesis(exegesis: any) {
    if (!exegesis) return undefined;
    return {
        exegeticalProposition: exegesis.exegeticalProposition,
        historical: exegesis.context?.historical,
        literary: exegesis.context?.literary,
        audience: exegesis.context?.audience,
        pastoralInsights: exegesis.pastoralInsights,
    };
}

/**
 * Las palabras clave del estudio, EN EL MISMO FORMATO QUE EMITE EL GENERADOR.
 *
 * DOS CAMINOS, UNA FORMA: el pastor puede llegar al mismo sermón armándolo en el
 * taller o generándolo de una vez, y las palabras clave tienen que verse igual
 * por los dos lados. Si acá se formatearan distinto, el mismo estudio produciría
 * dos sermones que no se parecen — que es exactamente el desajuste que el plan
 * de convergencia vino a cerrar.
 *
 * La forma: la palabra en cursiva, la transliteración entre paréntesis y la
 * significancia que ESCRIBIÓ EL PASTOR tras un guión. Cada parte se omite si no
 * está; una palabra sin nada útil no entra.
 */
export function studyKeyWordsFromExegesis(exegesis: any): string[] {
    return (exegesis?.keyWords ?? [])
        .map((kw: any) =>
            [
                kw.original && `*${kw.original}*`,
                kw.transliteration && `(${kw.transliteration})`,
                kw.significance && `— ${kw.significance}`,
            ]
                .filter(Boolean)
                .join(' '),
        )
        .filter(Boolean);
}
