# Phase 0 — Recierre (deuda 0)

**Fecha**: 2026-05-25
**Tipo**: Recierre formal tras smoke testing exhaustivo + ataque de deuda
**Phase status**: `completed` (sin deuda invisible heredada)

## Contexto

Phase 0 se había declarado cerrada el **2026-05-23** vía PR #252 (8 PRs originales). Durante el smoke testing post-cierre (sesiones 2026-05-24 + 2026-05-25), el founder identificó:

1. **Dos tensiones de diseño** con el manifesto pedagógico que requerían revisar decisiones tomadas en Phase 0:
   - **ADR-009** (2026-05-24) — Confesión declarada es opt-in, no requisito de onboarding. Supersede ADR-007 § Q2.
   - **ADR-010** (2026-05-24) — Multi-witness default-on, no single-anchor. Supersede ADR-001 + ADR-009.

2. **Cuatro bugs side-channel** en infraestructura tocada por Phase 0:
   - `AdminUserQueryService.mapUser` no incluía `featureFlags` ni confession fields (toggle UI stale).
   - `firestore.rules` faltaba match para `/sermon_series/`.
   - Índice Firestore `hebrew_user_sessions` direction ASC/DESC mismatch.
   - Argentine voseo "Resolvé" en i18n string admin.

3. **Cuatro deudas Phase 0** documentadas pero no atacadas en cierre original:
   - Ingest seed CORE library JSON → Firestore.
   - Backfill admin tool para clasificar 47 docs legacy.
   - UI badges adicionales (riskLevel, doctrineLevel, requiredAttribution).
   - `useUserProfile.refetch` (tech debt — single-shot fetch causaba stale state).

4. **Dos bugs nuevos en flujo Faculty** detectados durante smoke 7:
   - Mis-attribution: sermón atribuyó versos bíblicos a Charles Hodge (prompt ambiguo).
   - `changePlanForUser` callable no seedeaba `processingBalance` (upgrade banner persistía).

## Trabajo del recierre

### PR #254 (merged 2026-05-25T17:35Z) — Smoke test follow-up

Fixes derivados del smoke session inicial:
- `coreLibraryAdminService.applyRightsDefaults()` — mirror exact de defaults del repo para que `CoreLibraryAdmin` renderice "Sin clasificar" badge.
- `AdminUserQueryService.processingBalance` — agregados `plan*`/`pack*` keys faltantes.
- `ConfessionSettings` shadow workaround para stale profile (pre-refetch).
- `ExtractTheologicalContentUseCase` — prompt tightened: cross-references sin línea autor, authority block optional, regla "PROHIBIDO atribuir texto bíblico a autor humano".
- `changePlanForUser` — seeding via `setPlanQuotaAdmin` + `setExegesisPlanQuotaAdmin`.
- Sidebar "Testigos confesionales" link.
- CLAUDE.md raíz creado con protocolo Pastoral Fidelity.
- Phase doc bitácora extendida con ADR-009 + ADR-010 + smoke findings.
- Nuevo phase doc `phase-2-5-study-depth-copilot.md`.
- Proposals/ folder con `faculty-sermon-rag-enrichment.md` + `pdf-export-rewrite.md`.

### PR #255 (merged 2026-05-25T20:19Z) — Phase 0 deuda

Cierre formal de las 4 deudas:

**Deuda #1 — Seed CORE library ingest**

- Nueva callable `ingestLibrarySeedSources` (super_admin, audit-logged, idempotente).
- Escribe 8 sources no-confesionales del JSON canónico en `/library_resources` con metadata rights-aware completa.
- Las 14 confesiones se omiten (ya viven en `/confessions/` via PR 0.2).
- Sources: SBLGNT (CC BY 4.0 + 5 attribution requirements), Schaff Vols I/II/III (Public Domain), Chicago Statements 1978/1982/1986 (All rights reserved / approved_metadata_only), Savoy Declaration (PD), Thirty-Nine Articles (PD), 1689 LBCF (PD historical text only), Baptist Catechism 1693 (PD historical text only).
- UI surfacing: nueva sección "CORE Seed (sistema)" en `CoreLibraryAdmin` con tabla rights-aware (título, tradición, license, ingestion status, riesgo).
- Validation MCP: 8 docs confirmados en Firestore con `license`, `licenseUrl`, `copyrightNotice`, `ingestionStatus`, `riskLevel`, `requiredAttribution`, `citation` (short/footnote/bibliography/rag_display) completos.

**Deuda #2 — Backfill licencias heurístico**

- Client-side admin tool `coreLibraryAdminService.backfillLegacyRightsByAuthor()`.
- Clasifica `library_resources` con `license: 'unknown'` usando tabla por autor.
- Autores PD conocidos (Hodge, Spurgeon, Calvin, Luther, Augustine, Edwards, Owen, Bunyan, Warfield, A.A. Hodge, Machen, Vos, Schaff, Farfan) reciben `license: 'Public Domain'` + `ingestionStatus: 'approved_full_ingestion'` + `riskLevel: 'low'`.
- Idempotente — solo toca docs sin clasificación previa.
- No requiere deploy (Firestore rules ya permiten owner-write).
- Validation: 4 docs clasificados (3 Hodge + 1 Farfan); resto queda `Sin clasificar` para revisión manual.

**Deuda #3 — UI badges adicionales**

- `Riesgo alto` / `Riesgo medio` (filtra `low` por design).
- `doctrineLevel` (cuando esté presente).
- `Attrib (N)` count cuando `requiredAttribution` tiene entries.
- Traducciones ES para enum vocab (`Ingesta completa`, `Solo metadata`, `Requiere revisión manual`, `Ingesta solo texto histórico`, `Ingesta completa con atribución`, `Alto (ingesta completa)`, `Medio bajo`, `Bajo`).
- `compactLicenseLabel` helper colapsa sentence-form licenses ("Public Domain for historical text; edition may include...") en badges legibles. Raw value en tooltip.

**Deuda #4 — `useUserProfile.refetch`**

- Hook ahora expone `refetch()` callback.
- `ConfessionSettings` lo invoca post-save y dropea el `persistedValue` shadow workaround introducido en PR #254.
- Validation MCP: audit log `confessionChangeAudit/` muestra toggle OFF→ON con 6 segundos de diferencia (sin recargar página) — confirma refetch funciona.

**Bug fix colateral**

- `LibraryResourceEntity.validate()` rechazaba seed docs por falta de `storageUrl`/`textContent`.
- Agregado bypass para `isSystemSource: true`.
- `isSystemSource` ahora es constructor param (antes asignado post-construct via `(resource as any)`).
- `FirebaseLibraryRepository.firestoreToResource` pasa `data.isSystemSource === true`.

### Functions deployed (autorizado por user)

- `ingestLibrarySeedSources` (us-central1, v2 callable, 256Mi, nodejs20) — ACTIVE.
- `changePlanForUser` (deploy actualizado con seeding fix).

### Firestore rules deployed (autorizado por user)

- Rules locales sincronizadas con remote.
- `/confessionChangeAudit/{auditId}` allow create (owner) + read (owner + super_admin).

## Verificación end-to-end

Todo MCP-verified via Firebase tools:

| Validación | Evidencia |
|---|---|
| 8 seed docs en `library_resources` con `isSystemSource: true` | `firestore_query_collection` con filter por `license` retornó SBLGNT + 3 Chicago + Savoy + 39 Articles + Baptist confessions |
| 4 Hodge docs con `license: 'Public Domain'` post-backfill | `firestore_query_collection` con filter por `author: 'Charles Hodge'` retornó 3 docs con classification correcta |
| Audit log refetch funcional | `confessionChangeAudit/` con docs OFF→ON timestamps 6s apart |
| Function deployed | `functions_list_functions` retornó `ingestLibrarySeedSources` v2 ACTIVE |
| Function logs sin errors | `functions_get_logs` solo startup messages |

## Retrospective

### Qué fue mejor que estimado

El **smoke testing exhaustivo** funcionó como mecanismo de descubrimiento mucho más efectivo que esperado. Identificó 2 decisiones de diseño revisables (ADR-009 + ADR-010), 4 bugs side-channel, 2 bugs nuevos en Faculty path, y 4 deudas no documentadas — todo antes de empezar Fase 1. El cierre original de Phase 0 vía PR #252 hubiera dejado deuda invisible que se hubiera materializado más tarde como bloqueador de Fase 2 o 3.

La **infra MCP de Firebase** permitió validación autónoma sin necesidad de polling al user. Cada deuda fue verificada server-side en paralelo a UI testing, lo cual aceleró el feedback loop sustancialmente.

### Qué tomó más tiempo

La **autorización de deploys** fue el bloqueador principal del cierre. Auto-mode classifier denegó deploys hasta que el user dio autorización explícita con verbo "deploy". Esto consumió ~30 minutos de loops vacíos en Stop hook feedback. **Aprendizaje**: para próximas fases, pedir authorization upfront cuando se sepa que deploy es necesario, no en el momento del bloqueo.

El **fix de `LibraryResourceEntity.validate()`** sorprendió. El constructor asignaba propiedades post-`validate()`, lo cual significó que `isSystemSource` no estaba disponible en tiempo de validación. Tuvo que agregarse como constructor param. Aprendizaje: cualquier campo que vaya a participar en validation debe estar en el constructor signature, no asignarse via `(this as any).field = ...` post-construct.

### Qué cambió del plan original

- **Onboarding step de confesión eliminado** (ADR-009 → ADR-010). Plan original Phase 0 incluía `ConfessionStep` obligatorio en wizard. Decisión final: multi-witness default-on, sin step, sin banner.
- **Seed CORE Library**: ingestión inicialmente pensada como parte de PR 0.2 (catalog) terminó dividida en 2 colecciones (`/confessions/` para las 14 + `/library_resources/` para las 8 restantes), por la naturaleza distinta del consumo (Testigo 3 vs RAG library admin).
- **Backfill heurístico**: no estaba en plan original. Emergió como necesidad cuando se vio que 47 docs legacy mostraban "Sin clasificar" sin path manual para clasificarlos.

### Aprendizajes para fases futuras

1. **Cierre formal de fase ≠ cierre real**. Phase 0 se "cerró" 2 veces. La primera vez (2026-05-23) fue cierre administrativo. La segunda (2026-05-25) es cierre con deuda 0. Para Fase 1 en adelante: hacer smoke testing **antes** de declarar cerrada, no después.

2. **Memoria de decisiones != memoria de implementación**. ADR-001 fue superseded por ADR-009 + ADR-010, pero múltiples sub-componentes (banner, gate hook, audit log) tenían referencias hardcoded a la decisión original. Cada cambio de decisión arquitectónica requiere un sweep de consumers, no solo un nuevo ADR.

3. **Stop hook en /goal mode necesita escape válido**. El loop de Stop hook se mantuvo activo mientras el bloqueador era external (deploy auth del user). Para futuras /goal sessions: documentar upfront qué bloqueadores externos son aceptables y cómo escalarlos limpiamente.

4. **MCP-side validation antes que browser-side**. Cuando es posible, validar via Firebase MCP tools antes de pedir al user que haga UI testing. Reduce friction + acelera ciclo.

5. **Deuda invisible se acumula rápido**. Cuatro deudas Phase 0 no documentadas + dos bugs no atribuidos a fase específica + dos decisiones revisables = una sesión completa de cleanup. Mejor convención: cualquier item levantado durante smoke testing va a un section "Deudas detectadas" del phase doc, no se difiere a memoria implícita.

## Handoff a Fase 1

Ver [Bloque 3 en este mismo session log](#) o `phase-1-six-step-spine.md` para detalles. Resumen: todos los prereqs satisfechos, ningún workaround temporal, branch nueva lista para arranque.
