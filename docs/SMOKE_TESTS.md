# Smoke Tests — Manual playbook

Tests rápidos que se pueden ejecutar manualmente antes de cada deploy o launch.
Diseñados para correrse en ≤ 30 minutos por una persona.

**Setup:**
- Cuenta admin: `rdocerda@gmail.com`
- Cuenta de test: cualquier email distinto (idealmente con plan free al inicio)
- Stripe: tarjeta de test `4242 4242 4242 4242` con cualquier futuro CVV / fecha
- Dos navegadores (o uno + incognito) para alternar admin / test user

Cada sección termina con `Result: ✅ / ❌` para que registres en cada corrida.

---

## Test 1 — Citas protegidas (Hito 1)

**Objetivo:** confirmar que core library docs sin `publiclyCitable=true` no leakean autor/título al usuario.

1. Login con cuenta de test (NO admin)
2. Crear sesión con un tutor (Faculty chat o Greek tutor con biblioteca core)
3. Mandar mensaje que requiera retrieval: ej. "¿Qué dice Calvino sobre la justificación?"
4. Esperar respuesta completa
5. **Verificar en la respuesta:**
   - [ ] Texto del chunk se ve correctamente en la respuesta
   - [ ] **NO aparece** ningún `(Autor, "Título", p. N)` inline en el cuerpo
   - [ ] Sección "Bibliografía" abajo: NO aparecen items numerados de las fuentes core protegidas
   - [ ] **SÍ aparece** el footer: *"+ N fuentes curadas con cita protegida — material consultado pero no citable públicamente mientras se cierran los acuerdos de derechos"*
6. Logout, login admin (`rdocerda@gmail.com`)
7. Misma sesión / mismo tipo de query
8. **Verificar:**
   - [ ] Bibliografía SÍ muestra autor + título
   - [ ] Footer de "fuentes protegidas" NO aparece

**Result:** ✅ / ❌

---

## Test 2 — Free tier gates (Hito 5)

**Objetivo:** confirmar que un usuario sin plan paid puede usar el producto y se le bloquea correctamente cuando excede límites.

### 2.1 Acceso a la library siendo Free

1. Login con cuenta sin subscription (plan `free`)
2. Ir a `/dashboard/library`
3. **Verificar:**
   - [ ] La página carga (NO redirige a UpgradeRequiredPage)
   - [ ] Aparece `BalanceBanner` con saldo (probablemente 0 / 0 si nunca compró pack)
   - [ ] Aparece `UsageBanner` con "Consultas / mes: 0 / 50" y "Documentos propios: 0 / 0"

### 2.2 Bloqueo de upload

1. Click "Add resource" en el header
2. **Verificar:**
   - [ ] **NO se abre** el upload form
   - [ ] Aparece `UpgradeRequiredModal` con CTA a Pro / Equipo

### 2.3 Bloqueo de query al límite

1. Hacer 50 queries a un tutor (puedes simularlas mandando mensajes cortos)
2. Recargar `/dashboard/library` y verificar que UsageBanner pasó a 50/50
3. Volver al tutor, mandar query 51
4. **Verificar:**
   - [ ] Toast aparece: "Has alcanzado tu límite de 50 consultas este mes"
   - [ ] Toast tiene botón "Ver planes" que navega a `/dashboard/subscription`
   - [ ] El query NO se envía (no hay respuesta del modelo)

**Result:** ✅ / ❌

---

## Test 3 — Credit pack purchase (Hito 3)

**Objetivo:** confirmar el flujo end-to-end de compra → webhook → balance updated.

1. Login con cuenta de test (cualquier plan)
2. Ir a `/dashboard/library`
3. Ver balance inicial standard (anotarlo)
4. Click "Comprar páginas" en `BalanceBanner`
5. Click "Comprar" en pack S Estándar ($3)
6. Stripe Checkout aparece — usar `4242 4242 4242 4242`, fecha futura, CVV cualquiera
7. Tras pagar, redirect a `/dashboard/library?packPurchase=success`
8. **Verificar:**
   - [ ] Balance "Estándar" subió en 500 páginas (refresh la página si tarda)
   - [ ] En Firebase console → `users/{test-uid}/credit_pack_purchases/`: existe doc con ID = session id de Stripe, con campos `pages: 500, mode: 'standard'`

**Result:** ✅ / ❌

---

## Test 4 — Bonus inicial automático (Hito 4)

**Objetivo:** confirmar que al activar plan se acreditan páginas correctamente.

### 4.1 Usuario nuevo (registration flow)

1. En navegador limpio (incognito), ir a `/register?plan=basic`
2. Completar email + display name
3. Stripe Checkout con `4242...`
4. Tras `registration-success`, login automático
5. Ir a `/dashboard/library`
6. **Verificar:**
   - [ ] Balance "Estándar" muestra 2,000 páginas (bonus inicial Personal)
   - [ ] Balance "Premium" muestra 0
   - [ ] En Firestore: `users/{nuevo-uid}/bonus_grants/{stripeSubscriptionId}` existe con `standardPages: 2000, premiumPages: 0`

### 4.2 Usuario existente upgrade Free → Pro

1. Login con cuenta Free existente (NO debe tener subscription previa)
2. Ir a `/dashboard/subscription`
3. Click "Upgrade a Pro"
4. Completar checkout con `4242...`
5. Tras success, ir a `/dashboard/library`
6. **Verificar:**
   - [ ] Balance "Estándar" subió en 5,000 páginas (bonus Pro)
   - [ ] Balance "Premium" subió en 200 páginas
   - [ ] `bonus_grants/{subscriptionId}` doc existe

**Result:** ✅ / ❌

---

## Test 5 — Multi-account LlamaParse failover (Hito 6)

**Objetivo:** confirmar que la rotación entre cuentas funciona y la admin UI refleja consumo.

**Pre-req:** las 2 cuentas free están provisioned, secrets configurados, docs creados (paso 2 de LAUNCH_READINESS).

1. Login admin
2. Ir a `/dashboard/admin/llamaparse-monitoring`
3. **Verificar estado inicial:**
   - [ ] 2 cuentas visibles, ambas activas
   - [ ] free-1 priority 1, free-2 priority 2
   - [ ] Ambas en 0% usage, status "Healthy"

### 5.1 Procesamiento normal

1. Ir a `/dashboard/admin/core-library` y subir un PDF de prueba (10 págs)
2. Click el botón LlamaParse premium (icono Sparkles) en la fila del PDF
3. Esperar a que el proceso termine
4. Volver a `/admin/llamaparse-monitoring`
5. **Verificar:**
   - [ ] free-1 (priority 1) `creditsUsed` aumentó por el page count del PDF
   - [ ] free-2 sigue en 0

### 5.2 Failover

1. En el monitoring, click "Desactivar" en free-1 → status pasa a "Inactiva"
2. Subir otro PDF, repetir el reprocess
3. **Verificar:**
   - [ ] Esta vez free-2 recibe el incremento (no free-1)

### 5.3 Reactivar

1. Click "Activar" en free-1 → vuelve a "Saludable"
2. Subir un tercer PDF
3. **Verificar:**
   - [ ] free-1 recibe el incremento (porque tiene priority 1 y está activa)

**Result:** ✅ / ❌

---

## Test 6 — Pre-commit hook (compliance)

**Objetivo:** confirmar que el hook bloquea regresiones críticas.

1. Crear branch nuevo: `git checkout -b test-precommit`
2. Editar cualquier archivo `.tsx` en `packages/web/src/pages/` (que no esté en allowlist)
3. Agregar al inicio del archivo: `import { getFirestore } from 'firebase/firestore';`
4. `git add . && git commit -m "test: should fail"`
5. **Verificar:**
   - [ ] El commit FALLA con mensaje que menciona `Firebase imports in .tsx`
   - [ ] El bloque "Boy Scout opportunity" aparece listando el archivo + acción sugerida

6. Revertir el cambio: `git checkout -- packages/web/src/pages/...`
7. Commit cambio benign (ej. agregar comentario)
8. **Verificar:**
   - [ ] El commit pasa
   - [ ] Si el archivo tenía otras violaciones legacy, el "Boy Scout opportunity" sí las muestra como advisory pero NO bloquea

9. Limpiar: `git checkout main && git branch -D test-precommit`

**Result:** ✅ / ❌

---

## Test 7 — Type-check global

**Objetivo:** confirmar que la build pasa antes del deploy.

```bash
npx tsc --noEmit -p packages/domain
npx tsc --noEmit -p packages/application
npx tsc --noEmit -p packages/infrastructure
npx tsc --noEmit -p packages/functions
npx tsc --noEmit -p packages/web
```

- [ ] Los 5 comandos terminan sin errores

**Result:** ✅ / ❌

---

## Test 8 — Build de producción

**Objetivo:** confirmar que el bundle web compila correctamente.

```bash
cd packages/web && npm run build
```

- [ ] Build termina sin errores
- [ ] Tamaño del bundle no es absurdo (>10 MB sería raro)
- [ ] No hay imports rotos al cargar `dist/index.html` localmente

**Result:** ✅ / ❌

---

## Test 9 — Exegesis pricing end-to-end (EXEGESIS_PRICING_INTEGRATION)

**Objetivo:** confirmar reserve → consume → pre-confirm → out-of-credits → pack purchase → telemetry para el bucket de exégesis.

**Pre-requisitos:** usuario test en plan Pro con `processingBalance.planExegesisUsd ≥ 10` (correr `backfillExegesisQuotas` si hace falta).

### 9.1 Reserve happy-path

1. Login con cuenta Pro de test
2. Ir a `/dashboard/exegesis`
3. Banner debe mostrar tono `ok` y "X estudios disponibles"
4. Abrir un paper → click "Análisis canónico" en un verso
5. **Pre-confirm modal** debe aparecer con costo `~$0.10` y preview de saldo después
6. Click "Continuar"
7. **Verificar:**
   - [ ] Operación corre, análisis se renderiza
   - [ ] Tile de balance baja `$0.10` (banner Library)
   - [ ] Firestore `user_activities`: 2 docs nuevos con `metadata.event` = `exegesis.quota.reserve_attempted` y `exegesis.quota.reserve_succeeded`

### 9.2 Out-of-credits flow

1. Bajar manualmente `processingBalance.exegesisUsdAvailable` a `0` (Firestore console)
2. Click "Análisis canónico" en otro verso
3. **Verificar:**
   - [ ] OutOfCreditsDialog aparece con `neededUsd: 0.10`
   - [ ] Click "Comprar pack" → CreditPacksDialog abre con sección Estudios primero
   - [ ] Firestore `user_activities`: 1 doc con `event = exegesis.quota.exceeded`
   - [ ] Cerrar y re-abrir, click "Mejorar plan" → 1 doc con `event = exegesis.upgrade.cta_clicked, surface = upgrade_plan`

### 9.3 Pack purchase

1. En el CreditPacksDialog (sección Estudios), click "Comprar" en pack S Estudios ($9)
2. Stripe Checkout → tarjeta `4242...`
3. Tras pagar, redirect a library
4. **Verificar:**
   - [ ] Tile "Estudios" suma 3 estudios (S = $6 credit / $2 STUDY_UNIT_USD = 3)
   - [ ] Firestore `users/{uid}/credit_pack_purchases/{sessionId}` con `mode: 'exegesis'`, `usdAmount: 6`
   - [ ] Firestore `user_activities`: 1 doc con `event = exegesis.pack.purchased`, `packSku = exegesis-s`, `amountUsd = 6`

### 9.4 noAccess gate (plan Free / Personal)

1. Login con cuenta Free
2. Ir a `/dashboard/exegesis`
3. **Verificar:**
   - [ ] Banner muestra tono `hard-cap` con texto "Disponible en planes Pro y Equipo"
   - [ ] Click banner → OutOfCreditsDialog en estado `noAccess` (botón "Comprar pack" disabled, solo upgrade)

**Result:** ✅ / ❌

---

## Test 10 — Faculty Extractions Persistence (PR #153)

**Cuándo correr:** después de cualquier cambio en Faculty extraction flow, antes de cada deploy mayor.

**Prerequisito:** estar autenticado con cuenta Pro/Team que tenga al menos una sesión de Faculty con 4+ mensajes.

### 10.1 Generate + queue UX

1. Abrir sesión de Faculty con conversación existente.
2. Panel derecho → tab `Herramientas`.
3. Click `Devocional Diario`.
4. **Verificar:**
   - [ ] Loading state visible en la card durante generación
   - [ ] Al terminar: si NO había documento abierto → editor se abre auto con el devocional
   - [ ] Si HABÍA documento abierto → toast "✓ {título} listo · Ver" sin reemplazar el editor
   - [ ] Click "Ver" en toast → editor cambia al nuevo artifact

### 10.2 Persistencia + listener

1. Después de generar al menos 2 artifacts en la sesión.
2. Click tab `Generados`.
3. **Verificar:**
   - [ ] Badge cuenta correctamente (`Generados · N`)
   - [ ] Lista cronológica con icon + título + "hace X min" + chip de tipo
   - [ ] Click en un item → editor cambia a ese artifact
   - [ ] Item seleccionado tiene highlight indigo

### 10.3 Reload survival

1. Generar artifact → cerrar editor.
2. Hard refresh (`Cmd+Shift+R`).
3. **Verificar:**
   - [ ] Tab `Generados` aún muestra el artifact
   - [ ] Click → abre con markdown intacto

### 10.4 Autosave

1. Abrir artifact desde lista.
2. Editar texto en el editor.
3. Esperar 2s (debounce 1.5s + buffer).
4. Reload.
5. **Verificar:**
   - [ ] Cambios persisten
   - [ ] En Firestore Console → doc tiene `version` incrementado

### 10.5 Cross-session library

1. Navegar a `/dashboard/faculty/library`.
2. **Verificar:**
   - [ ] Lista TODOS los artifacts del user (de cualquier sesión)
   - [ ] Search filtra por título/tipo/contenido
   - [ ] Click → editor en panel derecho

### 10.6 Provenance jump-back

1. En `/library` → click menú `⋯` de un artifact → "Ver origen en la conversación".
2. **Verificar:**
   - [ ] Navega a la sesión origen
   - [ ] Scroll automático al mensaje origen
   - [ ] Highlight indigo en el mensaje (6 segundos)
   - [ ] Hash URL `#origin=...` desaparece después del fade

### 10.7 Orphan después de delete sesión

1. En `/library` localizar artifact de una sesión.
2. Volver a la sesión origen → menú → eliminar sesión.
3. Confirmar.
4. Reload `/library`.
5. **Verificar:**
   - [ ] Artifact aún visible
   - [ ] Chip muestra "sesión eliminada"
   - [ ] Menú `⋯` ya NO ofrece "Ver origen"

### 10.8 Pin a proyecto

1. En sesión asociada a un proyecto → generar artifact.
2. Tab `Generados` → menú → `Anclar al proyecto`.
3. Navegar a `/dashboard/faculty/projects/{projectId}/library`.
4. **Verificar:**
   - [ ] Artifact aparece en la lista del proyecto
   - [ ] En tab `Generados` original muestra icono pin

### 10.9 Markdown rendering en tablas

1. Generar un sermón o estudio que produzca tabla (e.g. paradigma griego).
2. **Verificar:**
   - [ ] Tablas con `**Label**` en celdas renderizan bold (no asteriscos literales)
   - [ ] Callouts Ejemplo/Nota/Definición/Atención están dentro del box verde/azul/violeta/ámbar (NO como blockquote raw)
   - [ ] Multi-paragraph callouts mantienen todo el cuerpo dentro del box

**Result:** ✅ / ❌

---

## Frecuencia recomendada

| Test | Antes de cada deploy | Antes de launch | Diario post-launch |
|---|---|---|---|
| 1. Citas protegidas | ❌ | ✅ | semanal |
| 2. Free tier gates | ❌ | ✅ | semanal |
| 3. Credit pack purchase | ❌ | ✅ | después de tocar Stripe |
| 4. Bonus inicial | ❌ | ✅ | después de tocar Stripe |
| 5. LlamaParse failover | ❌ | ✅ | después de tocar extracción |
| 6. Pre-commit hook | ❌ | ✅ | si modifico el script |
| 7. Type-check global | ✅ | ✅ | siempre antes de commit |
| 8. Build producción | ✅ | ✅ | siempre antes de deploy |
| 9. Exegesis pricing end-to-end | ❌ | ✅ | después de tocar exégesis o Stripe |
| 10. Faculty Extractions Persistence | ❌ | ✅ | después de tocar Faculty o cada release semanal |

---

**Cuando un test falla:**
1. NO desplegar
2. Investigar el log / consola del browser
3. Si es bug genuino: arreglar + re-run el test
4. Si es flake (falla inconsistente): registrar y re-run; si vuelve a fallar trátalo como bug
