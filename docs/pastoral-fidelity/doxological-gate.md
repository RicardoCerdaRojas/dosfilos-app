# Gate doxológico — diseño, principios y criterios de adjudicación

> Estado: **sombra en prod (verificada)**. Enforce (C/D) **pendiente de datos de sombra reales**.
> Última actualización: 2026-06-17.

Cierre de la **grieta del `doxologicalApplication`**: la dimensión afectiva del sermón
podía llegar a publicación **sin confrontación contra el texto** ("proof-texting afectivo")
en tres huecos — flag off, flujo guiado, write-time. Esta es la única pieza que toca el
path del sermón en producción, detrás del flag `three_witnesses`.

Este documento es el registro técnico del gate y, sobre todo, **los criterios que el
fundador necesita enfrente al leer la data de sombra**.

---

## 1. Principio de fail-mode (doctrina, no número)

**Contenido NUEVO + gate no verificable = NO avanza. Fail-closed.**

Razón: la tesis del producto es "confronta ANTES de dejar publicar". Fail-open volvería la
confrontación best-effort y, peor, convertiría el modo de fallo en **bypass** (tumbar la
llamada = pasar sin confrontar). Inaceptable para el claim que define el producto.

La sombra **no decide el principio** — informa su **viabilidad** (la tasa real de fallo del
callable). Si la sombra muestra fallo alto, eso es un problema de **fiabilidad** que se
arregla ANTES de enforce; no es excusa para fail-open.

**Asimetría correcta (legacy vs nuevo):**
- **Legacy** sin veredicto (seed pre-puente-de-compat) → **pasa** como `sin_auditar`. Backward-compat: ningún estudio existente deja de funcionar.
- **Nuevo** sin veredicto → **bloquea** (fail-closed). La tesis.

**Matiz de latencia (refinamiento 2026-06-17):** distinguir dos estados que NO son lo mismo:
- **VEREDICTO PENDIENTE** — la validación está en vuelo (verificable, aún no terminó) → **espera / spinner, NUNCA hard-blockea**.
- **SIN VEREDICTO genuino** — nunca corrió o falló (no verificable) → **bloquea** per fail-mode.

"Pending ≠ no verificable." Bloquear contenido sano por ir más rápido que la validación de
fondo sería **fail-closed-por-latencia**, y es un bug, no la tesis. Ver §5.

---

## 2. Criterios de adjudicación del FP-candidato

El gate reusa los **tres testigos** (motor único de fidelidad): Testigo 1 (contexto
inmediato / derivación del texto), Testigo 2 (paralelos canónicos), Testigo 3 (tradición
histórica / nivel doctrinal). La escalación es `level × dissent-count → pass/note/soft-block/hard-block/absolute-block`.
El gate doxológico pliega: `pass|note → pass`, `soft-block → soft`, `hard-block|absolute-block → hard`.

Al revisar la muestra de sombra, **un falso-positivo = el gate marcó una aplicación que SÍ
se derivaba del texto.** Dos lentes para adjudicar:

| Señal | Lectura | ¿Bloqueo correcto? |
|---|---|---|
| **No deriva del texto** (Testigo 1 disiente: el afecto importa conceptos ajenos al pasaje) | El afecto no se desprende del texto estudiado → proof-texting afectivo | **SÍ — bloqueo correcto.** Es exactamente lo que el gate debe atrapar. |
| **Toca doctrina core** (Testigo 3 clasifica core → cualquier disenso escala a absolute-block) | Una observación textual menor escala a bloqueo duro por tocar core | **POSIBLEMENTE mal calibrado** — bump a revisar. Doctrina sana puede quedar hard-blocked por no salir del versículo exacto. |

**Caso real del smoke (Juan 1:1):** "A Cristo puedes rechazarlo o creer; es la única manera
de ser salvos y no perecer" → **absolute-block** ("Límite cristiano clásico"). Es doctrina
**ortodoxa** (Juan 14:6, Hechos 4:12; Testigos 2 y 3 concuerdan), pero Testigo 1 disiente
("salvación/perecer no están en Juan 1:1") y toca core → escala a hard. **¿Bloqueo correcto
(afecto ajeno a Juan 1:1) o FP (doctrina sana sobre-bloqueada)?** Esta es la llamada de juicio
experto que la sombra existe para alimentar.

> Nota de muestra: el juicio de un superadmin con formación sobre el FP es válido y útil.
> Pero el superadmin **no escribe proof-texting afectivo**, así que el **delta `oneShotVerdict`**
> sobre su input NO representa la población objetivo. El delta necesita **usuarios reales**.

---

## 3. Arquitectura — capas (todas `default-off` = inertes)

| Capa | Qué | Dónde |
|---|---|---|
| **0** | `evaluateDoxologicalGate(WitnessResult)` — colector puro que estrecha los 3 testigos al claim doxológico (pass/soft/hard). Reusa la escalación, sin re-thresholdear. | `domain/entities/WitnessValidation.ts` |
| **1** | Modo **sombra** (corre + loguea, NO bloquea). Wizard (reusa el WitnessResult del one-shot, cero llamadas nuevas, no toca `canProceedFromWitnesses`) + guided-insight (desacoplado, fail-open). | `web/lib/doxologicalShadow.ts`, `WitnessGate.tsx`, `useGuidedSermonIntegration.ts`, callable `recordDoxologicalGateShadow` |
| **1.5** | Shadow del **socrático** (texto libre en chat autora el doxológico vía `InsightStepPolicy.persistTo`). `failureCause` enum. | `useGuidedSermonIntegration.ts` (`trySocraticSubmit`) |
| **2.B** | **Puente de compat**: persiste `seed.doxologicalGate` `{fingerprint, status, escalation, validatedAt, override:null, legacy?}`. Normalizador + fingerprint compartidos (re-entrante). Aditivo, inerte. | `domain/entities/WitnessValidation.ts`, `PastoralSeedService.persistDoxologicalGate` |

**Tres rutas de autoría del doxológico** (todas verificadas grabando en prod, smoke 2026-06-17):
`wizard` · `guided-insight` (formulario) · `guided-socratic` (texto libre en chat, paso Insight).

---

## 4. Telemetría de sombra

Colección `doxologicalGateShadow/` (super_admin-read; server-write vía callable con App Check;
TTL nativo 90d sobre `expiresAt` como backstop, purga real manual tras la decisión de flip).

Campos por fila: `flow` (wizard|guided-insight|guided-socratic|guided-wordstudies), `status`
(pass|soft|hard), `escalation` (banda cruda), `oneShotVerdict` (pass|block|null), `witnessLatencyMs`,
`cacheHit`, `failure`, `failureCause` (timeout|error-callable|app-check|otro), `doxologicalText`,
`seedId`, `sermonId`, `userId`, `createdAt`, `expiresAt`.

**Los 2 cortes que reabren C/D (sobre datos de usuarios reales):**
1. **Delta `oneShotVerdict`** — filas guiadas con `status ∈ {soft,hard}` y `oneShotVerdict = null`
   = la fuga que prod deja pasar HOY (el guiado no tiene one-shot). En wizard `oneShotVerdict`
   nunca es null (el doxológico es claim del one-shot) → el delta solo se ve en guiado.
2. **Tasa + causa de `failure`** (enum) — decide si fail-closed es vivible o si hay que endurecer
   el callable antes. Latencia: computar p95/p99 **solo sobre `cacheHit=false`** (las cacheadas
   deflactan el percentil).

**Criterios de flip (todos verdaderos):** sombra ≥20 Insights **Y** ≥7 días (ambos piso) ·
FP <10% (adjudicado por el fundador sobre la muestra) · latencia/fiabilidad resueltas (§5).

---

## 5. Diseño de enforce (C/D) — NO codear hasta los datos

Flag `doxological_enforce` (per-claim; off=sombra, on=bloquea; **reversible sin redeploy**).
`three_witnesses` sigue master (el gate corre). Default off.

**Chokepoint** server-side: `PastoralSeedService.savePatch` (`wasCompletedBefore`, detecta la
transición false→true a `completed`). En CADA transición→completed:
- `normalizeDoxological(texto vacío)` → **pass-through** (no gatea; invariante `completed ⟹ doxological ≥80`).
- Recomputa `doxologicalFingerprint(texto actual)` y compara con `seed.doxologicalGate.fingerprint`:
  - **match + pass** → permite.
  - **match + soft/hard con override válido** (override ligado a ESE fingerprint, `response` ≥ umbral existente) → permite.
  - **mismatch** (texto editado desde la última validación) → **stale** → bloquea / re-valida.
  - **sin veredicto**: legacy (pre-2.B) → `sin_auditar` pass; nuevo → bloquea (fail-mode).
- **Re-entrante**: el override SIEMPRE se limpia (`null`) al re-correr el gate → editar a un
  texto peor invalida el override viejo; hay que re-justificar contra el fingerprint nuevo.

**Cobertura no-bypass:** las rutas que voltean `completed` sin tocar el doxológico
(word-studies, socrático-que-completa-otro-paso) NO re-autoran el afecto → el fingerprint
matchea → heredan el veredicto previo. No es bloqueo a ciegas.

**Requisitos duros de latencia (input del smoke, §1 matiz):**
- (a) **min-instances** para matar el cold start (24s en frío, y el frío es el caso MODAL por uso baja-frecuencia).
- (b) **Scopear el callable a doxológico-only** (1 claim, no ~6 → prompt chico → mucho más rápido).
- (c) **PENDIENTE vs SIN-VEREDICTO**: validación en vuelo → spinner/espera, nunca hard-block; solo fallo/ausencia genuina → bloquea.

---

## 6. Interacciones y bordes abiertos

- **Producto — chat = aclaración-only en pasos con formulario** (decisión 2026-06-17, ticket
  aparte por mérito pedagógico): el chat queda disponible para preguntar/entender pero NO
  autora el paso; el formulario es el único envío. Si entra, **muere la ruta `guided-socratic`
  de autoría** → enforce solo necesita wizard + guided-insight. Capa 1.5 queda defensiva hasta
  entonces; NO removerla antes.
- **"Manos" / aplicación de conducta**: el seed del sermón tiene UN solo campo de aplicación
  (`doxologicalApplication`, afectiva). No hay campo de conducta → nada que gatear ahí hoy.
  Borde abierto: si se agrega, hereda el patrón (su propio `conduct_enforce`).
- **Atribución / no tocar**: el gate no toca `inject.ts`, `render/`, `validatePlan.ts`, los
  prompts del sermón, ni `WitnessGate.tsx` `canProceedFromWitnesses` (one-shot intacto).

---

## 7. Estado y siguiente paso

- ✅ Capas 0/1/1.5/2.B — PR #354 mergeado + deployado. Smoke prod: 3 rutas verificadas.
- 🔴 **Runtime (fundador):** encender `three_witnesses` (+`study_depth` para guiado) en cuentas
  REALES; arrancar reloj de sombra (≥20 Insights Y ≥7 días); política TTL en GCP.
- 🟠 **C/D enforce** — espera los 2 cortes (delta + tasa/causa failure). Diseño en §5.
- 🟡 Tickets aparte (go del fundador): chat=aclaración-only; scopear latencia.

**PAUSA total en C/D hasta datos de sombra de usuarios reales.**
