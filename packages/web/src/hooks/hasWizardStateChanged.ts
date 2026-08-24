import type { WizardState } from './buildWizardProgress';

/**
 * ¿Cambió algo que valga la pena guardar?
 *
 * COMPARA TODAS LAS CLAVES, no una lista escrita a mano.
 *
 * Antes esto era una cadena de `prev.x !== next.x` campo por campo, repetida
 * además en el array de dependencias del efecto. Agregar un campo a
 * `WizardState` obligaba a acordarse de DOS lugares más, y olvidarse no rompía
 * nada: el campo simplemente no se guardaba nunca. Pasó con `sectionElements`
 * — el pastor decidía sus ideas, recargaba, y no había nada. Sin error, sin
 * aviso, y con el indicador de "Guardado" diciendo que todo estaba bien.
 *
 * Comparación por IDENTIDAD, igual que antes: el estado del wizard se reemplaza
 * entero en cada cambio (setState con objeto nuevo), así que `!==` alcanza y
 * evita el costo de una comparación profunda en cada render.
 */
export function hasWizardStateChanged(prev: WizardState, next: WizardState): boolean {
    const claves = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof WizardState>;
    for (const clave of claves) {
        if (prev[clave] !== next[clave]) return true;
    }
    return false;
}
