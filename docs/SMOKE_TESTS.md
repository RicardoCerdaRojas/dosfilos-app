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

---

**Cuando un test falla:**
1. NO desplegar
2. Investigar el log / consola del browser
3. Si es bug genuino: arreglar + re-run el test
4. Si es flake (falla inconsistente): registrar y re-run; si vuelve a fallar trátalo como bug
