/**
 * Teaching Suite F3 — armado del prompt para proponer un `plan` desde un estudio.
 *
 * Función PURA (sin fs, sin SDK): recibe los textos de referencia ya cargados y
 * el material del estudio, y devuelve { system, prompt } para `ILlmClient`. Así
 * es testeable sin tocar disco ni red. El callable la envuelve cargando los
 * assets de `assets/prompts/` y llamando a Anthropic.
 *
 * El punto de control editorial es el `plan` (JSON), nunca el HTML: este prompt
 * pide EXCLUSIVAMENTE un objeto `plan` conforme al contrato. La validación dura
 * (validatePlan) corre client-side sobre el candidato devuelto; si falla, el
 * bucle re-llama pasando `erroresPrevios` (Slice B). En Slice A el bucle es
 * manual (un intento + botón «Reintentar»).
 */

export type GeneroSoportado = 'exegesis' | 'doctrina' | 'consejeria';
export type Modalidad = 'clase' | 'sesion';

export interface PromptRefs {
  /** SKILL.md — flujo + reglas editoriales transversales. */
  skill: string;
  /** contrato-plan.md — esquema exhaustivo del `plan`. */
  contrato: string;
  /** tipos-de-lamina.md — catálogo y criterios de elección de tipo. */
  tipos: string;
  /** genero-{exegesis,doctrina}.md — la referencia del género elegido. */
  genero: string;
}

export interface BuildPlanPromptInput {
  refs: PromptRefs;
  /** Material de estudio del docente (markdown/texto). */
  estudio: string;
  genero: GeneroSoportado;
  /** Solo consejería: 'sesion' (1-a-1, guía+hoja) o 'clase' (grupal, suite). */
  modalidad?: Modalidad;
  /** Identificador de la marca elegida (va en `plan.marca`). */
  marcaId: string;
  /** Identificador base sugerido para `plan.id` ([a-z0-9_-]+). */
  idSugerido: string;
  artefactos: string[];
  /**
   * Recorte de esta sesión dentro de un curso (Eje 2): qué porción/subtema del
   * estudio cubre. Si está presente, el plan se ciñe a ese alcance; si no, el
   * plan cubre el estudio como una sesión única.
   */
  alcance?: string;
  /** Errores de validatePlan del intento anterior (bucle de corrección). */
  erroresPrevios?: string[];
}

export interface BuiltPrompt {
  system: string;
  prompt: string;
}

const ROL =
  'Eres un editor de enseñanza bíblica. A partir del material de estudio de un ' +
  'docente, redactas el PLAN de una clase: un objeto JSON que describe la clase ' +
  '(cabecera + bloques + diapositivas + notas). NUNCA escribes el HTML de los ' +
  'artefactos: el plan es la única fuente editable; un runtime determinista lo ' +
  'convierte en HTML después. Tu salida es EXCLUSIVAMENTE el objeto plan.';

export function buildPlanPrompt(input: BuildPlanPromptInput): BuiltPrompt {
  const { refs, estudio, genero, modalidad, marcaId, idSugerido, artefactos, alcance, erroresPrevios } =
    input;

  const system = [
    ROL,
    '',
    '## Reglas y flujo (skill)',
    refs.skill,
    '',
    '## Contrato del plan (esquema exhaustivo — no inventar campos)',
    refs.contrato,
    '',
    '## Catálogo de tipos de lámina',
    refs.tipos,
    '',
    `## Referencia del género: ${genero}`,
    refs.genero,
    '',
    '## Salida',
    'Responde con UN solo objeto JSON `plan`, sin texto alrededor. Requisitos duros:',
    `- "genero": "${genero}"; "marca": "${marcaId}"; "id": "${idSugerido}" (o una variante [a-z0-9_-]+).`,
    `- "artefactos": ${JSON.stringify(artefactos)}.`,
    ...(genero === 'consejeria'
      ? [
          `- "modalidad": "${modalidad ?? 'sesion'}".`,
          ...(modalidad === 'sesion'
            ? [
                '- Modalidad SESIÓN (1-a-1): SIN presentación/notas. Redacta "cuerpo_guia_html" con la estructura nouthética (repaso de tareas → recolección de datos con preguntas literales → esperanza bíblica → confrontación DESDE EL TEXTO con `escritura-anotada` → plan despojarse/vestirse `dv` con conductas concretas → tareas verificables; señales de alerta si el caso lo amerita). Y "cuerpo_hoja_html" (hoja del aconsejado, tipo aplicación: pasajes para meditar, autoexamen con `lineas`, plan `dv`, `tareas` con casillas, `memorizar` con el versículo). Las diapositivas pueden ser mínimas (la guía es el artefacto central).',
              ]
            : [
                '- Modalidad CLASE (grupal): enseña consejería al grupo con la suite completa, como una clase de doctrina.',
              ]),
          '- CONFIDENCIALIDAD (obligatorio): anonimiza TODO nombre real o dato identificable del aconsejado usando un código de caso ("H-02"). En TODOS los artefactos, también borradores. No inventes datos.',
        ]
      : [
          '- ESTA ES UNA SOLA SESIÓN de clase (~45 min): apunta a 12–20 diapositivas. NO exceder: si el material da para más, prioriza el núcleo de esta sesión; el resto es otra sesión.',
        ]),
    '- "version_contrato" coherente con los features usados (tarjetas/pasos/secuencia ⇒ ≥1.1; variante ⇒ ≥1.2; lienzo ⇒ ≥1.3; edicion ⇒ ≥1.4).',
    '- "diapositivas": "n" correlativo 1..N sin huecos ni duplicados.',
    '- "bloques": cubren 1..N sin huecos ni solapes (cada uno con "min" realista).',
    '- "notas_resumen": una entrada por cada diapositiva (cubre 1..N).',
    '- Reglas por tipo: escritura/escritura-anotada llevan "ref"; lista ≤4 ítems (≤6 si variante dos-columnas); quiasmo con niveles espejados y exactamente un "centro"; flujo con al menos un nodo raíz (conecta=null) y sin conexiones a ids inexistentes; escritura-anotada: cada palabra destacada debe aparecer literal en "texto".',
    '- Regla de la Escritura: el color de Escritura es solo para palabras citadas textualmente de la Biblia, en cursiva; citas de comentaristas/confesiones nunca en ese color.',
    '- Si los artefactos incluyen "notas"/"hoja", redacta "cuerpo_notas_html"/"cuerpo_hoja_html" coherentes con las diapositivas; la síntesis doctrinal va DESPUÉS del trabajo con el texto.',
    '- En "cuerpo_hoja_html" los espacios para rellenar van VACÍOS: `<span class="blanco corto"></span>` SIN texto dentro (el alumno escribe ahí). NUNCA escribas la respuesta dentro del span; la palabra omitida se infiere del contexto de la frase. El texto ancla bíblico SIEMPRE impreso completo.',
    '- Sin emojis. Una idea por diapositiva.',
  ].join('\n');

  const partesPrompt: string[] = [
    'Material de estudio del docente:',
    '"""',
    estudio.trim(),
    '"""',
    '',
    'Redacta el objeto JSON `plan` completo para esta clase.',
  ];

  if (alcance && alcance.trim()) {
    partesPrompt.push(
      '',
      'Esta sesión es parte de un curso. Cíñete EXCLUSIVAMENTE a este alcance ' +
        '(el resto del estudio se cubre en otras sesiones):',
      alcance.trim(),
    );
  }

  if (erroresPrevios && erroresPrevios.length > 0) {
    partesPrompt.push(
      '',
      'El intento anterior fue RECHAZADO por el validador con estos errores. ' +
        'Corrígelos todos y devuelve el plan completo de nuevo:',
      ...erroresPrevios.map((e) => `- ${e}`),
    );
  }

  return { system, prompt: partesPrompt.join('\n') };
}
