import {
  injectArtifacts,
  type Artefacto,
  type BrandBundle,
  type InjectAssets,
  type InjectResult,
  type TeachingPlan,
} from '@dosfilos/domain';
import { TEMPLATES } from './assets/templates';
import {
  SEBEX_CSS_EXTRA,
  SEBEX_FONT_BASE64,
  SEBEX_ICONO_B64,
  SEBEX_LOGO_B64,
  SEBEX_MARCA,
} from './assets/sebex.assets';
import {
  IGLESIA_CSS_EXTRA,
  IGLESIA_FONT_BASE64,
  IGLESIA_ICONO_B64,
  IGLESIA_LOGO_B64,
  IGLESIA_MARCA,
} from './assets/iglesia.assets';

/**
 * Render client-side (F1). Las marcas semilla viven embebidas en el bundle,
 * indexadas por su clave (= campo `plan.marca`). Fase 2 (crear marca) traerá
 * marcas de usuario con assets en Storage.
 */
const BUNDLES: Record<string, BrandBundle> = {
  sebex: {
    marca: SEBEX_MARCA,
    fontBase64: SEBEX_FONT_BASE64,
    logoB64: SEBEX_LOGO_B64,
    iconoB64: SEBEX_ICONO_B64 || undefined,
    cssExtra: SEBEX_CSS_EXTRA,
  },
  'iglesia-1ra-concepcion': {
    marca: IGLESIA_MARCA,
    fontBase64: IGLESIA_FONT_BASE64,
    logoB64: IGLESIA_LOGO_B64,
    iconoB64: IGLESIA_ICONO_B64 || undefined,
    cssExtra: IGLESIA_CSS_EXTRA,
  },
};

function buildAssets(plan: TeachingPlan): InjectAssets {
  const brand = BUNDLES[plan.marca];
  if (!brand) {
    throw new Error(
      `[teaching-suite] marca "${plan.marca}" no disponible en el bundle (F1: sebex | iglesia-1ra-concepcion).`,
    );
  }
  const templates: InjectAssets['templates'] = {};
  for (const a of plan.artefactos) templates[a] = TEMPLATES[a];
  return { templates, brand };
}

/** Renderiza TODOS los artefactos declarados en el plan. */
export function renderPlanArtifacts(plan: TeachingPlan): InjectResult {
  return injectArtifacts(plan, buildAssets(plan));
}

/** Renderiza UN artefacto del plan (presentacion | notas | hoja | guia_sesion). */
export function renderArtifact(plan: TeachingPlan, artefacto: Artefacto): string {
  const out = injectArtifacts(plan, buildAssets(plan));
  const html = out[artefacto];
  if (!html) throw new Error(`El plan no declara el artefacto "${artefacto}".`);
  return html;
}
