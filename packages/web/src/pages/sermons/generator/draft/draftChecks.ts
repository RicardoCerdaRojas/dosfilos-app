import { JUDGE_SHADOW_SAMPLE_1_IN } from '@dosfilos/domain';

/**
 * Chequeos DETERMINISTAS sobre un borrador ya generado.
 *
 * Viven aparte del paso porque son la única parte de la generación que se puede
 * probar sin un modelo detrás: entra un borrador, sale un veredicto. Mientras
 * estaban sueltos al final de `StepDraft.tsx` no tenían una sola prueba, y lo
 * que verifican —si el sermón conserva las palabras del pastor— es justamente
 * lo que no puede romperse en silencio.
 *
 * NINGUNO CORRIGE NADA. Detectan y devuelven; quien llama decide si avisa. Un
 * chequeo que además re-genera convierte un aviso en una decisión tomada a
 * espaldas del pastor (P2).
 */

/** Espacios colapsados y minúsculas: un salto de línea no es una diferencia. */
function normalizar(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Todo el texto del borrador como un solo pajar normalizado. */
function pajar(draft: any, incluirReferencias: boolean): string {
    return [
        draft?.title ?? '',
        draft?.introduction ?? '',
        draft?.conclusion ?? '',
        draft?.callToAction ?? '',
        ...(Array.isArray(draft?.body)
            ? draft.body.flatMap((b: any) => [
                  b?.content ?? '',
                  ...(incluirReferencias && Array.isArray(b?.scriptureReferences) ? b.scriptureReferences : []),
              ])
            : []),
    ]
        .map(normalizar)
        .join(' \n ');
}

/**
 * ADR-035 R3/R7 — referencias de paralelos del pastor que NO aparecen en el
 * borrador. El prompt los marca PRIMARIOS; si el modelo igual los dejó fuera,
 * surfaceamos cuáles (warning, no auto-regen — P2).
 */
export function draftMissingParallelRefs(
    draft: any,
    parallels: { reference: string }[] | undefined,
): string[] {
    if (!Array.isArray(parallels) || parallels.length === 0) return [];
    const texto = pajar(draft, true);
    return parallels
        .map((p) => p.reference?.trim())
        .filter((ref): ref is string => Boolean(ref) && !texto.includes(normalizar(ref)));
}

/**
 * ¿El borrador contiene la idea central del pastor palabra por palabra?
 *
 * El prompt se lo pide; esto verifica que haya obedecido. Sin idea central
 * declarada devuelve `true`: no hay nada que comprobar, y un `false` acá
 * dispararía un aviso sobre algo que el pastor nunca escribió.
 */
export function draftIncludesCentralIdea(draft: any, centralIdea: string): boolean {
    const objetivo = normalizar(centralIdea);
    if (!objetivo) return true;
    return pajar(draft, false).includes(objetivo);
}

/**
 * Muestreo determinista por `sermonId` — mismo molde que el del spine socrático.
 * Determinista para que un mismo sermón caiga siempre del mismo lado y los
 * conteos no dependan de cuántas veces se regeneró.
 */
export function shouldJudgeSample(sermonId: string): boolean {
    if (JUDGE_SHADOW_SAMPLE_1_IN <= 1) return true;
    let h = 0;
    for (let i = 0; i < sermonId.length; i++) h = (h * 31 + sermonId.charCodeAt(i)) | 0;
    return Math.abs(h) % JUDGE_SHADOW_SAMPLE_1_IN === 0;
}
