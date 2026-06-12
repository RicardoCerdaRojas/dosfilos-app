/**
 * Teaching Suite F3 (curso) — prompt para dividir un estudio en SESIONES.
 *
 * Función PURA: recibe los textos de referencia + el estudio y devuelve
 * { system, prompt } para `ILlmClient`. La salida pedida es un outline pequeño
 * (lista de sesiones), no el plan completo — eso lo genera luego, por sesión,
 * `generarPlan` con el `alcance` de cada una. El docente revisa y ajusta el
 * outline antes de generar (control editorial del curso).
 */

export type GeneroSoportado = 'exegesis' | 'doctrina';

export interface OutlineRefs {
  skill: string;
  genero: string;
}

export interface BuildOutlinePromptInput {
  refs: OutlineRefs;
  estudio: string;
  genero: GeneroSoportado;
  /** Número de sesiones sugerido por el docente; si falta, lo decide el modelo. */
  sesionesSugeridas?: number;
}

export interface BuiltPrompt {
  system: string;
  prompt: string;
}

const ROL =
  'Eres un editor de enseñanza bíblica. A partir del material de estudio de un ' +
  'docente, divides el contenido en SESIONES de clase de ~45 minutos cada una ' +
  '(~12–20 diapositivas por sesión). No redactas el plan completo: solo el ' +
  'esquema del curso. Tu salida es EXCLUSIVAMENTE un objeto JSON.';

export function buildOutlinePrompt(input: BuildOutlinePromptInput): BuiltPrompt {
  const { refs, estudio, genero, sesionesSugeridas } = input;

  const system = [
    ROL,
    '',
    '## Reglas y flujo (skill)',
    refs.skill,
    '',
    `## Referencia del género: ${genero}`,
    refs.genero,
    '',
    '## Salida',
    'Responde con UN objeto JSON `{ "sesiones": [...] }`, sin texto alrededor. Cada sesión:',
    '- "titulo": título de la sesión (string).',
    '- "alcance": qué porción/subtema del estudio cubre esa sesión (1–3 frases claras, suficientes para que otro paso redacte el plan de SOLO esa sesión).',
    '- "min": minutos estimados (número, ~45 por sesión).',
    'Reglas: cada sesión debe ser autosuficiente y de tamaño de una clase (~12–20 láminas). El arco pedagógico progresa entre sesiones (no repitas el mismo material). El orden es bíblico-primero (texto y su exégesis antes de la sistematización).',
  ].join('\n');

  const partesPrompt: string[] = [
    'Material de estudio del docente:',
    '"""',
    estudio.trim(),
    '"""',
    '',
  ];

  if (sesionesSugeridas && sesionesSugeridas > 0) {
    partesPrompt.push(`Divide el estudio en EXACTAMENTE ${sesionesSugeridas} sesiones.`);
  } else {
    partesPrompt.push(
      'Decide cuántas sesiones necesita el material (normalmente 2–6) y divídelo con criterio pedagógico.',
    );
  }

  return { system, prompt: partesPrompt.join('\n') };
}
