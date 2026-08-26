import type { GreekWordToken } from './morphGntToken';

/**
 * EL PUENTE DE TRADUCCIÓN: por qué una palabra griega se traduce con
 * palabras que "no están" en el griego.
 *
 * La duda inaugural de todo lector hispanohablante: busca el "de" de
 * "de Dios" en θεοῦ y no existe — porque EL CASO LO LLEVA DENTRO. El
 * genitivo hace el trabajo de la preposición "de", el dativo el de "a/para",
 * el acusativo señala el objeto sin preposición. Es la diferencia
 * estructural entre una lengua flexiva y el español, y es 100% determinista:
 * catálogo por caso, no modelo.
 *
 * Devuelve la clave del puente o null cuando no hay nada que explicar
 * (verbos, partículas, palabras sin caso): un puente sobre nada es ruido.
 */
export function translationBridge(token: GreekWordToken): string | null {
    // El artículo se explica por su paradigma (pista propia), no por puente.
    if (token.pos === 'RA' || !token.tag.case) return null;
    switch (token.tag.case) {
        case 'G':
            return 'bridgeGenitive';
        case 'D':
            return 'bridgeDative';
        case 'A':
            return 'bridgeAccusative';
        case 'N':
            return 'bridgeNominative';
        case 'V':
            return 'bridgeVocative';
        default:
            return null;
    }
}
