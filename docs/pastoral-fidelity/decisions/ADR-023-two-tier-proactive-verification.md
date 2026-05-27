# ADR-023 — Verificación proactiva de dos niveles (tripwire inline + gate completo)

## Estado

`accepted` — aceptado 2026-05-27 al arrancar `/iniciar-fase 1.6`.

## Fecha

2026-05-27

## Contexto

Fase 2 ([ADR-011](./ADR-011-three-witnesses-multi-witness-orchestrator.md)) implementó el
`WitnessOrchestrator` como **gate único al final** del seed (antes del borrador). El spec
metodológico externo propone un verificador anti-eiségesis solo en el paso 7 (principio).
**Ambos son reactivos tardíos.**

El fundador identificó la falla: la eiségesis **se compone**. Si un pastor escribe una idea
errada temprano (ej. "no existe la Trinidad"), todas sus observaciones, idea central y aplicación
quedan contaminadas. Al llegar al gate final hay N avisos en cascada — cuando se pudo atajar en
la **fuente**, inline, antes de que infecte aguas abajo. El spec pide que la IA sea "un experto
útil que mejora y agiliza"; ser proactivo sin volverse la voz es la clave.

Tensión a resolver: el manifesto (P1 labor antes que output; productive struggle / Kapur) prohíbe
que la IA pre-empte el descubrimiento del pastor. Un verificador demasiado eager (a) se vuelve la
voz, (b) cortocircuita la lucha del pastor con el texto.

## Decisión

**Verificación de dos niveles**, ambos reusando el `WitnessOrchestrator` + escalado puro
(`escalateClaim`) de Fase 2 (no un segundo motor):

### Tier 1 — tripwire inline `core`-only

- Dispara cuando el pastor completa un campo doctrinalmente cargado: `insight.centralIdea`,
  `insight.observations`, `timelessPrinciple`. Debounced (no por keystroke).
- Corre **solo Testigo 3 nivel `core`** (riesgo de negar credo ecuménico).
- Si `core` + disenso → aviso inline no-bloqueante con evidencia ("esta afirmación tensiona la
  doctrina de la Trinidad; revísala antes de seguir"). **No escribe la interpretación correcta.**
- **Silencio total en `distinctive` / `open-evangelical`** inline. Esas son interpretaciones
  legítimas hasta el gate completo — meterse ahí temprano viola productive struggle.
- **Guardrail duro**: el tripwire es verificador, NUNCA generador. Marca riesgo + evidencia;
  el pastor decide y reescribe. Registrado en `AiAssistLog` (`assistType: eisegesisCheck`).

### Tier 2 — gate completo (paso 7 + pre-borrador)

- Three-witnesses completos (T1+T2+T3, todos los niveles) sobre todos los claims, **+ check de
  generalización** del principio atemporal (¿demasiado abstracto para ser de cualquier texto? /
  ¿demasiado específico para transferir? / ¿se funda en los pasos 1-6 del propio pastor?).
- Como el `core` ya se atajó inline, el gate es **refuerzo + capa distinctive/open**.
- Escalado idéntico a Fase 2 (`escalateClaim`): note/soft/hard/absolute. `core` que llegue aquí
  sin resolver sigue siendo `absolute-block`.

### Reuso

- `escalateClaim`, `aggregateWitnessResult`, `canProceedFromWitnesses` (domain, Fase 2): sin cambios.
- `validateSeedWitnesses` callable: se parametriza para correr en modo `inline-core` (solo T3 core,
  1 claim) o `full-gate` (todos los testigos, todos los claims). El cache `witnessResults/` se
  reusa con key que distinga el modo.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Solo gate final (status quo Fase 2) | Reactivo tardío; la eiségesis ya contaminó aguas abajo. |
| Verificador inline en todos los niveles | Viola productive struggle — hand-holding sobre interpretación legítima; la IA se vuelve la voz. |
| Segundo motor de verificación para el paso 7 | Duplicación. El `WitnessOrchestrator` ya es "verificador no generador". |
| Tripwire que bloquea inline | Demasiado intrusivo mid-escritura; el aviso no-bloqueante respeta autoría. |

## Consecuencias

### Positivas
- Ataja eiségesis `core` en la fuente, antes de contaminar el seed completo (escenario del fundador).
- Preserva productive struggle: silencio en distinctive/open inline.
- Reuso total del motor de Fase 2 — esfuerzo incremental bajo.
- El paso 7 se vuelve refuerzo, como predijo el fundador.

### Negativas
- Más llamadas LLM (inline checks). Mitigado: debounce + cache + solo T3-core (1 testigo, 1 claim).
- Riesgo de falsos positivos `core` molestos. Mitigado: threshold `confidence ≥ 0.6` (Fase 2) +
  feedback "no era preciso" + curated `CORE_DOCTRINE_CLAIMS` como ancla.

### Neutrales
- `witnessReview` (Fase 2) se generaliza para registrar resoluciones inline + de gate.

## Impacto

- **Functions**: `validateSeedWitnesses` parametrizado (modo inline-core / full-gate); cache key con modo.
- **Web**: hook inline debounced en los campos cargados; aviso no-bloqueante en `InsightStep` + `TimelessPrincipleStep`; gate completo reusa `WitnessGate`.
- **Domain**: sin cambios al escalado puro; quizá helper `collectCoreTripwireClaim`.
- **Reversibilidad**: alta — el tier 1 es aditivo; apagarlo deja el gate de Fase 2 intacto.

## Referencias

- Reusa: [ADR-011](./ADR-011-three-witnesses-multi-witness-orchestrator.md)
- Honra: P1 (productive struggle) del manifesto [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)
- Phase doc: [phase-1-6-context-genre-principle.md](../phases/phase-1-6-context-genre-principle.md)
