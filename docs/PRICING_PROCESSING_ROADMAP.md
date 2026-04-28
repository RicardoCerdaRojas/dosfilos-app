# Roadmap: Modelo de Pricing y Procesamiento de Documentos

**Estado:** ▶️ **REANUDADO** 2026-04-26 (tras cierre de C0-C8 + C6.1 del compliance roadmap)
**Owner:** Ricardo Cerda
**Co-author:** Claude (sesiones de planning + implementación)

## Contexto y motivación

El modelo SaaS tradicional de "X páginas/mes recurrentes" no encaja con el comportamiento real de los usuarios de DosFilos, donde:

- **Onboarding (mes 1-3):** carga intensiva de la biblioteca personal (30-50 libros)
- **Steady state (mes 4+):** uso bajo de procesamiento, alto de queries
- **Año 2+:** procesamiento ocasional cuando aparece material nuevo

Cobrar quotas mensuales de procesamiento genera ansiedad ("¿estoy aprovechando esto?") y churn cuando el uso baja después del onboarding. **El procesamiento debe modelarse como capacidad, no como suscripción.**

Adicionalmente:
- LlamaParse cuesta $1.25/1K páginas (caro a escala). Gemini 2.0 Flash con PDF nativo cuesta ~$0.10-0.30/1K. **Ratio de ahorro 5-12x para libros narrativos simples.**
- Hay restricción legal: las citas del core library no pueden mostrar autor/título hasta cerrar acuerdos con autores. Implementar "Cita protegida" hasta entonces.

## Decisiones estratégicas tomadas

1. **Procesamiento estándar = Gemini Flash**, cubierto por bonus inicial del plan
2. **Procesamiento premium = LlamaParse**, opt-in con costo adicional vía credit packs
3. **Bonus inicial al activar plan** (no recurrente mensual). Para procesar más, comprar packs on-demand
4. **Suscripción mensual cubre uso continuo:** queries al RAG, acceso a biblioteca core, tutores, workflow de sermones, almacenamiento
5. **Free tier abierto** con biblioteca core curada + 50 queries/mes (sin upload propio)
6. **Citas protegidas por defecto** hasta cerrar derechos por autor (flag por recurso)
7. **Multi-account LlamaParse en early-stage** (2 cuentas free = 30K páginas/mes gratis) hasta que volumen justifique Starter

## Estructura de planes propuesta

| Plan | $/mes | $/año (–17%) | Queries/mes | Bonus inicial standard | Biblioteca propia |
|---|---|---|---|---|---|
| Free | $0 | – | 50 | – | ❌ |
| Personal | $9 | $90 | 500 | 2,000 págs | ✅ 30 docs |
| Pro | $19 | $190 | 2,000 | 5,000 págs | ✅ 100 docs |
| Equipo | $49 | $490 | 5,000 | 10,000 págs | ✅ 500 docs |

**Tutores Greek/Hebrew:** Pro+
**Multi-user:** Equipo

### Credit packs (on-demand, no caducan en 1 año desde compra)

**Standard (Gemini Flash):**
| Pack | Páginas | Precio | $/pág | Margen aprox |
|---|---|---|---|---|
| S | 500 | $3 | $0.006 | 6x |
| M | 2,000 | $10 | $0.005 | 2.5x |
| L | 5,000 | $20 | $0.004 | 2x |

**Premium (LlamaParse):**
| Pack | Páginas | Precio | $/pág | Margen aprox |
|---|---|---|---|---|
| S | 200 | $4 | $0.020 | 8x |
| M | 1,000 | $15 | $0.015 | 1.2x |
| L | 3,000 | $35 | $0.012 | break-even (volumen retain) |

## Hitos

### ✅ Hito 0 — Limpieza Legacy Gemini (COMPLETADO)
- Removidos botón Sync, badge "AI Ready", lógica TTL Gemini File Search
- Refactor visual de página Biblioteca con header editorial + callout
- Wording cambiado a "Listo / Por procesar / Procesando" (de "Indexado / Sin indexar / Extrayendo")

### ✅ Hito 1 — Protección de citas (COMPLETADO 2026-04-26)

**Objetivo:** Bloquear atribución de autor/título en citas hasta que se cierren derechos por autor.

**Implementación final:** se usó `publiclyCitable: boolean` (en lugar del enum `citationRights` propuesto en el plan original) — funcionalmente equivalente: `publiclyCitable === true` ⇔ "cleared", cualquier otro valor (incluyendo `undefined`) ⇔ "restricted". El default seguro está en todo el pipeline.

**Tareas completadas:**
- [x] Campo `publiclyCitable?: boolean` en `LibraryResource` entity (default = undefined → tratado como restricted)
- [x] **Cloud function `retrieveChunks`** propaga el flag desde Firestore a cada chunk retornado
- [x] **`CoreLibraryRAGService.formatContextForPrompt`** enmascara la atribución: chunks no-cleared aparecen al modelo como `[Fuente N: Material curado · referencia interna]` en lugar de `[Fuente N: Autor, "Título", p. N]`. **El texto del chunk se incluye verbatim** — solo se oculta el header bibliográfico para que el modelo no pueda emitir `(Autor, "Título")` en su respuesta
- [x] **`extractCitations` en `citations.tsx`** strippea citaciones inline cuyo source no es `publiclyCitable === true` para usuarios no-admin (defensa en profundidad)
- [x] **Bibliography panel** muestra footnote "+ N fuentes curadas con cita protegida — material consultado pero no citable públicamente mientras se cierran los acuerdos de derechos" cuando hay sources protegidas (vs antes: silencio total que podía hacer parecer que la respuesta no tenía base)
- [x] **Migración via UI admin** — banner amarillo en `CoreLibraryAdmin` aparece cuando hay docs con `publiclyCitable === undefined`, botón "Marcar como restringidos" ejecuta batch update via `coreLibraryAdminService.markResourcesAsRestrictedCitable()` (write split en chunks de 450 para respetar límite de 500 ops/batch de Firestore)
- [x] **Admin UI per-doc flip** — al editar metadata de cualquier doc, toggle "Pública / Restringida" actualiza el flag inmediatamente

**Archivos modificados en esta sesión:**
- `packages/application/src/services/CoreLibraryRAGService.ts:111-148` — enmascaramiento en `formatContextForPrompt`
- `packages/web/src/lib/citations.tsx:455-525` — Bibliography acepta `protectedSourcesCount` + footnote
- `packages/web/src/components/faculty/FacultyChatMessages.tsx:47-66` — `AssistantMessageContent` calcula y pasa el count

**Acceptance criteria:**
- ✅ Al hacer cualquier query a tutores, el modelo recibe `[Fuente N: Material curado · referencia interna]` para chunks restringidos — no puede leakear autor/título
- ✅ El contenido textual del chunk sí aparece en la respuesta (no censurado)
- ✅ La bibliografía visible al usuario solo lista sources `publiclyCitable === true`; las protegidas aparecen como contador discreto al final
- ✅ Un admin puede marcar un resource específico como `publiclyCitable: true` (toggle) y sus citas inmediatamente muestran autor/título sin re-deploy

### ✅ Hito 2 — Path Gemini Estándar (COMPLETADO 2026-04-26 — pendiente A/B test)

**Objetivo:** Implementar `processWithGemini` y switch `processResource(mode)` para procesamiento de bajo costo en libros narrativos.

**Implementación:**

1. **`packages/functions/src/library/processWithGemini.ts` (callable)** — recibe `{resourceId, force}`, descarga el PDF, lo sube a la Gemini Files API y le pide a Gemini 2.0 Flash extraer página-por-página en JSON estricto (`responseMimeType: 'application/json'`). Reusa los helpers `pagesToMarkedText` y `pagesToMarkdown` de `llamaParseClient.ts` para emitir el output con el contrato exacto que el chunker espera (`<!-- page: N -->` markers + `[PAGE N]` en `textContent`). Marca el resource con `extractionVersion: '4.0-gemini-standard'`, `extractedWithGemini: true`, `extractedWithLlamaParse: false`. 50MB hard limit (lanza `failed-precondition` con mensaje claro sugiriendo el path premium).

2. **`CoreLibraryAdminService.processWithGemini(id, force)`** — método paralelo a `reprocessWithLlamaParse` en el application layer.

3. **`CoreLibraryAdminService.processResource(id, force, mode)`** — entry point unificado que decide entre `'standard'` (Gemini, default) y `'premium'` (LlamaParse). UI puede llamar uno u otro directamente o pasar por aquí cuando el modo es config-driven.

4. **`indexStructuredDocument` + `autoIndexOnExtractionReady`** — actualizados para aceptar ambas versiones (`['3.0-llamaparse', '4.0-gemini-standard']`). El downstream pipeline (chunker, embeddings, RAG retrieval) **no cambió**: ambos paths producen el mismo `structured.md`.

5. **Admin UI (`CoreLibraryAdmin.tsx`)** — añadido botón Gemini estándar (icono `Wand2`, tinte `info`) junto al de LlamaParse premium (icono `Sparkles`, tinte `success`). Tooltip: "Extraer con Gemini estándar (bajo costo)" / "Extraer con LlamaParse premium (alta calidad, costo elevado)". Cada botón llama su path correspondiente; el badge de "Pages" en la fila refleja `extractionVersion` para ver qué path usó cada doc.

**Archivos creados/modificados:**
- `packages/functions/src/library/processWithGemini.ts` (nuevo — 244 líneas)
- `packages/functions/src/index.ts` (export)
- `packages/functions/src/library/indexStructuredDocument.ts` (acepta ambas versiones)
- `packages/functions/src/library/autoIndexOnExtractionReady.ts` (acepta ambas versiones)
- `packages/application/src/services/CoreLibraryAdminService.ts` (`processWithGemini`, `processResource`)
- `packages/web/src/pages/admin/CoreLibraryAdmin.tsx` (`handleProcessDocumentStandard`, botón UI)

**Acceptance criteria:**
- ✅ Admin puede procesar un PDF vía Gemini estándar (botón "Wand2" en cada fila)
- ✅ Output `structured.md` legible por el chunker existente sin modificación
- ✅ El indexer y el auto-index trigger reconocen `4.0-gemini-standard` además de `3.0-llamaparse`
- 🟡 Costo medible <30% del costo equivalente con LlamaParse — **pendiente test empírico** (siguiente paso: procesar 5-10 PDFs representativos con ambos paths y medir vía Gemini billing API + LlamaParse usage API)
- 🟡 Habilitar Gemini como default — **mantener opt-in** hasta validar quality con A/B test

**Subtask Hito 2.1 — A/B test (próxima sesión):**
- Procesar 5-10 PDFs representativos (3 narrativos simples, 3 con tablas/multi-columna, 2 con griego/hebreo, 1 escaneado mediocre) con ambos paths
- Medir: páginas extraídas correctamente, calidad de chunks downstream (¿retrieval relevante?), preservación de griego/hebreo, tablas
- Decisión: si Gemini alcanza ≥90% en narrativos → flip default, LlamaParse opt-in
- Costo: comparar facturas Gemini vs créditos LlamaParse para el mismo set

### ✅ Hito 3 — Sistema de balance + credit packs (COMPLETADO 2026-04-26)

**Objetivo:** Backend de pages balance + integración Stripe para compra de packs.

**Implementación:**

1. **Domain — `User.processingBalance: ProcessingBalance`** + nueva entity `CreditPack`
   - `ProcessingBalance` con `standardPagesAvailable`, `premiumPagesAvailable`, `standardSpentTotal`, `premiumSpentTotal`, `updatedAt`
   - `ProcessingMode = 'standard' | 'premium'` (single source of truth, importado por todos los packages)
   - `CREDIT_PACK_CATALOG` con 6 packs (S/M/L para standard + premium) con `id`, `mode`, `pages`, `priceUsd`, `size`. Helpers `getCreditPackById`, `packsByMode`.

2. **Application — `ProcessingBalanceService`** con `getBalance`, `hasCapacity`, `consume`, `addPack`
   - Usa `firebase/firestore` `increment()` para evitar races en decrementos concurrentes
   - `InsufficientBalanceError` con datos `{ needed, available, mode }` para UI handling

3. **Functions — `processingBalance.ts`** mirror admin-SDK con `consumePagesAdmin` y `addPackAdmin`
   - `processWithGemini.ts` decrementa `standard` tras extracción exitosa (página real consumida)
   - `reprocessWithLlamaParse.ts` decrementa `premium` tras extracción exitosa
   - Errores no-fatales: si el balance falla, log + continuar (extracción ya tuvo éxito; no rollback)

4. **Stripe — credit pack catalog en functions** (`creditPackCatalog.ts`)
   - 6 SKUs con env vars: `STRIPE_PRICE_PACK_{STANDARD|PREMIUM}_{S|M|L}`
   - `createCheckoutSession` extendido para aceptar `packId` (mode=`payment`, no subscription)
   - Webhook `handleCreditPackPurchase` detecta `metadata.packId`, credita balance, registra en `users/{uid}/credit_pack_purchases/{sessionId}` (idempotente por session id)

5. **UI — `BalanceBanner.tsx` + `CreditPacksDialog.tsx`** insertados en LibraryManager
   - Balance tiles (standard / premium) con iconos `Wand2` / `Sparkles` y tokens `text-info` / `text-success`
   - CTA "Comprar páginas" abre dialog modal con 6 packs en grid (3+3)
   - Click → `authService.createCheckoutSession({ packId })` → redirect a Stripe
   - Success-redirect: `/dashboard/library?packPurchase=success` (página recarga balance al montar)

**Acceptance criteria:**
- ✅ Schema Firestore: usuario tiene `processingBalance.{standardPagesAvailable,premiumPagesAvailable,standardSpentTotal,premiumSpentTotal,updatedAt}`
- ✅ Decremento automático tras extracción Gemini (standard) o LlamaParse (premium)
- ✅ Webhook acredita balance al pagar credit pack (idempotente vía session id en sub-colección)
- ✅ UI muestra balance + botón comprar packs
- 🟡 Bonus inicial al activar plan: pendiente Hito 4 (migración planes incluye otorgar bonus al subscribirse)
- 🟡 Bloqueo upload cuando balance insuficiente: pendiente subtask 3.1 (UI integration en upload form — el servicio `hasCapacity` ya existe)
- 🟡 Stripe Price IDs reales: requieren configuración en Stripe Dashboard + env vars (deploy step)

**Archivos creados/modificados:**
- `packages/domain/src/entities/User.ts` (`ProcessingBalance` interface + campo)
- `packages/domain/src/entities/CreditPack.ts` (nuevo, 41 líneas)
- `packages/application/src/services/ProcessingBalanceService.ts` (nuevo, 132 líneas)
- `packages/functions/src/library/processingBalance.ts` (nuevo, 60 líneas)
- `packages/functions/src/library/processWithGemini.ts` (decremento)
- `packages/functions/src/library/reprocessWithLlamaParse.ts` (decremento)
- `packages/functions/src/stripe/creditPackCatalog.ts` (nuevo, 41 líneas)
- `packages/functions/src/stripe/createCheckoutSession.ts` (mode=payment para packs)
- `packages/functions/src/stripe/webhook.ts` (`handleCreditPackPurchase`)
- `packages/application/src/services/AuthService.ts` (`packId` en input)
- `packages/web/src/pages/library/components/BalanceBanner.tsx` (nuevo, 87 líneas)
- `packages/web/src/pages/library/components/CreditPacksDialog.tsx` (nuevo, 130 líneas)
- `packages/web/src/pages/library/LibraryManager.tsx` (wire BalanceBanner)
- `packages/web/src/i18n/locales/{es,en}/library.json` (`balance.*`, `creditPacks.*`)

### ✅ Hito 4 — Migración de planes a nueva estructura (COMPLETADO 2026-04-27)

**Objetivo:** Reemplazar plan structure actual (basic/pro/team con quotas mensuales) por nueva (Free/Personal/Pro/Equipo con bonus + queries).

**Decisión arquitectónica:** mantener IDs legacy (`free`, `basic`, `pro`, `team`) y solo cambiar **display names** + **limits** + agregar **bonusInitial**. Esto evita migrar miles de suscripciones Stripe + Firestore subscription pointers — los usuarios existentes en `basic` automáticamente ven "Personal" como nombre de su plan sin tocar su row.

**Implementación:**

1. **Domain — `PlanDefinition.bonusInitial`** (nuevo campo opcional)
   ```ts
   bonusInitial?: { standardPages?: number; premiumPages?: number };
   ```
   El webhook + `completeRegistration` lo leen para acreditar páginas al `processingBalance` del usuario una vez por suscripción.

2. **Cloud Functions — bonus crediting idempotente:**
   - `webhook.ts > creditBonusInitialIfPending` — fires en `checkout.session.completed` para usuarios existentes (upgrade)
   - `completeRegistration.ts > creditPlanBonusForNewUser` — fires durante el flujo de registro nuevo (post-payment, post-user-creation)
   - **Idempotencia:** ambos escriben a `users/{uid}/bonus_grants/{stripeSubscriptionId}` antes de acreditar. Re-deliveries del webhook o reintentos no duplican el bonus.

3. **Migración Firestore — `scripts/migrate-plans-to-new-structure.js`:**
   - Patches `plans/{free,basic,pro,team}` con nuevos `name`, `description`, `limits`, `bonusInitial`
   - Patches `plan_translations/{free,basic,pro,team}.translations.{es,en}` con nombres localizados (Personal/Pro/Equipo en es, Personal/Pro/Team en en)
   - Idempotente — re-ejecutar es seguro
   - Comando: `npm run migrate:plans:hito4`

**Bonus + limits configurados:**

| Plan ID | Display name | Queries/mes | Docs propios | Bonus standard | Bonus premium |
|---|---|---|---|---|---|
| `free` | Free | 50 | 0 | 0 | 0 |
| `basic` | Personal | 500 | 30 | 2,000 | 0 |
| `pro` | Pro | 2,000 | 100 | 5,000 | 200 |
| `team` | Equipo | 5,000 | 500 | 10,000 | 500 |

**Acceptance criteria:**
- ✅ `PlanDefinition` extiende con `bonusInitial`
- ✅ Plan visible en UI con nombres actualizados (vía `plan_translations`)
- ✅ Usuarios nuevos reciben bonus al completar registro Stripe (`completeRegistration`)
- ✅ Usuarios existentes haciendo upgrade reciben bonus al checkout (`webhook.handleCheckoutCompleted`)
- ✅ Idempotencia garantizada por marker doc `bonus_grants/{subscriptionId}`
- ✅ Existing users `basic/pro/team` ven los nuevos nombres sin migración Stripe (mismo plan id)
- 🟡 Página `/dashboard/upgrade` rediseñada — pendiente para subtask UI (los planes ya muestran info correcta vía PlanService)

**Archivos creados/modificados:**
- `packages/domain/src/entities/PlanDefinition.ts` (campo `bonusInitial`)
- `packages/functions/src/stripe/webhook.ts` (`creditBonusInitialIfPending`)
- `packages/functions/src/auth/completeRegistration.ts` (`creditPlanBonusForNewUser`)
- `scripts/migrate-plans-to-new-structure.js` (nuevo, 154 líneas)
- `package.json` (`migrate:plans:hito4` script)

**Deploy steps:**
1. `firebase deploy --only functions:stripeWebhook,functions:completeRegistration`
2. `npm run migrate:plans:hito4` (ejecutar UNA vez en producción)
3. Verificar en `/dashboard/upgrade` que los planes muestran los nuevos nombres

### ✅ Hito 5 — Free tier abierto (COMPLETADO 2026-04-27)

**Objetivo:** Abrir el producto a usuarios free con biblioteca core protegida + 50 queries/mes.

**Implementación:**

1. **Quota tracker server-side ya existía** (`UsageLimitsService.canQuery` / `canUploadDocument` / `getMonthlyUsage`). Faltaba exponerlo al UI y hacer pre-check.

2. **`useUsageLimits` hook** extendido con 3 funciones nuevas: `checkCanQuery()`, `checkCanUploadDocument()`, `getMonthlyUsage()`.

3. **Pre-check de query en `useFacultyChat.ts`:** antes de `sendMessage`/`sendOrchestratedMessage` llama `quotaService.canQuery(uid)`. Si !allowed lanza `QuotaExceededError`. `onError` discrimina y muestra toast con action "Ver planes" → `/dashboard/subscription`.

4. **Bloqueo de upload en `LibraryManager.tsx`:** `handleToggleUploadForm()` reemplaza el toggle ingenuo. Llama `checkCanUploadDocument()` antes de abrir el form. Si !allowed abre `UpgradeRequiredModal`. **Free tier ahora puede entrar a la library** para ver biblioteca core. Eliminado el `UpgradeRequiredPage` que bloqueaba todo el módulo.

5. **`UsageBanner` UI** (89 líneas, nuevo) — strip compacto entre `LibraryHeader` y `BalanceBanner`:
   - 2 progress bars: queries / mes + docs propios
   - Tones por % consumido: `bg-primary` < 80%, `bg-warning` 80-99%, `bg-destructive` 100%+
   - Botón "Mejorar plan" aparece solo en warning/critical
   - Auto-oculto cuando el plan tiene quotas unlimited (`-1`) o undefined

6. **i18n** — namespace `library.usage.*` agregado en es+en.

**Acceptance criteria:**
- ✅ Usuario sin plan puede ver biblioteca core, hacer queries con citas protegidas (Hito 1 cubre la cita)
- ✅ Pre-check de quota: al llegar a 50 queries, intentar enviar muestra toast con CTA → /dashboard/subscription
- ✅ Al intentar subir libro siendo Free: `UpgradeRequiredModal` aparece antes de abrir el form
- ✅ UsageBanner visible con consumo / quota; tinte + CTA aparecen al 80%+
- 🟡 Onboarding flow específico para Free (tour + primer query) — pendiente sub-task UX, no bloqueante para launch
- 🟡 Bloqueo de "crear proyectos" para Free — falta agregar `canCreateProject` (similar a `canQuery`) — sub-task no bloqueante

**Archivos creados/modificados:**
- `packages/web/src/hooks/useUsageLimits.ts` (3 funciones nuevas)
- `packages/web/src/hooks/faculty/useFacultyChat.ts` (pre-check + QuotaExceededError handling)
- `packages/web/src/pages/library/LibraryManager.tsx` (`handleToggleUploadForm` + `UsageBanner` + `UpgradeRequiredModal` wire)
- `packages/web/src/pages/library/components/UsageBanner.tsx` (nuevo, 89 líneas)
- `packages/web/src/i18n/locales/{es,en}/library.json` (`usage.*`)

**Type-check:** ✅ web + application + domain + functions. **Compliance:** ✅ archivos nuevos sin violaciones.

### ✅ Hito 6 — Multi-account LlamaParse + monitoring (COMPLETADO 2026-04-27)

**Objetivo:** Rotación de API keys de LlamaParse + dashboard admin para monitorear consumo.

**Decisión arquitectónica:** la collection se llama `llamaparseAccounts` (top-level), NO `config/llamaparseAccounts/{id}` como decía el draft. Razón: `config/{name}` en Firestore es un single-document path; un sub-doc por cuenta requiere un parent collection. Top-level collection es la forma correcta.

**Implementación:**

1. **Domain entity `LlamaParseAccount`** (nuevo, 73 líneas):
   - `id`, `name`, `apiKeySecretEnv`, `creditsUsed`, `creditsLimit`, `resetDate`, `priority`, `active`, `lastUsedAt`
   - Helpers: `llamaParseAvailableCredits`, `llamaParseHasCapacity`
   - Las API keys NUNCA se guardan en Firestore — solo el `apiKeySecretEnv` (nombre del secret de Firebase Functions).

2. **`llamaParseAccountSelector.ts`** (nuevo, 117 líneas) en functions:
   - `selectLlamaParseAccount(pagesEstimate)` — filtra `active && creditsAvailable >= pages`, ordena por `priority` asc + `creditsUsed` asc (drena una cuenta antes de rotar para auditoría más simple), resuelve `process.env[apiKeySecretEnv]`
   - **Fallback automático** a `LLAMAPARSE_API_KEY` legacy cuando la collection está vacía → existing deployments siguen funcionando sin migración
   - `recordLlamaParseUsage(accountId, pages)` — `FieldValue.increment(pages)` + `lastUsedAt` server-timestamp

3. **`reprocessWithLlamaParse.ts` y `extractPdfWithGemini.ts` refactorizados:**
   - Reemplazado `process.env.LLAMAPARSE_API_KEY` por `selectLlamaParseAccount()`
   - Tras parse exitoso: `recordLlamaParseUsage(account.id, pageCount)` — non-fatal, billing es source of truth
   - **Secrets declaration extendido** en ambos: `LLAMAPARSE_API_KEY`, `LLAMAPARSE_API_KEY_FREE_1`, `LLAMAPARSE_API_KEY_FREE_2`, `LLAMAPARSE_API_KEY_STARTER_1` (agregar más al provisionarse)
   - extractPdfWithGemini: si `selectLlamaParseAccount` falla (no hay cuenta con capacidad), automáticamente cae al fallback Gemini → pdf-parse

4. **`resetLlamaParseCounters.ts`** (nuevo, 50 líneas) — scheduled function:
   - Schedule: `every day 06:00 UTC` (free-tier resets are calendar-month aligned; running daily catches rollover within ≤24h)
   - Para cada cuenta con `resetDate <= now`: `creditsUsed = 0`, avanza `resetDate` +1 mes (loop in case the cron was paused for días)
   - Idempotente: segunda ejecución del mismo día es no-op

5. **Admin UI `/dashboard/admin/llamaparse-monitoring`** (`LlamaParseMonitoring.tsx`, 207 líneas):
   - 3 summary tiles (cuentas totales, créditos disponibles totales, consumo del periodo)
   - Tabla con columnas: name + secret env, priority, usage bar, next reset, status badge, toggle activate/deactivate
   - Status badges con tonos semánticos: `success` (saludable, <70%), `warning` (≥70%), `destructive` (≥90%), `muted` (inactiva)
   - i18n: namespace `admin.llamaParse.*` agregado en es+en
   - Service methods: `coreLibraryAdminService.getLlamaParseAccounts()`, `setLlamaParseAccountActive(id, active)`

**Acceptance criteria:**
- ✅ App rota automáticamente entre cuentas activas según `priority` + `creditsUsed` (drena antes de rotar)
- ✅ Admin ve dashboard con consumo en tiempo real, % por cuenta y status badges
- ✅ Cron diario resetea contadores correctamente con idempotencia
- ✅ Si todas las cuentas están agotadas, extractPdfWithGemini falla a Gemini → pdf-parse en lugar de error
- 🟡 Email alert al admin cuando una cuenta supera 90% — pendiente integración con Resend (sub-task)
- 🟡 Query a LlamaParse usage API tras cada parse — Hito 6 usa el conteo local (`pageCount` reportado por LlamaParse mismo). Sincronización con su API es overkill para el ROI; queda como follow-up

**Archivos creados/modificados:**
- `packages/domain/src/entities/LlamaParseAccount.ts` (nuevo)
- `packages/functions/src/library/llamaParseAccountSelector.ts` (nuevo, 117 líneas)
- `packages/functions/src/library/resetLlamaParseCounters.ts` (nuevo, 50 líneas)
- `packages/functions/src/library/reprocessWithLlamaParse.ts` (refactor: usa selector)
- `packages/functions/src/library/extractPdfWithGemini.ts` (refactor: usa selector + fallback chain)
- `packages/functions/src/index.ts` (export resetLlamaParseCounters)
- `packages/application/src/services/CoreLibraryAdminService.ts` (`getLlamaParseAccounts`, `setLlamaParseAccountActive`)
- `packages/web/src/pages/admin/LlamaParseMonitoring.tsx` (nuevo, 207 líneas)
- `packages/web/src/App.tsx` (route)
- `packages/web/src/i18n/locales/{es,en}/admin.json` (`llamaParse.*`)

**Deploy steps (cuando estés listo):**
1. Aprovisionar API keys adicionales en LlamaParse (cuenta secundaria con email distinto)
2. Configurar secrets:
   ```bash
   firebase functions:secrets:set LLAMAPARSE_API_KEY_FREE_1
   firebase functions:secrets:set LLAMAPARSE_API_KEY_FREE_2
   ```
3. Crear docs en `llamaparseAccounts` collection (manualmente vía Firebase console o seed script):
   ```js
   { id: 'free-1', name: 'Free Account 1', apiKeySecretEnv: 'LLAMAPARSE_API_KEY_FREE_1', creditsUsed: 0, creditsLimit: 10000, resetDate: <next-month-start>, priority: 1, active: true }
   { id: 'free-2', name: 'Free Account 2', apiKeySecretEnv: 'LLAMAPARSE_API_KEY_FREE_2', creditsUsed: 0, creditsLimit: 10000, resetDate: <next-month-start>, priority: 2, active: true }
   ```
4. Deploy: `firebase deploy --only functions:reprocessWithLlamaParse,functions:extractPdfWithGemini,functions:resetLlamaParseCounters`
5. Verificar en `/dashboard/admin/llamaparse-monitoring` que las cuentas aparezcan

### ⏳ Hito 7 — Métricas + iteración (Post-launch, primeros 90 días)

**Objetivo:** Validar el modelo con data real e iterar.

**Métricas a trackear:**
- Conversion rate Free → Personal: target 5-10%
- Activation rate (% que sube primer libro o hace primer query): target 60%
- Bonus consumption pattern: ¿qué % consume el bonus, cuándo?
- Credit pack purchase rate: target 15-25% de Pro+
- Churn mensual: target <5%
- ARPU por plan
- Distribution standard vs premium en credit packs

**Posibles ajustes:**
- Bonus muy chico → upgrade frustrante (subir bonus)
- Bonus muy grande → packs no se venden (bajar bonus o subir precio)
- Queries muy ajustadas → frustración / churn (subir cap)
- Conversion rate Free → Personal bajo → revisar value proposition de Free

## Pendientes no-bloqueantes (Boy Scout)

Cosas que NO impiden lanzar pero deberían cerrarse cuando haya tiempo. Cada item linkea al hito padre para contexto.

| Sub-task | Padre | Esfuerzo | Riesgo de no hacer | Cuándo hacerla |
|---|---|---|---|---|
| **2.1** A/B test Gemini vs LlamaParse en 5-10 PDFs reales | Hito 2 | 1 día | Default sub-óptimo en costo (no sabemos si Gemini es ≥90% en quality) | Tras tener 5+ libros core procesados con cada path |
| ~~**3.1** Bloqueo upload por balance insuficiente~~ ✅ DONE 2026-04-27 | Hito 3 | 2 horas | — | LibraryManager pre-check: tras `canUploadDocument`, si `standard+premiumPagesAvailable === 0` se abre `CreditPacksDialog` en vez del form |
| ~~**5.1** Onboarding hint Free (sugerencia de primer query)~~ ✅ DONE 2026-04-27 | Hito 5 | medio día | — | `FreeStarterCard` en `FacultyDirectoryPage`. Visible sólo si `planId='free'` y `sessions.length === 0` — desaparece tras primera query (sin localStorage). 3 prompts demo de la biblioteca curada. Si conversion sigue < 3%, añadir tour multi-paso. |
| ~~**5.2** `canCreateProject` para Free~~ ✅ DONE 2026-04-27 | Hito 5 | 1 hora | — | `UsageLimitsService.canCreateProject` + gate en `ProjectsListPage` con `UpgradeRequiredModal` |
| ~~**6.1** Email alert al admin ≥90% LlamaParse~~ ✅ DONE 2026-04-27 | Hito 6 | medio día | — | Cron `alertLlamaParseUsage` (06:30 UTC daily). Idempotencia vía `lastAlert90At` borrado por `resetLlamaParseCounters` |
| **6.2** Sync con LlamaParse usage API tras cada parse | Hito 6 | medio día | Drift entre nuestro contador local y billing real (LlamaParse cobra por job, no por página exacta) | Cuando notemos drift > 10% |

**Reglas:**
- Boy Scout rule: si tocas un archivo relacionado, aprovecha y cierra el item del mismo hito
- El pre-commit hook NO los bloquea (son advisory)
- Cuando uno se complete, mover de aquí a "Lecciones aprendidas" o eliminar

## Hito 7 — Métricas + iteración (post-launch — recordar)

Activar cuando llegue data real. Ver sección [Hito 7](#hito-7--métricas--iteración-post-launch-primeros-90-días) arriba para métricas a trackear.

**Trigger para empezar:** ≥ 50 usuarios o 30 días desde launch (lo que llegue primero).

**Outputs esperados:**
- Decisión: ¿bonus inicial es muy chico/grande?
- Decisión: ¿queries cap es realista o frustra?
- Decisión: ¿Free tier convierte? Si <3%, revisar value prop o agregar onboarding tour (5.1)

## Decisiones pendientes

- [ ] Validar pricing exacto de cada plan ($9 / $19 / $49 son sugerencia, ajustables)
- [ ] Decidir si Free tier puede crear 1 proyecto demo (evaluar con UX testing)
- [ ] Decidir nombres definitivos de los planes (Personal/Pro/Equipo vs alternativas)
- [ ] Decidir reglas de re-bonus al re-suscribirse (full / 50% / nada)
- [ ] Decidir si annual gating: ¿anual descuento solo, o también desbloquea features?

## Constraints técnicos a recordar

- LlamaParse ya tiene 2 cuentas free (30K créditos/mes total combinado). Stay free hasta volumen justifique Starter ($50)
- Vector index `(resourceId, userId, embedding)` en Firestore ya existe, no tocar
- Citation protection es per-resource (`citationRights` flag), no per-user-tier
- Output del extractor (Gemini o LlamaParse) DEBE ser idéntico (`structured.md` con `<!-- page: N -->`) para que pipeline downstream no cambie

## Lecciones aprendidas (durante esta investigación)

- **Bug de RAG silencioso:** la query de project scope `userId == Y AND resourceId IN [...]` requería un índice vectorial específico que no existía → fallaba silenciosamente vía try/catch en orchestrator. Resuelto con índice + per-source retrieval grouping.
- **`force=true` en deploy hooks:** sin predeploy hook, `firebase deploy --only functions:X` no compila TypeScript → deployaba código viejo. Resuelto agregando `predeploy: ["npm --prefix \"$RESOURCE_DIR\" run build"]`.
- **Author trailing space:** la metadata `author: "Duane and Terrance "` (con espacio al final) puede causar bugs de matching downstream. Validar trim al guardar.
- **Modelo de citation cuando autor real ≠ display name:** Modelo Gemini infiere apellidos académicos de "Duane and Terrance" → "Watson and Callan" cuando ve la portada del libro. Si quieres consistency con el campo `resourceAuthor` en Firestore, normalizar al cargar (e.g. setear como "Duane F. Watson and Terrance Callan").

---

**Próxima actualización:** Post-launch. Hito 7 (Métricas + iteración) requiere data real — pasa a estado activo cuando lances.
