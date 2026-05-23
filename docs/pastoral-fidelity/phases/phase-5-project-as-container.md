# Phase 5 — Proyecto como contenedor + artefactos derivados

## Estado

`planning` — placeholder. Detalle se completa al cierre de Fase 4.

## Objetivo

Refactor arquitectónico mayor: introducir `Project` como unidad raíz. Migrar sermones, papers (paralelo a Fase 7), y otros artefactos a derivarse de un proyecto. Implementar UI de proyecto con sección "Artefactos derivados" que permite generar múltiples piezas desde la misma semilla.

Esto es el punto donde la coherencia de voz entre artefactos del mismo pastor sobre el mismo pasaje se vuelve arquitectónica, no aspiracional.

## Prerequisitos

- Fases 1-4 completas (seed + tres testigos + fidelity + autoría funcionan sobre `Project` ya desde su definición en Fase 0)
- Decisión de pricing model para "por proyecto" vs "por output" (decisión de negocio paralela)

## Decisiones tomadas

- [ADR-003](../decisions/ADR-003-project-as-root-unit.md) — Project como unidad raíz
- [ADR-004](../decisions/ADR-004-defer-exegesis-reform-decouple-sermon-from-paper.md) — sermón se desacopla de paper
- [ADR-005](../decisions/ADR-005-exegetical-confessional-pedagogy.md) — cada `ArtifactType` tiene `pedagogyPattern` asociado
- [ADR-006](../decisions/ADR-006-rights-aware-citation-system.md) — cada `ArtifactType` tiene `citationStyle` asociado (sermon, bible_study, essay_or_article, rag_answer, modern_statement_warning). Mapeo en [07-citation-policy § Mapeo](../07-citation-policy.md#mapeo-artifacttype--citationstyle).

## Decisiones pendientes (TBD al iniciar fase)

- Estrategia de migración para users existentes (dual-write window length)
- Naming convention para `Project` en UI (en español): "Proyecto pastoral", "Proyecto", "Estudio"
- Default artefactos a proponer al crear proyecto
- Pricing: ¿cuota por proyecto o por artefacto generado?

## Arquitectura propuesta (alto nivel)

Ver [ADR-003](../decisions/ADR-003-project-as-root-unit.md) para schema completo.

### Tipos de artefacto derivado v1

1. Sermón
2. Estudio bíblico (versión expandida con preguntas)
3. Newsletter (resumen pastoral semanal)
4. Post de blog (versión laica del estudio)
5. Lección de escuela dominical
6. Carta pastoral (carta personal al rebaño sobre el tema)
7. Devocional (versión corta para social media o app móvil)

Cada artefacto:
- Comparte el `pastoralSeed` del proyecto
- Tiene su propio prompt template adaptado al **`pedagogyPattern`** (ADR-005)
- Tiene su propio **`citationStyle`** asociado (ADR-006/07-citation-policy)
- Mantiene `derivedContext: { kind: 'project', projectId, sectionId? }`
- Pasa por fidelity pass propio (incluyendo plurality + attribution + authority checks de ADR-006)
- Tiene su propia track de autoría verbatim

### Schema `ArtifactTypeConfig`

```typescript
interface ArtifactTypeConfig {
  type: ArtifactType;
  defaultPattern: PedagogyPattern;       // ADR-005
  allowedPatterns: PedagogyPattern[];     // user can override within set
  citationStyle: CitationStyle;            // ADR-006 (sermon | bible_study | essay_or_article | rag_answer)
  promptTemplate: PromptTemplate;          // per pattern
  requiredSections: SectionRequirement[];  // e.g. exegetical pattern requires "doxological closure"
}
```

Mapeo completo `ArtifactType → pedagogyPattern + citationStyle` en [06-pedagogy-applied § 2](../06-pedagogy-applied.md#2-los-4-patrones--tipos-de-artefacto-derivado) y [07-citation-policy § 4](../07-citation-policy.md#4-citation-rendering-per-context).

## Reuso identificado

- PR #211 paper→artifacts pattern
- PR #213 sermon pipeline convergence
- PR #214 derivedContext discriminated union (extender con `project`)
- Editores existentes de cada tipo de artefacto
- Export pipeline (PDF, Word, etc.)

## Detalle TBD

- Schema final de migration
- Backfill strategy
- Pricing model alignment
- UI del project dashboard

## Bitácora

- **2026-05-22** — Placeholder creado.
