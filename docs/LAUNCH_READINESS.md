# Launch Readiness Checklist

**Estado:** 🟡 En preparación · **Target launch:** TBD
**Última actualización:** 2026-04-27

> **Cómo usar este doc:**
> Marca cada `- [ ]` según vayas completando. Cada paso tiene un `**Por qué:**` (la razón del paso) y un `**Cómo verificar:**` (el smoke test concreto).
>
> El orden importa: las dependencias están en orden top-down. Si saltas un paso, el siguiente probablemente fallará.

## Resumen ejecutivo

Hitos completados que componen el launch:

| # | Hito | Estado | Notas |
|---|---|---|---|
| 0 | Limpieza Legacy Gemini | ✅ | |
| 1 | Protección de citas | ✅ | `publiclyCitable` flag end-to-end |
| 2 | Path Gemini Estándar | ✅ | A/B test pendiente (Hito 2.1) |
| 3 | Balance + credit packs | ✅ | Stripe products ya creados |
| 4 | Migración de planes | ✅ | Bonus inicial automático |
| 5 | Free tier abierto | ✅ | UsageBanner + UpgradeRequiredModal |
| 6 | Multi-account LlamaParse | ✅ | UI admin lista |
| 7 | Métricas + iteración | ⏳ | Post-launch, requiere data real |

Compliance: ✅ deuda crítica resuelta (C0-C8 + C6.1). Pre-commit hook activo.

---

## 1. Configuración de Stripe (production)

### 1.1 Subscription products + prices

Para los planes de suscripción que el usuario verá en `/pricing`, asegúrate que existen en Stripe:

- [ ] Product **Personal** (plan `basic`):
  - Mensual: $9 USD/month, recurring
  - Anual: $90 USD/year, recurring
  - Anota los `price_1XXX...` para cada ciclo
- [ ] Product **Pro** (plan `pro`):
  - Mensual: $19 USD/month
  - Anual: $190 USD/year
- [ ] Product **Equipo** (plan `team`):
  - Mensual: $49 USD/month
  - Anual: $490 USD/year
- [ ] Free (plan `free`): NO requiere product en Stripe

**Por qué:** la columna `stripeProductIds[]` en `plans/{id}` Firestore debe apuntar a price IDs reales para que checkout funcione.

**Cómo verificar:** después del paso 3.1, revisa que `plans/basic.stripeProductIds` contenga el price ID de Personal mensual.

### 1.2 Credit packs (one-time)

- [x] Los 6 productos ya están creados (instrucciones en mensaje anterior). Verifica los Price IDs:
  - `STRIPE_PRICE_PACK_STANDARD_S` — 500 págs · $3
  - `STRIPE_PRICE_PACK_STANDARD_M` — 2,000 págs · $10
  - `STRIPE_PRICE_PACK_STANDARD_L` — 5,000 págs · $20
  - `STRIPE_PRICE_PACK_PREMIUM_S` — 200 págs · $4
  - `STRIPE_PRICE_PACK_PREMIUM_M` — 1,000 págs · $15
  - `STRIPE_PRICE_PACK_PREMIUM_L` — 3,000 págs · $35

**Por qué:** estos secrets ya están seteados (deploy ya pasó). Solo verifica que los valores sean los Price IDs reales de Stripe (no los placeholders).

**Cómo verificar:**
```bash
firebase functions:secrets:access STRIPE_PRICE_PACK_STANDARD_S
# Debe devolver un price_1XXX..., NO "placeholder_pending_stripe_setup"
```
Si devuelve placeholder, configúralo con el Price ID real:
```bash
firebase functions:secrets:set STRIPE_PRICE_PACK_STANDARD_S
# pega price_1XXX...
```
Repite por cada pack y luego `firebase deploy --only functions:createCheckoutSession`.

### 1.3 Webhook endpoint

- [ ] En [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), confirma:
  - URL: `https://us-central1-iglesiafiel-df68a.cloudfunctions.net/stripeWebhook`
  - Eventos suscritos:
    - `checkout.session.completed` ✅ (registro nuevo + credit packs)
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
    - `invoice.payment_succeeded`
- [ ] Signing secret en `STRIPE_WEBHOOK_SECRET` matches el del endpoint:
  ```bash
  firebase functions:secrets:access STRIPE_WEBHOOK_SECRET
  ```

**Por qué:** sin webhook el credit pack purchase no se acredita al balance del usuario, y los upgrades de plan no se registran en Firestore.

---

## 2. LlamaParse multi-account

### 2.1 Provisionar cuentas adicionales

- [ ] Crear 1-2 cuentas free adicionales en LlamaParse (emails distintos al actual):
  - Cada cuenta free tiene 10,000 créditos/mes
  - Total con 2 cuentas free: 20,000 págs/mes gratis (≈ 60 libros narrativos típicos)

### 2.2 Setear secrets de las cuentas nuevas

```bash
firebase functions:secrets:set LLAMAPARSE_API_KEY_FREE_1
firebase functions:secrets:set LLAMAPARSE_API_KEY_FREE_2
```

- [ ] Los secrets fueron creados (revisar con `firebase functions:secrets:access ...`)

### 2.3 Crear docs en `llamaparseAccounts` collection

Ve a Firebase Console → Firestore → crea collection `llamaparseAccounts` (top-level) con docs:

```json
// Doc id: "free-1"
{
  "name": "Free Account 1",
  "apiKeySecretEnv": "LLAMAPARSE_API_KEY_FREE_1",
  "creditsUsed": 0,
  "creditsLimit": 10000,
  "resetDate": "<timestamp del 1ro del próximo mes UTC>",
  "priority": 1,
  "active": true,
  "createdAt": "<now>",
  "updatedAt": "<now>"
}

// Doc id: "free-2"
{
  "name": "Free Account 2",
  "apiKeySecretEnv": "LLAMAPARSE_API_KEY_FREE_2",
  "creditsUsed": 0,
  "creditsLimit": 10000,
  "resetDate": "<timestamp del 1ro del próximo mes UTC>",
  "priority": 2,
  "active": true,
  "createdAt": "<now>",
  "updatedAt": "<now>"
}
```

- [ ] `free-1` doc creado
- [ ] `free-2` doc creado

### 2.4 Re-deploy de las funciones que usan los secrets

```bash
firebase deploy --only functions:reprocessWithLlamaParse,functions:extractPdfWithGemini,functions:resetLlamaParseCounters
```

- [ ] Deploy exitoso sin errores de secret overlap

**Cómo verificar:**
1. Ve a `/dashboard/admin/llamaparse-monitoring`
2. Debes ver las 2 cuentas activas, priority 1 y 2, 0% usage
3. El cron `resetLlamaParseCounters` aparece en `firebase functions:list`

---

## 3. Migración de planes (Hito 4)

### 3.1 Ejecutar el script de migración

- [ ] Backup de Firestore (Firebase console → Backups → Export)
- [ ] Ejecutar:
  ```bash
  npm run migrate:plans:hito4
  ```
- [ ] Verificar que el script devuelva "Updated: 4, Skipped: 0"

**Por qué:** este script patcha los 4 planes (`free`, `basic`, `pro`, `team`) con los nuevos display names, limits y `bonusInitial`. También actualiza `plan_translations` con "Personal/Pro/Equipo" en es y en.

**Cómo verificar:**
1. En Firestore, abre `plans/basic` y verifica:
   - `name: "Personal"`
   - `bonusInitial: { standardPages: 2000, premiumPages: 0 }`
   - `limits.queriesPerMonth: 500`
2. Abre `plan_translations/basic` y verifica:
   - `translations.es.name: "Personal"`
   - `translations.en.name: "Personal"`
3. En el front-end ve a `/pricing` (o `/dashboard/subscription`) y confirma que los planes se llaman Personal/Pro/Equipo

### 3.2 Validar que los Stripe Price IDs siguen vinculados

- [ ] Verificar que `plans/basic.stripeProductIds`, `plans/pro.stripeProductIds`, `plans/team.stripeProductIds` siguen apuntando a los price IDs reales (el script no los toca, pero confirma)

### 3.3 Migración de cuotas de exégesis (EXEGESIS_PRICING_INTEGRATION Fase 6)

Sin esto, suscriptores Pro/Equipo existentes ven "0 estudios" hasta que su próxima invoice de Stripe corra (hasta 30 días) y el modal de upgrade les insiste a pesar de que su plan ya incluye la cuota.

- [ ] **Paso A — Sembrar `plans/{id}.limits.exegesisUsdPerMonth`** (si no se hizo todavía):
  ```bash
  node scripts/billing/migrate-exegesis-plan-quotas.js
  ```
  Salida esperada: `pro: $10`, `team: $30`, `free: $0`, `basic: $0`. Idempotente.

- [ ] **Paso B — Backup de Firestore** (Firebase Console → Backups → Export).

- [ ] **Paso C — Dry-run del backfill por usuario** (Firebase Console → Functions → `backfillExegesisQuotas` → Test):
  ```json
  { "dryRun": true }
  ```
  Validar `summary.credited > 0` y `grantsByPlan` solo con `pro` / `team`.

- [ ] **Paso D — Ejecutar backfill real**:
  ```json
  {}
  ```
  Marker prefix: `exegesis-backfill-{ts}`. Re-correr con el mismo ts es no-op (markers existen).

- [ ] **Paso E — Verificar usuario Pro de muestra**:
  1. Firestore → `users/{uid}.processingBalance`:
     - `planExegesisUsd: 10`
     - `exegesisUsdAvailable: 10` (asumiendo `packExegesisUsd: 0`)
  2. UI: tile "Estudios" en Library banner debe mostrar `5` (10 / STUDY_UNIT_USD).

---

## 4. Validación de seguridad y citas (Hito 1)

### 4.1 Marcar core library docs como restricted

- [ ] Ve a `/dashboard/admin/core-library`
- [ ] Si aparece el banner de migración "Hay X documento(s) sin estado de cita definido", click "Marcar como restringidos"
- [ ] Espera el toast de éxito

**Por qué:** todos los docs core library nuevos tienen `publiclyCitable=undefined` por defecto. El código trata undefined como restricted (default seguro), pero el banner solo desaparece cuando seteas explícitamente `false`. Setearlo explícitamente evita confusión en UIs futuras.

### 4.2 Smoke test: cita protegida en respuesta tutor

- [ ] Login con cuenta NO-admin (cuenta de test diferente a rdocerda@gmail.com)
- [ ] Crea una sesión con un tutor que use core library
- [ ] Manda un mensaje que requiera retrieval de core library
- [ ] **Verifica:**
  - La respuesta del modelo usa el contenido (texto del chunk se ve)
  - **NO aparece** ningún `(Autor, "Título")` en el cuerpo de la respuesta
  - En la sección "Bibliografía" abajo, NO hay items numerados de las fuentes core
  - Sí aparece el footer: *"+ N fuentes curadas con cita protegida"*

### 4.3 Smoke test: admin sí ve atribución

- [ ] Login con `rdocerda@gmail.com`
- [ ] Misma sesión / mismo tipo de query
- [ ] **Verifica:**
  - La bibliografía SÍ muestra autor + título de las fuentes
  - El footer de "fuentes protegidas" NO aparece (porque admin las ve directamente)

---

## 5. Smoke test de credit pack purchase (Hito 3)

- [ ] Login con cuenta de test
- [ ] Ir a `/dashboard/library`
- [ ] Click "Comprar páginas" en el `BalanceBanner`
- [ ] Click "Comprar" en pack S Estándar ($3)
- [ ] Stripe Checkout aparece con tarjeta de test `4242 4242 4242 4242` (cualquier futuro CVV/fecha)
- [ ] Tras pagar, redirect a `/dashboard/library?packPurchase=success`
- [ ] **Verifica:**
  - El balance "Estándar" sube en 500 páginas (puede tardar unos segundos en propagarse — refresh la página)
  - En Firestore: `users/{tu-uid}/credit_pack_purchases/{sessionId}` existe con `pages: 500, mode: 'standard'`

---

## 6. Smoke test de bonus inicial (Hito 4)

### 6.1 Para usuario nuevo (registration flow)

- [ ] Registrar usuario nuevo seleccionando plan Personal en `/register?plan=basic`
- [ ] Completar checkout con tarjeta de test
- [ ] Tras `registration-success` y login automático, ir a `/dashboard/library`
- [ ] **Verifica:**
  - Balance "Estándar" muestra 2,000 páginas (el bonus inicial de Personal)
  - En Firestore: `users/{nuevo-uid}/bonus_grants/{stripeSubscriptionId}` existe con `standardPages: 2000`

### 6.2 Para usuario existente (upgrade)

- [ ] Login con cuenta existente en plan free
- [ ] Ir a `/dashboard/subscription`
- [ ] Upgrade a Pro
- [ ] **Verifica:**
  - Tras checkout, balance "Estándar" sube en 5,000 páginas y "Premium" en 200
  - `bonus_grants/{subscriptionId}` doc existe

---

## 7. Smoke test de Free tier (Hito 5)

- [ ] Login con cuenta Free (sin subscription o con plan free)
- [ ] **Verifica gates:**
  - Puede entrar a `/dashboard/library` y ver biblioteca core
  - Click "Add resource" → aparece `UpgradeRequiredModal` (no abre el upload form)
  - El `UsageBanner` muestra "Consultas / mes: 0 / 50"
- [ ] Hacer 50 queries a un tutor
- [ ] Intentar query 51:
  - **Verifica:** toast aparece "Has alcanzado tu límite de 50 consultas este mes" + botón "Ver planes" navega a `/dashboard/subscription`
  - El query NO se envía al modelo (no hay respuesta)

---

## 8. Smoke test de extracción multi-account (Hito 6)

- [ ] Login admin
- [ ] Ve a `/dashboard/admin/core-library`
- [ ] Sube un PDF de prueba (10-20 págs idealmente)
- [ ] Click el botón LlamaParse premium (icono Sparkles) en la fila
- [ ] **Verifica:**
  - El doc se procesa correctamente
  - En `/dashboard/admin/llamaparse-monitoring`: la cuenta `free-1` (priority 1) sube su `creditsUsed` por las páginas procesadas

### 8.1 Smoke test de failover

- [ ] En el monitoring, desactiva la cuenta `free-1` (toggle)
- [ ] Sube otro PDF
- [ ] **Verifica:** se procesa pero ahora la cuenta `free-2` recibe el incremento

---

## 9. Pre-commit hook + compliance baseline

- [ ] Confirmar que el pre-commit hook está activo:
  ```bash
  ls -la .husky/pre-commit
  # Debe ser ejecutable
  ```
- [ ] Hacer un commit de prueba (puede ser un cambio trivial como editar este doc) y verificar que el hook corre:
  ```bash
  echo "test" >> docs/LAUNCH_READINESS.md && git add . && git commit -m "test: pre-commit hook"
  # debe imprimir el "Boy Scout opportunity" si tocas algún archivo con violaciones legacy
  ```

---

## 10. Lighthouse / performance check (opcional pre-launch)

- [ ] Build de producción local: `npm run build` en `packages/web`
- [ ] Probar `/landing` → Lighthouse score:
  - Performance: ≥ 80
  - Accessibility: ≥ 90
  - Best Practices: ≥ 90
- [ ] Probar `/dashboard/library` (logueado) → no errores en consola

---

## 11. Monitoring & alertas

### 11.1 Logs

- [ ] Confirmar acceso a Cloud Functions logs:
  ```bash
  firebase functions:log --only stripeWebhook --limit 20
  ```

### 11.2 Sentry / Error tracking (si aplica)

- [ ] Si tienes Sentry configurado, verificar que las nuevas funciones reportan errores

### 11.3 Dashboard de uso

- [ ] Confirmar acceso a `/dashboard/admin/analytics` con métricas básicas (signups, sessions)

---

## 12. Comunicación a usuarios existentes

Si tienes usuarios actuales en plan basic/pro/team que verán los nuevos nombres:

- [ ] Email a usuarios existentes anunciando:
  - Nombres nuevos: "Personal" (antes Basic), "Pro", "Equipo" (antes Team)
  - Cambios en limits (queries mensuales, docs propios, bonus inicial al renovar)
  - **NO se les cobra extra** — siguen con su mismo subscription Stripe
  - Nuevo Free tier abierto a referidos

- [ ] Considerar otorgar bonus retroactivo a usuarios existentes (no automático en migración) — decisión de negocio

---

## 13. Day-of-launch

- [ ] Cambiar a Stripe live mode (si estás en test mode)
- [ ] Verificar que `STRIPE_SECRET_KEY` apunta a la live key (`sk_live_...`)
- [ ] Verificar que `STRIPE_WEBHOOK_SECRET` corresponde al webhook live
- [ ] Habilitar dashboards de monitoreo
- [ ] Anuncio en redes / web

---

## 14. Post-launch (primeros 7 días)

- [ ] Monitorear `/dashboard/admin/llamaparse-monitoring` diariamente — por si hay que activar otra cuenta antes del reset mensual
- [ ] Revisar Cloud Functions errors: `firebase functions:log --only stripeWebhook,createCheckoutSession --limit 50`
- [ ] Revisar Stripe Dashboard → Disputes / Failed payments
- [ ] Recolectar feedback de los primeros usuarios Free → "¿qué te gustaría que pudieras hacer pero no puedes?"

Activar **Hito 7 — Métricas + iteración** cuando tengas ≥ 50 usuarios o 30 días de data, lo que llegue primero.

---

## Pendientes no-bloqueantes (NO impiden launch, hacer cuando haya tiempo)

Ver [PRICING_PROCESSING_ROADMAP.md](./PRICING_PROCESSING_ROADMAP.md) para detalle.

| Sub-task | Hito | Esfuerzo | Riesgo de no hacer |
|---|---|---|---|
| A/B test Gemini vs LlamaParse | 2.1 | 1 día | Default sub-óptimo en costo |
| Bloqueo upload por balance insuficiente | 3.1 | 2 horas | UX confuso si balance=0 |
| Onboarding tour Free | 5.1 | medio día | Free activation rate bajo |
| `canCreateProject` para Free | 5.2 | 1 hora | Usuarios free crean proyectos sin sentido |
| Email alert al 90% LlamaParse | 6.1 | medio día | Admin debe revisar dashboard manualmente |
| Sync con LlamaParse usage API | 6.2 | medio día | Drift entre nuestro contador y billing real |
| Multimodal input en Faculty chat (imágenes) | F1 | medio día (MVP) – 2-3 días (full) | Limita análisis exegético a texto; usuarios no pueden compartir manuscritos, notas a mano, capturas de comentarios. |

### F1 — Multimodal input en Faculty chat (imágenes)

Permitir que el usuario adjunte imágenes a un mensaje del chat de Facultad. Gemini 2.5 Flash es nativamente multimodal — el bloqueo está solo en cliente y persistencia.

**MVP (medio día):** 1 imagen por mensaje, máx 5MB, base64 inline en el request a Gemini. Solo se persiste el texto del mensaje y la respuesta del modelo (la imagen es efímera al exchange). UI: botón de attach + preview thumbnail + botón quitar + drag-and-drop.

**Versión completa (2-3 días):** persistencia en Firebase Storage (`users/{uid}/chat-attachments/...`), thumbnails, soporte multi-archivo, también PDFs no-curated (subir y discutir un PDF puntual sin sumarlo a la library).

**Casos de uso:**
- Foto de manuscrito hebreo/griego → análisis morfológico (Dra. Alétheia)
- Foto de nota a mano del sermón → transcripción / expansión
- Captura de un comentario impreso → discusión en chat
- Foto del pizarrón de un estudio bíblico → estructuración

**Frentes técnicos:**
1. UI: `FacultyChatInput.tsx` (attach button, preview, drag-drop)
2. Domain: `AIChatMessage.content` debe aceptar `Part[]` o agregar `attachments: Attachment[]`
3. Service: `GeminiMultiAgentService.sendMessageStream` debe aceptar `Part[]` en lugar de `message: string`
4. Persistencia: decidir entre base64-en-Firestore (límite 1MB → mala idea para >1 imagen) vs Storage (correcto, requiere subida + URL)

## Hito 7 — Métricas + iteración (post-launch)

Activar cuando llegue data real. Ver [PRICING_PROCESSING_ROADMAP.md → Hito 7](./PRICING_PROCESSING_ROADMAP.md) para métricas a trackear y posibles ajustes.

**Métricas críticas:**
- Conversion rate Free → Personal (target 5-10%)
- Activation rate (% que sube primer libro o hace primer query): target 60%
- Bonus consumption pattern
- Credit pack purchase rate: target 15-25% de Pro+
- Churn mensual: target <5%
- ARPU por plan
- Distribution standard vs premium en credit packs

---

**Maintainer:** Ricardo Cerda
**Co-author:** Claude (sesiones de planning + implementación)
