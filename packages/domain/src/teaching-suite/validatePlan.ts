import { TIPOS_LAMINA, type Genero, type TeachingPlan, type VersionContrato } from './TeachingPlan';

/**
 * Réplica del núcleo de `validar.py` (reglas de PLAN, no de HTML post-render).
 * Devuelve errores duros (bloquean) y avisos (no bloquean). El render/inject
 * NO debe correr si `ok` es false.
 *
 * F0: cubre las reglas estructurales y por-tipo verificables sobre el plan.
 * Las auditorías sobre el HTML final (canal único, cero emojis, cita-humana sin
 * color de Escritura, `node --check` de scripts) son post-render → Fase 1+.
 */

export interface ValidationResult {
  ok: boolean;
  errores: string[];
  avisos: string[];
}

const GENEROS: Genero[] = ['exegesis', 'doctrina', 'consejeria'];
const VERSIONES: VersionContrato[] = ['1', '1.1', '1.2', '1.3', '1.4'];

function versionNum(v: string): number {
  return v === '1' ? 1.0 : parseFloat(v);
}

export function validatePlan(plan: TeachingPlan): ValidationResult {
  const errores: string[] = [];
  const avisos: string[] = [];
  const E = (m: string) => errores.push(m);

  // ── Cabecera ──────────────────────────────────────────────────────────────
  if (!plan.id || !/^[a-z0-9_-]+$/.test(plan.id)) {
    E(`id inválido "${plan.id}" — debe coincidir con [a-z0-9_-]+`);
  }
  if (!GENEROS.includes(plan.genero)) {
    E(`genero inválido "${plan.genero}" — ∈ {exegesis, doctrina, consejeria}`);
  }
  if (plan.genero === 'consejeria') {
    if (!plan.modalidad || !['clase', 'sesion'].includes(plan.modalidad)) {
      E('consejería requiere modalidad ∈ {clase, sesion}');
    }
    if (plan.modalidad === 'sesion') {
      if (plan.artefactos.includes('presentacion') || plan.artefactos.includes('notas')) {
        E('modalidad sesion ⇒ sin presentacion ni notas');
      }
      if (!plan.artefactos.includes('guia_sesion')) {
        E('modalidad sesion ⇒ requiere guia_sesion');
      }
    }
  }

  // ── Versión de contrato + coherencia con features usados ────────────────────
  if (!VERSIONES.includes(plan.version_contrato)) {
    E(`version_contrato inválida "${plan.version_contrato}"`);
  }
  const tipos = new Set(plan.diapositivas.map((d) => d.tipo));
  const usaSecuencia = plan.diapositivas.some((d) => !!d.secuencia);
  const usaVariante = plan.diapositivas.some((d) => !!d.variante);
  let requerida = 1.0;
  if (tipos.has('tarjetas') || tipos.has('pasos') || usaSecuencia) requerida = Math.max(requerida, 1.1);
  if (usaVariante) requerida = Math.max(requerida, 1.2);
  if (tipos.has('lienzo')) requerida = Math.max(requerida, 1.3);
  if (plan.edicion) requerida = Math.max(requerida, 1.4);
  if (versionNum(plan.version_contrato) < requerida) {
    E(`version_contrato ${plan.version_contrato} incoherente — los features usados requieren ≥ ${requerida}`);
  }

  // ── Diapositivas: numeración 1..N + tipos conocidos ────────────────────────
  const N = plan.diapositivas.length;
  const ns = plan.diapositivas.map((d) => d.n).sort((a, b) => a - b);
  for (let i = 0; i < N; i++) {
    if (ns[i] !== i + 1) {
      E(`numeración de diapositivas con hueco/duplicado: esperado ${i + 1}, encontrado ${ns[i]}`);
      break;
    }
  }
  for (const d of plan.diapositivas) {
    if (!TIPOS_LAMINA.includes(d.tipo)) E(`tipo desconocido "${d.tipo}" (diapo n=${d.n})`);
  }

  // ── Bloques cubren 1..N sin huecos ni solapes ──────────────────────────────
  const cubierto = new Array<number>(N + 1).fill(0);
  for (const b of plan.bloques) {
    for (let n = b.diapo_ini; n <= b.diapo_fin; n++) {
      if (n >= 1 && n <= N) cubierto[n]++;
    }
  }
  for (let n = 1; n <= N; n++) {
    if (cubierto[n] === 0) E(`bloques no cubren la diapositiva ${n}`);
    else if (cubierto[n] > 1) E(`bloques solapan en la diapositiva ${n}`);
  }

  // ── notas_resumen cubre todas las diapositivas ─────────────────────────────
  const conNota = new Set(plan.notas_resumen.map((r) => r.diapo));
  for (let n = 1; n <= N; n++) {
    if (!conNota.has(n)) E(`notas_resumen no cubre la diapositiva ${n}`);
  }

  // ── Reglas por tipo ────────────────────────────────────────────────────────
  for (const d of plan.diapositivas) {
    const any = d as unknown as Record<string, unknown>;
    if (d.html && d.tipo !== 'lienzo') continue; // vía de escape: no se audita el cuerpo

    if (d.tipo === 'escritura' || d.tipo === 'escritura-anotada') {
      if (!any.ref) E(`${d.tipo} (n=${d.n}) requiere ref (Regla de la Escritura)`);
    }

    if (d.tipo === 'lista') {
      const items = (any.items as unknown[]) ?? [];
      const max = d.variante === 'dos-columnas' ? 6 : 4;
      if (items.length > max) E(`lista (n=${d.n}) con ${items.length} ítems (máx ${max})`);
    }

    if (d.tipo === 'escritura-anotada') {
      const texto = String(any.texto ?? '');
      const destacados = (any.destacados as { palabra: string }[]) ?? [];
      for (const m of destacados) {
        if (!texto.includes(m.palabra)) {
          E(`escritura-anotada (n=${d.n}): palabra destacada "${m.palabra}" ausente en el texto`);
        }
      }
    }

    if (d.tipo === 'quiasmo') {
      const lineas = (any.lineas as { nivel: number; centro?: boolean }[]) ?? [];
      const niveles = lineas.map((l) => l.nivel);
      const espejo = [...niveles].reverse();
      if (JSON.stringify(niveles) !== JSON.stringify(espejo)) {
        E(`quiasmo (n=${d.n}): los niveles no son un palíndromo (espejados)`);
      }
      const centros = lineas.filter((l) => l.centro).length;
      if (centros !== 1) E(`quiasmo (n=${d.n}): debe haber exactamente un centro (hay ${centros})`);
    }

    if (d.tipo === 'flujo') {
      const nodos = (any.nodos as { id: string; conecta: string | null }[]) ?? [];
      const ids = new Set(nodos.map((nd) => nd.id));
      let raices = 0;
      for (const nd of nodos) {
        if (nd.conecta === null || nd.conecta === undefined) raices++;
        else if (!ids.has(nd.conecta)) {
          E(`flujo (n=${d.n}): conexión a id inexistente "${nd.conecta}"`);
        }
      }
      if (raices < 1) E(`flujo (n=${d.n}): no tiene raíz (al menos un nodo con conecta=null)`);
    }

    if (d.tipo === 'lienzo') {
      avisos.push(`lienzo (n=${d.n}): QA visual obligatorio antes de entregar`);
    }
  }

  return { ok: errores.length === 0, errores, avisos };
}
