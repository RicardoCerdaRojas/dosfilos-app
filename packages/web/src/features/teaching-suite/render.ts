import { injectArtifacts, type InjectAssets, type InjectResult, type TeachingPlan } from '@dosfilos/domain';
import { TEMPLATES } from './assets/templates';
import {
  SEBEX_CSS_EXTRA,
  SEBEX_FONT_BASE64,
  SEBEX_ICONO_B64,
  SEBEX_LOGO_B64,
  SEBEX_MARCA,
} from './assets/sebex.assets';

/**
 * Render client-side (F1): `plan + marca (bundled) → artefactos HTML`.
 *
 * En F1 la única marca soportada es la semilla `sebex`, cuyos assets (marca,
 * fuentes/logo en base64, extra.css) y plantillas viven embebidos en el bundle.
 * Fase 2 (crear marca) traerá marcas de usuario con assets en Storage; entonces
 * `buildAssets` resolverá por `marca.assetKey` (bundled) o por Storage.
 */
export function buildSebexAssets(plan: TeachingPlan): InjectAssets {
  const templates: InjectAssets['templates'] = {};
  for (const a of plan.artefactos) templates[a] = TEMPLATES[a];
  return {
    templates,
    brand: {
      marca: SEBEX_MARCA,
      fontBase64: SEBEX_FONT_BASE64,
      logoB64: SEBEX_LOGO_B64,
      iconoB64: SEBEX_ICONO_B64 || undefined,
      cssExtra: SEBEX_CSS_EXTRA,
    },
  };
}

/** Renderiza los artefactos del plan con la marca semilla. */
export function renderPlanArtifacts(plan: TeachingPlan): InjectResult {
  return injectArtifacts(plan, buildSebexAssets(plan));
}
