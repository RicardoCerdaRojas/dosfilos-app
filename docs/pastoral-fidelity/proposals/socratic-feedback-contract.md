# Propuesta — Contrato de feedback socrático (afirmar + enrutar + nudge)

> **Estado:** ACTIVA (2026-06-08). Follow-up #2 del smoke del estudio guiado.
> **ADR:** [ADR-034](../decisions/ADR-034-socratic-feedback-contract.md).
> **Extiende:** [ADR-028](../decisions/ADR-028-faculty-socratic-sermon-agent.md) (Acompañante Socrático). NO lo duplica.
> **Branch:** `feat/socratic-feedback-contract` (apilada sobre `feat/sermon-versions` / PR #319).

## Problema

Tras el smoke del estudio guiado de 8 pasos, el feedback del agente en cada
turno aceptado es genérico ("Gracias por compartir… Paso 2"). No:

1. **Afirma un acierto concreto** del trabajo del pastor.
2. **Captura ni enruta las dudas** que el pastor plantea (se pierden, o peor:
   el agente cae en la tentación de responderlas → viola P1/P2).
3. **Invita a profundizar** cuando el aporte es delgado pero aceptable.

## Objetivo

Cada turno (accept + orient) entrega feedback formativo que **afirma**,
**enruta dudas sin responderlas**, y **hace nudge** — todo manifiesto-seguro.

## Contrato de feedback

En cada turno **aceptado**, `agentReply` debe:

1. **Afirmar 1 acierto concreto** citando una frase del pastor. ≤2 frases.
   Nunca "excelente" pelado. Si el aporte es flojo → **omitir afirmación** y
   hacer nudge.
2. **Si el pastor planteó duda/pregunta** → reconocerla en una cláusula +
   **dirigirla al paso que la trabaja**, SIN resolverla.
3. **Nudge** opcional a profundizar.

### Mapa de enrutado de dudas

| Tipo de duda | Paso que la resuelve |
|---|---|
| Significado de palabra / doctrina | Paso 4 (palabras) + Paso 5 (paralelos) |
| Estructura / argumento | Paso 3 (estructural) |
| Audiencia / aplicación | Paso 6 (función) / 7 (principio) / 8 (insight) |

Regla dura (P1/P2): **NUNCA resolver la duda doctrinal — solo señalar el
paso. Respetar la pluralidad confesional.**

## Secuencia de implementación (4 PRs)

### PR 1 — Enriquecer prompts (núcleo, bajo riesgo)
- Extender `BASE_SYSTEM_GUARDS` (`_shared.ts`) con el contrato de feedback +
  el mapa de enrutado.
- Solo strings de prompt → aplica a los 8 pasos. Valor inmediato.

### PR 2 — Captura determinista de dudas (fiabilidad + provenance)
- Helper puro `detectRaisedDoubt(message)` (heurística: `?`, "no estoy
  seguro", "me pregunto", "no sé si").
- Nuevo campo `PastoralSeed.openDoubts: { step, text, routedTo }[]` →
  persistir dudas para que no se pierdan y resurjan (Paso 8 `openQuestion`
  o wizard).
- El use-case enruta determinísticamente (no solo confiando en el LLM).

### PR 3 — Afirmación estructurada en UI (pulido)
- `affirmation?` + `routedDoubt?: { text, toStep }` en
  `SocraticAcceptedOutput`.
- Render: afirmación como chip sutil + duda enrutada como pill
  "📌 guardada para Paso X".

### PR 4 — Rúbrica de acierto por paso (profundidad)
- Cada policy define qué cuenta como acierto en SU paso. El prompt usa la
  rúbrica → afirmaciones específicas, no genéricas.

## Tests
- Snapshot: el prompt incluye el contrato (afirmar/enrutar/nunca-responder).
- `detectRaisedDoubt` unit tests.
- `openDoubts` persistencia + resurgir en Paso 8.
- Golden cases: una duda doctrinal se enruta y la respuesta NO contiene
  resolución.

## Riesgos + mitigación
- **Adherencia del LLM** (a veces responde la duda) → prompt fuerte + casos
  golden; el guard duro real lo da contra-scan/fidelity (capa aparte).
- **Sobre-afirmación** (todo "genial" diluye) → rúbrica + "afirma solo un
  acierto REAL y específico; si es flojo, omite y haz nudge".

## Orden recomendado
PR1 → PR2 → PR3/PR4.
