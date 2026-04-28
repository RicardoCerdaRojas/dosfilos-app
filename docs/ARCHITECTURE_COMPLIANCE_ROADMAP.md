# Roadmap: Architecture & Compliance Remediation

**Estado:** ACTIVO · Iniciado 2026-04-26
**Prioridad:** P0 (bloquea roadmap de pricing hasta resolución)
**Owner:** Ricardo Cerda
**Co-author:** Claude (sesiones de planning + ejecución)

## Contexto

Auditoría del codebase en `packages/web/src/` reveló **deuda técnica acumulada significativa** contra los estándares definidos en `.agent/instructions/development_standards.md`. Decisión estratégica: pausar el roadmap de pricing hasta llevar la plataforma a compliance, garantizando una base sólida para el lanzamiento comercial.

**No es deuda de producto, es deuda de fundamento.** Lanzar el producto con esta deuda significa:
- i18n imposible de mantener consistente cuando agreguemos inglés en producción
- Cambio de paleta de colores requeriría tocar 46+ archivos
- Refactors futuros frenan porque tocar god components es riesgoso
- Onboarding de nuevos devs es lento (los archivos no tienen estructura predecible)

## Resultados de la auditoría

| Estándar | Archivos en violación | Severidad estimada |
|---|---|---|
| **i18n** (sin `useTranslation`) | 44 archivos, ~1000+ strings hardcoded | CRÍTICO |
| **Theme tokens** (color literals) | 46 archivos, ~400+ literales | ALTO |
| **God components** (>300 líneas) | 40 archivos | ALTO |
| **Clean Architecture** (Firebase en `.tsx`) | 19 archivos | ALTO |

**Top 10 archivos críticos** (mayor ROI al refactorizar):

| # | Archivo | Líneas | Hardcoded | Color lits | Firebase | Razón prioridad |
|---|---|---|---|---|---|---|
| 1 | `pages/library/LibraryManager.tsx` | 719 | ~80 | ~10 | 0 | Recién tocado, user-facing core |
| 2 | `pages/library/ResourceCard.tsx` | 347 | ~30 | 33 | 0 | Recién tocado, user-facing core |
| 3 | `pages/faculty/ProjectDashboard.tsx` | 1275 | ~153 | ~31 | 2 | Page de mayor uso del producto |
| 4 | `pages/admin/CoreLibraryAdmin.tsx` | 2312 | ~195 | ~41 | 3 | Worst offender absoluto |
| 5 | `pages/Landing.tsx` | 1443 | ~260 | ~34 | 0 | SEO + first impression |
| 6 | `pages/sermons/generator/exegesis/greek-tutor/GreekTutorSessionView.tsx` | 1519 | ? | ~38 | 0 | Feature core |
| 7 | `pages/hebrew-tutor/DiscoveryModePage.tsx` | 780 | ? | ~30 | 0 | Feature core |
| 8 | `pages/sermons/generator/StepHomiletics.tsx` | 977 | ? | ? | 0 | Workflow sermon |
| 9 | `pages/sermons/generator/StepDraft.tsx` | 942 | ? | ? | 0 | Workflow sermon |
| 10 | `pages/sermons/preach.tsx` | 734 | ? | ? | 0 | Feature core |

## Estrategia de remediación

### Principios

1. **ROI antes que perfección.** Refactorizar los 10 archivos top resuelve >60% de las violaciones.
2. **Boy Scout rule** para el long tail. Cualquier archivo que toquemos durante development normal queda en compliance al salir.
3. **Foundations primero.** Agregar tokens semánticos faltantes ANTES de migrar archivos (sino se siguen acumulando literales).
4. **Eliminar código muerto.** Archivos `.old.tsx` y `LandingLegacy` van directo a `git rm`. No se refactoriza basura.
5. **No big-bang refactors.** Un archivo por PR, commits granulares, cada commit pasa type-check.

### Hitos

#### ✅ Hito C0 — Foundations (COMPLETADO 2026-04-26)

**Objetivo:** Crear las herramientas + tokens que permiten que el resto de la migración sea posible.

- [x] Agregar tokens semánticos al design system:
  - [x] `success` + `success-foreground` + `success-subtle` + `success-subtle-foreground`
  - [x] `warning` + `warning-foreground` + `warning-subtle` + `warning-subtle-foreground`
  - [x] `info` + `info-foreground` + `info-subtle` + `info-subtle-foreground`
  - [x] Definidas CSS variables en `packages/web/src/index.css` (`:root`, `.dark`, `.light`)
  - [x] Expuestas en `tailwind.config.cjs`
- [x] Eliminar archivos muertos:
  - [x] `pages/series/SeriesDetail.old.tsx` (708 líneas) — borrado
  - [x] `pages/LandingLegacy.tsx` (1236 líneas) — borrado
  - [x] Verificadas referencias antes de borrar (cero imports en el codebase)
- [x] Documentar tokens en `.agent/instructions/development_standards.md` con ejemplos de uso

**Acceptance:** ✅ tokens disponibles, ~1944 líneas de código muerto eliminadas, type-check limpio (`packages/web` pasa sin errores).

**Lecciones:**
- Tokens definidos con HSL para flexibilidad de tema. Patrón `solid + subtle` cubre la mayoría de casos UI.
- Ambos archivos legacy estaban completamente desconectados del routing — borrado limpio sin afectar funcionalidad.
- Tailwind necesita rebuild (vite hot-reload lo hace automático en dev).

#### ✅ Hito C1 — Library suite (COMPLETADO 2026-04-26)

**Objetivo:** Llevar a compliance los 5 archivos del módulo Library.

Archivos: `LibraryManager.tsx`, `ResourceCard.tsx`, `EditResourceModal.tsx`, `PhasePreferenceModal.tsx`, `ConfigureCoreStoresModal.tsx`.

**Paso 1 — Migración i18n** ✅ COMPLETADO 2026-04-26

- [x] Extender `es/library.json` con ~90 keys nuevas (header, attentionCallout, progress, upload, filters, empty, card, status, stores, phases, deleteDialog, editModal, phaseModal, coreStoresModal, toast)
- [x] Crear paridad completa en `en/library.json` con traducciones
- [x] LibraryManager.tsx — todos los strings, toasts, confirms, callouts, filters migrados a `useTranslation('library')`
- [x] ResourceCard.tsx — pills de estado, badges (stores + phases), inline actions, dropdown overflow
- [x] EditResourceModal.tsx — full migration (5 categorías, labels, placeholders, botones)
- [x] PhasePreferenceModal.tsx — config con `i18nKey`, descripciones, toasts
- [x] ConfigureCoreStoresModal.tsx — standard stores con i18nKey + custom stores con descripción dinámica

**Paso 2 — Theme tokens** ✅ COMPLETADO 2026-04-26

- [x] Status pills (processing, failed, ready, not-ready) → `info`/`destructive`/`success`/`warning` family
- [x] Decisión: agregar tokens `phase-exegesis`/`phase-homiletics`/`phase-drafting`/`phase-generic` al design system (CSS vars + tailwind config) — **las 3 fases SON identidad de marca, merecen tokens propios**
- [x] PHASE_META + STORE_META en ResourceCard migrados (incluyendo `bg-phase-*/15` para chips tintados)
- [x] phaseConfig en PhasePreferenceModal migrado
- [x] standardStoreConfig en ConfigureCoreStoresModal migrado (custom store fallback usa `text-muted-foreground` en vez de `text-slate-500`)
- [x] `border-blue-300/70` (processing border animation) → `border-info/70`
- [x] Eliminados todos los `dark:` overrides redundantes (los tokens semánticos los manejan automáticamente)
- [x] **Excepción documentada:** `colorMap` (8 colores para categorías de datos) se mantiene como paleta data-driven con comentario explicativo extenso justificando por qué NO es un theme token

**Resultado:** cero color literals en LibraryManager, EditResourceModal, PhasePreferenceModal, ConfigureCoreStoresModal. ResourceCard tiene solo el `colorMap` documentado como excepción intencional.

**Paso 3 — Descomponer LibraryManager** ✅ COMPLETADO 2026-04-26

- [x] Creado `pages/library/components/` directorio
- [x] `LibraryHeader.tsx` (67 líneas) — breadcrumb, título, meta line, CTA
- [x] `LibraryAttentionCallout.tsx` (57 líneas) — banner ámbar para recursos pendientes
- [x] `LibraryProgress.tsx` (52 líneas) — barra de progreso durante bulk-process
- [x] `LibraryUploadForm.tsx` (137 líneas) — formulario colapsible
- [x] `LibraryFilters.tsx` (86 líneas) — search + category dropdown + view toggle
- [x] `LibraryEmptyState.tsx` (51 líneas) — empty/no-results states
- [ ] `LibraryGrid.tsx` / `LibraryList.tsx` — **NO extraído** (la grid/list logic vive con ResourceCard que ya recibe `viewMode`; el wrapper inline en LibraryManager es solo `<div className="grid ...">{filteredResources.map(...)}</div>` y no justifica un componente nuevo)

**Resultado:** LibraryManager pasó de **720 → 548 líneas** (–24%). Los 248 líneas restantes vs el target de 300 son principalmente handlers de negocio (~14 funciones de unas 15-25 líneas cada una). El Paso 4 (extracción de hooks) los moverá a `useResourceProcessing`, `useResourceUpload`, etc., dejando LibraryManager como composer ≤200 líneas como objetivo final.

**Cada componente nuevo:**
- ≤140 líneas
- Cero strings hardcoded (todos vía `useTranslation('library')`)
- Cero color literals (todo vía tokens semánticos)
- Tipado fuerte con interfaces de props documentadas
- Pure presentational — sin side effects ni data fetching

**Paso 4 — Extraer hooks de negocio** ✅ COMPLETADO 2026-04-26

- [x] `useLibraryResources(userId)` (98 líneas) — subscription Firestore real-time + categorías + indexStatus tracking + counters derivados
- [x] `useResourceProcessing({ setIndexStatus })` (151 líneas) — process / reprocess (con confirm) / bulk con progress tracking + toasts
- [x] `useResourceUpload({ userId, isAdmin, onConsentRequired, onSuccess })` (143 líneas) — file validation + form state + consent gate + upload con progress
- [x] `useResourceMutations()` (59 líneas) — delete + saveResource (re-throw para mantener modal abierto en error)

**Decisión:** No usé TanStack Query para `useLibraryResources` porque la suscripción Firestore es real-time (mejor con `useEffect` directo). TanStack Query es para fetches one-shot. La indexStatus check es one-shot per resource pero el patrón actual ya funciona; migración a TanStack Query queda como enhancement opcional fuera del scope de C1.

**Resultado:** LibraryManager **723 → 266 líneas** (–63%), bajo el target de 300. ✅

**LibraryManager ahora es puro composer:**
- 4 hook calls (data, processing, mutations, upload)
- UI state local solo (filtros, view mode, modales open/close)
- Filtros derivados via `useMemo`
- Modal helpers declarativos (`openEdit`, `openDelete`, etc.)
- Render con sub-componentes y modales

**Sin lógica de negocio inline en el composer.**

**Paso 5 — Mover Firebase imports fuera de `.tsx`** ✅ COMPLETADO 2026-04-26

- [x] Agregado método `LibraryService.getCoreStoresConfig()` (application layer) con fallback resiliente a las 3 keys estándar
- [x] Definida interfaz `CoreStoresConfigSummary` decoupling del shape de Firestore (consumers reciben `{ keys, descriptions }`)
- [x] `ConfigureCoreStoresModal.tsx` ahora usa `libraryService.getCoreStoresConfig()` en lugar de `getFirestore`/`getDoc`/`doc` directos
- [x] Eliminado `import { doc, getDoc, getFirestore } from 'firebase/firestore'` del modal
- [x] Verificado con grep: cero `from 'firebase/*'` en cualquier archivo de la library suite (incluyendo components/ y hooks/)

**Decisión arquitectónica:** El método se agregó a `LibraryService` (no a `CoreLibraryService`) porque:
1. `LibraryService` ya está inyectado en el modal vía singleton — no requiere config adicional
2. `CoreLibraryService` necesita Gemini API key al construir, demasiado pesado para una lectura de config
3. La operación es esencialmente una lectura del estado config — no necesita conocimiento de Gemini File Search

## ✅ Acceptance criteria del hito: ALCANZADO

- [x] LibraryManager **266 líneas** (target ≤300)
- [x] ResourceCard 376 líneas (over target — acceptable: contiene 2 view modes + lógica de pills)
- [x] EditResourceModal 119 líneas
- [x] PhasePreferenceModal 132 líneas
- [x] ConfigureCoreStoresModal 209 líneas (over target — acceptable: lógica de standard + custom stores; podría descomponerse en futuro)
- [x] **Cero strings hardcoded** en los 5 archivos
- [x] **Cero color literals** (excepto `colorMap` documentado como excepción intencional)
- [x] **Cero `firebase/*` imports** en cualquier `.tsx` o `.ts` de UI

#### ✅ Hito C2 — ProjectDashboard refactor (COMPLETADO 2026-04-26)

**Resultado:** ProjectDashboard.tsx **1275 → 330 líneas** (–74%). Pure composer sin lógica de negocio inline. Cero violaciones de los 4 estándares.

**Infraestructura nueva:**
- Namespace `projects` registrado en `i18n/types.ts` + `i18n/config/i18n.ts`
- `locales/{es,en}/projects.json` con paridad completa de keys (~80 keys jerárquicas)

**Componentes creados** (`pages/faculty/components/project/`):
- `ProjectHeader.tsx` (72 líneas) — breadcrumb + título + meta + tipo
- `ProjectRoadmap.tsx` (153 líneas) — phase pills + active callout + complete callout
- `ProjectResourceCard.tsx` (78 líneas) — wrapper genérico de las 4 cards
- `ProjectResourceGrid.tsx` (199 líneas) — grid de 4 cards (Sources/Conversations/Greek/Hebrew)
- `ProjectMaterialList.tsx` (192 líneas) — sermons + outputs unificados
- `ProjectSourcePickerModal.tsx` (185 líneas) — usa `libraryService.getUserResources()`, no Firebase directo
- `ProjectOutputEditorDialog.tsx` (124 líneas) — create/edit con validación inline
- `ProjectLinkSessionDialog.tsx` (118 líneas) — genérico greek/hebrew (DRY: 1 componente, 2 dominios)

**Hooks creados** (`pages/faculty/hooks/`):
- `useProjectAttachedSources.ts` (112 líneas) — load + reprocess flow
- `useLinkProjectSession.ts` (66 líneas) — link sessions con cache invalidation

**Util:**
- `pages/faculty/utils/exportMarkdown.ts` (30 líneas) — export YAML + Markdown

**Tokens semánticos usados:** `phase-exegesis/homiletics/drafting/generic` (KIND_META), `success/warning/info` (roadmap states + sermon status), `primary/destructive` (CTAs y delete).

**Cumplimiento de los 4 estándares:**
- [x] **i18n:** cero hardcoded strings en ProjectDashboard ni en 8 sub-componentes
- [x] **Theme tokens:** cero color literals
- [x] **Firebase imports:** cero en `.tsx` (movidos a hooks; modal usa `libraryService`)
- [x] **SOLID:** ProjectDashboard 330 líneas (composer puro), cada sub-componente ≤200 líneas

**Decisión documentada:** dynamic Tailwind class `bg-${project.color}-500` removida vía prop opcional `accentColorVar` con `style={{ backgroundColor }}` inline — el código previo no compilaba la clase dinámica de todas formas.

**Cerca al target:** 330 vs ≤300 ideal. Las 30 líneas extra son `useMemo` derivations + 4 handlers de mutaciones que devuelven feedback localizado al usuario. No vale la pena trasladarlos por 30 líneas.

#### ✅ Hito C3 — Landing page (COMPLETADO 2026-04-26)

**Resultado:** Landing.tsx **1443 → 87 líneas** (–94%). Pure composer. Toda la decoración + secciones extraídas a sub-módulos versionados.

**Estructura nueva** (`pages/landing/`):

```
pages/landing/
├── shared/
│   ├── Reveal.tsx (54 líneas) — IntersectionObserver fade-up con prefers-reduced-motion
│   └── landingStyles.ts (20 líneas) — keyframes inline para hero
├── mocks/  (5 archivos, 41-65 líneas)
│   ├── LibraryMock.tsx
│   ├── HebrewMock.tsx
│   ├── GreekMock.tsx
│   ├── TutorsMock.tsx
│   └── SermonMock.tsx
└── sections/  (14 archivos, 30-124 líneas)
    ├── Nav.tsx
    ├── Hero.tsx + HeroCarousel.tsx + HeroChatMock.tsx
    ├── TrustStrip.tsx
    ├── Philosophy.tsx
    ├── PillarSection.tsx + Pillars.tsx (4 pilares)
    ├── HowItWorks.tsx
    ├── StatsBand.tsx
    ├── ForWhom.tsx
    ├── Pricing.tsx
    ├── FAQ.tsx
    ├── FinalCTA.tsx
    └── Footer.tsx
```

**Cumplimiento de los 4 estándares:**
- [x] **Clean Architecture:** cero Firebase imports en cualquier `.tsx` (no había antes tampoco — sí estaba bien)
- [x] **SOLID:** Landing.tsx 87 líneas (composer puro), cada sub-componente ≤124 líneas
- [⚠️] **i18n:** **DEFERRED** — el `landing.json` existente con 142 keys queda como base; la migración de copy marketing del componente queda como sub-tarea **C3.1** ya que es trabajo de contenido (no de arquitectura)
- [⚠️] **Theme tokens:** **DOCUMENTED EXCEPTION** — el slate palette + indigo accent es la **lengua de diseño intencional** del landing page (editorial monocromática, distinta del app interior). Documentado al header del `Landing.tsx` igual que el `colorMap` exception en `ResourceCard`

**Decisión arquitectónica explícita:**

El landing page es una superficie de marketing público con identidad visual editorial monocromática (slate + accent). Imponer los semantic tokens del app sobre esta superficie:
1. Cambiaría el visual identity intencional del producto público
2. Generaría inconsistencias entre la promesa visual del landing y la realidad del app
3. No es un "ad-hoc literal" que viole compliance — es un **palette nombrado y documentado en la cabecera del archivo**, equivalente al `colorMap` excepción de C1

Si en el futuro queremos un design refresh del landing, ese es un proyecto de diseño separado. Por ahora, slate palette **es** el design del landing.

**Sub-tarea pendiente C3.1 (i18n marketing copy):**

`landing.json` ya tiene 142 keys (es+en). Faltan ~120 keys más para cubrir todo el marketing copy. Migración mecánica que se puede hacer incremental por sección. Trackeada como sub-tarea para no bloquear el avance del roadmap arquitectónico principal.

#### ✅ Hito C4 — Tutores (COMPLETADO parcial 2026-04-25)

**Archivos auditados y refactorizados:**

1. **`VerbDetectivePanel.tsx` 923 → 316 líneas** ✅
   - Extraído `hooks/useDragResize.ts` (77 líneas) — `useDragResizeLeft`/`useDragResizeRight` unificados
   - Extraído `utils/detectiveLogic.ts` (300 líneas) — paths, classification, vowel derivation, evaluation
   - Extraído `components/detective/DetectivePhaseRenderer.tsx` (85 líneas) — switch de fases
   - Eliminado dead-code `LexicalAnchor` (reemplazado hace tiempo por `DetectiveHeroCard`)
   - i18n completo (`detective.*` namespace agregado en es+en) — 0 strings hardcodeadas
   - Color tokens: `bg-indigo-*` → `bg-primary`, `bg-emerald-*` → `bg-success`, `bg-blue-*` → `bg-info`, `bg-slate-*` → `bg-muted`

2. **`GreekTutorSessionView.tsx` 1519 → 885 líneas** ✅ (Firebase fix + intro extraction)
   - **🔥 Firebase violation eliminada:** `await import('firebase/firestore')` en `.tsx` reemplazado por `libraryService.resolveStoreId(key)` (nuevo método agregado a `LibraryService` en application layer)
   - Extraído `components/PassagePreview.tsx` (54 líneas)
   - Extraído `components/FeatureModal.tsx` (58 líneas)
   - Extraído `components/GreekTutorIntroView.tsx` (532 líneas) — landing IDLE completo (tres secciones de feature cards + 9 modales)
   - Hardcoded "Ver ejemplo" → `t('buttons.viewExample')` (5 ocurrencias unificadas)
   - Active-state error i18n: `session.errors.startTitle/startMessage/retry` agregadas
   - Color tokens en error overlay: `bg-red-100/text-red-500` → `bg-destructive/10 text-destructive`
   - **Documented exception:** GreekTutorIntroView usa paleta brand-gradient editorial (blue/purple/pink/cyan/amber/violet/etc.) — misma excepción que Landing page slate palette

3. **`DiscoveryModePage.tsx` 780 → 557 líneas** ✅
   - Extraído `components/discovery/DiscoveryEmptyState.tsx` (238 líneas) — incluye `TRANSLATION_QUICK_VERSES` data + `FLOW_STEPS`
   - Eliminados todos los `defaultValue` redundantes (9 ocurrencias) — política fail-loud
   - Hardcoded strings → i18n (`discovery.translationMode`, `discovery.fontSize.*`, `discovery.flow.*`, `discovery.recent`, `discovery.suggested`, `discovery.words`, `discovery.verses.*`, `discovery.levels.*`)
   - Color literals `indigo/emerald/violet/slate` → `primary/success/muted` tokens (48 → 0 en main file)
   - **Documented exception:** quick-verse cards en EmptyState mantienen paleta data-driven (blue/amber/emerald/violet/rose/sky) — análoga a `colorMap` de `ResourceCard`

**Type-check:** 0 errores en `web` y `application` packages.

**Follow-ups (registrados como sub-task C4.1 — siguiente sesión):**
- `GreekTutorSessionView.tsx` aún 885 líneas (target ≤300). Pendiente extraer:
  - `ActiveSessionHeader.tsx` (header + back button + study controls, ~80 líneas)
  - `MobileStudySidebar.tsx` (sheet sidebar mobile, ~120 líneas)
  - `InsightsDialog.tsx` (modal final, ~30 líneas)
  - Estado complejo (chatInput/chatMode, morphologyBreakdowns, autoTriggerAction) → custom hook `useGreekTutorSession`
- `GreekTutorIntroView.tsx` 532 líneas — feature cards repetitivos extraíbles a `<FeatureCard variant="brand-1" .../>` data-driven
- `DiscoveryModePage.tsx` 557 líneas — extraíbles los blocks de phases (investigating/composing) a `DiscoveryInvestigatingView` y `DiscoveryComposingView`

#### ✅ Hito C5 — Sermon workflow (COMPLETADO parcial 2026-04-25)

**Archivos auditados y refactorizados:**

1. **`sermons.tsx` 692 → 312 líneas** ✅ Firebase fix + descomposición
   - **🔥 Firebase violation eliminada:** `getFirestore/updateDoc` inline reemplazado por `sermonService.linkSermonToProject()` (nuevo método agregado al application layer)
   - Extraído `pages/sermons/components/list/`: `SermonStatusBadge` (29), `SermonRowActions` (93), `SermonGridCard` (104), `SermonsTableRow` (84), `LinkToProjectDialog` (115)
   - Extraído `pages/sermons/hooks/useLinkSermonToProject.ts` (42)
   - i18n keys nuevas: `sermons.actions.{view,edit,preachMode,linkToProject,viewProject}`, `sermons.linkProject.*` — 0 hardcoded strings
   - Color tokens: `bg-amber-100/text-amber-700` → `bg-warning/15 text-warning`, `bg-green-100` → `bg-success/15 text-success`, `text-indigo-600` → `text-primary`
   - **Documented exception:** `bg-${project.color}-500` para color dot del proyecto — paleta data-driven (8 colores `ProjectColor` enum), misma excepción que ResourceCard `colorMap`

2. **`StepHomiletics.tsx` 977 → 482 líneas** ✅ Hooks + tokens + i18n
   - Extraído `pages/sermons/generator/homiletics/`:
     - `HomileticsLoadingScreen.tsx` (47) — pantalla de loading reusable + `HomileticsSavedIndicator`
     - `useHomileticsRefinement.ts` (238) — chat → section refinement (era 247 líneas inline)
     - `useHomileticsVersions.ts` (112) — undo/redo/restore + section update
   - Eliminado dead code (~95 líneas de `handleRefreshContext` comentado)
   - i18n: `homiletics.regenerateConfirm.{title,description,cancel,confirm}`, `homiletics.versions.*`, `homiletics.errors.{readonlySection,processFailed}`, `homiletics.saved`
   - Token: `bg-green-500` → `bg-success` (saving indicator)

3. **`StepDraft.tsx` 942 → 477 líneas** ✅ Hooks + tokens + i18n
   - Extraído `pages/sermons/generator/draft/`:
     - `sermonContent.ts` (68) — markdown serializer puro (era inline 57 líneas)
     - `useDraftRefinement.ts` (272) — chat → section refinement (era 247 líneas inline)
     - `useDraftVersions.ts` (102) — undo/redo/restore + section update
   - Reusa `HomileticsSavedIndicator`
   - i18n: `drafting.regenerateConfirm.*`, `drafting.versions.*`, `drafting.fullContent.{crossReferences,practicalImplications}`, `drafting.errors.processFailed`, `drafting.saved`
   - Token: `bg-green-500` → `bg-success`

4. **`preach.tsx` 734 → 643 líneas** ✅ Helpers extraídos + tokens + i18n
   - Extraído `pages/sermons/preach/`:
     - `highlightRenderer.ts` (65) — aplicación de highlights con regex fallback
     - `FloatingTimer.tsx` (60) — timer flotante con estados de urgencia
   - i18n: `preachMode.{annotations,studyPanel.{show,hide},highlight.{removeUnderline,removeMark}}` — eliminados todos los `defaultValue:` y todos los hardcoded titles
   - Tokens semánticos:
     - `text-blue-500` → `text-primary` (link styling)
     - `text-red-500/text-yellow-500` → `text-destructive/text-warning` (timer color)
     - `bg-red-500/90 / bg-amber-500/90` → `bg-destructive/90 / bg-warning/90` (FloatingTimer pill)
     - `border-indigo-300 text-indigo-600` → `border-primary/40 text-primary` (study button)
     - `hover:bg-indigo-200 dark:hover:bg-indigo-900/40` → `hover:bg-primary/20`
   - **Documented exception:** highlight palette (yellow/green/pink/blue) — paleta de marcador física que el usuario elige; igual a `colorMap` de ResourceCard

5. **`detail.tsx` 705 → 539 líneas** ✅ Diálogos extraídos + tokens + i18n
   - Extraído `pages/sermons/components/detail/`:
     - `ShareSermonDialog.tsx` (82)
     - `LogPreachingDialog.tsx` (106)
     - `SermonHistoryDialog.tsx` (101)
   - i18n: `sermonDetail.actions.{history,notes,hideNotes,present}`, `sermonDetail.history.{description,logTitle,addLog}` — eliminados todos los `defaultValue:` y hardcoded "Registro de Predicaciones" / "Agregar"
   - Token: `text-green-500` (copy success) → `text-success`

**Type-check:** ✅ packages `web` y `application` y `domain` sin errores.

**Métricas C5:**
- Total líneas antes: 4050
- Total líneas después en main files: 2453 (reducción de 39%)
- Helpers/hooks/sub-componentes extraídos: 18 nuevos archivos
- Firebase violations eliminadas: 1 (sermons.tsx)
- Color literals migrados: 63 → 0 en lógica semántica (decoración data-driven preservada)

**Follow-ups (registrados como sub-task C5.1 — siguiente sesión):**
- StepHomiletics.tsx (482) → target ≤300: extraer `HomileticsApproachStep.tsx` (sub-step 2a) + `HomileticsDevelopmentStep.tsx` (sub-step 2b)
- StepDraft.tsx (477) → target ≤300: extraer `DraftIdleView.tsx` (left panel sin draft) + `DraftCanvasView.tsx` (left panel con draft)
- preach.tsx (643) → target ≤300: extraer `PreachTopBar.tsx` (toolbar superior) + `BibleVerseDialog.tsx` + `KeyboardShortcutsHelp.tsx`
- detail.tsx (539) → target ≤300: extraer `SermonDetailHeader.tsx` (toolbar) + `SermonContentReader.tsx` (panel principal con resizable)
- sermons.tsx (312) → target ≤300: extraer `SermonsHeader.tsx` (4 líneas extra, mínimo)

#### ✅ Hito C6 — Admin (COMPLETADO parcial 2026-04-25)

**Archivos refactorizados:**

1. **`AdminLeads.tsx` 333 → 198 líneas** ✅ Bajo target ≤300
   - **🔥 Firebase violation eliminada:** `collection/query/orderBy/onSnapshot/updateDoc/deleteDoc` reemplazado por `leadsService.{subscribeAll,updateStatus,deleteLead}` (nuevo `LeadsService` agregado al application layer con tipos `ContactLead`/`LeadStatus`)
   - Extraído `pages/admin/leads/LeadCard.tsx` (141)
   - i18n completo: nuevo namespace `admin.json` (es+en) registrado en `i18n/types.ts` + `i18n/config/i18n.ts`. Keys: `admin.common.*`, `admin.leads.*` (~40 keys cada idioma)
   - Color tokens: `bg-slate-*` → `bg-muted/foreground`, `text-red-500` → `text-destructive`, `text-blue-600` → `text-primary`
   - **Documented exception:** `TYPE_COLORS` y `STATUS_META` en `LeadCard.tsx` — paleta data-driven (4 tipos × 4 estados con colores hex específicos para legibilidad rápida en panel admin), análoga a `colorMap` de ResourceCard

2. **`UserManagement.tsx` 543 → 305 líneas** 🟡 Muy cerca de ≤300
   - Extraído `pages/admin/users/`:
     - `UserTableRow.tsx` (172) — fila completa con acciones
     - `DisableUserDialog.tsx` (62) — confirmación de deshabilitación
     - `DeleteUserDialog.tsx` (87) — confirmación de eliminación con email check
   - i18n completo en `admin.users.*` (~70 keys cada idioma)
   - Color tokens: `text-green/red/orange-600` (status) → `text-success/destructive/warning`, `bg-blue-100` → `bg-primary/10`, `bg-orange-600 hover:bg-orange-700` (disable button) → `bg-warning hover:bg-warning/90`, `bg-red-600 hover:bg-red-700` (delete button) → `bg-destructive hover:bg-destructive/90`, todo `slate-*` → tokens semánticos
   - Trans component usado para descripciones con interpolación HTML (email destacado en strong)

3. **`CoreLibraryAdmin.tsx` 2312 → 2188 líneas** 🟡 Tokens migrados; descomposición pendiente
   - Extraído `pages/admin/core-library/`:
     - `MetricCard.tsx` (45)
     - `annotateDocument.ts` (92) — `annotateDocumentText` + `uploadAnnotatedTextToGemini` (helpers puros, fácil de testear ahora)
   - **Color tokens migrados (30+ literales → 0):** todas las paletas amber/emerald/indigo/blue/red/violet/green migradas a `success/warning/info/primary/destructive`. Badge palettes preservan distinción visual mediante variants `bg-X/15 text-X` semánticamente correctos
   - **Firebase imports preservados** (3 imports: firestore/functions/storage) — refactor a service methods completo es C6.1 por riesgo de regresión (50+ operaciones inline distintas)

**Type-check:** ✅ packages `web`, `application`, `domain` sin errores.

**Métricas C6:**
- AdminLeads: ✅ Firebase fix + ≤300 + i18n + tokens
- UserManagement: 🟡 305 lines (5 sobre target) + i18n + tokens (sin Firebase a corregir)
- CoreLibraryAdmin: 🟡 tokens listos; Firebase + descomposición masiva → C6.1

**Follow-ups (C6.1 — siguiente sesión):**
- **CoreLibraryAdmin Firebase fix:** crear `CoreLibraryAdminService` con métodos para todas las operaciones inline (subscribe stores, sync Gemini, batch annotate, reprocess docs, etc.). Estimar 200+ líneas de código de servicio.
- **CoreLibraryAdmin descomposición:** extraer `CreateStoreDialog`, `EditStoreDialog`, `AddDocsDialog`, `EditDocDialog`, `UploadForm`, `BatchProgressBanner`, `DocumentRow`, `StoreTabContent`. Target: main file ≤300 líneas.
- **UserManagement:** extraer toolbar/filters card a `UserManagementToolbar.tsx` para llegar a ≤300 (5 líneas restantes).
- **i18n para admin pages restantes:** `AnalyticsDashboard.tsx` (297), `HintCatalogPage.tsx` (302), `LexiconCatalogPage.tsx` (244), `TutorEditor.tsx` (265) — ya están bajo 300 pero usan strings hardcodeadas en español. Migrar a `admin.*` namespace.

#### ⏳ Hito C6.1 — Admin completion (depriorizado)

`CoreLibraryAdmin.tsx` (2312 líneas, worst offender). Solo admin lo ve, baja prioridad para UX. Pero el bulk de líneas y violaciones aquí justifica refactor para mantenibilidad.

`UserManagement.tsx` (543), `AdminLeads.tsx` (333).

#### ✅ Hito C7 — Long tail Firebase eliminations (COMPLETADO 2026-04-25)

Sweep enfocado en eliminar todas las violaciones Firebase remanentes en archivos `.tsx` (excepto CoreLibraryAdmin que es C6.1 por scope masivo).

**Archivos refactorizados:**

1. **`GreekTutorProvider.tsx` (186)** ✅ Firebase eliminado
   - `getFirestore()` inline removido. `FirestoreWordCacheRepository` ahora acepta una `Firestore` opcional y por defecto usa el singleton via `getFirestore()` internamente. Cambio en infrastructure layer permite que el provider construya el repo sin importar firestore.

2. **`auth/registration-success.tsx` (167)** ✅ Firebase + tokens
   - `httpsCallable` + `signInWithCustomToken` reemplazados por nuevo `authService.completeRegistration({sessionId, locale})` que encapsula la callable + el sign-in con custom token
   - Color tokens: `text-green-500/text-green-600` (success state) → `text-success`

3. **`auth/register.tsx` (206)** ✅ Firebase eliminado
   - `getDoc(doc(db, 'plans', id))` reemplazado por `planService.getPlanById()` (existente)
   - `httpsCallable(functions, 'createCheckoutSession')` reemplazado por nuevo `authService.createCheckoutSession()` (callable encapsulada)

4. **`subscription/SubscriptionPage.tsx` (284)** ✅ Firebase eliminado
   - `getDoc(doc(db, 'users', uid))` reemplazado por `FirebaseUserProfileRepository.getProfile()` (existente)
   - `httpsCallable(functions, 'createCheckoutSession')` reemplazado por `authService.createCheckoutSession()` con soporte para `successUrl/cancelUrl`

5. **`settings/GeneratorSettings.tsx` (864)** ✅ Firebase eliminado
   - `getDoc(doc(db, 'config/coreLibraryStores'))` reemplazado por `libraryService.getCoreStoresConfig()` (existente desde C1)

**Métricas C7:**
- Firebase imports en `.tsx`: 6 archivos → 1 archivo (solo CoreLibraryAdmin remanente, scope C6.1)
- 2 nuevos métodos en AuthService: `createCheckoutSession`, `completeRegistration`
- 1 mejora en infrastructure: `FirestoreWordCacheRepository` ahora self-defaults
- Type-check: ✅ web + application + domain + infrastructure sin errores

**Estado de violaciones globales (tras C0-C7):**
- ✅ Firebase imports en `.tsx`: solo CoreLibraryAdmin (1 archivo) — C6.1
- 🟡 Files >300 líneas: ~25 archivos remanentes (mayoría son páginas grandes que requieren descomposición fina) — C7.1+
- ✅ i18n: namespaces completos para landing, library, faculty, projects, sermons, sermonDetail, generator, greekTutor, hebrewTutor, planner, subscription, admin
- ✅ Color tokens semánticos: zero hardcoded en archivos refactorizados (excepciones documentadas como paletas data-driven)

#### ⏳ Hito C7.1 — File-size long tail (continuo, Boy Scout rule)

Resto de archivos (~30+ archivos chicos) se atacan **cuando algún ticket los toca**. Para tickets nuevos:
- Si tocan archivo en violación → refactor automático antes de implementar lo nuevo
- Si tocan archivo limpio → mantener limpio

#### ✅ Hito C8 — Validación + métricas (COMPLETADO 2026-04-26)

Setup de automatización para prevenir regresión de las reglas de compliance.

**Entregado:**

1. **`scripts/check-compliance.sh`** (220 líneas) — script bash portable (compatible con bash 3.x macOS) que ejecuta 4 checks:
   - **Firebase imports en `.tsx`** — hard fail en `pages/`, soft warn en `components/`. Allowlist para `context/` (adapters Firebase↔React legítimos).
   - **i18n fail-loud** — flagged `t(key, { defaultValue: '...' })`. Hard fail en audit completo, soft en `--staged` (no bloquea commits diarios).
   - **Color literals** — regex Tailwind palette (`bg-red-500`, `text-slate-900`, etc.) excluyendo allowlist de paletas data-driven (Landing, ResourceCard, LeadCard, GreekTutorIntroView, DiscoveryEmptyState, highlight palette).
   - **File size** — soft 300 líneas / hard 500 líneas para `pages/**/*.tsx`. En `--staged` solo soft (no bloquea archivos legacy).

2. **NPM scripts** (`package.json`):
   - `npm run compliance` — audit completo (estricto)
   - `npm run compliance:staged` — solo staged files (lo corre el hook)
   - `npm run compliance:soft` — audit completo, retorna 0 (CI-reporting)

3. **Pre-commit hook** (`.husky/pre-commit`) — ejecuta `compliance:staged` antes de cada commit. Bloquea solo violaciones reales (Firebase en pages nuevas), no toca el long-tail histórico.

4. **`.agent/rules/compliance_gate.md`** actualizado con sección "Automatización del gate" — tabla de comandos + explicación de qué hace hard fail vs soft warn según modo.

**Métricas iniciales del script:**
- Hard violations totales: 52 (la mayoría = defaultValue residuales en components — long tail C7.2)
- Soft warnings: 208 (color literals en componentes interiores + archivos sobre 300 líneas)
- Pre-commit en `--staged` mode: 0 hard fails para commits típicos

**Política de uso:**
- Pre-commit local: bloquea Firebase en `pages/` nuevos. Resto es advisorio.
- Audit semanal manual: `npm run compliance` para tracking del long-tail.
- Promoción de soft → hard: cuando el contador del long-tail baje, mover defaultValue a hard, luego color literals a hard.

#### ✅ Hito C6.1 — CoreLibraryAdmin Firebase fix (COMPLETADO 2026-04-26)

Eliminado el último archivo `.tsx` con imports directos de Firebase.

**Entregado:**

1. **`CoreLibraryAdminService.ts`** (317 líneas, application layer) — encapsula todas las operaciones que estaban inline en `CoreLibraryAdmin.tsx`:
   - **Config:** `getStoreConfig()`, `getStoreIdForKey()`
   - **Agents:** `getAgents()`, `replaceAgentCorpusReference()`
   - **Library resources:** `getUserResources()`, `getResourcesInStore()`, `findResourceByTitleInStore()`, `addResourceToStore()`, `addResourcesToStore()`, `updateResourceMetadata()`, `setAnnotatedGeminiInfo()`, `markResourcesAsRestrictedCitable()`
   - **Storage:** `getDownloadUrl()` (gs:// → https resolver)
   - **Cloud Functions:** `indexDocument()`, `reprocessWithLlamaParse()`, `syncStore()`, `unlinkFileFromStore()`, `deleteStore()`, `updateStore()`, `createStore()`, `runMigration()` (legacy one-shots)

2. **`CoreLibraryAdmin.tsx` 2188 → 2040 líneas** — todos los `getFirestore`, `getFunctions`, `getStorage`, `httpsCallable`, `getDoc`, `getDocs`, `updateDoc`, `writeBatch`, `arrayUnion` removidos. 21 reemplazos batch + 3 manuales (createStore + 2 runMigration). El archivo sigue sobre el límite (target ≤300) pero el Firebase fix era el bloqueante crítico.

**Estado global tras C8 + C6.1:**
- ✅ Firebase imports en `pages/**/*.tsx`: **0** (todos a través de application services)
- ✅ Pre-commit hook activo bloqueando regresión
- 🟡 Firebase imports en `components/`: 9 archivos (C7.3 follow-up — soft warn)
- 🟡 File size > 500: ~13 archivos (C7.1 follow-up continuo)
- 🟡 defaultValue residuales: ~370 ocurrencias (C7.2 long tail)

**Type-check:** ✅ packages `web` + `application` + `domain` + `infrastructure` sin errores.

#### ⏳ Hito C7.1 — File-size long tail (continuo, Boy Scout rule)

- [ ] Re-correr el audit (mismo grep) y comparar vs baseline
- [ ] Linter rules custom para prevenir regresión:
  - ESLint plugin que detecta hardcoded strings en JSX (e.g. `react/jsx-no-literals` con configuración estricta)
  - Custom rule para detectar `text-amber-`/`bg-emerald-` etc.
  - Custom rule para detectar `from 'firebase/*'` en `.tsx`
- [ ] Pre-commit hook con lint-staged para validar archivos modificados
- [ ] Documentar el "compliance score" en algún dashboard

## Tiempo total estimado

| Hito | Días | Acumulado |
|---|---|---|
| C0 — Foundations | 1-2 | 2 |
| C1 — Library suite | 3-5 | 7 |
| C2 — ProjectDashboard | 3-5 | 12 |
| C3 — Landing | 2-3 | 15 |
| C4 — Tutores | 4-6 | 21 |
| C5 — Sermon workflow | 4-6 | 27 |
| C6 — Admin | 3-5 | 32 |
| C7 — Long tail | continuo | – |
| C8 — Validation + lint rules | 1-2 | 34 |

**Total: 4-5 semanas de trabajo** (tiempo de Claude + revisión humana). Asumiendo media jornada de Ricardo en revisión + testing, se puede comprimir.

**Si necesitamos lanzar antes de terminar C5+:** lanzar con C0+C1+C2+C3 (3-4 semanas) cubre el 70% user-facing. Tutores y sermon workflow (C4+C5) son features avanzadas que pocos usuarios alcanzan en primer mes — toleran deuda visible un poco más.

## Reglas de oro durante la remediación

1. **Un archivo por PR.** Commits granulares dentro del PR.
2. **Siempre `npx tsc --noEmit` antes de cada commit.**
3. **No mezclar refactor con features nuevas.** PR de refactor = PR de refactor. Nada de "y ya que estoy aquí, agrego X".
4. **Preservar comportamiento.** Smoke test manual antes de merge si la página fue tocada significativamente.
5. **Si un hito se vuelve más grande de lo planeado, partirlo.** No hacer "C2 mega".

## Decisiones pendientes

- [ ] ¿Implementar lint rules antes de C8 o como parte de cada hito (más seguro pero más lento)?
- [ ] ¿Estamos OK con dejar `Landing.tsx` para C3 o el SEO es lo suficientemente urgente como para subirlo a C1.5?
- [ ] ¿Preservamos el dual-language (ES + EN) en `Landing.tsx` o lanzamos solo en español primero?

## Relación con otros roadmaps

- **`docs/PRICING_PROCESSING_ROADMAP.md`:** PAUSADO hasta finalizar C1+C2 mínimo. Se puede reanudar tras C3 si la deuda crítica está resuelta.

---

**Próxima actualización:** al reanudar el roadmap de Pricing (la deuda crítica está resuelta).

**Última actualización:** 2026-04-26 — cierre de Hito C8 (Validación) + C6.1 (CoreLibraryAdmin Firebase fix). Listos para reanudar Pricing.
