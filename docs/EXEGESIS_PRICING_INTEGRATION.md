# Roadmap: Integración de Exégesis al modelo de planes y cuotas

**Estado:** 📝 Planning — pendiente de confirmación de decisiones abiertas (ver §3)
**Owner:** Ricardo Cerda
**Co-author:** Claude
**Documento relacionado:** [`PRICING_PROCESSING_ROADMAP.md`](./PRICING_PROCESSING_ROADMAP.md)
**Última edición:** 2026-05-07

---

## 1. Resumen ejecutivo

El módulo Exégesis (PR #103-#111) introduce un eje de costo nuevo y dominante: **cada paper consume $1.00–$1.75 en LLM tokens** (Gemini Pro 2.5), muy distinto del eje "páginas procesadas" sobre el que está construido el modelo actual.

Dejarlo gratis dentro de los planes pone en riesgo el unit economics de Pro/Equipo en cuanto un usuario abuse de regeneraciones, recompositions y verificaciones. Dejarlo bloqueado niega el feature diferenciador del producto.

**Propuesta:** integrar exégesis como tercer recurso facturable en el balance del usuario, junto a los buckets actuales de páginas estándar y premium. Plan mensual incluye una cuota razonable, packs adicionales disponibles on-demand, gating progresivo desde la UI.

---

## 2. Estado actual (lo que ya tenemos)

### Modelo de pricing vigente (post-Hito 6)

`processingBalance` en cada user doc:

```typescript
{
  standard: { monthlyAllowance, monthlyUsed, packBalance },
  premium:  { monthlyAllowance, monthlyUsed, packBalance },
}
```

- `monthlyAllowance` = bonus del plan, **no recurrente** — se acredita al activar / renovar
- `packBalance` = créditos de packs comprados, persistentes (no caducan en 1 año)
- `monthlyUsed` resetea con la facturación mensual de Stripe (webhook `invoice.paid`)

### Planes actuales

| Plan | $/mes | Standard pages bonus | Premium pages bonus | Queries/mes |
|------|-------|---------------------|---------------------|-------------|
| Free | $0 | – | – | 50 |
| Personal | $9 | 800 | 40 | 500 |
| Pro | $19 | 2 500 | 150 | 2 000 |
| Equipo | $49 | 5 000 | 300 | 5 000 |

### Surfaces UX existentes

- **Landing page** — pricing table simple (3 planes), sin métricas de exégesis
- **Dashboard `UsageBanner`** — barras de progreso para standard + premium pages
- **`CreditPacksDialog`** — compra de packs S/M/L para standard + premium
- **`UpgradeRequiredModal`** — gate al exceder cuota o intentar feature locked
- **`FreeStarterCard`** — onboarding hint para Free users

### Lo que NO existe

- Track de uso LLM en `processingBalance`
- Gating de exégesis por plan
- Confirmaciones costo-conscientes en operaciones caras (composer académico, coherence pass, etc.)
- Pack SKU para créditos de exégesis
- Visualización del uso de exégesis en UsageBanner
- Mensajes de upsell específicos para exégesis

---

## 2.5 Estrategia de naming (decidido 2026-05-07)

Audiencia mixta (seminaristas + pastores sin seminario). Naming diferenciado por surface:

| Surface | Audiencia | Nombre visible |
|---------|-----------|---------------|
| **Landing / pricing** | desconocido, marketing | **"Estudio Bíblico Profundo"** (header) + subtitle "Papers académicos, sermones, devocionales y guías de estudio con rigor exegético" |
| **Sidebar / dashboard / nav** | usuario logged | **"Estudios"** |
| **Dentro del módulo** | usuario ya engaged | **"Exégesis"** (precisión técnica donde ya hay buy-in) |
| **Quota label** (UsageBanner, billing) | mixto | **"Estudios bíblicos"** — unidad: 1 estudio ≈ 1 paper-equivalente full pipeline |
| **Pack SKUs** (Stripe metadata) | interno + UI compra | **"Pack de Estudios"** (Pack 3 / 10 / 30) |

Implementación: i18n keys nuevas bajo `studies.*` para los surfaces marketing/dashboard; los surfaces internos siguen usando `exegesis.*` existente.

## 3. Decisiones (LOCKED 2026-05-07)

| # | Decisión | Valor | Notas |
|---|----------|-------|-------|
| 3.1 | Unidad cuota | **Híbrido** | USD interno, "estudios" visible. 1 estudio ≈ $2 USD. |
| 3.2 | Free tier | **Bloqueado** | Modal "Upgrade para acceder". |
| 3.3 | Personal | **Bloqueado** | Modal "Upgrade a Pro". |
| 3.4 | Cuotas mensuales | **Pro 5 / Equipo 15** | $10 / $30 USD allowance respectivamente. |
| 3.5 | Packs | **3=$9 / 10=$25 / 30=$60** | Persistentes, no caducan. |
| 3.6 | Confirmaciones costosas | **Híbrido** | Modal solo en operaciones ≥$0.10. Banner contador siempre visible. |
| 3.7 | Refund en falla | **Parcial** | Refund pre-LLM (timeout/validation). NO refund post-LLM (tokens reales gastados). |

## 3.bis Decisiones cerradas — DEPRECATED OPTIONS

### 3.1 Unidad de cuota de exégesis

**Opción A — USD-based** (token-budget): cada operación descuenta dólares estimados. Ventaja: refleja costo real, granular. Desventaja: opaco para el usuario ("¿cuánto me queda?").

**Opción B — Paper-equivalent** (tickets): cada paper-completo = 1 unidad. Cuota mensual = "5 papers Pro / 15 papers Equipo". Ventaja: comprensible. Desventaja: pierde fidelidad cuando user solo verifica o solo regenera.

**Opción C — Híbrido** (recomendado): unidad visible al user = "Estudios exegéticos" donde 1 estudio = full pipeline (análisis + composer + verify + coherence). Internamente se descuenta proporcional por operación contra un bucket USD invisible. Si user usa solo 30% de un estudio, descuenta 0.3 estudios.

**❓ Confirmar:** A, B o C.

### 3.2 Política Free tier

**Opción A — Bloqueado total**: Free no ve módulo Exégesis. Modal "Upgrade para acceder".
**Opción B — Trial**: Free puede crear 1 paper de hasta 3 versos (1 estudio aprox), luego se bloquea.
**Opción C — Read-only**: Free puede ver papers compartidos por usuarios Pro/Equipo (futura feature).

**❓ Confirmar:** A, B o C.

### 3.3 Política Personal

**Opción A — Bloqueado**: módulo no disponible. Mensaje "Upgrade a Pro para Exégesis".
**Opción B — Limitado**: 1 paper/mes incluido + opción de comprar packs.

**❓ Confirmar:** A o B.

### 3.4 Cuotas mensuales sugeridas

Baseline (ajustable):
- **Pro**: 5 estudios/mes (~$10 COGS, $9 margen sobre $19)
- **Equipo**: 15 estudios/mes (~$30 COGS, $19 margen sobre $49)

**❓ Confirmar:** mantengo estos números o ajustamos.

### 3.5 Estructura de packs

| Pack | Estudios | Precio | $/estudio | Margen aprox |
|------|----------|--------|-----------|--------------|
| Pack 3 | 3 | $9 | $3.00 | ~2x |
| Pack 10 | 10 | $25 | $2.50 | ~1.6x |
| Pack 30 | 30 | $60 | $2.00 | ~1.3x |

**❓ Confirmar:** rangos OK o ajustamos margen target.

### 3.6 Confirmaciones costosas — interrumpir o pre-warn

**Opción A — Modal antes de cada operación >$0.10**: friction-forward, baja sorpresas.
**Opción B — Banner persistente con contador en vivo**: muestra costo acumulado + permite operar libre. Modal solo al exceder cuota.
**Opción C — Híbrido**: modal solo en operaciones top-N caras (composer académico, full verify de paper grande); banner para el resto.

**❓ Confirmar:** A, B o C.

### 3.7 Política de fallos — refund

Si Gemini falla mid-operación, ¿devolver la cuota consumida?

**Opción A — Sí siempre**: usa-y-paga clean. Más generoso, complica accounting.
**Opción B — No**: el LLM costó tokens reales aunque haya fallado. Honesto, fricción.
**Opción C — Refund parcial**: si la falla fue antes del modelo (timeout, rate limit) → refund. Si fue durante (parsed JSON inválido, etc.) → no.

**❓ Confirmar:** A, B o C. Recomiendo C.

---

## 4. Modelo objetivo (asumiendo decisiones recomendadas: 3.1=C, 3.2=A, 3.3=A, 3.6=C, 3.7=C)

### 4.1 Schema extendido

`processingBalance` gana un tercer bucket:

```typescript
{
  standard: { monthlyAllowance, monthlyUsed, packBalance },
  premium:  { monthlyAllowance, monthlyUsed, packBalance },
  exegesis: {
    monthlyAllowanceUsd: number,    // ej. Pro = $10, Equipo = $30
    monthlyUsedUsd: number,         // resetea con factura
    packBalanceUsd: number,         // persistente, suma packs comprados
    // Display unit (no se persiste; se calcula al renderizar):
    //   studiesRemaining ≈ (allowance - used + pack) / 2  ($2 = 1 estudio promedio)
  },
}
```

### 4.2 Costo por operación (catálogo)

Tabla canónica que el sistema descuenta. Estimaciones conservadoras (input + output a precio Pro 2.5):

| Operación | $ aprox | Equivalente "estudios" (÷2) |
|-----------|---------|------------------------------|
| Análisis canónico (1 verso) | $0.10 | 0.05 |
| Componer prosa (1 verso) | $0.02 | 0.01 |
| Componer conclusión | $0.06 | 0.03 |
| Componer introducción | $0.06 | 0.03 |
| Componer paper académico full | $0.20 | 0.10 |
| Componer sermón / devocional / guía | $0.05 | 0.025 |
| Verificar citas (paso) | $0.05 | 0.025 |
| Coherence pass | $0.12 | 0.06 |
| Extraer rúbrica (texto o doc) | $0.02 | 0.01 |
| Extraer manifest guía estilo | $0.03 | 0.015 |
| Clasificar SourceType | $0.001 | 0 (gratis efectivo) |
| Re-análisis canónico | mismo costo | mismo |

**Política de cobro:** cobrar al inicio de la operación (reservar). Si falla durante (Gemini error después del input), no se devuelve — input ya costó. Si falla antes (timeout, validation), refund completo.

### 4.3 Caps progresivos

- **Soft cap** al 80% mensual: banner amarillo con CTA "Comprar pack" + link a settings/billing
- **Hard cap** al 100%: modal blocking que ofrece (a) comprar pack o (b) esperar al ciclo
- **Per-operation pre-warn** para operaciones ≥ $0.10:
  - Composer académico full
  - Re-análisis de versos ya aceptados
  - Verify completo (>10 cites)
  - Coherence pass
- **Rate limit por hora:** 20 análisis canónicos / 5 composers académicos / 50 verificaciones — pega solo en abuso runaway, transparente vía 429-style banner

---

## 5. Cambios por capa

### 5.1 Domain (`@dosfilos/domain`)

**Nuevos archivos:**
- `pricing/exegesis-cost-catalog.ts` — tabla `EXEGESIS_OPERATION_COSTS_USD` con cada operación
- `entities/ExegesisBalance.ts` — shape del nuevo bucket en `processingBalance.exegesis`
- `pricing/computeExegesisQuotaState.ts` — pure function: `(balance) → { allowanceUsd, usedUsd, packUsd, remainingUsd, remainingStudies, capState: 'ok' | 'soft-warn' | 'hard-cap' }`

**Modificaciones:**
- `entities/ProcessingBalance.ts` — agregar campo `exegesis`
- `entities/Plan.ts` o equivalente — agregar `exegesisAllowanceUsd` por plan

### 5.2 Application

**Nuevos use cases:**
- `pricing/ReserveExegesisCreditsUseCase.ts` — pre-cobra al inicio de operación
- `pricing/RefundExegesisCreditsUseCase.ts` — devuelve si falla pre-LLM
- `pricing/PurchaseExegesisPackUseCase.ts` — Stripe checkout extension

**Modificaciones:**
- Cada UC de exégesis costoso (`AnalyzeVerseCanonicallyUseCase`, `ComposeAcademicPaperUseCase`, etc.) llama `ReserveExegesisCredits` antes de la llamada Gemini. Si la reserva falla → throw `QuotaExceededError`. Si Gemini falla pre-LLM → `RefundExegesisCredits`.

### 5.3 Infrastructure

**Cloud functions:**
- Nuevo `applyExegesisMonthlyAllowance.ts` (paralelo al de procesamiento) — corre en `invoice.paid` webhook, acredita el bonus mensual de exégesis
- Modificar `handleCheckoutCompleted.ts` — soportar nuevos pack SKUs

**Stripe SKUs nuevos** (declarar en `secrets.json` + Stripe dashboard):
- `exegesis_pack_3` — 3 estudios, $9
- `exegesis_pack_10` — 10 estudios, $25
- `exegesis_pack_30` — 30 estudios, $60

### 5.4 Web

Cambios distribuidos por surface — ver §6.

### 5.5 Functions (callables)

- `purchaseExegesisPack` callable — wrap del checkout session de Stripe
- `getCurrentExegesisQuota` callable — read del balance + computed state (probablemente ya cubierto por la query de paper, pero exponerlo standalone para el banner)

---

## 6. Surfaces UX (en orden de viaje del usuario)

### 6.1 Landing page (`packages/web/src/pages/landing/PricingPage.tsx`)

**Cambios:**
- Agregar fila "Exégesis Profunda" en la tabla comparativa
- Por plan:
  - Free: ❌ Bloqueado
  - Personal: ❌ No incluido (ver Pro)
  - Pro: ✅ 5 estudios/mes incluidos
  - Equipo: ✅ 15 estudios/mes incluidos
- Sección nueva "¿Qué es un estudio exegético?" con copy explicativo + link a demo
- Mostrar packs adicionales como "extiende tu cuota" debajo de la tabla

### 6.2 Onboarding / registro

**Sin cambios estructurales** — el plan elegido ya define la cuota de exégesis. Agregar a `WelcomeModal` post-checkout: "Tu plan Pro incluye 5 estudios exegéticos al mes".

### 6.3 Dashboard

**`UsageBanner`** — agregar tercer bloque "Exégesis":
- Barra de progreso con `usedUsd / (allowanceUsd + packUsd)`
- Texto: "{N} de {M} estudios este mes" (donde N = round(remainingUsd / 2))
- Estados: verde (<60%) / amarillo (60-90%) / rojo (>90%)
- CTA "Comprar más" cuando el balance se acerca al límite

**`FreeStarterCard`** — actualizar copy si Free queda bloqueado de exégesis (recomendado).

### 6.4 Exégesis — landing del módulo

**`ExegesisPage` (lista de papers)** — banner contextual:
- Si user está sobre 80%: amarillo + CTA "Comprar pack"
- Si user está sobre 100%: modal hard al click "Crear paper" (no se puede crear nuevos)
- Si user está en plan que NO incluye exégesis: card "Upgrade a Pro" reemplaza el listado

### 6.5 Exégesis — crear / setup

**`ExegesisCreatePage`** — al submit:
- Estimar costo del paper basado en cantidad de versos seleccionados
- Mostrar antes del "Crear" un estimado: "Este paper consumirá ~2 estudios (5 versos × full pipeline)"
- Si el estimado supera el balance: modal "Cuota insuficiente — comprar pack" o "ajusta el alcance del paper"

### 6.6 Exégesis — paper detail

**Per-step / per-action confirmaciones costosas:**
- Cualquier operación ≥ $0.10:
  - Tooltip nativo en el botón muestra costo: "Análisis canónico · ~$0.10"
  - Click en botón → modal pre-confirm con costo y botón "Continuar"
  - Modal recordable: checkbox "No volver a preguntar para esta operación"
- Operaciones < $0.10: ejecución directa, sin friction

**Header del paper** — chip permanente: "Costo de este paper: $X.XX" (acumulado real). Click → drawer con desglose por operación.

### 6.7 Settings / Billing

**`BillingPage`** — sección nueva "Cuota Exégesis":
- Mismo bloque de progreso que en Dashboard
- Lista de packs disponibles con CTA "Comprar"
- Histórico de uso (últimos 30 días) — gráfico opcional

**`CreditPacksDialog`** — agregar tab "Exégesis" con los 3 packs nuevos.

---

## 7. Telemetría y observabilidad

Eventos nuevos a logger (si tienes analytics provider; si no, Firestore collection `telemetry/exegesis-pricing`):

- `exegesis.quota.reserve_attempted` `{ ownerId, operation, costUsd, balanceBefore }`
- `exegesis.quota.reserve_succeeded` `{ ownerId, operation, costUsd, balanceAfter }`
- `exegesis.quota.exceeded` `{ ownerId, operation, requiredUsd, availableUsd, plan }`
- `exegesis.quota.refunded` `{ ownerId, operation, costUsd, reason: 'pre-llm-failure' }`
- `exegesis.pack.purchased` `{ ownerId, packSku, amountUsd }`
- `exegesis.upgrade.cta_clicked` `{ ownerId, surface }` — para detectar deseo de upgrade

**Métricas a tracker post-launch:**
- Estudios consumidos por user/mes (distribución)
- % de Pro users que compran ≥1 pack/mes
- Conversion Personal → Pro driven by exégesis upsell
- Refund rate (debería ser <2%)
- Soft cap → hard cap conversion (% de users que compran al hit 80%)

---

## 8. Plan de implementación por fases

### Fase 0 — Decisiones (esta sesión)

- [ ] Confirmar decisiones §3.1–3.7 con el usuario
- [ ] Ajustar números si conviene
- [ ] Aprobar antes de codear

### Fase 1 — Schema + cost catalog (1 PR, ~4 horas)

- Domain: `ExegesisBalance` entity + `EXEGESIS_OPERATION_COSTS_USD` catalog + `computeExegesisQuotaState` pure helper
- Tests del catalog y del helper
- **Sin** wiring aún. Solo tipos y datos.
- Migración: function que añade `exegesis: { monthlyAllowanceUsd: 0, monthlyUsedUsd: 0, packBalanceUsd: 0 }` a todos los users existentes (default sin cuota — no rompe nada)

### Fase 2 — Reserve / refund use cases (1 PR, ~6 horas)

- Application: `ReserveExegesisCreditsUseCase`, `RefundExegesisCreditsUseCase`
- Modificar todos los UC de exégesis costosos para llamar reserve antes / refund en pre-LLM failure
- Tests con mocks de Firestore
- **Aún sin gating en UI.** Plans tienen `exegesisAllowanceUsd: Infinity` por defecto → reserve siempre pasa, equivalente a no-op.

### Fase 3 — Plan allowances + Stripe SKUs (1 PR, ~4 horas)

- Definir `exegesisAllowanceUsd` por plan en el catálogo de planes
- Migración: function que aplica allowance según el plan actual de cada user
- Stripe SKUs nuevos en dashboard + secrets (manual paso de deployment)
- Webhook `invoice.paid` reset mensual del bucket exégesis
- Webhook `checkout.session.completed` para los nuevos packs
- Callable `purchaseExegesisPack`

### Fase 4 — UI gating + banners (1 PR, ~8 horas)

- `UsageBanner` — bloque exégesis
- `ExegesisPage` — banner contextual + gate por plan
- `ExegesisCreatePage` — pre-estimate
- StepCard / dialogs — confirmaciones costosas + tooltips de costo
- Header del paper — chip de costo acumulado
- `BillingPage` — sección cuota exégesis + histórico
- `CreditPacksDialog` — tab exégesis
- `UpgradeRequiredModal` — variantes para exégesis
- Landing pricing — fila exégesis

### Fase 5 — Telemetría (1 PR, ~3 horas)

- Logger de los 6 eventos
- Si hay analytics provider: wire. Si no: Firestore collection `telemetry/exegesis_pricing`.
- Admin dashboard simple para ver agregados (opcional, fase 5.1)

### Fase 6 — Migración + rollout (1 PR + deploy, ~3 horas)

- Cloud function callable de migración (idempotente, batch 450 users a la vez)
- Run en producción con feature flag OFF
- Smoke test
- Flip flag para nuevos users
- Comunicación a users existentes (email opcional): "Tu plan Pro incluye 5 estudios exegéticos / mes"

**Total estimado:** ~28 horas dev + setup Stripe + deploy = ~1 sprint

---

## 9. Migración

### Usuarios existentes

- Función one-shot que setea `exegesis.monthlyAllowanceUsd` según el plan actual del user
- `monthlyUsedUsd: 0`, `packBalanceUsd: 0` por default
- Idempotente: si el campo ya existe, no toca

### Grandfathering

**Decisión recomendada:** ningún grandfathering. La feature aún no estaba "facturando" → no hay quien tenga "uso ilimitado adquirido" que defender. Aplicar caps desde el día del rollout.

### Backfill telemetría

Skip. Los eventos arrancan al deployment.

---

## 10. Anti-patterns a evitar

- ❌ **Cobrar dos veces la misma operación**: si user clickea "Componer académico" 3 veces seguidas → reservar las 3, cada una a costo full. NO acumular y descontar al final (deja al user en deuda si su browser crashes).
- ❌ **Mostrar saldo en USD en la UI principal**: confunde. Display = "estudios", USD solo en breakdown.
- ❌ **Hard-block sin alternativa**: cada vez que se gate, ofrecer comprar pack OR upgrade.
- ❌ **Estimar costo BAJO y cobrar ALTO**: el pre-estimate del create page debe ser conservador (sumar 20% buffer) para que nunca el real lo supere.
- ❌ **Reservar después del LLM call**: race condition donde 2 calls paralelas usan más cuota de la que hay. Reservar SIEMPRE antes.
- ❌ **No log eventos de upsell**: perderse la señal de "user wants more cuota" es perder revenue.

---

## Próximos pasos

1. **Tú confirmas** decisiones §3 (puedes responder con un mensaje diciendo "3.1=C, 3.2=A, 3.3=A, 3.4=ok, 3.5=ok, 3.6=C, 3.7=C")
2. Yo ajusto este doc con tus decisiones finales
3. Arrancamos por Fase 1 (schema + catalog) en branch `feat/exegesis-quota-foundation`
4. Cada fase = un PR independiente, mergeable sin la siguiente

---

🤖 Co-authored with Claude Opus 4.7 (1M context)
