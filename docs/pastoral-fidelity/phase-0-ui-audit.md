# Phase 0 — UI Audit

Inventario de surfaces actuales del codebase que **violan los principios no-negociables** del manifesto pedagógico ([05-pedagogy-manifesto.md](./05-pedagogy-manifesto.md), ADR-005). Insumo directo para la kill-list de Fase 1+5 y el reposicionamiento del producto.

**Fecha del barrido**: 2026-05-23

**Criterio**:

- **HIGH** — viola P1 (labor antes que output) / P2 (AI desarrolla, no origina) / P3 (confrontación obligatoria) directamente.
- **MEDIUM** — friction-reducing en surface pastoral; degrada el método sin violarlo frontalmente.
- **LOW** — copy ambiguity o deuda arquitectónica forward (permite violación futura sin acción inmediata).

## Resumen

12 hallazgos: 5 HIGH, 5 MEDIUM, 2 LOW.

| # | Categoría | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| 1 | Auto-generación sin decisión pastoral | 1 | 1 | 0 |
| 2 | Métricas de éxito basadas en velocidad/count | 1 | 3 | 0 |
| 3 | Copy con velocidad como métrica de valor | 1 | 2 | 0 |
| 4 | Campos pastorales pre-completados por LLM | 0 | 0 | 1 |
| 5 | Botones "saltar análisis" | 0 | 0 | 1 |
| 6 | CTAs a sermon generation standalone | 2 | 0 | 0 |

## Hallazgos

### Categoría 1 — Auto-generación silenciosa sin decisión pastoral

Violación directa de **P1 (labor antes que output)** y **P2 (AI desarrolla, no origina)**.

| Severidad | Path | Descripción |
|---|---|---|
| **HIGH** | [packages/web/src/pages/sermons/generator/StepHomiletics.tsx:88](../../packages/web/src/pages/sermons/generator/StepHomiletics.tsx#L88) | `hasAttempted` state auto-dispara `handleGenerate()` cuando exégesis existe pero homiletics no. Pastor llega al step y el sistema ya generó opciones antes de reflexionar. |
| **MEDIUM** | [packages/web/src/pages/sermons/generator/StepHomiletics.tsx:53-55](../../packages/web/src/pages/sermons/generator/StepHomiletics.tsx#L53-L55) | `currentSubStep` predetermina `APPROACH_SELECTION` o `PROPOSITION_DEVELOPMENT` automáticamente. UI decide flow para el pastor en lugar de ofrecer elección. |

**Acción Fase 1**: gate explícito antes de generar — pastor debe completar seed observacional (six-step spine) antes que `handleGenerate()` pueda dispararse.

### Categoría 2 — Métricas de éxito basadas en velocidad/count

Violación directa de **P1**: el sistema premia output rápido, no labor profunda.

| Severidad | Path | Descripción |
|---|---|---|
| **HIGH** | [packages/web/src/utils/engagementScore.ts:95-102](../../packages/web/src/utils/engagementScore.ts#L95-L102) | `calculateSermonCreationScore(sermonsCreated)`: 0→30 puntos indexado por cantidad de sermones. Ignora profundidad de estudio. |
| **MEDIUM** | [packages/web/src/utils/engagementScore.ts:120-130](../../packages/web/src/utils/engagementScore.ts#L120-L130) | `calculateConsistencyScore` premia `loginCount >= 10 AND sermonsCreated >= 5`. Confunde producción con fidelidad. |
| **MEDIUM** | [packages/web/src/hooks/admin/useAllUsers.ts:107-109](../../packages/web/src/hooks/admin/useAllUsers.ts#L107-L109) | Tabla admin ordena por `engagementScore` por default. |
| **MEDIUM** | [packages/web/src/pages/admin/UserManagement.tsx:59,225,431](../../packages/web/src/pages/admin/UserManagement.tsx#L59) | UserManagement expone `engagementScore` como sortable column + metric badge. |
| **MEDIUM** | [packages/domain/src/entities/User.ts:22-42](../../packages/domain/src/entities/User.ts#L22-L42) | `UserAnalytics` schema lista `sermonsCreated` + `sermonsGenerated` + `firstAIGenerationAt` como métricas first-class. |

**Acción Fase 5+**: reemplazar `engagementScore` (production-based) con `studyDepthScore` (seed completeness + three-witnesses pass rate + contra-scan engagement). Métricas que aplican el manifesto al producto, no opuestas.

### Categoría 3 — Copy con velocidad como métrica de valor

Violación de **P1** en marketing/onboarding copy. El pastor llega esperando velocidad cuando el producto debe formar labor.

| Severidad | Path | Descripción |
|---|---|---|
| **HIGH** | [packages/web/src/pages/landing/sections/HowItWorks.tsx:32](../../packages/web/src/pages/landing/sections/HowItWorks.tsx#L32) | Headline: "Empieza en minutos, úsalo durante años." Velocidad como selling point principal. |
| **MEDIUM** | [packages/web/src/i18n/locales/es/landing.json:40-42](../../packages/web/src/i18n/locales/es/landing.json#L40-L42) | Hero metric: "Horas ahorradas por sermón: 5+". Posiciona valor como ahorro de tiempo. |
| **MEDIUM** | [packages/web/src/i18n/locales/es/landing.json:94](../../packages/web/src/i18n/locales/es/landing.json#L94) | Transformation section: "Con DosFilos: 3-5 horas" vs "Sin DosFilos: 8-12 horas". Speed-focused value prop. |

**Acción Fase 5+**: reescritura de landing copy. Sustituir métricas de tiempo-ahorrado por métricas de profundidad-lograda. Hero copy debe afirmar formación, no velocidad.

### Categoría 4 — Campos pastorales pre-completados por LLM

Riesgo arquitectónico forward — habilita violación futura sin acción inmediata.

| Severidad | Path | Descripción |
|---|---|---|
| **LOW** | [packages/application/src/use-cases/exegesis/paperToWizardProgress.ts:144,156](../../packages/application/src/use-cases/exegesis/paperToWizardProgress.ts#L144) | Mapper `paperToWizardProgress` llena `contemporaryApplication: []` (vacío hoy). Campo existe en domain — arquitectura permite prefill LLM futuro sin cambio UI. |

**Acción Fase 1**: documentar en schema `PastoralSeed` qué campos son **AI-forbidden** (no se permite suggestion: `centralIdea`, `doxologicalApplication`, `contemporaryApplication`, etc.) y enforcer en prompt builder + audit `pasteEvents`.

### Categoría 5 — Botones "saltar análisis"

No se detectaron botones explícitos de skip. Una mención ambigua en copy:

| Severidad | Path | Descripción |
|---|---|---|
| **LOW** | [packages/web/src/pages/landing/sections/UseCases.tsx:29](../../packages/web/src/pages/landing/sections/UseCases.tsx#L29) | Marketing copy: "Sermón expositivo del domingo, sin saltarse pasos." Afirmación positiva, pero su sola mención sugiere que podría hacerlo. |

**Acción Fase 5+**: revisar copy en próximo rewrite de landing.

### Categoría 6 — CTAs a generación de sermón standalone

Violación de **memoria `priorities_repositioning`**: sermón = output derivado, no producto principal.

| Severidad | Path | Descripción |
|---|---|---|
| **HIGH** | [packages/web/src/pages/sermons.tsx:149,154](../../packages/web/src/pages/sermons.tsx#L149) | Dropdown items navegan a `/dashboard/sermons/tutor` y `/dashboard/sermons/new` sin pipeline exegético. |
| **HIGH** | [packages/web/src/pages/projects/projectRoadmaps.ts:100,233](../../packages/web/src/pages/projects/projectRoadmaps.ts#L100) | `ProjectRoadmaps` define milestone CTA `{ label: 'Generar sermón', kind: 'sermon' }` sin exégesis previa. |

**Acción Fase 5+**: ambas surfaces deben re-rutarse al flow Project → Exégesis → Sermón derivado. Wizard standalone permanece accesible (admin + URL directa) pero sale de CTAs orgánicos.

---

## Mapeo a kill-list por fase

### Fase 1 (Six-step spine) — bloquea pre-generation

- Categoría 1 (StepHomiletics auto-generate): gate detrás de `pastoralSeed.completedAt`
- Categoría 4 (paperToWizardProgress prefill risk): docstring + lint rule sobre fields AI-forbidden

### Fase 4 (Contra-scan + authorship) — métricas que premian labor

- Categoría 2: nueva métrica `studyDepthScore` reemplaza `engagementScore`
- Schema `UserAnalytics` extendido con `seedCompletionRate`, `threeWitnessesPassRate`, `contraScanEngagement`

### Fase 5 (Project como container) — re-rutar standalone

- Categoría 6: CTAs orgánicos sólo desde Project flow. Wizard standalone fuera de menus principales.

### Post-launch (paralelo a Fase 1+5) — landing rewrite

- Categoría 3: hero + transformation section re-escritura
- Categoría 5: ambigüedad en UseCases removida

---

## Referencias

- Phase doc: [phase-0-foundations.md](./phases/phase-0-foundations.md)
- Manifesto: [05-pedagogy-manifesto.md](./05-pedagogy-manifesto.md)
- Bridge operacional: [06-pedagogy-applied.md](./06-pedagogy-applied.md)
- Memorias relacionadas: `priorities_repositioning`, `feature_pastoral_fidelity_roadmap`
