import { contrast, deltaE } from './color';

/**
 * Validación de tokens de marca — réplica de `validar_tokens` (crear_marca.py).
 * Rechaza si el contraste WCAG o la distinción perceptual (ΔE) caen bajo el
 * umbral; si la Escritura no se distingue del acento de interfaz, la semántica
 * de la Regla de la Escritura colapsa.
 */

export interface BrandValidationResult {
  ok: boolean;
  errores: string[];
  avisos: string[];
}

/** Fondo claro de referencia para el contraste de `escritura_tinta`. */
const FONDO_CLARO = '#f7fafb';

/** Tokens requeridos para validar (los 9 del contrato de marca). */
const REQUERIDOS = [
  'oscuro',
  'panel',
  'medio',
  'acento',
  'claro1',
  'claro2',
  'escritura',
  'escritura_tinta',
  'alerta',
] as const;

export function validateBrandTokens(tokens: Record<string, string>): BrandValidationResult {
  const errores: string[] = [];
  const avisos: string[] = [];

  for (const k of REQUERIDOS) {
    if (!tokens[k] || !/^#[0-9A-Fa-f]{6}$/.test(tokens[k])) {
      errores.push(`token "${k}" ausente o no es un hex de 6 dígitos`);
    }
  }
  if (errores.length > 0) return { ok: false, errores, avisos };

  // Contraste WCAG. Umbral 4.5:1 (texto), 3:1 para estructura (acento).
  const reqContraste = (a: string, sobre: string, min: number) => {
    const ratio = contrast(tokens[a] ?? a, sobre.startsWith('#') ? sobre : (tokens[sobre] ?? sobre));
    if (ratio < min) {
      errores.push(
        `CONTRASTE ${a} sobre ${sobre}: ${ratio.toFixed(2)}:1 (mínimo ${min}:1)`,
      );
    } else if (ratio < min + 0.5) {
      avisos.push(`CONTRASTE ${a} sobre ${sobre}: ${ratio.toFixed(2)}:1 (al límite)`);
    }
  };
  reqContraste('escritura', 'oscuro', 4.5);
  reqContraste('escritura_tinta', FONDO_CLARO, 4.5);
  reqContraste('claro1', 'oscuro', 4.5);
  reqContraste('acento', 'oscuro', 3.0);

  // Distinción perceptual ΔE ≥ 18 (semántica de la Regla de la Escritura).
  const reqDistincion = (a: string, b: string) => {
    const de = deltaE(tokens[a], tokens[b]);
    if (de < 18) {
      errores.push(`DISTINCIÓN ${a}↔${b}: ΔE=${de.toFixed(0)} (<18) — la semántica colapsa`);
    }
  };
  reqDistincion('escritura', 'acento');
  reqDistincion('escritura', 'alerta');
  reqDistincion('acento', 'alerta');

  return { ok: errores.length === 0, errores, avisos };
}
