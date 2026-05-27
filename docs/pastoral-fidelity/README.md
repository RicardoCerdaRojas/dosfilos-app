# Pastoral Fidelity Initiative

Reforma del módulo de generación de sermones (y artefactos derivados) para alinearlo con un único propósito: **formar predicadores fieles, no producir sermones sintéticos**.

> "Esdras dispuso su corazón para inquirir la ley de Yahweh, y para hacerla, y para enseñarla." — Esdras 7:10

## Por qué existe esta iniciativa

El motor de generación de sermones actual produce contenido de alta calidad superficial (con motor de citas verificadas, exégesis estructurada y export profesional), pero el aporte real del pastor al output final es típicamente 10–30%. El producto opera como fábrica de sermones, no como plataforma de formación.

Esta iniciativa invierte ese flujo: **el pastor estudia primero, el sistema desarrolla bajo su dirección, y la fidelidad bíblica se valida por tres testigos antes de permitir publicar**.

Análisis fundacional: ver [00-vision.md](./00-vision.md).

## Estado actual

| Fase | Nombre | Estado | Doc |
|------|--------|--------|-----|
| 0 | Foundations (onboarding confesional + arquitectura) | `completed` | [phase-0-foundations.md](./phases/phase-0-foundations.md) |
| 1 | Six-step spine como Step 1 del wizard | `completed` | [phase-1-six-step-spine.md](./phases/phase-1-six-step-spine.md) |
| 1.5 | Pastoral Word Study (módulo separado de language tutors) | `completed` | [phase-1-5-pastoral-word-study.md](./phases/phase-1-5-pastoral-word-study.md) |
| 2 | Tres testigos para validar semilla pastoral | `planning` | [phase-2-three-witnesses.md](./phases/phase-2-three-witnesses.md) |
| 2.5 | Study Depth Copilot (gate Faculty + medición multidimensional) | `planning` | [phase-2-5-study-depth-copilot.md](./phases/phase-2-5-study-depth-copilot.md) |
| 3 | Pass de fidelidad claim↔source en borrador | `planning` | [phase-3-claim-source-fidelity.md](./phases/phase-3-claim-source-fidelity.md) |
| 4 | Indicador de autoría + contra-scan + voice fingerprint | `planning` | [phase-4-authorship-contrascan-voice.md](./phases/phase-4-authorship-contrascan-voice.md) |
| 5 | Proyecto como contenedor + artefactos derivados | `planning` | [phase-5-project-as-container.md](./phases/phase-5-project-as-container.md) |
| 6 | Planner como runway de formación | `planning` | [phase-6-planner-runway.md](./phases/phase-6-planner-runway.md) |
| 7 | Exégesis reform (mismo marco aplicado al paper académico) | `planning` | [phase-7-exegesis-reform.md](./phases/phase-7-exegesis-reform.md) |

**Última actualización**: 2026-05-27 — **Phase 1.5 CERRADA**. Branch `feat/pastoral-fidelity-phase-1-5` ship: 6 PRs (PR0 docs + PR1 modal/identify + PR5 curated dataset + PR2 analysis/cache + PR3 persist/Hebrew + PR4 naming/attribution). `PastoralWordStudyModal` reemplaza `GreekTutorOverlay` embed cuando sub-flag `pastoral_word_study` on. ADRs 017-021 accepted. `aggregateLexiconAttributions` + 50-entry curated lexicon v1 (30 griego + 20 hebreo). 269 tests passing. Phase 1 CERRADA con deuda interim explícita previamente: Single PR `feat(pastoral-fidelity): Phase 1 — six-step spine` (#257). Entrega: schema top-level `pastoralSeeds/{seedId}` (ADR-015) + `PastoralSeedWizard` orquestador + 6 step components (Lectura/Sintaxis/Morfología/Reconocimiento/Función/Insight) + Greek tutor embed (interim) + Hebrew link-out + cross-ref engine integration + Faculty histórico link + AI-forbidden Step 6 con paste audit + gate hard en SermonWizard + `PRIMARY VOICE` prompt block + verbatim post-gen check + `PastoralSeedAuditPanel` inline en sermón detail + admin `PastoralSeedInspector` + UI audit kill-list Cat 1+4. Feature-flagged (`pastoral_fidelity_flow` off por default). 363 tests passing total (264+38+61). **Nueva Fase 1.5 Pastoral Word Study** insertada (ADR-016) — MorphologyStep actualmente embed `GreekTutorOverlay` (módulo académico) viola manifesto "sin convertir la clase en lección de idiomas"; Fase 1.5 reemplazará con `PastoralWordStudyModal` enfocado en uso pastoral. Anterior (Phase 0 recierre, 2026-05-25): cerrada con deuda 0 — PRs #252 + #253 + #254 + #255 — seed CORE ingest + backfill heurístico + UI badges + `useUserProfile.refetch()`; Smoke 1-8 + Deuda 1-4 validated end-to-end via MCP; `confessionChangeAudit/` populated; callables `ingestLibrarySeedSources` + `changePlanForUser` deployed. **Fase 2.5 Study Depth Copilot** sigue planificada entre Fase 2 y 3. Propuestas tracked: [faculty-sermon-rag-enrichment.md](./proposals/faculty-sermon-rag-enrichment.md) (techo citacional Faculty) + [pdf-export-rewrite.md](./proposals/pdf-export-rewrite.md) (Puppeteer migration).

## Protocolo de sesión

**Una conversación por fase** es la unidad recomendada. Sub-tareas (PRs) de la misma fase comparten conversación.

### Apertura

**Modo rápido**: en nueva conversación escribir `/iniciar-fase N` (donde N es el número de fase). Ejemplo: `/iniciar-fase 0`. El slash command vive en `.claude/commands/iniciar-fase.md` y ejecuta el protocolo completo.

Alternativa (si slash command no disponible): copia-pega manual de la plantilla en [SESSION_KICKOFF.md](./SESSION_KICKOFF.md).

Ambos modos producen lo mismo:
- Lista ordenada de docs a leer (README + phase doc + ADRs + manifesto + bridges)
- Output esperado del agente antes de escribir código (resumen + plan PRs + preguntas + discrepancias)
- Adaptaciones por fase

### Durante

- Decisión técnica significativa → ADR inmediato (no esperar al cierre)
- Cambio al plan → update del phase doc en tiempo real (sección `Bitácora`)
- Sub-tareas con TodoWrite intra-sesión

### Cierre de fase

**Modo rápido**: en la conversación de la fase escribir `/cerrar-fase N`. Ejemplo: `/cerrar-fase 0`. El slash command vive en `.claude/commands/cerrar-fase.md`.

Alternativa: ejecutar manualmente el protocolo de [PHASE_CLOSEOUT.md](./PHASE_CLOSEOUT.md). 5 bloques en orden:

1. **Verificación de cierre real** (tests, criterios de aceptación, no deferrals encubiertos)
2. **Actualización de documentación** (phase doc + README + memoria + ADRs + session log)
3. **Handoff a siguiente fase** (prereqs satisfechos/no, update del próximo phase doc, riesgos cross-fase)
4. **Retrospective** (qué mejor/peor de lo estimado, qué cambió, aprendizajes)
5. **Sanity check final** (git limpio, CI verde, onboarding test mental)

Sin closeout disciplinado, la siguiente fase onboarda con contexto incompleto y deuda invisible.

## Mapa del folder

```
docs/pastoral-fidelity/
├── README.md                  ← este archivo (índice + estado)
├── SESSION_KICKOFF.md         ← plantilla para abrir nueva conversación de fase
├── PHASE_CLOSEOUT.md          ← protocolo para cerrar fase + handoff a siguiente
├── 00-vision.md               ← marco bíblico fundacional
├── 01-architecture.md         ← proyecto→artefactos + 6 pasos + tres testigos
├── 02-glossary.md             ← términos del proyecto
├── 03-reuse-map.md            ← infra existente → nuevo rol
├── 04-kill-list.md            ← qué deprecar y cuándo
├── 05-pedagogy-manifesto.md   ← manifiesto pedagógico del fundador (canónico)
├── 06-pedagogy-applied.md     ← bridge: manifiesto → componentes Preach (spec)
├── 07-citation-policy.md      ← política rights-aware del citation engine (spec)
├── data/
│   └── core-library-seed.json ← catálogo CORE Library (22 fuentes, semilla)
├── decisions/                 ← ADRs append-only (nunca editar pasado)
│   ├── ADR-template.md
│   ├── ADR-001-confession-anchored-correction.md
│   ├── ADR-002-six-step-as-step1-spine.md
│   ├── ADR-003-project-as-root-unit.md
│   ├── ADR-004-defer-exegesis-reform-decouple-sermon-from-paper.md
│   ├── ADR-005-exegetical-confessional-pedagogy.md
│   ├── ADR-006-rights-aware-citation-system.md
│   ├── ADR-007-phase-0-policy-resolutions.md
│   └── ADR-008-cross-reference-engine-tsk-based.md
├── phases/
│   ├── phase-0-foundations.md            ← DETALLE
│   ├── phase-1-six-step-spine.md         ← DETALLE
│   ├── phase-2-three-witnesses.md        ← placeholder
│   ├── phase-3-claim-source-fidelity.md  ← placeholder
│   ├── phase-4-authorship-contrascan-voice.md ← placeholder
│   ├── phase-5-project-as-container.md   ← placeholder
│   ├── phase-6-planner-runway.md         ← placeholder
│   └── phase-7-exegesis-reform.md        ← placeholder
└── sessions/                  ← logs de cierre (opcional, append-only)
    └── 2026-05-22-strategy.md ← kickoff
```

## Decisiones de diseño centrales

1. **Inversión del flujo** — pastor produce semilla antes que sistema genere. Wizard se bloquea hasta cumplir.
2. **Socratismo bíblico anclado en tres testigos** — contexto inmediato, paralelos canónicos, confesión declarada del propio pastor.
3. **Proyecto como unidad raíz** — sermón, estudio, newsletter, post, lección son artefactos derivados de un proyecto.
4. **Pedagogía exegético-confesional** — modelo operacional adoptado del manifiesto del fundador. 9 pasos del patrón exegético + 4 patrones por tipo de contenido + 3 niveles de doctrina (core/distinctive/open). Ver [05-pedagogy-manifesto.md](./05-pedagogy-manifesto.md) y [06-pedagogy-applied.md](./06-pedagogy-applied.md).
5. **Citation engine rights-aware** — dos ejes (`ingestion_status` × `license`) + display contextual + JSON canónico CORE Library con 22 fuentes (subset 14 v1). Ver [07-citation-policy.md](./07-citation-policy.md) y [ADR-006](./decisions/ADR-006-rights-aware-citation-system.md).
6. **Reuso, no rebuild** — ~70% de la infraestructura existente se reorquesta; lo nuevo es coordinación pastoral.

Detalle en [01-architecture.md](./01-architecture.md).

## Lo que NO entra aquí

- Código (va en `src/`)
- Schemas canónicos de Firestore (van en código + sus propios docs)
- Tareas operativas intra-sesión (TodoWrite)
- Marketing copy / pricing final (vive en su propio dominio)

## Memorias relacionadas

- `feature_pastoral_fidelity_roadmap.md` — pointer maestro
- `priorities_repositioning.md` — sermón como output derivado, no producto principal
- `feature_greek_tutor_methodology_narrative.md` — 6 pasos preservados para reuso (ahora se reusan aquí)
- `feature_exegesis_paper_artifacts_convergence.md` — patrón paper→artefactos (escalado a proyecto→artefactos)
- `feature_sermon_pipeline_convergence.md` — PR #213, base del wizard convergente
- `feature_faculty_sermon_wizard_convergence.md` — PR #214, derivedContext discriminated union
