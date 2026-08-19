# Plan de puesta al día — del código inerte al sistema medido

> **Tipo:** plan de ejecución vivo. Se actualiza en cada cierre de ola (marcar casillas + bitácora al final).
> **Creado:** 2026-08-17, tras auditoría del estado real (git + byblos + código).
> **Contexto de partida:** última actividad 2026-07-18 (PR #400). ~1 mes sin commits. CI y Deploy Production
> verdes en el último push. Producto vivo en prod con usuarios reales.

---

## Diagnóstico que ordena el plan

El problema **no** es falta de features. Es que hay mucho código shipped en producción que está
**inalcanzable y sin medir**:

- 13 feature flags en el dominio, **9** encendibles desde el admin. Tres features shipped no se pueden
  activar sin editar Firestore a mano.
- Un flag (`anchor_fidelity_enforce`) que un hook lee pero que **no existe en el registry del dominio** →
  el verify-drop de ADR-036 nunca puede activarse.
- La calibración del gate de suficiencia (Redacción v2 Fase 1) está **en pausa por falta de datos**:
  0 filas `userConfirmed` en prod, causadas por un bug de escritura de un solo sitio.
- Dos implementaciones del spine de 8 pasos; **solo una instrumenta** → los estudios que entran por el menú
  "Nuevo Sermón" no producen ninguna señal de sombra.

**Consecuencia para el orden:** primero se hace el sistema **alcanzable y medible**, después se construye
encima. Construir features nuevas sobre instrumentación que no corre acumula más código inerte.

---

## Ola 0 — Higiene y salud de prod

**Tamaño:** ½ día. **Bloquea:** nada, pero se hace primero tras un mes idle.

- [ ] **0.1** Descartar el diff de `approach-compliance-criteria.md` (195/195 líneas, whitespace/EOL puro,
      cero cambio de contenido).
- [ ] **0.2** Commitear `0b-gap-genero-como-acto.md` (terreno de la Ola 2) + corregir su hueco desactualizado:
      el juez **sí está cableado** (`CallableGenreEngagementJudge` inyectado en `GuidedSermonService.ts:151`
      + callable `passage-profile/genreEngagement.ts`).
- [x] **0.3** `scripts/cohorte-superficies-creacion.mjs` — ampliado a `FOUNDER_UIDS` (lista; el fundador opera
      con dos cuentas y filtrar por una dejaba la otra contaminando), **corrido contra prod**. Resultados en
      § Cohorte real.
- [x] **0.4a** Smoke automático de funciones — **encontró un roto real**: `sendNurtureEmails` fallaba a diario
      por índice faltante y la cascada se llevaba las advertencias de fin de trial. Cero usuarios recibieron
      jamás day-14 ni trial-5d/1d (marcadores `emailsSent` en `users/`). Fix en PR #402.
- [ ] **0.4b** Smoke manual de UI (login, wizard, faculty, biblioteca) + revisar quota LlamaParse/Gemini y
      vigencia de secrets. Queda para el fundador.

---

## Cohorte real (medido 2026-08-17, `scripts/cohorte-superficies-creacion.mjs`)

Base: **13 usuarios · 69 pastoralSeeds · 210 sermones.** "Sin fundador" excluye las dos cuentas del fundador.

| Métrica | Con fundador | Sin fundador |
|---|---|---|
| Seeds socráticos instrumentados (Spine B) | 4 (2 usuarios) | **2** (1 usuario) |
| — de esos, `userConfirmed` | 1 | **0** |
| Estudios del form del menú (Spine A) post-PR1 | 0 | 0 |
| Seeds legacy pre-PR1 (ambiguos) | 65 (3 usuarios) | 4 (2 usuarios) |
| Sermones sintéticos (`AI Generated`) | 3 (1 publicado) | **0** |
| Sermones sin estudio ni tag sintético | 150 (8 usuarios) | 18 (7 usuarios) |

**Tres lecturas que corrigen supuestos del plan:**

1. **El cuello de botella de la Ola 3 no es solo el bug de provenance — es el tráfico.** Post-PR1 hay 4 seeds
   socráticos en total, casi todos del fundador. Aunque 0b-B quede perfecto, con ese caudal no se llega a
   20-30 estudios reales en un plazo razonable. La meta 3.3 necesita **generar uso** (dogfood activo del
   fundador + embajador, o bajar el N y aceptar menos confianza), no solo esperar.
2. **Instrumentar el Spine A (3.2b) NO es urgente.** Cero estudios entraron por el form post-PR1. El atajo (a)
   — entrar por el camino socrático — no está tapando volumen.
3. **El problema del tutor sintético (5.1) es de señal, no de daño.** Los 3 sermones sintéticos son **todos**
   del fundador; ningún usuario real produjo uno. La decisión sigue siendo válida (qué comunica el menú) pero
   pierde urgencia.

**Dato de fondo, más incómodo que los tres anteriores:** los usuarios reales tienen **18 sermones sin estudio**
frente a **2 seeds socráticos**. La tesis del producto — el sermón como fruto del estudio — todavía no se
refleja en el uso.

> **Fix de raíz — HECHO para seeds (2026-08-19).** Los `pastoralSeeds` nuevos traen `origin` (`wizard` |
> `socratic`), escrito por el creador: para ellos la superficie es un hecho, no una inferencia. Los proxies
> quedan como fallback de los seeds anteriores al campo. **Los sermones siguen sin `origin`** — esa mitad de la
> partición sigue siendo proxy (tag `AI Generated` + enlace a seed). Pendiente.

## 🔴 PRIORIDAD ALTA — Sacar la clave de Gemini del navegador

**Descubierto:** 2026-08-19, levantando el terreno para la gestión de costos.
**Estado:** pendiente. Arranca al cerrar la capa de "actuar" sobre costos.
**Por qué encabeza la lista:** es el único pendiente del plan que es a la vez un
problema de **seguridad**, de **costo** y de **medición**.

### El problema

`VITE_GEMINI_API_KEY` se inlinea en el bundle por definición del prefijo `VITE_`
(inyectada desde un secret de GitHub en `deploy-production.yml:43`). Cualquiera
que abra DevTools en `app.preach.dosfilos.com` la lee. Consecuencias, en orden:

1. **Un tercero puede gastar tu cuota** sin tocar la app. No aparecería como uso
   del producto — solo en la factura.
2. **Ningún medidor del servidor puede verla.** El panel `/dashboard/admin/llm-cost`
   mide únicamente lo que pasa por callables; mientras esto siga así, el total
   real es mayor que el mostrado y nadie sabe por cuánto.
3. **No hay rate-limit posible.** El usuario habla directo con Google; no hay
   dónde interponer un tope.

Nota: las otras claves `VITE_` (`VITE_FIREBASE_API_KEY`, `VITE_RECAPTCHA_SITE_KEY`)
son públicas **por diseño** y están protegidas por reglas + App Check. La de Gemini
es la anómala: es una credencial que gasta dinero directamente.

### Mitigaciones interinas (no reemplazan el fix)

- Restricción por referrer HTTP + restricción de API a Generative Language.
  ⚠️ El referrer se falsifica con un header; y la API de Gemini históricamente no
  aplicaba bien esa restricción — **verificar que realmente muerda**.
- **Tope de cuota por API** en Cloud Console (req/min y req/día). Esto sí se aplica
  siempre, venga la llamada de donde venga. Es el freno duro real.
- **Rotar la clave.** Lleva meses en el bundle: tratarla como ya comprometida.
- ⚠️ **Antes de restringir:** verificar si `VITE_GEMINI_API_KEY` y la
  `GEMINI_API_KEY` de functions son el MISMO valor. Si lo son, la restricción por
  referrer tumba todos los callables (Cloud Functions no manda `Referer`).

### El fix real: mover las llamadas a callables

**38 sitios**, agrupados por feature. El orden propuesto va por volumen × riesgo,
y cada tanda es una PR que además hace visible su gasto en el panel:

| # | Feature | Archivos | Nota |
|---|---|---|---|
| 1 | Refinamientos del sermón (draft, homilética, secciones, chat de paso) | 4 hooks web | Los más usados; ganan medición inmediata |
| 2 | Tutores griego y hebreo | 5 (services + providers) | Sesiones largas = muchos tokens |
| 3 | Biblioteca (embeddings, file search, core library) | 4 + `library-context` | Embeddings a volumen |
| 4 | Exégesis (orquestador, compositores, verificador, detectores) | 18 en `infrastructure/exegesis` | La tanda grande; conviene partirla |
| 5 | Resto (`GeminiAIService`, multi-agent, word study, repurposer, plan generator) | 6 | Barrido final |

**Criterio de cierre:** `grep -r VITE_GEMINI_API_KEY packages/` no devuelve nada,
la variable sale de los workflows, y la clave del cliente se elimina en Cloud
Console.

**Patrón a seguir:** el port `ILlmClient` + adapters ya existen en `functions`, y
desde la PR del medidor **cada callable que se migra queda medido gratis** — la
migración deja de ser deuda estética y pasa a comprar visibilidad de costo.

**Relación con la deuda vieja:** esto se solapa con
`tech_debt_llm_provider_abstraction` (~34 callers directos al SDK). Es el mismo
trabajo mirado desde otro ángulo; hacerlo una vez paga las dos deudas.

## Ola 1 — Destrabar el panel de control ⬅️ PRIMERO DE VERDAD

**Tamaño:** 1 PR chico. **Bloquea:** todo lo demás — sin esto no se puede encender ni medir nada.

- [x] **1.1** Sincronizar `ALLOWED_FLAGS` (`packages/functions/src/admin/setUserFeatureFlags.ts:7-17`, hoy 9)
      con `FEATURE_FLAG_NAMES` (`packages/domain/src/entities/User.ts:133-256`, hoy 13). Faltan:
      `sermon_draft_shadow`, `genre_override_enforce`, `step3_genre_help`.
- [x] **1.2** `anchor_fidelity_enforce` — **registrado, no borrado**. Era la disyuntiva de la ola (registrarlo
      o borrar `useAnchorFidelityEnforceGate`); se registró porque el verify-drop es trabajo shipped de
      ADR-036 y borrarlo lo tiraba a la basura. Entra a `FEATURE_FLAG_NAMES` con prereq `passage_profile`.
- [x] **1.3** Test de paridad anti-drift — `packages/functions/src/admin/__tests__/allowedFlagsParity.test.ts`.
      Lee el fuente del dominio vía `fs` porque `functions` NO puede importar `@dosfilos/domain` (decoupling
      intencional: importarlo revienta el build con ~180 TS6059). Probado fail-closed: al quitar un flag del
      allowlist, el test falla nombrándolo.

### Cerrada 2026-08-18 — qué se encontró de paso

- **`anchor_fidelity_enforce` no existía en el registry** y sin embargo un hook lo leía. Se registró en
  `FEATURE_FLAG_NAMES` con prereq `passage_profile` (misma baranda anti-fail-open que sus hermanos) →
  el verify-drop de ADR-036 pasa de inalcanzable a encendible.
- **La UI de admin ya derivaba del dominio** (`FEATURE_FLAG_NAMES`), no tenía tercera copia. Lo que fallaba
  era el borde servidor: el toggle se veía y el callable lo rechazaba como flag desconocido.
- **7 de 13 flags no tenían descripción en la UI** (i18n es/en). Agregadas — un panel de control con toggles
  mudos no es un panel de control.
- 🔴 **HALLAZGO GRANDE, fuera de alcance de esta ola: `packages/web` NO se typechequea en CI.** Su
  `tsconfig.json` es un archivo-solución con `"files": []`, así que `tsc --noEmit` (lo que corre CI) no mira
  ni un archivo; `vite build` tampoco typechequea. El chequeo real
  (`tsc -p packages/web/tsconfig.app.json`) arroja **587 errores preexistentes**. Por eso el flag fantasma
  sobrevivió a CI. Ver Ola 8.

## Ola 2 — 0b-B: provenance desde el acto

**Tamaño:** 1 PR. **Depende de:** Ola 1 (para poder encender y verificar). **Palanca:** la más alta del sistema.

Paga doble: des-confunde la sombra de Fase 3 **y** destraba la calibración en pausa.

- [x] **2.1** Huecos cerrados — y uno de ellos invalidó la premisa del doc 0b. Ver nota abajo.
      Enunciado original:
      (a) sourcing de la propuesta inferida-del-libro en `persistTo`;
      (b) si `persistTo` corre en la rama `accept-override` (hoy devuelve `undefined` → probablemente se salta).
      El 3er hueco (hogar de `SELECTABLE_GENRES`) ya lo cerró 0b-A.
- [x] **2.2** Hecho, con el alcance corregido: `persistTo` deja de derivar procedencia de la prosa
      (preserva el acto); el acto se registra en las DOS superficies. Rewire original enunciado: → `(propuestaDelLibro, géneroDelChip)`; sacar
      `detectGenreInText` de ese path.
- [x] **2.3** VERIFICADO en prod (2026-08-19): el seed de Jonás 1:1-3 creado tras el deploy lleva
      `genreProvenance: userConfirmed` salido del clic del pastor. El otro `userConfirmed` de la base es de
      julio y venía del keyword-match viejo.

### Cerrada 2026-08-18 — la premisa del doc 0b estaba equivocada

El doc 0b decía: *"el acto YA existe (los chips del paso 2); 0b-B solo re-conecta la escritura de
provenance a ese acto"*. El código dice otra cosa — **son dos superficies distintas**:

| | Spine A — wizard (`PastoralSeedWizard`) | Spine B — socrático (Faculty chat) |
|---|---|---|
| Acto (chips) | **Sí**, `ContextGenreStep` | **No existía** |
| Escribía provenance | **No** (solo `genre` + `genreConfirmed`) | Sí, adivinada de la prosa |

O sea: la superficie que tenía el acto no lo registraba, y la superficie que registraba procedencia no
tenía acto. `createEmptyPastoralSeed` lo decía en un comentario desde Fase 1: *"the guided conversational
flow has no UI to confirm a proposed genre"*. Apuntar `persistTo` "al chip" era imposible: en el chat no
hay chip.

**Decisión del fundador:** llevar el mismo acto al chat (chips de los 7 predicables del SSOT `SELECTABLE_GENRES`)
en vez de derivar la procedencia de un veredicto LLM. El acto queda determinista y las dos superficies miden
lo mismo.

**Lo entregado:**
- `pronounceGenre` (dominio, puro, fail-closed ante centinelas/stub) — una sola derivación para ambas superficies.
- `persistTo` deja de usar `detectGenreInText` para procedencia: preserva el acto o queda `aiProposed`
  honesto. Antes podía emitir un `userConfirmed` **falso** por un keyword suelto en la prosa.
- `PronounceGuidedGenreUseCase` + `GuidedGenreSelector` — el paso 2 guiado gana el acto que no tenía.
- El wizard ahora sí registra su propio acto.

## Ola 3 — Encender la instrumentación + dogfood

**Tamaño:** poco trabajo, 2-4 semanas de calendario. **Depende de:** Olas 1 y 2.

- [ ] **3.1** Flip en cuentas dogfood, en orden: `passage_profile` → `sermon_draft_shadow` →
      `genre_override_enforce`.
- [x] **3.2** Resuelto por **(b)**, y (a) quedó descartado por los datos. Al verificar 2.3 se vio que el
      fundador dogfoodea en el WIZARD, no en el chat: su estudio de Jonás quedó completo (3 estudios de
      palabras en hebreo, 3 paralelos, principio verificado) y **no dejó ni una fila de sombra** — porque el
      gate lee `passageProfileShadow` y el wizard no reportaba. Pedirle que cambie de superficie para
      alimentar el instrumento era la cola moviendo al perro. El wizard ahora reporta la misma señal, por la
      misma puerta (`PassageProfileShadowService`).
- [ ] **3.3** Meta: **≥20-30 estudios reales** con `userConfirmed` poblado. Recién ahí se toca el umbral del
      gate de suficiencia (condición explícita de reanudar, registrada en byblos).
      ⚠️ **El cohorte medido dice que el caudal no alcanza** (4 seeds socráticos post-PR1, casi todos del
      fundador). Esta meta exige generar uso deliberadamente o bajar el N a sabiendas. Ver § Cohorte real.

**Regla de lectura de los datos:** solo las filas `userConfirmed` + insuficiente miden labor. `aiProposed` y
`userOverride` miden precisión de la inferencia, NO "no analizó".

## Ola 4 — Revisión de catálogos (solo el fundador)

**Corre en paralelo con la Ola 3** — los dos últimos se revisan CON los datos de sombra.

- [ ] **4.1** `approach-compliance-criteria.md` — el catálogo del juez, criterio por criterio, + severidad
      (`critica|estandar`) + tipo (`contenido|tratamiento`) + umbral "mayoría/todos" de §8.6.
      **Bloquea Redacción v2 Fase 2 entera.**
- [ ] **4.2** `GENRE_DISCERNMENT_CRITERIA` (`packages/domain/src/guided-sermon/genreDiscernmentCriteria.ts`).
      **Bloquea el flip de `genre_override_enforce`.**
- [ ] **4.3** `STRUCTURAL_SUFFICIENCY_BY_GENRE` + `workedExamples` (hoy vacíos, los cura el fundador).
      **Bloquea el flip de `step3_genre_help`.**

## Ola 5 — Decisiones de producto pendientes (solo el fundador)

Sin dependencia de orden; cuanto antes, mejor.

- [ ] **5.1** "Generar con el tutor" — produce sermón 100% sintético y es la **1ª entrada** del menú Nuevo
      Sermón. Medido 2026-08-17: 3 sermones sintéticos sobre 210, **todos de cuentas del fundador**; ningún
      usuario real produjo uno. Es un problema de **señal del menú**, no de daño. Reubicar / reetiquetar /
      dejar como está.
- [ ] **5.4** ¿A quién apunta hoy el email de día 14? Filtra por `subscription.planId == 'free'` y en prod hay
      **0 usuarios free** (el registro escribe `planId: 'free'` en `AuthService.ts:240`, pero nadie lo tiene).
      Con el índice arreglado el correo sigue sin audiencia. Decidir target o retirarlo.
- [ ] **5.2** `fidelity_pass` — ADR-032 lo manda a Fase 7 (es feature del paper, no del sermón). Confirmar que
      sigue siendo la decisión o reabrir.
- [ ] **5.3** `contra_scan` — hoy solo en la cuenta del fundador. ¿Ampliar a dogfood?

## Ola 6 — Redacción v2: el corazón

**Depende de:** Ola 4 (catálogos) + Ola 3 (datos). Aquí el track vuelve a ser producto visible.

- [ ] **6.1** **Fase 2 — catálogos como dato**: `ApproachComplianceCatalog` + criterios de género hermanos +
      severidad/tipo + reconciliación del enum.
- [ ] **6.2** **Fase 3 — mapeo género→estructura + constructor de proposición (8 elementos)**. Consume
      `PassageProfile`, NO re-deriva género (invariante: una sola fuente de verdad de género).

## Ola 7 — Cerrar Fase 4 (Pastoral Fidelity)

Solo el contra-scan está shipped (#315-#317). Faltan dos sub-features.

- [ ] **7.1** **Autoría verbatim** — debe **EXTENDER** `evaluatePublishGate`, no crear un tercer modal.
      Requiere ADR: 7 decisiones abiertas (algoritmo de diff, umbral por defecto, orden de confrontación).
- [ ] **7.2** **Voice fingerprint** — la más tardía. Sin decisión de técnica (fine-tune vs few-shot vs RAG) ni
      de privacidad del corpus. Diferible sin costo.

> **Precondición del phase doc:** flipear y validar la confrontación de Fase 3 antes de apilar otra. Con
> `fidelity_pass` dormante esa validación no existe → se resuelve en 5.2.

## Ola 8 — Deuda

Boy Scout salvo donde se indique.

- [ ] Convergencia/instrumentación del spine duplicado (viene de 3.2b)
- [ ] Parser Biblia duplicado (web + infra) — cambios deben mirrorearse o las superficies divergen en silencio
- [ ] Abstracción de proveedor LLM (~34 callers directos a Gemini) — sprint dedicado
- [ ] SBLGNT hardcoded → catálogo CORE (próxima ingesta)
- [ ] Typing de tools del SDK Gemini (upgrade SDK)
- [ ] Chat del paso 1 sin persistir
- [ ] Realtime status en Admin Core Library
- [ ] Rate-limit propio en `completeRegistration`
- [ ] Faculty extractions user-wide sin trimmed callable
- [ ] **`packages/web` sin typecheck real en CI** (587 errores preexistentes) — `tsconfig.json` es solución
      con `files: []`; CI corre `tsc --noEmit` sobre nada. Arreglarlo es un proyecto propio (apuntar el script
      a `tsconfig.app.json` y bajar los 587 a cero, o adoptar `tsc -b`). No es Boy Scout.
- [ ] **Clave duplicada `status`** en `i18n/locales/{es,en}/admin.json` (string + objeto; JSON.parse conserva
      el último → la etiqueta "Estado" está muerta). Nit, arreglar al pasar por ahí.
- [ ] **Staging env** — 3-4 días, plan ya acordado en byblos. No es Boy Scout.

---

## Camino crítico

```
Ola 0 (higiene)
   ↓
Ola 1 (allowlist de flags)  ← 80% del desbloqueo, 1 PR chico
   ↓
Ola 2 (0b-B provenance)     ← la palanca
   ↓
Ola 3 (dogfood 2-4 sem) ∥ Ola 4 (catálogos del fundador)
   ↓
Ola 6 (Redacción v2 Fase 2 → Fase 3)
```

Olas 5, 7 y 8 cuelgan del camino sin bloquearlo.

---

## Bitácora

| Fecha | Ola | Qué pasó |
|---|---|---|
| 2026-08-17 | — | Plan creado tras auditoría del estado real. |
| 2026-08-19 | 3 | Campo `origin` en los seeds (los 2 únicos creadores lo declaran) + script de cohorte lee el hecho en vez de adivinarlo. Sermones siguen por proxy. |
| 2026-08-19 | 3 | 2.3 verificada en prod (`userConfirmed` real). Hallazgo: el estudio del wizard no dejaba sombra → 3.2 resuelto instrumentando el Spine A + servicio único de recorder para los dos spines. Falta encender flags y dogfood (3.1/3.3). |
| 2026-08-18 | 2 | 0b-B con alcance corregido: el chat no tenía acto (el doc 0b confundía superficies). `pronounceGenre` en dominio + selector en el paso 2 guiado + wizard registrando su acto + `detectGenreInText` fuera del path de procedencia. Falta verificar en prod (2.3). |
| 2026-08-18 | 1 | Allowlist sincronizada (13/13) · `anchor_fidelity_enforce` registrado con prereq · test de paridad fail-closed · 7 descripciones i18n. Hallazgo: web sin typecheck en CI (587 errores) → Ola 8. |
| 2026-08-17 | 0 | 0.1 diff whitespace descartado · 0.2 doc 0b versionado + corregido el hueco del juez · 0.3 script de cohorte ampliado a `FOUNDER_UIDS` y corrido (§ Cohorte real) · 0.4a smoke de funciones destapó el nurture roto (PR #402). Queda 0.4b (smoke manual de UI + quotas). |
</content>
</invoke>
