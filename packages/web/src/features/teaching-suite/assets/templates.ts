// Las 4 plantillas congeladas, importadas como texto (?raw). NO se reescriben:
// son el runtime de los artefactos. Render client-side las inyecta con el plan.
import presentacion from '../templates/plantilla_presentacion.html?raw';
import notas from '../templates/plantilla_notas.html?raw';
import hoja from '../templates/plantilla_hoja.html?raw';
import guiaSesion from '../templates/plantilla_guia_sesion.html?raw';

import type { Artefacto } from '@dosfilos/domain';

export const TEMPLATES: Record<Artefacto, string> = {
  presentacion,
  notas,
  hoja,
  guia_sesion: guiaSesion,
};
