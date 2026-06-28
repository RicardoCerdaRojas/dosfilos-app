# Planes de membresía — acceso a módulos, funcionalidades y cuotas

> **Generado:** 2026-06-17
> **Fuentes canónicas (código):**
> - Cuotas de procesamiento/consultas: [`packages/functions/src/admin/migratePlanQuotas.ts`](../packages/functions/src/admin/migratePlanQuotas.ts) (valores realmente sembrados en Firestore `plans/`)
> - Cuota de exégesis (USD): [`packages/domain/src/entities/PlanDefinition.ts:67-82`](../packages/domain/src/entities/PlanDefinition.ts#L67-L82) + backfill [`backfillExegesisQuotas.ts`](../packages/functions/src/admin/backfillExegesisQuotas.ts)
> - Metadata + features por plan: [`packages/domain/src/config/planMetadata.ts`](../packages/domain/src/config/planMetadata.ts)
> - IDs canónicos: [`packages/domain/src/config/planIds.ts`](../packages/domain/src/config/planIds.ts)
> - Gating módulos/features: [`packages/application/src/services/AuthorizationService.ts`](../packages/application/src/services/AuthorizationService.ts) + enums [`packages/domain/src/entities/Feature.ts`](../packages/domain/src/entities/Feature.ts)

---

## 1. Planes existentes

| ID interno | Nombre visible | Precio/mes | Público | Trial | Stripe Price ID |
|------------|----------------|-----------:|:-------:|:-----:|-----------------|
| `free`  | Free *(legacy/sampling)* | $0     | No\* | — | — (sin Stripe) |
| `basic` | **Personal** | $9.99  | Sí | 30 días | `price_1Snh3X08MCNNnSDL4izMKQex` |
| `pro`   | **Pro**      | $14.99 | Sí | 30 días | `price_1Snh5U08MCNNnSDLVggbHmWm` |
| `team`  | **Equipo**   | $24.99 | Sí | 30 días | `price_1SgDiK08MCNNnSDL3mCVFwl4` |

\* `free` está marcado `isPublic: false` (nombre "Gratis (Legacy)") — se mantiene como **tier de muestra con funciones limitadas**, no como producto promocionado. Cuando un usuario no tiene suscripción activa, el sistema cae al comportamiento "Free" por defecto (ver §5).

> Planes legacy ocultos para back-compat: `starter` ("Pro (Legacy)", $9.99). No se ofrecen.

---

## 1.bis Tabla comparativa maestra

Leyenda: ✅ incluido · ❌ no incluido · ∞ ilimitado · 🔒 bloqueado.

| | **Free** | **Personal** | **Pro** | **Equipo** |
|---|:---:|:---:|:---:|:---:|
| **Precio/mes** | $0 | $9.99 | $14.99 | $24.99 |
| **ID interno** | `free` | `basic` | `pro` | `team` |
| **Trial** | — | 30 días | 30 días | 30 días |
| **— MÓDULOS —** | | | | |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Sermones (editor) | ✅ | ✅ | ✅ | ✅ |
| Configuración | ✅ | ✅ | ✅ | ✅ |
| Generador asistido | ❌ | ✅ | ✅ | ✅ |
| Biblioteca personal | Limitado | ✅ | ✅ | ✅ |
| Planes de predicación | ❌ | ❌ | ✅ | ✅ |
| Tutor griego/palabra | Por cuota | Por cuota | Por cuota | Por cuota |
| Exégesis | 🔒 | 🔒 | ✅ | ✅ |
| **— FEATURES —** | | | | |
| Crear sermón | ✅ | ✅ | ✅ | ✅ |
| Exportar PDF | ✅ | ✅ | ✅ | ✅ |
| Subir docs | ✅ | ✅ | ✅ | ✅ |
| Asistente de redacción | ❌ | ✅ | ✅ | ✅ |
| Búsqueda semántica | ❌ | ❌ | ✅ | ✅ |
| Homilética avanzada | ❌ | ❌ | ❌ | ✅ |
| Plantillas propias | ❌ | ❌ | ❌ | ✅ |
| **— CUOTAS MENSUALES —** | | | | |
| Consultas (queries)/mes | 50 | 500 | 2,000 | ∞ |
| Sesiones Hebreo/mes | 2 | 5 | ∞ | ∞ |
| Páginas Standard/mes | 0 | 800 | 2,500 | 5,000 |
| Páginas Premium/mes | 0 | 40 | 150 | 300 |
| Exégesis USD/mes | $0 🔒 | $0 🔒 | $10 (≈5 est.) | $30 (≈15 est.) |
| **— BIBLIOTECA —** | | | | |
| Docs máx. | 0 | 15 | 50 | 200 |
| Almacenamiento | 0 MB | 500 MB | 2 GB | 10 GB |
| **— BONUS INICIAL (1 vez) —** | | | | |
| Páginas Standard | 0 | 800 | 2,500 | 5,000 |
| Páginas Premium | 0 | 40 | 150 | 300 |

> Cuotas mensuales = **no rollover** (reset por factura Stripe). Packs de crédito comprados aparte sí persisten (ver §4.6).

---

## 2. Acceso a módulos por plan

Módulos definidos en [`Feature.ts:2-10`](../packages/domain/src/entities/Feature.ts#L2-L10). Acceso vía `plans/{planId}.modules[]` en Firestore; admin (`super_admin`) hace bypass total.

| Módulo | `free` | Personal | Pro | Equipo |
|--------|:------:|:--------:|:---:|:------:|
| `module:dashboard` — Inicio/panel | ✅ | ✅ | ✅ | ✅ |
| `module:sermones` — Editor/biblioteca de sermones | ✅ | ✅ | ✅ | ✅ |
| `module:configuracion` — Ajustes | ✅ | ✅ | ✅ | ✅ |
| `module:generar` — Generador de sermón asistido | ❌ | ✅ | ✅ | ✅ |
| `module:biblioteca` — Biblioteca personal (subir docs) | Limitado | ✅ | ✅ | ✅ |
| `module:planes` — Planes de predicación | ❌ | ❌ | ✅ | ✅ |
| `module:greek_tutor` — Tutor de griego/palabra | Por cuota | Por cuota | Por cuota | Por cuota |

**Default Free (sin suscripción)** — solo `dashboard`, `sermones`, `configuracion` ([`AuthorizationService.ts:123-129`](../packages/application/src/services/AuthorizationService.ts#L123-L129)).

---

## 3. Funcionalidades (features) por plan

Features definidas en [`Feature.ts:13-19`](../packages/domain/src/entities/Feature.ts#L13-L19). Acceso vía `plans/{planId}.features[]`.

| Feature | `free` | Personal | Pro | Equipo |
|---------|:------:|:--------:|:---:|:------:|
| `sermon:create` — Crear sermón | ✅ | ✅ | ✅ | ✅ |
| `sermon:export_pdf` — Exportar a PDF | ✅ | ✅ | ✅ | ✅ |
| `library:upload` — Subir docs a biblioteca | ✅ | ✅ | ✅ | ✅ |
| `sermon:ai_assistant` — Asistente de redacción | ❌ | ✅ | ✅ | ✅ |
| `library:semantic_search` — Búsqueda semántica | ❌ | ❌ | ✅ | ✅ |
| `sermon:advanced_homiletics` — Homilética avanzada | ❌ | ❌ | ❌ | ✅ |
| `sermon:custom_templates` — Plantillas propias | ❌ | ❌ | ❌ | ✅ |

> **Nota** `free` en `planMetadata.ts` lista `sermon:create`, `sermon:export_pdf`, `library:upload`. El fallback hardcoded "sin suscripción" en `AuthorizationService` es más estricto: solo `sermon:create` ([`AuthorizationService.ts:135-140`](../packages/application/src/services/AuthorizationService.ts#L135-L140)).

---

## 4. Cuotas

Todas las cuotas mensuales son **no acumulables** (no rollover): se resetean al valor del plan en cada factura de Stripe (`invoice.payment_succeeded`). Los **packs de créditos** comprados aparte sí persisten y se consumen después de agotar el bucket del plan.

### 4.1 Cuota de procesamiento de documentos (páginas/mes)

Dos buckets: **Standard** (Gemini Flash, bajo costo) y **Premium** (LlamaParse, alta calidad). Valores canónicos en [`migratePlanQuotas.ts:64-100`](../packages/functions/src/admin/migratePlanQuotas.ts#L64-L100).

| | `free` | Personal | Pro | Equipo |
|---|:---:|:---:|:---:|:---:|
| Páginas Standard/mes | 0 | 800 | 2,500 | 5,000 |
| Páginas Premium/mes | 0 | 40 | 150 | 300 |
| Docs máx. en biblioteca | 0 | 15 | 50 | 200 |
| Almacenamiento | 0 MB | 500 MB | 2,000 MB | 10,000 MB |

`-1` = ilimitado. Tope de docs es blando (avisa al 80%, bloquea subida al 100%).

### 4.2 Cuota de consultas (queries / mensajes a tutores por mes)

[`migratePlanQuotas.ts`](../packages/functions/src/admin/migratePlanQuotas.ts#L64-L100). Driver de costo: inferencia Gemini.

| | `free` | Personal | Pro | Equipo |
|---|:---:|:---:|:---:|:---:|
| Consultas (queries)/mes | 50 | 500 | 2,000 | **∞** (`-1`) |
| Sesiones Hebreo/mes | 2 | 5 | **∞** (`-1`) | **∞** (`-1`) |

(Sesiones Hebreo/Griego = gancho de conversión: tope chico en Free/Personal, ilimitado Pro+.)

### 4.3 Cuota de generación de recursos — Exégesis (USD/mes)

El módulo de exégesis se cobra en **USD** (no en páginas) porque cada operación tiene costo LLM distinto. La UI lo muestra como "estudios": **1 estudio ≈ $2 USD** (`STUDY_UNIT_USD` en [`ExegesisOperationCatalog.ts:72`](../packages/domain/src/entities/ExegesisOperationCatalog.ts#L72)). Valores en [`PlanDefinition.ts:74-78`](../packages/domain/src/entities/PlanDefinition.ts#L74-L78).

| | `free` | Personal | Pro | Equipo |
|---|:---:|:---:|:---:|:---:|
| Exégesis USD/mes | $0 *(módulo bloqueado)* | $0 *(bloqueado — upgrade a Pro)* | $10 (≈ 5 estudios) | $30 (≈ 15 estudios) |

**Módulo de exégesis gated por cuota:** Free y Personal tienen `exegesisUsdPerMonth = 0` → módulo bloqueado (prompt de upgrade). Solo Pro y Equipo incluyen asignación. El backfill [`backfillExegesisQuotas.ts`](../packages/functions/src/admin/backfillExegesisQuotas.ts) salta explícitamente planes con allowance 0.

**Costos por operación** (pre-cargados del bucket `processingBalance.exegesis*` antes de ejecutar — [`ExegesisOperationCatalog.ts:74+`](../packages/domain/src/entities/ExegesisOperationCatalog.ts#L74)):

| Operación | Costo est. | Pre-confirma |
|-----------|-----------:|:------------:|
| `analyzeVerseCanonically` (por verso) | $0.10 | No |
| `composeVerseAcademicProse` | $0.02 | No |
| `composeIntroduction/ConclusionFromAnalyses` | $0.06 | No |
| `composeAcademicPaper` | ~$0.20 | Sí |
| `composeSermon/Devotional/StudyGuideFromAnalyses` | ~$0.05 | — |
| `verifyStepCitations` | $0.05 | — |
| `runCoherencePass` | $0.12 | Sí |
| setup/clasificación | <$0.05 | — |

Umbral de pre-confirmación: operaciones ≥ $0.10 o re-disparables por accidente muestran modal de costo.

### 4.4 Bonus inicial (créditos primera activación)

Acreditado **una sola vez** al activar la suscripción (idempotente por subscription ID en el webhook). [`migratePlanQuotas.ts:105-110`](../packages/functions/src/admin/migratePlanQuotas.ts#L105-L110).

| | `free` | Personal | Pro | Equipo |
|---|:---:|:---:|:---:|:---:|
| Bonus páginas Standard | 0 | 800 | 2,500 | 5,000 |
| Bonus páginas Premium | 0 | 40 | 150 | 300 |
| Bonus exégesis USD | 0 | 0 | 0 *(no desplegado)* | 0 *(no desplegado)* |

> ⚠️ **Discrepancia documentada:** el doc-comment de [`PlanDefinition.ts:103-107`](../packages/domain/src/entities/PlanDefinition.ts#L103-L107) cita valores antiguos del roadmap Hito 4 (Personal 2,000/0, Pro 5,000/200, Equipo 10,000/500). Los valores **realmente sembrados** son los de `migratePlanQuotas.ts` arriba. El comentario está stale.

### 4.5 Estructura del balance del usuario

`users/{uid}.processingBalance` mantiene buckets separados (plan vs pack):

```
planStandardPages / planPremiumPages / planExegesisUsd   ← mensual, reset por factura Stripe
packStandardPages / packPremiumPages / packExegesisUsd   ← persistente, de compras de packs
standardPagesAvailable / premiumPagesAvailable / exegesisUsdAvailable  ← suma plan + pack
standardSpentTotal / premiumSpentTotal / exegesisSpentTotalUsd        ← acumulado consumido
```

El plan se consume primero; los packs cubren el excedente.

### 4.6 Packs de créditos (compra opcional)

[`creditPackCatalog.ts`](../packages/functions/src/stripe/creditPackCatalog.ts). Persisten entre ciclos.

- **Páginas Standard** (Gemini Flash): 500 / 2,000 / 5,000 págs → $3 / $10 / $20
- **Páginas Premium** (LlamaParse): 200 / 1,000 / 3,000 págs → $4 / $15 / $35
- **Estudios de exégesis**: $9→$6 crédito · $25→$18 crédito · $60→$48 crédito

---

## 5. Cómo se resuelve el acceso (lógica)

- **Sin suscripción activa** → comportamiento Free por defecto: módulos `dashboard/sermones/configuracion`, feature `sermon:create` ([`AuthorizationService.ts:96-103, 123-140`](../packages/application/src/services/AuthorizationService.ts#L96-L140)).
- **Suscripción activa** (`isPlanActive`): estados `ACTIVE`, `TRIALING`, o `CANCELLED` aún dentro del período con `cancelAtPeriodEnd` ([`AuthorizationService.ts:72-91`](../packages/application/src/services/AuthorizationService.ts#L72-L91)).
- **Admin** (`super_admin` / email `rdocerda@gmail.com`): bypass total de módulos y features.

---

## 6. Feature flags (capa independiente del plan)

⚠️ **Los feature flags NO están ligados al tier del plan.** Son toggles per-usuario que solo un `super_admin` puede activar ([`setUserFeatureFlags.ts`](../packages/functions/src/admin/setUserFeatureFlags.ts)). Cualquier plan puede tenerlos activos si admin los enciende. Definidos en [`User.ts:133-208`](../packages/domain/src/entities/User.ts#L133-L208):

| Flag | Propósito | Estado |
|------|-----------|--------|
| `pastoral_fidelity_flow` | Raíz: wizard reformado (6 pasos, 3 testigos) | Activo |
| `pastoral_word_study` | Sub: modal de estudio de palabra | Activo |
| `three_witnesses` | Sub: validación de tres testigos | Activo |
| `study_depth` | Sub: Acompañante de profundidad de estudio | Activo |
| `fidelity_pass` | Sub: pass de fidelidad claim↔fuente | **Dormante (ADR-032)** |
| `contra_scan` | Sub: confrontación contra-scan pre-publicación | Activo |
| `conduccion_corazon` | Conducción afectiva (Faculty) | Off (en cristalización) |

Los sub-flags requieren su padre (`pastoral_fidelity_flow`) activo. Árbol de prerequisitos en [`User.ts:226-234`](../packages/domain/src/entities/User.ts#L226-L234).

---

## 7. Resumen ejecutivo por plan

```
Free (sampling, no promocionado) — $0
  Módulos: dashboard, sermones, configuracion
  Features: sermon:create, sermon:export_pdf, library:upload
  Cuotas: 50 consultas/mes · 2 sesiones hebreo · 0 páginas · 0 exégesis · 0 docs
  Exégesis: BLOQUEADO

Personal (basic) — $9.99/mes
  Módulos: + generar, biblioteca
  Features: + sermon:ai_assistant
  Cuotas: 500 consultas · 5 hebreo · 800 std + 40 prem págs · 15 docs · 500 MB
  Exégesis: BLOQUEADO ($0 — upgrade a Pro)

Pro — $14.99/mes
  Módulos: + planes
  Features: + library:semantic_search
  Cuotas: 2,000 consultas · hebreo ∞ · 2,500 std + 150 prem · 50 docs · 2 GB
  Exégesis: $10/mes (≈5 estudios)

Equipo (team) — $24.99/mes
  Módulos: todos
  Features: + advanced_homiletics, custom_templates
  Cuotas: consultas ∞ · hebreo ∞ · 5,000 std + 300 prem · 200 docs · 10 GB
  Exégesis: $30/mes (≈15 estudios)

Admin (super_admin) — bypass total + toggle de feature flags por usuario
```
