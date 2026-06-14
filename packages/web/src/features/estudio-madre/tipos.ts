import type { ElementoTipo } from '@dosfilos/domain';

/**
 * Tipos de elemento ofrecidos en el picker de promoción + el dropdown del panel.
 * Compartido para que el botón (mensajes) y el panel (rail) no diverjan.
 *
 * - Básicos = riel formativo (Asistente A, spec §2.2): set guiado.
 * - Avanzados = modular experto (Asistente B): incluye contraargumento, etc.
 * Ambos grupos ya tienen lógica de puerta en domain (TIPOS_CLAIM / TIPOS_DE_PESO),
 * así que exponerlos es seguro.
 */
export const TIPOS_BASICOS: ElementoTipo[] = [
    'idea_central',
    'observacion',
    'testigo',
    'testigo_historico',
    'error_confrontado',
    'aplicacion',
];

export const TIPOS_AVANZADOS: ElementoTipo[] = [
    'marco',
    'argumento',
    'contraargumento',
    'cita',
    'ilustracion',
    'conclusion',
];
