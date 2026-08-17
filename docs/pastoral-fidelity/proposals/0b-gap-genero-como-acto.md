# 0b — Confirmación de género como acto (§4.4) + fix del leak de centinelas

**Tipo:** DELTA-GAP — profundidad de implementación. Solo terreno, sin plan, sin código.
**Fecha investigación:** 2026-07-10

> **ESTADO 2026-08-17 — leer antes que nada.** **0b-A YA SE HIZO** y está en prod (PR #398 `f7e36865` dominio
> `SELECTABLE_GENRES` + PR #399 `f3deb386` selector del paso 2 esconde centinelas + reroute de `acceptProposed`).
> Lo que sigue vivo de este doc es **0b-B** (rewire de provenance-desde-acto, §Punto 2 + §Punto 3) = Ola 2 de
> [plan-puesta-al-dia.md](./plan-puesta-al-dia.md). Los Puntos 1/4/5/6 quedan como evidencia de terreno; el
> Punto 6 lo entregó 0b-A.
**Método:** 4 investigadores paralelos read-only sobre clusters de archivos. Evidencia `file:line`, marcado observado-en-código vs hueco.

---

## TL;DR (reframe que cambia la forma de 0b)

El modelo mental de partida era: *"el paso 2 es puro display del género inferido; `userConfirmed` está vacío porque `detectGenreInText` hace match de keywords sobre prosa"*. El código confirma la mitad y corrige la otra:

- **El acto YA existe.** El paso 2 renderiza un selector de chips; el pastor clica y eso fija `genre` + `genreConfirmed: true`. El pastor **ya se pronuncia por chip**. 0b **no es una inserción de UI** — es una **re-conexión** de la escritura de provenance para que consuma ese acto.
- **La escritura ignora el acto.** La provenance se computa sobre un input distinto — `detectGenreInText(prosa)` sobre el textarea de implicación — no sobre el chip. Por eso `userConfirmed` queda vacío: la prosa rara vez contiene el keyword exacto del género.

**Consecuencia:** 0b = (1) apuntar la escritura de provenance al **acto del chip** y sacar `detectGenreInText` de ese path + (2) impedir que los centinelas (`gospel`/`mixed`) sean chip-eables. Sin turno UI nuevo. Sin flag nuevo.

---

## Punto 1 — Forma del turno del paso 2 HOY (UX + control)

Dos controles, una superficie: [ContextGenreStep.tsx](../../../packages/web/src/pages/sermons/generator/pastoralSeed/ContextGenreStep.tsx)

| Control | Líneas | Qué hace |
|---|---|---|
| **Selector de chips** (el acto) | [:159-174](../../../packages/web/src/pages/sermons/generator/pastoralSeed/ContextGenreStep.tsx#L159-L174) | Click → `selectGenre(g)` → fija `genre` + `genreConfirmed:true` ([:80-84](../../../packages/web/src/pages/sermons/generator/pastoralSeed/ContextGenreStep.tsx#L80-L84)) |
| **Textarea de implicación** | [:221-226](../../../packages/web/src/pages/sermons/generator/pastoralSeed/ContextGenreStep.tsx#L221-L226) | Prosa libre, ≥`MIN_CHARS`. ESTO es lo que escanea `detectGenreInText` para provenance |

- Override del pastor → alerta ámbar no bloqueante [:182-209](../../../packages/web/src/pages/sermons/generator/pastoralSeed/ContextGenreStep.tsx#L182-L209).
- **Punto de inserción del "acto de pronunciarse":** NO en la UI — la UI ya captura el acto (`data.genre`). El rewire vive en el path de escritura (Punto 2). *Observado.*

---

## Punto 2 — Ruta de escritura de provenance

`resolveGenreProvenance` [PastoralSeed.ts:423-431](../../../packages/domain/src/entities/PastoralSeed.ts#L423-L431) — función pura `(proposed, chosen)`:

```
chosen vacío           → 'aiProposed'
chosen == proposed     → 'userConfirmed'
chosen != proposed     → 'userOverride'
```

No lee nada del seed; recibe ambos géneros por parámetro. *Observado.*

**Un solo caller vivo:** `ContextGenreStepPolicy.persistTo` [ContextGenreStepPolicy.ts:139](../../../packages/domain/src/guided-sermon/policies/ContextGenreStepPolicy.ts#L139)
- args: `(existingGenre = seed.contextGenre?.genre, namedByPastor = detectGenreInText(pastorMessage))`
- persiste a `seed.contextGenre.genreProvenance` [:145](../../../packages/domain/src/guided-sermon/policies/ContextGenreStepPolicy.ts#L145)

`detectGenreInText` [inferGenreFromBook.ts:98-109](../../../packages/domain/src/bible/inferGenreFromBook.ts#L98-L109) — match de palabra-completa sobre prosa; devuelve `null` si es ambiguo; **nunca** devuelve `mixed`/`parable`. Prosa sin keyword de género → `''` → provenance cae a `aiProposed` **aunque el pastor haya clicado un chip**. Ese es el mecanismo exacto del `userConfirmed` vacío. *Observado.*

**Enganche del fix — REEMPLAZO, no rama nueva:** `namedByPastor` debe ser el **acto del chip** (`data.genre` / el género elegido en el seed), y `existingGenre` debe ser la **propuesta inferida-del-libro** (no el género ya fijado por el chip). Hoy ambos parámetros arriesgan ser el mismo valor post-chip. Rewire de `persistTo` para pasar `(propuestaLibro, géneroChipElegido)` y borrar la llamada a `detectGenreInText` de este path. Cambio de un solo sitio.

> **HUECO:** el sourcing exacto de la "propuesta inferida-del-libro" en el momento de `persistTo` — ¿sigue disponible en seed/ctx, o hay que hilarlo desde `ctx.genre`? Verificar antes de codear.

---

## Punto 3 — Cableado de `decideMisreadingTurn` para género

`maybeGenreConfront` [RunSocraticTurnUseCase.ts:522-560](../../../packages/application/src/use-cases/guided-sermon/RunSocraticTurnUseCase.ts#L522-L560)
- **Inputs:** seed, currentStep (debe = `contextGenre`), ctx (`enforceGenreOverride`, `genre`, `attemptIndex`), pastorMessage.
- **Guards → `undefined`:** step≠contextGenre / `!enforceGenreOverride || !genreJudge` / sin proposedGenre.
- **Decisión:** `genreJudge.judge()` [:533-541](../../../packages/application/src/use-cases/guided-sermon/RunSocraticTurnUseCase.ts#L533-L541) → `decideMisreadingTurn(judgment, attemptIndex, CAP)` [:542](../../../packages/application/src/use-cases/guided-sermon/RunSocraticTurnUseCase.ts#L542).

`decideMisreadingTurn` [misreadingTurn.ts:40-61](../../../packages/domain/src/guided-sermon/misreadingTurn.ts#L40-L61) — máquina de 3 estados (4 outcomes):

| Outcome | Condición | Semántica |
|---|---|---|
| `gate-minimo` | `!substantive` | mensaje corto → orienta "profundiza" (no cuenta re-confront) |
| `accept` | `!contradicts` | trabajó y no contradice → avanza |
| `re-confront` | `contradicts && attemptIndex < cap` | contradice bajo tope → confronta otra vez |
| `accept-override` | `contradicts && attemptIndex >= cap` | tope alcanzado → override floor: acepta + registra discrepancia |

Juzga **engagement, no corrección**. *Observado.*

**Gap de persistencia (observado):** `maybeGenreConfront` **no persiste provenance**. En `accept-override` solo `appendAiAssistLog('genreOverride')` [:547-556](../../../packages/application/src/use-cases/guided-sermon/RunSocraticTurnUseCase.ts#L547-L556) y devuelve `undefined` → cae al LLM → única escritura de seed en [:306-308](../../../packages/application/src/use-cases/guided-sermon/RunSocraticTurnUseCase.ts#L306-L308) bajo `if output.kind==='accepted'` → `policy.persistTo`.

La máquina **"decide confront", no provenance**. La provenance viaja por una escritura **separada, condicionada al LLM**, desacoplada del veredicto de engagement.

**Qué falta para que el acto también fije provenance:**
- Opción (a): rewire de `persistTo` para leer el acto del chip **sin importar quién disparó el accept** — el fix del Punto 2 corrige este path dondequiera que dispare. **Más limpio, un solo sitio de escritura, act-sourced.**
- Opción (b): agregar escritura de provenance en las ramas accept/override.

> **HUECO:** en `accept-override` `persistTo` **no está garantizado que corra** (la rama devuelve `undefined` y salta la escritura del LLM-accepted) → provenance podría no escribirse nunca en el override. Verificar/cerrar antes de codear.

---

## Punto 4 — Topología de flags

Árbol, 2 niveles, raíz `pastoral_fidelity_flow` [User.ts:273-295](../../../packages/domain/src/entities/User.ts#L273-L295):

```
pastoral_fidelity_flow (raíz)
├── passage_profile            (SURFACE / shadow)
│   ├── passage_profile_enforce (enforce misreadings)
│   ├── genre_override_enforce  (enforce confront género, paso 2)  ← tu enforceGenreOverride
│   ├── anchor_fidelity_enforce (VERIFY-DROP)
│   └── step3_genre_help        (scaffold paso 3)
└── sermon_draft_shadow        (mide integridad del draft)
```

- **Surface** = `passage_profile` → mide engagement de género cuando enforce OFF [RunSocraticTurnUseCase.ts:404-408](../../../packages/application/src/use-cases/guided-sermon/RunSocraticTurnUseCase.ts#L404-L408).
- **Enforcement** = `genre_override_enforce` (hijo de passage_profile [:288](../../../packages/domain/src/entities/User.ts#L288)) → gatea `maybeGenreConfront` [:248](../../../packages/application/src/use-cases/guided-sermon/RunSocraticTurnUseCase.ts#L248). Default OFF.
- Baranda anti-fail-open: enforce requiere el shadow padre. [usePastoralFidelityGate.ts:142-150](../../../packages/web/src/hooks/usePastoralFidelityGate.ts#L142-L150).

**Surface vs enforcement YA son separables** con flags existentes. **0b NO necesita flag nuevo:** el rewire de provenance-desde-acto es un fix de corrección a una escritura que ya corre (`persistTo` no está flag-gated; el registro de shadow vive bajo `passage_profile`). El enforcement queda bajo `genre_override_enforce`. Si se quisiera un flag, su padre sería `passage_profile` — pero no hace falta.

> **HUECOS (flip-blockers de enforcement, NO de 0b):**
> - `genre_override_enforce` **no está** en el allowlist admin `ALLOWED_FLAGS` [setUserFeatureFlags.ts:7-17](../../../packages/functions/src/admin/setUserFeatureFlags.ts#L7-L17) → no toggleble por admin UI todavía. **Sigue vigente** — lo cierra la Ola 1 de [plan-puesta-al-dia.md](./plan-puesta-al-dia.md).
> - ~~Impl concreta de `IGenreEngagementJudge` no aparece en grep~~ — **CORREGIDO 2026-08-17**: el judge SÍ está cableado. `CallableGenreEngagementJudge` [CallableGenreEngagementJudge.ts:23](../../../packages/application/src/services/CallableGenreEngagementJudge.ts#L23) se inyecta en el singleton [GuidedSermonService.ts:151](../../../packages/application/src/services/GuidedSermonService.ts#L151) y habla con el callable [genreEngagement.ts](../../../packages/functions/src/passage-profile/genreEngagement.ts). El confront está inerte por el FLAG, no por falta de judge.
> - Queda un solo flip-blocker (el allowlist), y muerde al flipear enforcement, no al arreglar el shadow.

---

## Punto 5 — `userConfirmed` → resume del gate (verificar doble pago)

**Confirmado mismo campo, con matiz.**

- Campo escrito = `seed.contextGenre.genreProvenance`.
- Propaga a `structuralShadow.provenance` [SocraticTurn.ts:176-202](../../../packages/domain/src/guided-sermon/SocraticTurn.ts#L176-L202).
- El umbral §4.2 cuenta **solo `userConfirmed`+insuficiente como labor** (aiProposed/userOverride excluidos — coincide con la regla byblos). Mismo tipo `GenreProvenance`, mismo campo fuente.

Por tanto arreglar la escritura para emitir `userConfirmed` real **des-confunde la shadow de Fase 3 Y alimenta el umbral de enforcement en pausa**. **Doble pago confirmado.** *Observado.*

> **Matiz / casi-hueco:** el **gate vivo de completitud del paso 2** lee `genreConfirmed` (booleano) [PastoralSeed.ts:402-413](../../../packages/domain/src/entities/PastoralSeed.ts#L402-L413), **NO** `genreProvenance`. Campo distinto. No es conflicto — pero significa que provenance hoy **no gatea nada vivo**; solo alimenta el conteo de shadow. 0b toca provenance (shadow); no toca ni necesita tocar `genreConfirmed`. Anotar para que nadie espere que provenance bloquee el avance.

---

## Punto 6 — Leak de centinelas + abstracción `selectableGenres`

`GENRE_OPTIONS = Object.keys(LITERARY_GENRE_LABELS_ES).filter(g => g !== 'parable')` [ContextGenreStep.tsx:35](../../../packages/web/src/pages/sermons/generator/pastoralSeed/ContextGenreStep.tsx#L35). Solo filtra `parable` → **`gospel` + `mixed` SÍ son chips seleccionables hoy**, mudos (click fija genre+confirmed, sin enrutado). El propio código lo comenta como deuda 0b/Fase-3 [:29-34](../../../packages/web/src/pages/sermons/generator/pastoralSeed/ContextGenreStep.tsx#L29-L34).

**Enum + labels:**
- `LiteraryGenre` [BookPanorama.ts:68-82](../../../packages/domain/src/exegesis/expository/BookPanorama.ts#L68-L82)
- `LITERARY_GENRE_LABELS_ES` [inferGenreFromBook.ts:47-58](../../../packages/domain/src/bible/inferGenreFromBook.ts#L47-L58)

**Partición:**

| Clase | Géneros |
|---|---|
| **Autorados / predicables** (criterio estructurado) | epistle, narrative, poetry, prophecy, wisdom, apocalypse, law |
| **Centinelas** (marcadores de enrutado, no géneros) | **gospel** (disuelve per-perícopa), **mixed** (dispara override) |
| **Stub** (espera autor) | parable (no seleccionable hoy) |

Intención centinela: [genreDiscernmentCriteria.ts:39-46](../../../packages/domain/src/guided-sermon/genreDiscernmentCriteria.ts#L39-L46) + markers vacíos [structuralSufficiency.ts:79-108](../../../packages/domain/src/guided-sermon/structuralSufficiency.ts#L79-L108).

**Abstracción `selectableGenres`: NO existe.** Sin constante, sin tipo, sin `isSelectableGenre`. La partición vive solo en comentarios/tests. La UI alcanza las keys crudas del enum, sin capa de mapeo. **HUECO = el entregable entero del punto 6.**

**Dónde debería vivir:** constante/tipo de **dominio** (`SELECTABLE_GENRES` / `SelectableGenre`, junto al enum en BookPanorama o en inferGenreFromBook), consumida por `GENRE_OPTIONS`. Enrutado: chip gospel removido → disuelve (se maneja aguas abajo per-perícopa); mixed → no es chip, dispara el path de override/socrático en vez de confirmarse como género.

> **Estado del borde dominio↔UI hoy:** sin capa de mapeo. Flujo: dominio exporta `LITERARY_GENRE_LABELS_ES` → UI importa → `Object.keys(...)` → filtra solo parable → renderiza 8 chips (incl. centinelas). El fix mueve la frontera al dominio.

---

## Lectura de tamaño: **dos PRs, acoplados — el orden importa**

Los dos mecanismos son independientes en código (política socrática de escritura vs render de chips del wizard, sin líneas compartidas) **pero acoplados en conducta**:

> Si se re-conecta provenance al acto del chip (Punto 2) **mientras gospel/mixed siguen siendo chips** (Punto 6), `userConfirmed` puede escribirse como `gospel`/`mixed` — contaminando exactamente la shadow que se busca des-confundir. **El fix del leak no puede ir después del fix de provenance.**

**Recomendación:**

| PR | Contenido | Testable | Rol |
|---|---|---|---|
| **0b-A** | leak de centinelas + abstracción `selectableGenres` de dominio + enrutado gospel/mixed | UI (chips cambian, limpio) | Prerrequisito duro. Va primero. |
| **0b-B** | rewire provenance-desde-acto (sacar `detectGenreInText` de `persistTo`, sourcing desde chip; verificar que shadow puebla `userConfirmed`; cerrar el hueco de escritura en `accept-override` del Punto 3) | Medición de shadow | Monta sobre el set de chips limpio de A. |

**Dos PRs porque:** superficies distintas, modos de test distintos (interacción UI vs medición de shadow), y A es prerrequisito duro para que B sea seguro.

**No un PR** — empaquetar mezcla enrutado UI con instrumentación de shadow + la pregunta de escritura en `accept-override`, y esconde la dependencia de orden.

**Un-PR es defendible** solo si se quiere atomicidad para evitar la ventana A-sin-B (inofensiva: esa ventana solo deja chips limpios pero provenance aún `aiProposed` = status quo del shadow). La ventana segura favorece **A→B, dos PRs**.

---

## Huecos a cerrar antes de codear cualquiera

1. **Punto 2** — ¿la propuesta inferida-del-libro sigue disponible en `persistTo` para pasarla como `proposedGenre`, o hay que hilarla desde `ctx.genre`?
2. **Punto 3** — ¿`persistTo` corre en la rama `accept-override`, o provenance se salta silenciosamente en el override? (Hoy: devuelve `undefined`, probablemente salta.)
3. **Punto 6** — decidir hogar de dominio para `SELECTABLE_GENRES` (sitio del enum en BookPanorama vs sitio de labels en inferGenreFromBook).

---

## Índice de evidencia (file:line)

| Tema | Archivo:línea |
|---|---|
| Selector chips paso 2 | ContextGenreStep.tsx:159-174 |
| `selectGenre` fija genre+confirmed | ContextGenreStep.tsx:80-84 |
| GENRE_OPTIONS (filtra solo parable) | ContextGenreStep.tsx:35 |
| Comentario deuda 0b/Fase-3 | ContextGenreStep.tsx:29-34 |
| Textarea implicación | ContextGenreStep.tsx:221-226 |
| `resolveGenreProvenance` | PastoralSeed.ts:423-431 |
| Único caller (persistTo) | ContextGenreStepPolicy.ts:139, :145 |
| `detectGenreInText` | inferGenreFromBook.ts:98-109 |
| `maybeGenreConfront` | RunSocraticTurnUseCase.ts:522-560 |
| accept-override → solo audit log | RunSocraticTurnUseCase.ts:547-556 |
| Única escritura seed (LLM-accepted) | RunSocraticTurnUseCase.ts:306-308 |
| `decideMisreadingTurn` | misreadingTurn.ts:40-61 |
| Prereqs de flags | User.ts:273-295 |
| genre_override_enforce prereq | User.ts:288 |
| dispatch maybeGenreConfront | RunSocraticTurnUseCase.ts:248 |
| shadow mide cuando enforce OFF | RunSocraticTurnUseCase.ts:404-408 |
| Gate hook surface/enforce | usePastoralFidelityGate.ts:142-150 |
| Allowlist admin (falta el flag) | setUserFeatureFlags.ts:7-17 |
| Gate vivo paso 2 (genreConfirmed) | PastoralSeed.ts:402-413 |
| structuralShadow.provenance | SocraticTurn.ts:176-202 |
| Enum LiteraryGenre | BookPanorama.ts:68-82 |
| Labels ES | inferGenreFromBook.ts:47-58 |
| Intención centinela | genreDiscernmentCriteria.ts:39-46 |
| Markers vacíos (fail-closed) | structuralSufficiency.ts:79-108 |
