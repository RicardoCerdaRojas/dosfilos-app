import type { ExegeticalStudy, HomileticalAnalysis, Sermon, SermonContent, SermonElement, SermonPersonalization } from '@dosfilos/domain';

type WizardProgress = NonNullable<Sermon['wizardProgress']>;
type DerivedContext = NonNullable<WizardProgress['derivedContext']>;

export interface WizardState {
    step: number;
    passage: string;
    exegesis: ExegeticalStudy | null;
    homiletics: HomileticalAnalysis | null;
    draft: SermonContent | null;
    derivedContext?: DerivedContext | null;
    personalization?: SermonPersonalization | null;
    audienceRigor?: 'beginner' | 'seminary' | null;
    sectionElements?: Record<string, SermonElement[]> | null;
    sectionProse?: Record<string, string> | null;
}

function hasAnyField(p: SermonPersonalization): boolean {
    return Boolean(
        p.tone ||
        p.situationalContext?.trim() ||
        p.congregationDescription?.trim() ||
        p.pastoralEmphasis?.trim() ||
        p.illustrations?.trim() ||
        p.preacherNotes?.trim(),
    );
}

/**
 * Arma el payload de `wizardProgress` que se persiste.
 *
 * FUNCIÓN PURA Y APARTE A PROPÓSITO. La construcción del payload vivía dentro
 * del hook, donde sólo se podía probar montando React y Firestore — y ahí se
 * escondió un bug que el pastor encontró predicando: cambiaba el registro del
 * sermón de Técnico a Cotidiano, recargaba, y volvía a Técnico.
 *
 * ⚠️ EL DATO QUE GOBIERNA ESTE ARCHIVO: `FirebaseSermonRepository.update` escribe
 * con `setDoc(..., { merge: true })`. Firestore FUSIONA los mapas anidados: una
 * clave que no viene en el payload NO se borra, se conserva la vieja.
 *
 * (Un comentario anterior acá decía lo contrario —"updateWizardProgress replaces
 * the whole object"— y esa creencia es exactamente lo que produjo el bug: si
 * omitir borrara, omitir `audienceRigor` sería una forma válida de volver al
 * default. No lo es.)
 *
 * CONSECUENCIA PRÁCTICA: OMITIR UNA CLAVE NUNCA ES UNA FORMA DE BORRARLA. Si un
 * valor puede volver a su default, hay que ESCRIBIR el default explícitamente.
 */
export function buildWizardProgress(wizardState: WizardState): WizardProgress {
    const progress: WizardProgress = {
        currentStep: wizardState.step,
        passage: wizardState.passage,
        lastSaved: new Date(),
    };

    if (wizardState.exegesis) progress.exegesis = wizardState.exegesis;
    if (wizardState.homiletics) progress.homiletics = wizardState.homiletics;
    if (wizardState.draft) progress.draft = wizardState.draft;
    if (wizardState.derivedContext) progress.derivedContext = wizardState.derivedContext;

    // La personalización vacía no se escribe: evita crear un
    // `wizardProgress.personalization` en blanco para quien nunca abrió el
    // panel. No es el caso de `audienceRigor`, que es un valor único y sí puede
    // volver a su default.
    if (wizardState.personalization && hasAnyField(wizardState.personalization)) {
        progress.personalization = wizardState.personalization;
    }

    // SE PERSISTEN LOS DOS VALORES, no sólo el no-default.
    //
    // Antes se escribía sólo `seminary`, argumentando que `beginner` es el
    // default implícito. Correcto para un sermón que NUNCA tocó el selector —
    // ese caso sigue cubierto: ahí el campo es `undefined` y no se escribe.
    //
    // Pero con merge, omitir `beginner` dejaba intacto el `'seminary'` ya
    // guardado. El pastor veía el cambio aplicado en pantalla y al recargar se
    // revertía, sin error y sin aviso.
    //
    // `undefined` = nunca eligió · `'beginner'` = eligió Cotidiano. Distintos.
    if (wizardState.audienceRigor) {
        progress.audienceRigor = wizardState.audienceRigor;
    }

    // ADR-037 — SE ESCRIBE EN CUANTO HAY MAPA, aunque alguna sección esté
    // vacía. Con merge, omitir una sección vaciada dejaría intactos los
    // elementos viejos: el pastor borraría el último elemento, recargaría, y lo
    // vería volver. Es el mismo fallo que tuvo `audienceRigor`, y la misma
    // regla: omitir una clave nunca es una forma de borrarla.
    if (wizardState.sectionElements) {
        progress.sectionElements = wizardState.sectionElements;
    }

    // Misma regla que arriba: una sección cuya prosa se borró se escribe vacía,
    // porque omitirla dejaría intacta la anterior.
    if (wizardState.sectionProse) {
        progress.sectionProse = wizardState.sectionProse;
    }

    return progress;
}
