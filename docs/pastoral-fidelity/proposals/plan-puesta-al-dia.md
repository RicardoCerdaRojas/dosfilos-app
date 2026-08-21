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

## ✅ CERRADA 2026-08-20 — Sacar la clave de Gemini del navegador

**Descubierto:** 2026-08-19, levantando el terreno para la gestión de costos.
**Estado:** ✅ **CERRADA 2026-08-20.** Los cinco criterios verificados (ver abajo).
La credencial expuesta fue **rotada y eliminada**, no solo reemplazada.
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
   *(Actualizado 2026-08-19: los callables del servidor que llamaban al SDK directo
   ya se migraron al port y quedaron medidos — 18 sitios. Lo que falta es
   exclusivamente lo del navegador.)*
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

**Estado al 2026-08-20: ~60% cerrado.** Todo lo conversacional, el motor de
sermón completo, la extracción de PDFs y los embeddings ya salen por el servidor
y aparecen en el panel. Queda la tanda de exégesis y un barrido final.

#### Lo que ya salió del navegador (en prod)

| PR | Superficie | Cómo salió |
|---|---|---|
| #417 | Proxy `runLlmPrompt` + tutor de hebreo | callable con allowlist de features/modelos + rate-limit por uid |
| #420 | Chat de Faculty (modo normal) | **SSE** (`facultyChatStream`, `onRequest`) — el SDK cliente v10 no tiene `.stream()` en callables |
| #421 | Tutor de griego + quiz | proxy |
| #422 #423 #424 #426 | `GeminiSermonGenerator` completo: generación, refinamiento, las 6 generaciones grandes, chat del wizard | proxy + SSE para el chat |
| #427 | Extracción de PDFs | ya corría en el servidor; lo que faltaba era **medirla** |
| #428 | Embeddings | callable `embedTexts` (tokens estimados: `embedContent` no devuelve `usageMetadata`) |
| #429 | Contrato del proxy completo | `responseSchema`, `topP`, `maxOutputTokens` hasta 65.536 |

#### Cómo cerró

Las 18 adapters de exégesis se migraron a mano, en tandas (#430, #431, #432), más
el barrido final (#433) y la limpieza de interruptores (#434).

**El hallazgo que casi cuesta una caída de prod:** al verificar antes de borrar la
clave apareció que `VITE_GEMINI_API_KEY` y el secret `GEMINI_API_KEY` del servidor
**eran el mismo valor**. Dos consecuencias:

1. Ejecutar el criterio de cierre literalmente ("borrar la clave del cliente")
   habría tumbado los 23 callables que declaran ese secret.
2. La exposición era peor de lo que decía este documento. No era "un tercero puede
   quemar cuota del navegador": la clave pública en el bundle durante meses **era la
   credencial del backend**.

Por eso el cierre no fue borrar, sino **rotar** (#435):

1. Clave nueva, solo servidor, creada y canalizada directo a Secret Manager por un
   pipe — el valor nunca pasó por pantalla ni por el portapapeles.
2. Versión 4 del secret.
3. **Redeploy de functions.** Firebase FIJA la versión del secret en el deploy;
   agregar la versión no basta. Este es el paso que se olvida.
4. Verificación en prod con tráfico real: `facultyChat`, `hebrewTutor_analyzeVerse`,
   `exegesis_analyzeVerse` (en `gemini-2.5-pro`) y cuatro features de sermón, todas
   registrando en el panel después del deploy.
5. Recién ahí, borrado de la clave vieja.

#### Verificación de cierre (2026-08-20)

| # | Criterio | Estado |
|---|---|---|
| 1 | `grep -rn VITE_GEMINI_API_KEY packages/*/src` | ✅ vacío |
| 2 | Fuera de `deploy-production.yml` y `deploy-preview.yml` | ✅ |
| 3 | Fuera de `.env.example` y `.env.local` | ✅ |
| 4 | Secret `VITE_GEMINI_API_KEY` borrado en GitHub | ✅ |
| 5 | Clave `dosfilosapp` (uid `025c013a-…`) eliminada en GCP | ✅ |

Además: barrido del bundle desplegado (`index.js` + los 317 chunks de
`app.preach.dosfilos.com`) sin rastro de la clave. La única `AIza` que queda es la
de Firebase, pública por diseño.

#### Lo que queda, ya sin urgencia

- ✅ **El SDK de Gemini ya NO se empaqueta en el navegador** (cerrado 2026-08-20).
  Lo arrastraban el enum `SchemaType` de tres esquemas de exégesis,
  `GeminiMultiAgentService` (que `SseMultiAgentService` construía con `''` solo
  para reusar sus prompts) y dos archivos muertos: `GeminiFileSearchService` y
  `GeminiPastoralWordStudyService`. Ver § SDK de Gemini fuera del navegador.
- Cuatro scripts de `scripts/` leen `process.env.GEMINI_API_KEY`. No la traen
  adentro, la toman del entorno — hay que exportar la nueva al correrlos.

**Patrón a seguir:** el port `ILlmClient` + adapters ya existen en `functions`, y
desde la PR del medidor **cada callable que se migra queda medido gratis** — la
migración deja de ser deuda estética y pasa a comprar visibilidad de costo.

**Relación con la deuda vieja:** esto se solapa con
`tech_debt_llm_provider_abstraction` (~34 callers directos al SDK). Es el mismo
trabajo mirado desde otro ángulo; hacerlo una vez paga las dos deudas.

## Lo que el medidor ya nos dijo (2026-08-20)

Con el panel `/dashboard/admin/llm-cost` en pie y las superficies migradas
midiéndose, hay por fin números en vez de intuición:

| Hecho medido | Número |
|---|---|
| Costo de un sermón completo, punta a punta | **≈ USD 0,02** |
| Sermones/mes que caben en el presupuesto de USD 25 | **≈ 1.200** |
| Factura real de GCP del mes | **≈ USD 2** |

**Conclusión, y conviene decirla sin adorno: el costo no es una restricción a esta
escala.** Estuvimos a punto de tratarlo como si lo fuera. El valor del medidor no
es ahorrar centavos — es **detectar fugas**: un bucle que reintenta, un prompt que
duplicó su contexto, una clave robada gastando de noche. Para eso sirve el
presupuesto de USD 25 y las alertas al 50/80/100%: no como techo económico, sino
como **detector de anomalías**.

Corolario para priorizar: la migración de la clave sigue siendo P0, pero por
**seguridad y visibilidad**, no por plata.

⚠️ Cuidado con la moneda: la consola de GCP muestra **CLP**. Leer esos montos como
USD infla la factura ~900× y lleva a optimizar lo que no importa (ya pasó una vez
en esta sesión).

### Cómo se mide (para no re-descubrirlo)

- Cada llamada escribe en `llmUsageDaily/{YYYY-MM-DD}` y `llmUsageMonthly/{YYYY-MM}`,
  con cortes por feature, modelo y `userId`, vía `recordLlmUsage` (fire-and-forget:
  el medidor nunca debe tumbar la feature que mide).
- El presupuesto vive como **dato editable** en `config/llmBudget`, no en código.
- `shadowLlmAllowed()` es el cortacircuito: cuando el día se pasa de
  `shadowDailyUsdCap`, lo primero que se sacrifica es la medición en sombra, no el
  producto. **Fail-open** a propósito.
- Trampa ya pagada: los cortes se escriben como **mapas anidados**, nunca con
  claves con punto (`set({'byFeature.x.calls': …})` crea un campo llamado
  literalmente así, y el panel muestra totales correctos con cortes vacíos —
  miente a medias, que es peor que fallar). Hay test que prohíbe el punto.

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
- ✅ **HALLAZGO GRANDE, fuera de alcance de esta ola: `packages/web` NO se typechequea en CI.** Su
  `tsconfig.json` es un archivo-solución con `"files": []`, así que `tsc --noEmit` (lo que corre CI) no mira
  ni un archivo; `vite build` tampoco typechequea. El chequeo real
  (`tsc -p packages/web/tsconfig.app.json`) arroja **587 errores preexistentes**. Por eso el flag fantasma
  sobrevivió a CI. **Cerrado el 2026-08-20 con un trinquete** — ver § Trinquete de tipos de `packages/web`.

## ✅ CERRADA 2026-08-20 — Trinquete de tipos de `packages/web`

**Por qué existía el agujero:** `packages/web/tsconfig.json` es un archivo-solución con `"files": []`.
Un `tsc --noEmit` a secas ahí no mira **ni un archivo**, y `vite build` tampoco typechequea. El script
`type-check` del paquete corría exactamente ese comando: reportaba éxito sin haber chequeado nada.
El `build` hacía lo mismo (`tsc && vite build`, con el `tsc` mirando cero archivos).

**Lo que costó:** el crash de `ExegesisPaperPage` (PR #436) venía siendo reportado por el compilador
**desde #296**, en la línea exacta y con el tipo exacto:

    ExegesisPaperPage.tsx(104,11): error TS2322:
      Type 'ExegesisPaperSummary | null' is not assignable to type 'ExegeticalPaper | null'.

No fue un bug difícil de encontrar. Fue un bug **reportado y no leído**.

**Por qué un trinquete y no "bajar los errores a cero":** el chequeo real arroja **574 errores
preexistentes**. Exigir cero frena todo el trabajo; dejarlo sin exigir nada repite el crash. El
trinquete separa las dos cosas: la deuda vieja no bloquea, la deuda nueva sí.

**Por qué el baseline es POR ARCHIVO y no un total:** un total suelto se mantiene plano arreglando un
error acá y rompiendo otro allá — que es justamente el caso a atrapar. Las líneas y columnas quedan
fuera del baseline a propósito: se mueven con cualquier edición y volverían el trinquete inservible.

| Pieza | Dónde |
|---|---|
| Script | `scripts/check-web-types.sh` (`--update` regraba el baseline) |
| Baseline | `scripts/web-type-errors-baseline.txt` — 574 errores en 230 archivos |
| CI | Paso `Web type-check ratchet` en `ci.yml`, **sin** `continue-on-error` |
| Scripts | `npm run type-check:web` · `npm run type-check:web:update` · `type-check:raw` en el paquete |
| Regla | `.agent/rules/compliance_gate.md` § Trinquete de tipos |

**Efectos colaterales, ambos deliberados:**

1. `packages/web` `type-check` ahora corre el trinquete de verdad, así que el `npm run type-check` de la
   raíz deja de mentir sobre el paquete más grande del repo.
2. Se sacó el `tsc` del `build` de web. No se pierde ningún chequeo — miraba cero archivos — y se deja de
   aparentar uno.

**No corre en pre-commit:** la corrida completa toma ~20 s, demasiado para cada commit. Vive en CI.

**Verificación:** con el baseline grabado el script sale verde (574 = 574). Con una asignación inválida
inyectada a propósito en un archivo que YA tenía un error (`planLabels.ts`, 1 → 2) sale rojo y nombra el
error nuevo — el caso exacto de #296, donde un archivo con deuda vieja gana una regresión.

---

## ✅ CERRADA 2026-08-20 — SDK de Gemini fuera del navegador

Cola del track de la clave. La clave ya no está; lo que quedaba era el **paquete**.

**Por qué importaba sin la clave:** el SDK no necesita credenciales para volver al bundle. Alcanza
con que algo del grafo del navegador lo importe — y un `export *` en el barrel de
`@dosfilos/infrastructure` basta, aunque nadie construya la clase. Mientras el paquete estuviera
adentro, reponer la clave era un `import` de distancia.

**Qué lo arrastraba, y por qué ninguno era una llamada al modelo:**

| Arrastre | Qué era en realidad | Cómo salió |
|---|---|---|
| `SchemaType` en 3 esquemas de exégesis | Un enum de TS — **existe en runtime**. Seis strings constantes traían un cliente HTTP entero. | Copia local en `packages/infrastructure/src/llm/schemaType.ts`, mismos valores (OpenAPI 3.0). Los esquemas no cambian ni una letra. |
| `GeminiMultiAgentService` | `SseMultiAgentService` la instanciaba **con clave vacía**, solo para reusar `buildSystemInstruction`. Nunca llamaba al modelo. | El prompt pasa a función pura en `prompts/geminiMultiAgentPrompts.ts`, que ya era el hogar del resto del prompt. La clase queda sin consumidores y se borra. |
| `GeminiFileSearchService`, `GeminiPastoralWordStudyService` | Archivos muertos: nadie los construía. Solo el barrel los exportaba. | Borrados. |

**Medición, honesta:** −42 KB crudos / −2,2 KB gzip sobre el JS del bundle. Es poco, y no es el punto:
el bundle son mayormente datos bíblicos. Lo que se compra es que la puerta quede cerrada, no peso.

**La baranda, que es la mitad del trabajo:** `scripts/check-gemini-sdk-boundary.sh` falla si
`web`/`domain`/`application`/`infrastructure` vuelven a importar `@google/generative-ai`.
`packages/functions` queda fuera a propósito — corre en el servidor y ahí el SDK debe vivir. Corre en
CI como paso propio (**no** `continue-on-error`) y dentro del audit de compliance. Vive en su propio
script porque el audit completo arrastra 67 violaciones duras preexistentes y no puede entrar entero
a CI. Verificado: con un import inyectado a propósito, falla y lo nombra.

**Limpieza de paso:** se cae el alias de `@google/generative-ai/server` en `vite.config.ts` y el
`src/lib/empty-module.ts` que existía solo para satisfacerlo; sale la dependencia del
`package.json` de `infrastructure` (`yarn.lock` no cambia — `functions` la sigue declarando).

**Verificación:** `grep` del bundle reconstruido sin rastro de `GoogleGenerativeAI` ni de
`generativelanguage.googleapis.com` (antes aparecía en dos chunks). Tests 165 web + 1017 resto en
verde; tsc de `infrastructure` limpio; el trinquete de web baja de 574 a 573.

---

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

- [x] **4.1** `approach-compliance-criteria.md` — ✅ **YA ESTABA HECHO; este ítem estaba desactualizado.**
      La revisión criterio-por-criterio la cerró el fundador el **2026-07-08** y quedó sellada en
      `redaccion-v2-diseno.md` §9.1–§9.8: severidad + tipo de los 12 descalificadores de forma, umbral de
      §9.6 (cierra el pendiente de §8.6), los 4 globales críticos, G4 a global, G2 cristotélico, E2 temático.
      Lo que faltaba no era la revisión sino **materializarla**, y eso ES la Ola 6.1 — no su bloqueo.
      Materializada el 2026-08-20 en `packages/domain/src/sermon-judge/`.
      ⚠️ **Ojo con la lectura anterior:** decir que 4.1 "bloquea Fase 2 entera" mandaba a esperar una
      decisión que ya existía. 4.2 y 4.3 SÍ siguen abiertos, pero bloquean **flips de flags**
      (`genre_override_enforce`, `step3_genre_help`), no la construcción de la Ola 6.
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

- [x] **6.1** **Fase 2 — catálogos como dato** — ✅ **HECHO 2026-08-20.** `packages/domain/src/sermon-judge/`:
      catálogo de FORMA (globales G1-G4 + 6 formas con C/E, severidad, tipo, `refina`), catálogo HERMANO de
      GÉNERO (los D de los 8 perfiles de §6, extraídos, no redactados), compositor de las tres capas y
      mecánica del veredicto (§8.3/§8.4/§9.6). La reconciliación del enum ya venía de Fase 0.
      Dos hallazgos del propio trabajo, ambos con test: (a) la clave de un descalificador debe ir calificada
      por dueño — `genero:D1` fundía "proverbio como promesa" con "aplanar el poema" al agregar sombra;
      (b) un veredicto `limpio` con `cumple:false` dejaba pasar en silencio el único esencial sellado
      (C4 narrativo). Severidades que el diseño NO selló quedan **pendientes explícitas en el dato** y nunca
      escalan a confrontación fuerte: la cola de revisión del fundador se deriva del catálogo, no de la
      memoria.
- [~] **6.2** **Fase 3 — mapeo género→estructura + constructor de proposición (8 elementos)**. Consume
      `PassageProfile`, NO re-deriva género (invariante: una sola fuente de verdad de género).
      - [x] **6.2a — mapeo género→estructura** (2026-08-20). Las 4 piezas de §6 por perfil
            (`genreSermonStructure.ts`) + la vara transversal (`pointAnchoring.ts`). Lo importante del
            modelado: **el rango de puntos NO es una regla de conteo**. Fusionar movimientos afines y
            dividir uno profundo son libertad homilética, no infidelidad; lo que se confronta es un punto
            que no rastrea a movimiento estudiado (G3 crítico) y la omisión **ciega** (declararla la vuelve
            fiel). Techo y piso salen como GUÍA de carga, no como violación — mezclarlos habría convertido
            el catálogo en el conteo que la regla transversal niega. Sapiencial es el único género donde la
            marca ramifica la estructura (`porMarca`); las categorías de poesía ramifican elementos
            internos, no el rango. Centinelas → `null`, no `{min:0,max:0}` (eso confrontaría todo sermón).
      - [x] **6.2b — constructor de proposición** (2026-08-20, `propositionContract.ts`). Los 8 elementos
            como dato, pre-siembra desde el estudio (idea central VERBATIM del paso 7), ensamblado del
            borrador y confrontación contra los 8. La proposición es el CONTRATO: el elemento 8 verifica que
            los puntos hereden el llamado a la acción, y un punto que no lo recoge refina G3.
            **El sistema pide, no decide:** sustantivo y llamado a la acción son del pastor y se dejan
            vacíos a propósito — pre-rellenarlos convertiría al tutor en el autor de la proposición.
            La vara de herencia es TOSCA por diseño (raíz verbal, sin tildes) igual que la de suficiencia
            estructural: cuando no alcanza sale `armonia-indeterminada`, no una falla inventada.
      - [ ] **Pendiente para que la Ola 6 sea VISIBLE:** todo 6.1/6.2 es dominio puro, sin UI ni flags. El
            cableado al paso del wizard (constructor de proposición en pantalla + veredicto del juez en
            sombra) es trabajo aparte y no está hecho.

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
- [x] **`packages/web` sin typecheck real en CI** — ✅ **CERRADO 2026-08-20.** No se bajaron los errores a
      cero (eso sigue siendo un proyecto propio); se puso un **trinquete** que congela los 574 actuales por
      archivo y bloquea los nuevos. Ver § Trinquete de tipos de `packages/web`. Bajar el baseline a cero pasa
      a ser Boy Scout: cada PR que toca un archivo lo deja con menos errores y regraba el baseline.
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
| 2026-08-20 | 6 | **Ola 6.1 en prod** (#440, deploy verde) + **6.2a** lista. Hallazgo que reordenó la ola: 4.1 NO bloqueaba — el fundador cerró la revisión del catálogo el 2026-07-08 (§9.1-§9.8); faltaba materializarla, que es 6.1. Tres defectos encontrados por tests propios: clave de descalificador sin calificar por dueño, veredicto `limpio` con `cumple:false`, y el riesgo de leer el rango de puntos como regla de conteo. |
| 2026-08-20 | ✅ | **SDK de Gemini fuera del navegador.** Lo arrastraban el enum `SchemaType` (3 esquemas), `GeminiMultiAgentService` (instanciada con clave vacía solo por sus prompts) y 2 archivos muertos. Baranda en CI: `check-gemini-sdk-boundary.sh`. −42 KB crudos; el valor es la puerta cerrada, no el peso. |
| 2026-08-20 | ✅ | **`packages/web` entra a CI con trinquete** (Ola 8). 574 errores congelados por archivo en `scripts/web-type-errors-baseline.txt`; el paso de CI bloquea los NUEVOS. Se sacó el `tsc` no-op del `build` y el `type-check` del paquete dejó de mentir. Bajar el baseline pasa a Boy Scout. |
| 2026-08-20 | ✅ | **Track de la clave CERRADO.** Los 5 criterios verificados. Hallazgo que cambió el cierre: la clave del navegador y el secret del servidor eran **el mismo valor** → no se borró, se **rotó** (#435: clave nueva → secret v4 → redeploy → verificación con tráfico real → borrado de la vieja). Secret de GitHub borrado, `.env` limpios, clave eliminada en GCP. |
| 2026-08-20 | ✅ | Exégesis migrada a mano en tandas (#430, #431, #432) + barrido final (#433) + limpieza de interruptores (#434). |
| 2026-08-20 | 🐛 | Crash de `ExegesisPaperPage` encontrado probando la rotación — **no era de la rotación**: regresión de #296. La página leía el paper de la lista recortada (`sources` fuera del payload). Fix: usar `useExegesisPaper`, que ya existía (#436). `tsc` ya reportaba el error exacto en la línea 104; nadie lo vio porque **web no se typechequea en CI** (Ola 8). Bug reportado y no leído. |
| 2026-08-20 | 🔴 | **Migración de la clave, ~60% cerrada.** Conversacionales (griego, hebreo, Faculty vía SSE) + `GeminiSermonGenerator` completo + extracción de PDFs + embeddings, todo en prod y medido (#417–#429). Falta la tanda de exégesis (18 adapters, contrato listo) + barrido final. |
| 2026-08-20 | 🔴 | Contrato del proxy completo (#429): `responseSchema`, `topP`, `maxOutputTokens` hasta 65.536. Descubierto de paso: el cap anterior (32.768) le habría recortado el paper académico a la mitad **en silencio**. |
| 2026-08-19 | 🔴 | Medidor de costo en pie: `llmUsageDaily`/`Monthly`, panel admin, presupuesto como dato, alertas 50/80/100%, cortacircuito de sombra. Números: sermón ≈ USD 0,02, factura real ≈ USD 2/mes → el costo no es restricción; el medidor sirve para **detectar fugas**. |
| 2026-08-19 | 🔴 | `firebase-functions` v4.5 → v7.3.2 (#418), con canario previo. Mi evaluación inicial de que el cambio de entrypoint v2 no afectaba al repo fue **incorrecta**: 41 errores en 6 archivos, resueltos fijando imports a `firebase-functions/v1`. |
| 2026-08-19 | 3 | Campo `origin` en los seeds (los 2 únicos creadores lo declaran) + script de cohorte lee el hecho en vez de adivinarlo. Sermones siguen por proxy. |
| 2026-08-19 | 3 | 2.3 verificada en prod (`userConfirmed` real). Hallazgo: el estudio del wizard no dejaba sombra → 3.2 resuelto instrumentando el Spine A + servicio único de recorder para los dos spines. Falta encender flags y dogfood (3.1/3.3). |
| 2026-08-18 | 2 | 0b-B con alcance corregido: el chat no tenía acto (el doc 0b confundía superficies). `pronounceGenre` en dominio + selector en el paso 2 guiado + wizard registrando su acto + `detectGenreInText` fuera del path de procedencia. Falta verificar en prod (2.3). |
| 2026-08-18 | 1 | Allowlist sincronizada (13/13) · `anchor_fidelity_enforce` registrado con prereq · test de paridad fail-closed · 7 descripciones i18n. Hallazgo: web sin typecheck en CI (587 errores) → Ola 8. |
| 2026-08-17 | 0 | 0.1 diff whitespace descartado · 0.2 doc 0b versionado + corregido el hueco del juez · 0.3 script de cohorte ampliado a `FOUNDER_UIDS` y corrido (§ Cohorte real) · 0.4a smoke de funciones destapó el nurture roto (PR #402). Queda 0.4b (smoke manual de UI + quotas). |
</content>
</invoke>
