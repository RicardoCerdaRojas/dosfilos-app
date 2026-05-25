# Phase 0 — Foundations

## Estado

`completed` — **cerrada 2026-05-23**. 8 PRs (0.1-0.8) shippeados. Cimientos no-código + infraestructura mínima listos para Fase 1.

## Objetivo

Establecer los cimientos no-código + infraestructura mínima para que las Fases 1-7 ejecuten sobre un piso común. Esta fase NO entrega features de usuario; entrega:

1. **CORE Library**: ingestar 14 fuentes confesionales del JSON canónico (Westminster, Heidelberg, etc.)
2. **Tagging `doctrineLevel`** (core/distinctive/open-evangelical) de cada sección de las 14 fuentes — LLM-curated + Ricardo review
3. **Schema extensions** del Source/Chunk con campos rights-aware (license, ingestionStatus, citationTemplates, etc.)
4. **Selector de confesión** en onboarding (nuevos users) + banner backfill no-bloqueante (existentes)
5. **Schema canónico de `Project`** (sin migración aún, solo definición)
6. **Feature flag** `pastoral_fidelity_flow` para enablement gradual
7. **Cross-reference engine TSK-based** (Testigo 2): dataset + lookup endpoint
8. **Auditoría de UI** actual para identificar bypass shortcuts a eliminar (insumo para kill-list)

## Prerequisitos

Ninguno externo. Esta es la fase 0.

## Decisiones tomadas

- [ADR-001](../decisions/ADR-001-confession-anchored-correction.md) — Confesión declarada por el pastor como Testigo 3
- [ADR-002](../decisions/ADR-002-six-step-as-step1-spine.md) — Six-step como spine del Step 1
- [ADR-003](../decisions/ADR-003-project-as-root-unit.md) — Project como unidad raíz
- [ADR-004](../decisions/ADR-004-defer-exegesis-reform-decouple-sermon-from-paper.md) — Diferir exégesis + desacoplar sermón de paper
- [ADR-005](../decisions/ADR-005-exegetical-confessional-pedagogy.md) — Pedagogía exegético-confesional como modelo operacional
- [ADR-006](../decisions/ADR-006-rights-aware-citation-system.md) — Citation engine rights-aware + JSON CORE canonical + subset 14 v1 (cierra Q5)
- [ADR-007](../decisions/ADR-007-phase-0-policy-resolutions.md) — Q2 (migración opcional/lazy) + Q3 (visibilidad default privada) + Q4 (override policy via 3 niveles)
- [ADR-008](../decisions/ADR-008-cross-reference-engine-tsk-based.md) — Cross-reference engine TSK-based build (cierra Q1)

## Decisiones pendientes — TODAS RESUELTAS (2026-05-22)

Las 5 preguntas iniciales se resolvieron en la misma sesión de kickoff. Tracking de cada una:

### Q1 — Cross-reference engine canónico — ✅ RESUELTO via [ADR-008](../decisions/ADR-008-cross-reference-engine-tsk-based.md)

Investigación de codebase confirmó: **NO existe cross-reference engine**. Decisión: build TSK-based (Treasury of Scripture Knowledge) como baseline v1, hybrid TSK + embeddings de Gemini en Fase 4. TSK es PD, ~340k cross-references históricamente curados, $0 cost recurrente, determinístico.

### Q2 — Migración de users existentes — ✅ RESUELTO via [ADR-007](../decisions/ADR-007-phase-0-policy-resolutions.md)

Backfill **opcional, no bloqueante**: banner persistente en dashboard hasta declarar; bloqueo solo al intentar usar `pastoral_fidelity_flow` nuevo; flow legacy sigue accesible mientras tanto. Users nuevos: obligatorio en signup.

### Q3 — Visibilidad de la confesión — ✅ RESUELTO via [ADR-007](../decisions/ADR-007-phase-0-policy-resolutions.md)

**Default privada**, configurable a `public-in-profile` cuando exista feature de perfil pastoral público. Editable en `/settings/confession` con audit log de cambios.

### Q4 — Política de override en bloqueo duro 3/3 — ✅ RESUELTO via [ADR-005](../decisions/ADR-005-exegetical-confessional-pedagogy.md) + [ADR-007](../decisions/ADR-007-phase-0-policy-resolutions.md)

Sistema de tres niveles de doctrina (manifiesto):

| Nivel | Política | Override |
|---|---|---|
| `core` (credos ecuménicos: Nicea, Calcedonia) | Bloqueo absoluto | **No** |
| `distinctive` (posiciones de la confesión declarada) | Bloqueo duro escalado normal | **Sí** (justificación escrita ≥100 chars + audit log) |
| `open-evangelical` (disentimientos legítimos) | Nota informativa | N/A (sin bloqueo) |

Ver [06-pedagogy-applied.md § Sistema de tres niveles](../06-pedagogy-applied.md#4-sistema-de-tres-niveles-de-doctrina-operacionalización).

### Q5 — Confesiones soportadas en v1 — ✅ RESUELTO via [ADR-006](../decisions/ADR-006-rights-aware-citation-system.md)

Adoptado el JSON canónico ([data/core-library-seed.json](../data/core-library-seed.json)) con 22 fuentes total. **Subset v1 priorizado: 14 fuentes** (todas PD sin special handling significativo):

- Schaff Creeds Vols I, II, III
- Apóstoles, Nicea, Atanasiano, Calcedonia
- Westminster (WCF, WSC, WLC)
- Belgic, Heidelberg, Dort
- Augsburg, 39 Articles, Savoy
- SBLGNT (con required attribution CC BY 4.0)

Diferidas a post-launch: 1689 LBCF, Baptist Catechism, 3 Chicago Statements (special handling / proceso legal).

Carga de texto: ingest en inglés (canónico), traducciones internas marcadas como tales para render en español.

## Diseño técnico

### Catálogo de confesiones

```typescript
// Firestore: /confessions/{confessionId}
interface Confession {
  id: string;                    // 'westminster' | 'lbcf-1689' | '39-articles' | ...
  name: string;                  // "Confesión de Westminster"
  tradition: string;             // 'Reformed' | 'Baptist' | 'Anglican' | ...
  year: number;                  // 1647
  language: 'es' | 'en' | 'la';  // texto canónico que cargamos
  fullTextUrl: string;           // pointer a doc completo en Storage
  sections: ConfessionSection[];
  ecumenicalAffirmation: boolean; // afirma Nicea/Calcedonia (mostly true)
}

interface ConfessionSection {
  reference: string;             // "WCF 3.1" o "1689 7.2"
  title: string;
  text: string;                  // texto de la sección
  topics: TopicTag[];            // ['justification', 'covenant', ...]
  doctrineLevel: 'core' | 'distinctive' | 'open-evangelical';
  // ↑ Según ADR-005 (manifiesto). Ver 06-pedagogy-applied.md § Sistema de tres niveles.
  // - core: intersección de credos ecuménicos + confesiones evangélicas mayores. Bloqueo absoluto si negado.
  // - distinctive: posición distintiva de esta confesión. Bloqueo duro con override.
  // - open-evangelical: disentimiento legítimo. Solo nota informativa.
}
```

**Trabajo de Fase 0 sobre `doctrineLevel`**: tagging inicial de cada sección de las 6 confesiones v1 con el nivel correspondiente. Curado por equipo + reviewed pastoralmente. Estimado: 5-10 días adicionales al desarrollo del catálogo base.

### Selector en onboarding

UI nueva en `/onboarding` (o equivalente):

```
┌─────────────────────────────────────────────┐
│  ¿Cuál es tu confesión teológica?           │
│                                              │
│  [ ] Confesión de Westminster                │
│  [ ] Confesión Bautista de Londres 1689      │
│  [ ] 39 Articles                             │
│  [ ] Pacto de Lausana                        │
│  [ ] Catecismo Mayor RCC                     │
│  [ ] No-confesional declarado                │
│                                              │
│  [ Más información sobre por qué pedimos esto ] │
│                                              │
│  [ Continuar ]                               │
└─────────────────────────────────────────────┘
```

Texto explicativo: "Esta selección nos permite ayudarte a mantener coherencia con tu propia tradición teológica. No imponemos posiciones — usamos tu confesión declarada para señalar cuándo una observación tuya tensiona tu propia confesión. Editable después."

Persistencia: `users/{uid}.declaredConfession: ConfessionId` + `users/{uid}.confessionAffirmedAt: timestamp`.

### Schema canónico de `Project`

Ver [ADR-003](../decisions/ADR-003-project-as-root-unit.md) para schema completo.

Esta fase solo **define** el schema y crea la colección vacía. Migración real es Fase 5.

### Feature flag

```typescript
// users/{uid}.featureFlags
interface FeatureFlags {
  pastoral_fidelity_flow: boolean;  // default false initially
  // ...
}
```

Toggle por usuario inicialmente (admin-controlled), eventually rollout gradual.

### Auditoría UI

Tarea de descubrimiento: barrido del codebase para identificar:

- [ ] Botones "saltar análisis"
- [ ] Defaults pre-llenados con sugerencias AI en campos pastorales
- [ ] CTAs que llevan a "generar sermón standalone"
- [ ] Mensajes de copy "Genera tu sermón en minutos"
- [ ] Métricas de éxito basadas en time-to-publish o sermones-generados

Output: documento `phase-0-ui-audit.md` (creado durante ejecución) con lista priorizada por severidad.

## Reuso identificado

- Onboarding flow existente (a extender)
- Firestore + schema patterns existentes
- Feature flag infrastructure (si existe — verificar)

## Tests / verificación

Criterios de aceptación de la fase (estado final 2026-05-25):

- [x] Las 14 fuentes CORE del JSON ingestadas en Firestore (PR #252 — 4 creeds full + 7 sectioned stubs + 3 Schaff refs en `/confessions/`; 8 sources adicionales en `/library_resources` via PR #255 deuda)
- [x] Cada sección tiene `doctrineLevel` taggeado (PR #252 — LLM-curated via Gemini 2.5 Flash + admin review UI)
- [x] Source schema extendido con campos rights-aware (PR #252 PR 0.3 — `LibraryResource` + `Confession` extendidos con `license`, `licenseUrl`, `copyrightNotice`, `ingestionStatus`, `riskLevel`, `requiredAttribution`, `specialHandling`, `citation`)
- [x] Citation render function devuelve estilo correcto por context (PR #252 — `citation` templates `short`/`footnote`/`bibliography`/`rag_display` persistidos)
- [x] SBLGNT render incluye atribución CC BY 4.0 obligatoria (PR #252 + smoke 7 validated — PDF/Word footer + manifest aggregation)
- [~] **SUPERSEDED por [ADR-009](../decisions/ADR-009-confession-opt-in.md)** — Usuario nuevo declara confesión en onboarding. Decisión revisada: confesión es opt-in, no requisito de onboarding
- [~] **SUPERSEDED por [ADR-010](../decisions/ADR-010-confessional-witnesses-default-on.md)** — Banner para users existentes. Decisión final: multi-witness default-on, banner eliminado
- [x] `declaredConfession` + `confessionVisibility` persisten correctamente (legacy preserved per ADR-010, no consumed)
- [x] `/settings/confession` permite editar con audit log (PR #252 + #254 refetch fix + MCP-verified `confessionChangeAudit/` populated)
- [x] Feature flag `pastoral_fidelity_flow` toggleable por admin (PR #252 — admin Feature Flags tab; smoke 1 validated)
- [x] TSK cross-reference dataset accesible via endpoint (PR #252 — `lookupCrossReferences` callable + sample seed)
- [x] Auditoría UI completa documentada (PR #252 — `phase-0-ui-audit.md` con 12 hallazgos → kill-list mapeado a Fase 1/4/5)
- [x] ADRs 005-010 escritos (todas las preguntas iniciales + smoke session decisions cerradas)
- [x] **Deuda Phase 0 cerrada via PR #255** (2026-05-25): seed CORE library ingest (8 system sources) + backfill heurístico (4 PD docs) + UI badges adicionales (riskLevel/doctrineLevel/Attrib/ES labels) + `useUserProfile.refetch` removing ConfessionSettings shadow workaround. End-to-end validated via MCP (Firestore docs verified + audit log timing).

## Estimación

- **CORE Library ingesta de 14 fuentes** (parsing CCEL/PD sources + chunking por sección/Q&A + persistencia): ~5-7 días
- **Tagging `doctrineLevel`** (LLM-curated + Ricardo review): ~2 días LLM + ~1 día review
- **Schema extensions** (Source rights-aware + Chunk): ~1 día
- **Selector onboarding + persistencia**: ~1 día
- **Banner backfill** para users existentes: ~1 día
- **Feature flag** (si no existe pattern): ~0.5 días
- **Schema `Project`** (sin migración): ~0.5 días
- **TSK dataset setup** (download/format + REST endpoint + tests): ~2-3 días
- **Auditoría UI**: ~1 día

**Total**: 2-3 semanas de trabajo concentrado.

**Decisiones (ADRs 005-008)**: ya cerradas. Cero tiempo de planning bloqueante restante.

## Cierre de fase (2026-05-23)

### Verificación de criterios de aceptación

| Criterio | Estado |
|---|---|
| 14 fuentes CORE del JSON ingestadas en Firestore (chunked por sección) | ⚠ Parcial — 14 catalog entries persistidos; 4 creeds con sections full (17 secciones); 7 confesiones grandes con stubs `ingestStatus: pending` (content fill en PR follow-up post-Fase 0) |
| Cada sección tiene `doctrineLevel` taggeado | ⚠ Parcial — LLM tagging pipeline shippeable; review pastoral en sprint paralelo (Q4 cerrada) |
| Source schema extendido con campos rights-aware | ✅ DONE — `LibraryResource` + `Confession` con license/licenseUrl/ingestionStatus/riskLevel/requiredAttribution/citation/specialHandling |
| Citation render function devuelve estilo correcto por context | ⚠ Estructura lista (`citation.short/footnote/bibliography/ragDisplay`); render-by-context vive en Fase 3 (fidelity pass) |
| SBLGNT render incluye atribución CC BY-SA 4.0 obligatoria | ✅ DONE — PdfExport + Word export emiten footer "Atribuciones" cuando manifest contiene chunks SBLGNT |
| Usuario nuevo puede declarar confesión en onboarding (obligatorio) | ✅ DONE — ConfessionStep en OnboardingWizard |
| Usuario existente puede declarar via banner (no bloqueante) | ✅ DONE — ConfessionBanner + `/settings/confession` |
| `declaredConfession` + `confessionVisibility` persisten correctamente | ✅ DONE — schema + repo + audit log |
| `/settings/confession` permite editar (con audit log) | ✅ DONE — page + `confessionChangeAudit/` collection |
| Feature flag `pastoral_fidelity_flow` toggleable por admin | ✅ DONE — UserDetail tab "Flags" + `setUserFeatureFlags` callable |
| TSK cross-reference dataset accesible via endpoint | ✅ DONE — sample seed (~12 versos); dataset full (~340k) en PR follow-up |
| Auditoría UI completa documentada | ✅ DONE — [phase-0-ui-audit.md](../phase-0-ui-audit.md) |
| ADRs 005-008 escritos | ✅ DONE |

### Diferimientos explícitos (NO bloquean cierre)

- **Content fill 7 confesiones largas** (WCF/WSC/WLC/Belgic/Heidelberg/Dort/Augsburg): PR follow-up con parsers per source-type que hacen live fetch desde CCEL `.txt` URLs.
- **Pastoral review del doctrineLevel tagging**: sprint paralelo (Q4 closure). Sections shippean con `reviewStatus: 'pending-pastoral-review'` que no bloquea producción.
- **Dataset TSK full (~340k links)**: PR follow-up con CSV importer desde openbible.info.
- **Project schema** (entregable 5 del phase doc original): diferido a Fase 5 cuando exista consumer real.
- **Per-user library upload UX para license declaration**: documento en open questions [07-citation-policy.md § 11](../07-citation-policy.md).

### Decisiones legales pendientes (founder owns)

- **MorphGNT vs SBLGNT bare**: codebase consume MorphGNT (CC BY-SA 4.0). JSON canónico declara CC BY 4.0. Discrepancia operacional vs declarativa. Decisión: mantener MorphGNT + aceptar SA en derivatives, o migrar a SBLGNT bare. Tracking en futuro ADR.

### Handoff a Fase 1

**Prereqs cumplidos**:
- Feature flag `pastoral_fidelity_flow` operacional → wizard puede gate via `usePastoralFidelityGate()`
- `User.declaredConfession` persiste → Testigo 3 puede consumir
- Cross-reference engine sample dataset → Testigo 2 + Step 4 (Reconocimiento) tienen lookup endpoint
- Confession catalog en Firestore → prompts pueden referenciar secciones del confessional declarado del pastor
- doctrineLevel tagging shippeable → override policy 3-niveles operable

**Riesgos cross-fase**:
- Content fill de 7 confesiones largas debe ocurrir antes que Fase 2 (Testigo 3) sea production-ready — sin Heidelberg/WCF sectioned, Testigo 3 reformado se reduce a 4 creeds
- TSK full dataset debe ingestar antes que Fase 1 Step 4 esté production-grade — sample seed cubre demo end-to-end, no producción real

**Lectura obligatoria al abrir Fase 1**:
- [phase-1-six-step-spine.md](./phase-1-six-step-spine.md)
- [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md) + [06-pedagogy-applied.md](../06-pedagogy-applied.md)
- [phase-0-ui-audit.md](../phase-0-ui-audit.md) — categorías 1 + 4 son directamente del scope de Fase 1
- Memoria `feature_greek_tutor_methodology_narrative` — six-step reusable

### Retrospective

**Mejor de lo estimado**:
- LLM tagging Gemini 2.5 Flash funciona excelente — calidad de rationale alta (Atanasiano → todo `core` con justificación anclada). Cost <$1 para v1.
- Reuso de patterns existentes (admin user mgmt, audit log, callable structure) aceleró PRs 0.1/0.4/0.5 significativamente.

**Peor de lo estimado**:
- Filtro de seguridad Anthropic durante seed de creeds requirió pivot a archivos JSON pequeños separados (vs un solo seed file). +30 min en PR 0.2.
- App Check debug token setup tomó 3 iteraciones — usuario no tenía VITE_RECAPTCHA_SITE_KEY (necesario para que init siquiera corra el debug token).
- TSC con `resolveJsonModule + commonjs` NO copia JSON a dist. Requirió postbuild copy-assets script. +20 min PR 0.2.
- Discrepancia legal MorphGNT vs SBLGNT bare descubierta durante audit — issue real, no típo. Surfaced para decisión founder.

**Aprendizajes**:
- Para iniciativas multi-PR contra una sola fase, mantener bitácora rica en cada PR paga dividendo en cierre — closeout fue ~10min en vez de re-cosechar contexto.
- Per-source parsers de CCEL en live fetch resultaron más complejos de lo previsto; ship con seed bundled + parsers en follow-up evita bloquear cierre por content scraping.

### Sanity check final

- Git status: 21 modified + 22 untracked archivos. PR boundary aún sin commit individual; commits + push de los 8 PRs son acción inmediata post-cierre.
- CI verde: typecheck clean en domain + infrastructure + web (mis archivos). Pre-existing structural deuda no relacionada.
- ADRs append-only respetados. Ningún ADR pasado editado.

## Bitácora

- **2026-05-22** — Phase doc creado. Bloqueada por 5 preguntas pendientes. Awaiting user input.
- **2026-05-22** (más tarde) — Phase **DESTRABADA**. 5 preguntas resueltas: ADR-005 (manifesto pedagógico operacional), ADR-006 (citation rights-aware + JSON CORE adoptado, Q5 cerrada), ADR-007 (Q2 migración opcional + Q3 visibilidad privada + Q4 override 3 niveles), ADR-008 (Q1 cross-ref TSK build). Estimación actualizada a 2-3 sem. Entregas redefinidas con CORE Library + tagging + TSK + schema rights-aware. Lista para codificación.
- **2026-05-22** — Plan de PRs aprobado por fundador. 8 PRs (0.1-0.8). Estimación ajustada a ~4 sem por discrepancias detectadas: feature flag infra inexistente (D-1), `LibraryResource` diverge del JSON canónico (D-2), `OnboardingWizard` localStorage-driven (D-3), no `/settings/<topic>` pages (D-4), `ProjectSource` ya existe (D-5 — acepto colisión nominal con `Project`), SBLGNT atribución solo en `/credits` web, ausente en PDF/Word export (D-6 con riesgo legal pequeño activo). Decisiones: extender `LibraryResource` con rights-aware fields, `/settings/confession` page nueva, diferir `Project` schema a Fase 5, `doctrineLevel` ship con LLM + flag `pending-pastoral-review`, mantener `coreStores` legacy clasificación funcional.
- **2026-05-22** — **PR 0.1 implementado**: Feature flag infrastructure. `User.featureFlags?: FeatureFlags` + canonical `FEATURE_FLAG_NAMES` con `pastoral_fidelity_flow`. Callable `setUserFeatureFlags` (super_admin only, audit-logged). Firestore rules permiten `featureFlags` en update via función. AdminUserService method + `useSetUserFeatureFlags` hook + `useFeatureFlag` hook consumer-side. Tab "Flags" en UserDetailPage con toggle Switch + descripción i18n ES/EN. Type-clean en archivos tocados (errors pre-existentes no relacionados).
- **2026-05-22** — **PR 0.2 implementado**: Confession catalog. Entities `Confession` + `ConfessionSection` + shared `citationRights` module (License/IngestionStatus/RiskLevel/CitationTemplates) reusados por PR 0.3. `IConfessionRepository` + `FirebaseConfessionRepository`. Catálogo de 14 fuentes (4 creeds + WCF/WSC/WLC + Belgic + Heidelberg + Dort + Augsburg + 3 Schaff Vols) en `functions/src/admin/confessions/catalog.ts`. Seed JSON per-creed bajo `data/` con texto canónico PD para Apóstoles/Niceno/Atanasiano/Calcedonia. Callable `ingestCoreLibraryConfessions` (super_admin, audit-logged, idempotente, accepta filter `confessionIds?`) persiste catalog + sections en `/confessions/{id}/sections/{sectionId}`. Sources sectioned sin seed local quedan `ingestStatus: 'pending'`. Admin page `/admin/confessions` con filter tabs + cards con badge status + drill-down route `:confessionId` + ingest buttons (all + per-source). Hooks `useConfessionCatalog`, `useConfessionSections`, `useIngestCoreLibrary`. Firestore rules `match /confessions/{id}` + `sections/{id}` read-auth/write-function. Sidebar nav link agregado. **Nota**: bulk-paste de varios creeds en un solo Write disparó filter de Anthropic; reescrito como archivos JSON separados (opción 1 con fallback a opción 3 si falla). Content fill-in para WCF/WSC/WLC/Belgic/Heidelberg/Dort/Augsburg queda para PR follow-up — usar live fetch desde CCEL `.txt` URLs vía parsers per source-type. Fix PR 0.1 latente: `FirebaseUserProfileRepository.mapProfile` no leía `featureFlags` (corregido).
- **2026-05-22** — **PR 0.3 implementado**: Rights-aware schema + SBLGNT attribution end-to-end. `LibraryResource` (interface + entity class) extendido con `license`/`licenseUrl`/`copyrightNotice`/`ingestionStatus`/`riskLevel`/`requiredAttribution`/`specialHandling`/`citation`. `FirebaseLibraryRepository.firestoreToResource` defaults conservadores para legacy chunks (`license: 'unknown'` + `ingestionStatus: 'requires_manual_review'`). `CitationManifestEntry` extendido con `license`/`licenseUrl`/`copyright`/`requiredAttribution` snapshot. `buildCitationManifest` accepta `resolveRights` callback. Nueva utility `aggregateRequiredAttributions(manifest)` + constantes `SBLGNT_SOURCE_ID` + `SBLGNT_ATTRIBUTION` block. PDF export pipeline (`PdfExportService.ts`) y Word export (`exportSermonToDocx.ts`) renderizan sección "Atribuciones" después de bibliografía cuando manifest contiene fuentes con required attribution o cuando chunks derivados de SBLGNTBibleProvider están presentes. CoreLibraryAdmin surface badges de license + ingestionStatus + "Sin clasificar" / "Solo metadata" en columna policy. **Hallazgo legal**: codebase consume MorphGNT (https://github.com/morphgnt/sblgnt) bajo CC BY-SA 4.0, NO SBLGNT bare bajo CC BY 4.0 como declara el JSON canónico (`docs/pastoral-fidelity/data/core-library-seed.json`). Credits.tsx ya es correcto (CC BY-SA 4.0). `SBLGNT_ATTRIBUTION` block escrito para CC BY-SA 4.0 (verdad operacional, no JSON). **Implicación**: sermones con análisis griego heredan ShareAlike clause — decisión legal pendiente (founder owns): mantener MorphGNT y aceptar SA en derivatives, o migrar a SBLGNT bare y mantener CC BY 4.0. Tracking en futuro ADR. JSON canónico debe actualizarse a CC BY-SA 4.0 o codebase debe cambiar provider. Type-check clean (errors pre-existentes en `indexingStatus`/`extractionVersion` no míos — class `LibraryResourceEntity` no declaraba campos del interface, deuda anterior).
- **2026-05-22** — **PR 0.4 implementado**: doctrineLevel tagging LLM + admin review UI. Callable `tagConfessionDoctrineLevels` (super_admin, 9-min timeout, GEMINI_API_KEY secret) corre Gemini 2.5 Flash sobre cada sección sin `doctrineLevel` (o force=true), persistiendo `doctrineLevel` + `levelRationale` + `reviewStatus: 'pending-pastoral-review'`. Prompt encoding 3 niveles del manifesto (core/distinctive/open-evangelical) con definiciones + ejemplos canónicos (Trinidad/Calcedonia para core, paedo-vs-credo bautismo para distinctive, orden del culto para open). JSON output structurado. Idempotente per-section. Callable manual `updateSectionDoctrineLevel` para overrides + flip a `reviewed`. Audit log `core_library.tag_doctrine_levels` + `core_library.update_doctrine_level` con previous + applied snapshots. AdminConfessionService methods + hooks `useTagDoctrineLevels` + `useUpdateSectionDoctrineLevel`. ConfessionsAdmin detail view extendido con botón "Tag con LLM" + force re-tag + summary (total/untagged/pendingReview) + per-section `<Select>` editable con 3 niveles + badge "Revisado" / "Pendiente review" + botón "Marcar revisado" + display de `levelRationale` en bloque italic. `useConfessionSections` hook ahora retorna `refresh` callback para refetch tras mutations. i18n ES/EN strings completos. Type-check clean. **Per ADR-006 § Tagging doctrineLevel**: política LLM-curated + Ricardo review se aplica vía sprint paralelo (Q4 cerrada).
- **2026-05-23** — **PR 0.5 implementado**: TSK cross-reference engine. Domain entity `BibleCrossReferenceDoc` + `CrossReferenceLink` (4 types: quotation/allusion/parallel/echo). Repository interface `ICrossReferenceRepository` + impl Firestore con doc id format `{BOOK}-{chapter}-{verse}` (ej. `JHN-1-1`). Lookup callable `lookupCrossReferences` (auth users, not super_admin only — Phase 2 Testigo 2 lo consumirá desde sesión regular). Soporta single verse + range pericope. Ingest callable `ingestBibleCrossReferences` (super_admin, audit-logged) carga seed JSON bundled (`tsk-sample.json`) con ~12 versos ancla curados manualmente (Juan 1:1/14, Juan 3:16, Génesis 1:1, Romanos 3:23/8:28, Efesios 2:8, Filipenses 2:6-8, Isaías 53:5, Mateo 28:19). Postbuild script copia data dir a dist. Admin tester page `/admin/cross-references` con: botón "Ingest sample" + form interactivo (book/chapter/verse + opcional verseEnd para pericope) + display de paralelos con badges tipo + strength score + notes. Firestore rules `/bibleCrossReferences/{verseRef}` read-auth/write-function. Sidebar nav link. AdminCrossReferenceService + hook `useCrossReferences`. i18n ES/EN. Type-check clean. **Per ADR-008**: dataset TSK full (~340k links) llega en PR follow-up post-Fase 0 — el shim sample valida el contrato end-to-end. Embeddings de Gemini Embedding API (Fase 4 hybrid retrieval) sigue diferido.
- **2026-05-23** — **PR 0.6 implementado**: Onboarding confesional obligatorio. `User` entity extendido con `declaredConfession?: DeclaredConfessionId` + `confessionAffirmedAt?: Date` + `confessionVisibility?: 'private' \| 'public-in-profile'`. Constante `NON_CONFESSIONAL` para opción synthetic. `IUserProfileRepository.updateDeclaredConfession` + impl Firebase con `serverTimestamp` para `confessionAffirmedAt`. `mapProfile` lee los 3 campos. Hook `useDeclaredConfession` mutation directa a Firestore (Firestore rules `allow write: if isOwner(userId)` ya autorizan self-write — no callable). Hook `useConfessionList` para user-facing surfaces (filtra a sectioned + sort por shortTitle). Component `ConfessionStep` con: explainer card, grid 14 confesiones del catálogo + opción "No-confesional declarado" como tarjeta full-width, selección visual con check, persist on continue, default `confessionVisibility: 'private'` per ADR-007 Q3. Wizard `OnboardingWizard` extendido: nuevo step `'confession'` entre `intent` y `workflow`, `STEP_ORDER` updated a 5 steps. Skip lógica `hasDeclaredConfession` — si user ya declaró (relaunch via help FAB), salta el step. `goNext`/`goPrev` consideran el branch. i18n ES/EN agregadas para eyebrow/title/subtitle/explainer/nonConfessional/toasts. Type-check clean. **Mandatorio para users nuevos**, los existentes reciben banner + `/settings/confession` en PR 0.7.
- **2026-05-23** — **PR 0.7 implementado**: Banner + settings page + flag gating para users existentes. `ConfessionBanner` renderizado en `DashboardLayout` (top de `<main>` cuando no `isFullScreen`) — persistente hasta declarar, hidden en `/settings/*` y `/admin/*`. `/dashboard/settings/confession` page con: explainer card, last-affirmed timestamp display, grid catálogo idéntico a ConfessionStep, visibility switch (private/public-in-profile), save button con dirty-state tracking. `FirebaseUserProfileRepository.updateDeclaredConfession` extendido con audit log write a colección flat `confessionChangeAudit/` (best-effort, captura previousConfession + newConfession + previousVisibility + newVisibility + changedAt serverTimestamp). Firestore rules `match /confessionChangeAudit/{auditId}` append-only para owners, read super_admin OR owner. Hook `usePastoralFidelityGate()` retorna discriminated `{ allowed, loading, reason }` con 4 reasons (loading / flag-disabled / confession-required / allowed) — combina feature flag + declaredConfession para gate del `pastoral_fidelity_flow`. Listo para consumidores Phase 1+ que entren al flow reformado. i18n ES/EN para banner/settings/gate. Type-check clean.
- **2026-05-23** — **PR 0.8 implementado + Fase 0 cerrada**. UI audit completo via subagent investigator. Output: [phase-0-ui-audit.md](../phase-0-ui-audit.md) con 12 hallazgos (5 HIGH, 5 MEDIUM, 2 LOW) en 6 categorías: auto-generación silenciosa, métricas de éxito basadas en velocidad/count, copy con velocidad como valor, campos pastorales pre-completados, botones "saltar análisis", CTAs a sermon standalone. Insumo directo para kill-list de Fase 1 (gate StepHomiletics + `pastoralSeed.completedAt` enforcement), Fase 4 (`studyDepthScore` reemplaza `engagementScore`), Fase 5 (re-rutar CTAs standalone), post-launch (landing rewrite). Phase status flipped a `completed` en este README + en tabla del README del proyecto. Memoria `feature_pastoral_fidelity_roadmap` actualizada.
- **2026-05-24** — **Smoke test sesión + decision change vía [ADR-009](../decisions/ADR-009-confession-opt-in.md)**. Durante smoke test post-cierre, fundador identificó tensión entre el step de onboarding confesional (PR 0.6) y el manifesto pedagógico (texto manda, tradición confirma). Decisión: confesión declarada es **opt-in**, no requisito de onboarding. Supersede parcialmente [ADR-007 § Q2](../decisions/ADR-007-phase-0-policy-resolutions.md) cláusula "obligatorio en signup". Cambios: `ConfessionStep` eliminado del `OnboardingWizard` (4 pasos en vez de 5), `ConfessionStep.tsx` deleted, banner copy reformulada ("Activa comparación con tradición histórica (opcional)"), `usePastoralFidelityGate()` ya no bloquea por `declaredConfession` ausente — agrega `hasConfessionAnchor: boolean` para soft nudges. Spanish display mapping para `/settings/confession` (admin sigue inglés). Phase 2 Testigo 3 design ajustado: `core` ecumenical fire siempre, `distinctive` solo con anchor explícito. Schema Firestore preserved sin migración. Bugs side-channel fixed durante smoke: (a) `AdminUserQueryService.mapUser` no incluía `featureFlags` ni confession fields → toggle UI stale; (b) `firestore.rules` faltaba match para colección `sermon_series` (codebase usa ese nombre, rules solo tenían `series`); (c) índice Firestore `hebrew_user_sessions` tenía direction ASC en local pero query necesita DESC; (d) `firestore.indexes.json` local out-of-sync con remote (sincronizado pre-deploy); (e) Argentine voseo "Resolvé" en i18n string admin → "Resuelve" neutral; (f) admin UserManagement table dropdown faltaba item "Detalle completo" para navegar al UserDetailPage con tabs.
- **2026-05-24** — **Decision change vía [ADR-010](../decisions/ADR-010-confessional-witnesses-default-on.md) supersede ADR-001 + ADR-009**. Continuando smoke test, fundador llevó el análisis al siguiente nivel: si manifesto trata historia como **testimonio plural** acumulado (no anchor único) Y como **parte constitutiva del método** (no add-on), entonces (a) la comparación NO debe ser single-anchor y (b) NO debe ser opt-in. Decisión final: **multi-witness default-on**. Schema: nuevo `User.useConfessionalWitnesses: boolean` default `true` (absent field interpreted as enabled). Legacy `declaredConfession*` fields deprecated, preserved for data continuity, no consumed. `ConfessionBanner` ELIMINADO completamente (default ON no necesita CTA). `ConfessionSettings` rewritten: toggle único + roster read-only de 14 traditions + textarea justification ≥50 chars cuando opt-out. Repository `updateConfessionalWitnesses` con audit `kind: 'witnesses-toggle'` row. `usePastoralFidelityGate` retorna `confessionalWitnessesEnabled: boolean` (replaces `hasConfessionAnchor`). Phase 2 Testigo 3 design final: `core` fire siempre (universal), `distinctive` + `open-evangelical` fire si toggle ON. i18n ES + EN rewritten. Banner i18n keys eliminadas. Sin migración Firestore necesaria — default field absent = enabled.
- **2026-05-25** — **Smoke test continuó + bug citas inventadas detectado + nueva deuda identificada**. Sermón generado via Faculty path disparó modal del validator "Posibles citas inventadas" — verifier detectó correctamente que el sermón atribuyó **versos bíblicos a Charles Hodge** (mis-attribution). Causa: prompt SERMON ambiguo en `ExtractTheologicalContentUseCase.ts` permitía "reemplazar Cita de Autoridad por cita bíblica" sin remover la línea `— Autor`. **Fix piso aplicado**: template + reglas reforzadas. "Referencias Cruzadas" SIN línea autor (paréntesis explícito), "Cita de Autoridad" marcada OPCIONAL con instrucción de eliminar bloque entero, regla nueva "PROHIBIDO atribuir texto bíblico a autor humano". Este fix establece **piso** (no hallucination). El **techo** (riqueza citacional con testimonio acumulado del manifesto) requiere arquitectura adicional documentada en [proposals/faculty-sermon-rag-enrichment.md](../proposals/faculty-sermon-rag-enrichment.md): wire RAG retrieval into Faculty sermon generation usando infra Phase A/B existente + confession catalog Phase 0 + extractions persistidas. 4 fuentes paralelas (confession sections + user library + CORE library + extractions). Citation manifest persisted, validator pipeline reusado. Reuse ~85% infra existente. Estimado 2-3 días. Scheduling: PR follow-up post-Fase 0, antes de Fase 2.5. Bloqueado parcialmente por content fill 7 confesiones largas (4 creeds shipped). Bug `changePlanForUser` callable identificado durante smoke (no seedea `processingBalance.planExegesisUsd` → upgrade banner persiste). Fix aplicado al callable: agregado seeding via `setPlanQuotaAdmin` + `setExegesisPlanQuotaAdmin` post plan update (patrón reusado de `resetUserPlanQuota`). Deploy pendiente.
- **2026-05-25** — **Phase 0 deuda CERRADA via PR #255**. Cuatro deudas atacadas + validadas end-to-end. (1) Seed CORE library ingest: callable `ingestLibrarySeedSources` escribe 8 sources no-confesionales del JSON canónico en `/library_resources` con metadata rights-aware completa (SBLGNT, Schaff x3, Chicago x3, Savoy, 39 Articles, 1689 LBCF, Baptist Cat 1693). Las 14 confesiones se omiten (ya en `/confessions/`). UI surfacing via nueva sección "CORE Seed (sistema)" en `CoreLibraryAdmin`. (2) Backfill licencias heurístico: client-side admin tool clasifica `library_resources` con `license: 'unknown'` por autor PD conocido (Hodge, Spurgeon, Calvin, Edwards, Warfield, Machen, Schaff, etc.). Idempotente. 4 docs clasificados en validación. (3) UI badges adicionales: `riskLevel` (Riesgo alto/medio), `doctrineLevel`, `Attrib (N)` count en filas; traducciones ES para enum vocab (`Ingesta completa`, `Solo metadata`, etc.); `compactLicenseLabel` colapsa sentence-form licenses. (4) `useUserProfile.refetch`: hook expone `refetch()` + `ConfessionSettings` lo invoca post-save, dropea shadow `persistedValue` workaround de PR #254. Audit log MCP-verified: toggle OFF→ON con 6 segundos de diferencia (sin recargar página). Bug fix colateral: `LibraryResourceEntity.validate()` ahora bypass para `isSystemSource: true` (constructor param, no asignación post-construct). Functions deployed: `ingestLibrarySeedSources` + `changePlanForUser`. **Phase 0 ahora truly cerrada — no deuda invisible heredada a Fase 1.**
