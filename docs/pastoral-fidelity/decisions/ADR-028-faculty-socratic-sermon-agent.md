# ADR-028 — Faculty Socratic Sermon Agent (guided conversational construction of the `pastoralSeed`)

## Estado

`accepted` — aceptado 2026-05-28 al arrancar Fase 2.5 PR B. Supersede parcialmente ADR-025 §"Opción B"
(la integración Faculty ↔ seed no usa clasificador de chat libre; ver Decisión).

## Fecha

2026-05-28

## Contexto

Fase 2.5 PR A (ADR-025) entrega el Acompañante de Estudio en el wizard form-based: badge cualitativa
de 7 dimensiones colgada del `pastoralSeed` + per-step orientation pull-first. La hipótesis original
para PR B fue **clasificar mensajes Faculty libres** y mezclar evidencia inferida + estructurada en
el mismo modelo de cobertura.

Durante el kickoff de PR B, el fundador propuso un diseño superior: Faculty deja de ser "chat libre
que pare sermón" y se vuelve **agente socrático que recorre los 8 pasos conversacionalmente** cuando
el pastor entra al modo guiado. Analogía propia: el wizard form-based es la IDE, Faculty guiado es
la consola — misma máquina, dos interfaces.

Esto elimina la necesidad del clasificador (cada respuesta del pastor ES la evidencia estructurada),
honra más fuerte P1/P2/P3 (el pastor escribe cada palabra del seed por sí mismo, con guía socrática
cuando el método se desvía) y unifica la arquitectura: **`pastoralSeed` es la única fuente de verdad**
sin importar la superficie.

## Decisión

### 1. Faculty Socratic Sermon Agent

Bajo el sub-flag `study_depth`, Faculty incorpora un **modo "Guía de sermón"** que:

- Convierte la conversación en un **walkthrough de los 8 pasos** del `pastoralSeed`.
- Por cada paso: el agente pregunta lo que el paso requiere, el pastor responde, el agente valida
  (usando los **mismos validators puros del domain Fase 1.6** — `validateReading`, etc.), y persiste
  la respuesta como la voz del pastor en el campo correspondiente del seed.
- Si la respuesta es insuficiente (longitud, vacío, off-topic) → el agente orienta socráticamente
  (mismo patrón que `orientStudy` de ADR-026).
- Si el agente detecta **error de método** (género equivocado UC3, salto exegético, regla de
  lectura inconsistente con el género) → confronta nombrando el error + reformulando como pregunta.
  **Nunca escribe la respuesta correcta.**
- Para pasos **AI-forbidden de generación** (`reading`, `timelessPrinciple`, `insight`): el agente
  SOLO pregunta + valida longitud/estructura; NUNCA propone contenido. Detecta paste events.
- Cuando los 8 pasos pasan sus validators → `pastoralSeed.completed === true` → CTA al wizard, que
  aterriza al pastor directo en homilética (no en estudio — ya está hecho).

### 2. Arquitectura — State Machine + Strategy + Clean Architecture

**Disciplina canónica para agentes en este proyecto** (esta ADR la deja escrita).

#### Capas

| Capa | Responsabilidad | Files |
|---|---|---|
| **domain/guided-sermon/** | Entidades puras + state machine + policies | `GuidedSermonSession`, `GuidedSermonStateMachine`, `IStepPolicy`, 8 step policies, `StepPolicyRegistry`, `SocraticTurn` types |
| **application/use-cases/guided-sermon/** | Orquestación (depende de ports) | `ActivateGuidedSermonUseCase`, `RunSocraticTurnUseCase`, `PauseGuidedSermonUseCase`, `CompleteGuidedSermonUseCase` |
| **infrastructure/** | Adapters concretos | Extensión de `FirestoreAIChatRepository` para `guidedSermonSession`; reuso `GeminiLlmClient` de PR A |
| **functions/guided-sermon/** | Callables thin | `runSocraticTurn`, `activateGuidedSermon` |
| **web/components/faculty/** + hook | UI thin | `useGuidedSermon`, `GuidedSermonHeader`, `GuidedSermonActivationPrompt` |

#### Patrón Strategy: `IStepPolicy`

Cada paso del seed implementa el mismo interface — la lógica per-paso está encapsulada en su clase,
NO esparcida en switches del orquestador.

```ts
interface IStepPolicy {
  readonly stepKey: PastoralSeedStepKey;

  /** True en `reading`, `timelessPrinciple`, `insight`. Bloquea persistir contenido del LLM. */
  readonly isAiGenerationForbidden: boolean;

  /** Construye el system prompt del LLM con el contrato del paso inyectado. */
  buildSystemPrompt(ctx: TurnContext): string;

  /** Parsea la respuesta del LLM en una estructura tipada (no string libre). */
  parseLlmReply(raw: string): SocraticTurnOutput;

  /** Validación previa al persist — reusa validators puros del domain Fase 1.6. */
  validatePastorInput(value: unknown): StepValidationResult;

  /** Detecta error de método (UC3 género / estructura / salto exegético). null = ok. */
  detectMethodError(pastorMessage: string, ctx: TurnContext): MethodErrorReport | null;

  /** Cómo persistir la respuesta del pastor al seed (path específico al paso). */
  persistTo(seed: PastoralSeed, pastorInput: string): Partial<PastoralSeed>;
}
```

**Beneficios SOLID:**
- **SRP**: cada policy tiene UNA razón para cambiar (su paso).
- **OCP**: agregar paso 9 = nueva policy + registro. Cero cambio al `RunSocraticTurnUseCase`.
- **LSP**: el orquestador trata cualquier `IStepPolicy` como intercambiable; sin special-casing.
- **ISP**: el orquestador depende del interface chico, no de un God service.
- **DIP**: orquestador depende de la abstracción `IStepPolicy`; concretas inyectadas vía
  `StepPolicyRegistry`.

#### State Machine puro

`GuidedSermonStateMachine` es **función pura** sobre `GuidedSermonSession`:
- `advance(state, completedStepKey)` → `state'` con `currentStep` = siguiente.
- `retry(state, stepKey)` → incrementa `stepAttempts[stepKey]`.
- `back(state, toStep)` → permite retroceder (solo a pasos ya iniciados).
- `complete(state)` → `status: 'completed'` cuando todos validan.

**Testable sin LLM ni Firestore**. Invariantes pinned por tests.

#### Use Case: `RunSocraticTurnUseCase` (thin orchestrator)

```
ejecutar(input: { sessionId, pastorMessage }):
  1. cargar session + seed
  2. policy = registry.get(session.guidedSermonSession.currentStep)
  3. validación previa: si paste-event detectado, log y notar (no bloquea)
  4. methodError = policy.detectMethodError(pastorMessage, ctx)
     si methodError → devolver { kind: 'confront', report: methodError }
                       sin avanzar estado
  5. validation = policy.validatePastorInput(pastorMessage)
     si !validation.valid → policy build orientation prompt; LLM call; devolver { kind: 'orient', orientation }
                            stateMachine.retry()
  6. patch = policy.persistTo(seed, pastorMessage)
     repo.update(seed.id, patch)
  7. nextState = stateMachine.advance(state, policy.stepKey)
     repo.updateGuidedSermon(sessionId, nextState)
  8. si nextState.currentStep === último completado + completo → CompleteGuidedSermonUseCase
  9. devolver { kind: 'accepted', nextStep, agentReply }
```

Sin switches. Cada decisión está en la policy del paso. El use case es pura coordinación.

### 3. Garantías invariantes (testables como contratos)

| Invariante | Test |
|---|---|
| Pasos AI-forbidden de generación NUNCA reciben contenido del LLM al persist | `policy.parseLlmReply` para esos pasos devuelve `persistField: undefined` o lanza; test pinea. |
| State machine puro | Unit tests sin mocks; entradas → salidas. |
| Validators del agente = validators del wizard | Test de equivalencia: `validateReading(seed.reading)` da el mismo resultado que `policy.validatePastorInput(input)`. |
| Paste audit consistente con wizard | Test: paste > umbral dispara `PasteEvent` igual que el form. |
| `AiAssistType: 'socraticGuidance'` cada turno aceptado | Test: turn accepted → log append-only. |
| Provider swap-ready | `RunSocraticTurnUseCase` depende de `ILlmClient` (no de `GeminiLlmClient`). |
| AI-forbidden steps tienen `isAiGenerationForbidden: true` | Test del registry: assert flags match `AI_ASSIST_FORBIDDEN_STEPS` + `timelessPrinciple`. |

### 4. Persistencia

**Nuevo campo opcional en `AIChatSession`**:

```ts
interface AIChatSession {
  // ... existing fields
  guidedSermonSession?: GuidedSermonSession;
}

interface GuidedSermonSession {
  seedId: string;
  currentStep: PastoralSeedStepKey;
  status: 'active' | 'paused' | 'completed';
  stepAttempts: Record<PastoralSeedStepKey, number>;
  startedAt: Date;
  completedAt?: Date;
  /** Snapshot del pasaje al activar (para que el agente lo tenga sin re-fetch). */
  passage: string;
}
```

Persistido por `IAIChatRepository.updateGuidedSermonSession(sessionId, ...)`. Mismas rules
(owner-only).

### 5. Tres entradas al modo guiado (UX)

| Entrada | Comportamiento bajo flag `study_depth` |
|---|---|
| **Home page chip "Bosquejo de Sermón"** (`packages/web/src/pages/faculty/index.tsx`) | Crea sesión con `guidedSermonSession.status = 'active'` desde msg 1. Sin flag → comportamiento actual (pre-fill prompt). |
| **Recursos > Crear "Bosquejo de Sermón"** mid-chat (`FacultyExtractionPanel`) | Muestra `GuidedSermonActivationPrompt` ("¿activar guía paso a paso?") en vez de `SermonOutlinePreviewModal`. Sin flag → comportamiento actual (PR #214 path). |
| **NLU intent detection** (futuro, no v1) | Si pastor dice "ayúdame con un sermón de X", el sistema detecta intención + propone activar. Deferido. |

**Backward compatibility**: con `study_depth` off, todo el path PR #214 sigue funcionando intacto.

### 6. Reuso de PR A

- **`pastoralSeed` schema + validators**: sin cambios. Mismo artefacto.
- **`StudyDepthBadge`**: aparece en Faculty también cuando hay `guidedSermonSession` (badge muestra
  progreso 8-pasos del seed igual que en wizard).
- **`AiAssistLog`**: extender `AiAssistType` con `'socraticGuidance'` (turn aceptado) y
  `'socraticConfrontation'` (UC3 confrontación en chat).
- **`orientStudy` callable**: NO se reusa directamente; el system prompt del agente incorpora la
  capacidad de orientar inline. Trade-off: 1 LLM call/turno vs 2. Más simple, mismo costo unitario.
- **`GeminiLlmClient` adapter**: 100% reusado. Patrón `LlmClient` local (decoupling functions↔domain
  ya documentado en ADR-025).

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Clasificador de Faculty libre** (plan original PR B) | Dos motores conceptuales (form + chat), mezcla de voces, "% tuyo" cuestionable, complejidad de merge structured+inferred. |
| **God service `SocraticAgent`** con `switch(stepKey)` | Viola OCP/SRP. Agregar paso = tocar la única clase. No testable per-paso aisladamente. |
| **Llamar a `orientStudy` separadamente para orientar** | Doble LLM call por turno inválido. Más complejo el orquestador. |
| **Modo guiado como `ResponseMode` nuevo** | `ResponseMode` es estilo (longitud/registro), no funcionalidad. Mezcla ejes ortogonales. |
| **Colección separada para `GuidedSermonSession`** | El estado pertenece a la sesión Faculty (1:1); subdoc/field es más natural y atómico. |
| **Faculty produce outline → wizard step 3** (status quo PR #214) | Salta el estudio personal del pastor (viola P1). Es exactamente lo que esta fase corrige. |

## Consecuencias

### Positivas
- **Una sola fuente de verdad**: el `pastoralSeed`. Form y chat son dos superficies del mismo proceso.
- **P1/P2/P3 más fuerte**: el pastor escribe cada palabra; el agente confronta sin escribir.
- **Arquitectura canónica para agentes** futuros (faculty docente, faculty pastoral, etc.) — el
  patrón `IStepPolicy` + state machine + use case se reusa.
- **Escalable**: nuevos pasos / nuevos tiers / nuevos LLMs sin tocar el orquestador.
- **Testabilidad alta**: capas puras (domain) testeables sin infra.

### Negativas
- **Costo por sesión**: ~30 LLM calls (1 por turno × ~3-4 turnos por paso × 8 pasos) ≈ $0.05-0.10
  vs ~$0.02 del clasificador batched. Aceptable por el valor formativo.
- **Prompt engineering exigente**: cada step policy tiene su system prompt con guarantees fuertes
  (no escribir respuesta en AI-forbidden, confrontar UC3, etc.). Tests + snapshots pin behavior.
- **Latencia percibida**: cada turno es 1 LLM call. UX: streaming + estado "agente piensa…".

### Neutrales
- PR #214 sigue funcionando bajo flag off. Cuando se decida deprecar, se borra detrás de seguridad.

## Impacto

- **Domain**: nuevo módulo `guided-sermon/` (entity + state machine + 8 policies + registry + types);
  extiende `AIChatSession` con campo opcional; extiende `AiAssistType` con `socraticGuidance` y
  `socraticConfrontation`.
- **Application**: 4 use cases nuevos en `use-cases/guided-sermon/`.
- **Infrastructure**: 2 métodos nuevos en `FirestoreAIChatRepository`
  (`updateGuidedSermonSession`, `clearGuidedSermonSession`).
- **Functions**: 2 callables (`runSocraticTurn`, `activateGuidedSermon`).
- **Web**: hook + 2 componentes + integración 3 entradas en Faculty (home chip + extraction card +
  chat send override).
- **Firestore rules**: ninguna nueva (la sesión ya tiene rules; el campo es interno).
- **Migración**: ninguna (campo opcional aditivo).
- **Reversibilidad**: alta — todo detrás de `study_depth` flag (default off).

## Referencias

- Phase doc: [phase-2-5-study-depth-copilot.md](../phases/phase-2-5-study-depth-copilot.md)
- Modelo de cobertura + Opción B: [ADR-025](./ADR-025-study-companion-unified-model.md)
- Orientación per-paso (verifier-orienter pull-first): [ADR-026](./ADR-026-step-orientation-supersede-silence.md)
- Override + modo experto (PR C): [ADR-027](./ADR-027-override-and-expert-mode-policy.md)
- Manifesto P1/P2/P3: [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)
- Tech debt LLM provider abstraction: `memory:tech_debt_llm_provider_abstraction`
- Patrón canónico de duplicación de tipos functions↔domain: ver comentarios en
  `validateSeedWitnesses.ts` / `migratePastoralSeedsEightStep.ts`.
