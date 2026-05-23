# ADR-006 — Rights-aware citation system + adopción del JSON canónico de fuentes CORE

## Estado

`accepted`

## Fecha

2026-05-22

## Contexto

El motor actual de citas (Fases B + C del citation engine, branch `feat/phase-c1-export-with-citations`) resuelve **identidad** de cita (el `[N]` mapea a un chunk validado existente en la biblioteca) pero NO resuelve tres problemas:

1. **Atribución legal correcta**: licencias como CC BY 4.0 requieren atribución específica (autor + título + license + URL + cambios). Hoy esto no se honra formalmente. Riesgo legal pequeño pero real (SBLGNT es CC BY 4.0).
2. **Display contextual**: misma cita renderizada igual en sermón, estudio bíblico, blog post, RAG. Cada contexto exige un estilo distinto.
3. **Material moderno copyright**: Chicago Statement (1978/1982/1986) no puede ingestarse en full pero hoy el sistema no distingue entre "ingerible full" e "ingerible solo metadata + summary interno".

Paralelo a esto, el fundador requiere (Q5 de Phase 0) un catálogo CORE Library con: Westminster (WCF + WSC + WLC), 1689, Heidelberg, Dort, Belgic, Augsburg, 39 Articles, Savoy, credos antiguos (Apostólico, Nicea, Atanasiano, Calcedonia) y Chicago 1978.

El JSON propuesto ([data/core-library-seed.json](../data/core-library-seed.json)) provee 22 fuentes con metadata legal completa, citation templates por contexto, política de autoridad explícita (Escritura sobre confesiones), y reglas de uso para material moderno. Coincide y excede los requisitos de Q5.

## Decisión

Se adopta el **JSON canónico de fuentes CORE Library** como semilla del catálogo de fuentes confesionales y biblias críticas. Se introduce un **sistema de citas rights-aware** basado en dos ejes (`ingestion_status` × `license`) y display contextual (`citationStyle` por `ArtifactType`).

Adopciones concretas:

1. **JSON guardado como dato canónico** en `docs/pastoral-fidelity/data/core-library-seed.json` (versionado in-repo). Este JSON es source of truth para el catálogo CORE.

2. **Subset v1 priorizado para launch**: 14 fuentes de las 22 (todas `approved_full_ingestion` sin special handling significativo):
   - Schaff Creeds Vols I, II, III
   - Apóstoles, Nicea, Atanasiano, Calcedonia
   - Westminster (WCF, WSC, WLC)
   - Belgic, Heidelberg, Dort
   - Augsburg, 39 Articles, Savoy
   - SBLGNT (con required attribution CC BY 4.0)

3. **Diferidas a post-launch (8 fuentes)**:
   - 1689 LBCF + Baptist Catechism (special handling: revisar appendices del edition de Chapel Library)
   - 3 Chicago Statements (requieren proceso legal cuidadoso para metadata-only + summary interno)

4. **Schema extensions** al `Source` y `Chunk` del citation engine:
   - Agregar campos: `license`, `licenseUrl`, `ingestionStatus`, `riskLevel`, `requiredAttribution`, `citation: CitationTemplates`, `specialHandling`, `copyrightNotice`
   - Citation rendering pasa de hardcoded a function `renderCitation(chunk, source, context)`

5. **Citation styles por contexto** (mapeo del JSON):
   - `sermon` (pastoral, fluido)
   - `bible_study` (document + section)
   - `essay_or_article` (footnote + bibliografía)
   - `rag_answer` (transparent label + subordination note)
   - `modern_statement_warning` (override cuando `ingestionStatus = approved_metadata_only`)

6. **Mapeo `ArtifactType` → `citationStyle`** vive en `06-pedagogy-applied.md` y se instancia en código en Fase 5.

7. **Required attribution renderer**: por artefacto, sistema computa lista de atribuciones obligatorias e injecta en export pipeline (PDF, Word, web).

8. **Política de autoridad** del JSON adoptada literal: "Never cite a confession, creed, catechism, or modern statement as the final authority over a biblical passage. Use it as historical, theological, or confessional support." Implementación:
   - Render `rag_answer` añade nota "Historical confessional reference subordinate to Scripture."
   - Faculty prompts incluyen instrucción explícita
   - Validador detecta y flagea cuando el sermón cita confesional como autoridad final (fidelity pass extension)

9. **No-proof-texting validator**: para claims marcados doctrina sustantiva, validador verifica ≥2 pasajes bíblicos distintos en su soporte (no solo confesional). Esto cierra el compromiso del manifesto.

10. **Política de traducción**: ingest en inglés (canónico); generar traducciones internas marcadas como tales cuando se necesite render en español.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Mantener motor de citas actual (solo identidad)** | No resuelve gap legal (CC BY no honrado), no diferencia por contexto, no maneja material moderno copyright. Insuficiente para iniciativa Pastoral Fidelity. |
| **Adoptar todas las 22 fuentes del JSON en v1** | 3 Chicago + 1689 + Baptist Catechism requieren revisión legal y/o de edición específica. Bloqueante de launch. Subset 14 es defendible. |
| **Construir catálogo CORE desde cero** | Re-invention. El JSON ya tiene 22 fuentes con metadata completa, citation templates, política de autoridad. ~5-7 días ahorrados. |
| **Solo flag binario "puede citar"** (statu quo extendido) | No distingue ingerible vs metadata-only. No honra licencias específicas. Insuficiente. |
| **Externalizar citation engine** (librería externa tipo Citation.js, RIS, BibTeX) | Estos sistemas no entienden RAG ni licencias de ingesta. Complementarios, no sustitutos. |
| **Citation style único, no per-context** | Pierde la oportunidad de diferenciar sermón vs essay. Manifiesto ya distingue 4 patrones; citation engine debe acompañar. |
| **Diferir la reforma del citation engine hasta Fase 7** | Esa fase es exégesis. Pero esta política aplica desde Fase 0 (CORE Library) y Fase 3 (fidelity pass). No es diferible. |

## Consecuencias

### Positivas

- **Catálogo CORE Library resuelto para v1** (Q5 cerrada via adopción del JSON).
- **Compliance legal real** con licencias CC BY (SBLGNT) y modern statements (Chicago) sin riesgo.
- **Coherencia con manifesto**: política de autoridad subordinada a Escritura es ahora operacional, no aspiracional.
- **Coherencia con Fase 5**: cada artifact tendrá su citation style natural sin hacks ad-hoc.
- **Audit defendible**: para cada artefacto exportado, podemos producir un reporte de atribuciones cumplidas, fuentes usadas, licencias respetadas.
- **Reuso ~85%** del citation engine actual (cambios aditivos, no rewrites).
- **Diferenciador de mercado**: ningún competidor articula política de citas rights-aware con esta granularidad.

### Negativas

- **Trabajo de ingesta CORE**: 14 fuentes en v1 requiere ~5-10 días (parsing PDFs/HTML, chunking por sección/Q&A, validación, tagging doctrineLevel).
- **Migración de chunks legacy**: pastor con biblioteca existente recibe defaults conservadores (`requires_manual_review`). Necesita UX para tagger sus propias fuentes.
- **Diferimiento de Chicago a post-launch**: pastores que esperaban citar Chicago directamente deben usar URL externa por ahora.
- **Carga ongoing de mantenimiento**: catálogo CORE crece, citation templates evolucionan.
- **Override de attribution no permitido**: pastor que no quiera mostrar atribución SBLGNT en su sermón no puede. Mitigación: render compacto pero presente.

### Neutrales

- Catálogo de licencias soportadas es extensible. Empezamos con PD + CC BY 4.0 + All rights reserved + Internally created. Agregar más cuando se necesite.
- Traducciones internas etiquetadas explícitamente — cambio menor de UX, no de modelo.

## Impacto

- **Código afectado**:
  - Citation engine actual: `Source` schema, `Chunk` schema, render functions, export pipeline
  - Nueva utility `renderCitation(chunk, source, context)`
  - Nueva utility `aggregateAttributions(artifact)` para export
  - Validator de identity → extender con plurality check (no-proof-texting)
  - Faculty prompts updated con authority subordination clause
  - Library admin (CoreLibraryAdmin): visualización + edición de los nuevos campos
- **Fases impactadas**:
  - **Fase 0**: ingesta de las 14 fuentes CORE + schema migration + Q5 cerrada
  - **Fase 3**: fidelity pass extends con attribution validator + no-proof-texting validator + authority subordination check
  - **Fase 5**: `ArtifactType` definitions incluyen `citationStyle` mapping
  - **Fase 7**: exégesis reform usa essay-style citations directamente
- **Migraciones requeridas**:
  - Source schema extension (aditivo, backwards compatible)
  - Chunk schema mínimamente extendido
  - Per-user library: backfill conservador (defaults a `requires_manual_review` para legacy)
  - 14 fuentes CORE ingestadas desde JSON seed
- **Reversibilidad**: media-alta — todos los cambios son aditivos. Citation engine actual sigue funcionando sin los nuevos campos (default behavior). Reverter individual fuente del CORE es trivial.

## Subset v1 — entrega de Fase 0

14 fuentes a ingestar:

| # | Source | License | Notes |
|---|---|---|---|
| 1 | Schaff Creeds Vol. I | PD | Historical reference |
| 2 | Schaff Creeds Vol. II | PD | Greek/Latin creeds |
| 3 | Schaff Creeds Vol. III | PD | Protestant creeds |
| 4 | Apostles' Creed | PD | Core ecumenical |
| 5 | Nicene Creed (325/381) | PD | Core ecumenical |
| 6 | Athanasian Creed | PD | Ancient Western |
| 7 | Definition of Chalcedon (451) | PD | Core ecumenical |
| 8 | Westminster Confession (1646) | PD | |
| 9 | Westminster Shorter Catechism (1647) | PD | |
| 10 | Westminster Larger Catechism (1647) | PD | |
| 11 | Belgic Confession (1561) | PD | |
| 12 | Heidelberg Catechism (1563) | PD | |
| 13 | Canons of Dort (1619) | PD | |
| 14 | Augsburg Confession (1530) | PD | |
| (15) | 39 Articles (1571) | PD | Si tiempo permite (CCEL edition) |
| (16) | Savoy Declaration (1658) | PD | Si tiempo permite |
| (17) | SBLGNT (2010) | CC BY 4.0 | Required attribution — ya parcialmente integrado |

Diferidas a post-launch: 1689 LBCF, Baptist Catechism 1693, Chicago Statements 1978/1982/1986.

## Tagging `doctrineLevel` para v1

Política: **LLM-curado + review del fundador**.

1. Sistema procesa cada sección de las 14 confesiones con prompt LLM que clasifica en `core | distinctive | open-evangelical` basado en el manifiesto ([06-pedagogy-applied § Sistema de 3 niveles](../06-pedagogy-applied.md#4-sistema-de-tres-niveles-de-doctrina-operacionalización)).
2. Output: spreadsheet con cada sección + nivel propuesto + razonamiento.
3. Ricardo (fundador) revisa y corrige.
4. Resultado final se persiste como `confessionSections[].doctrineLevel`.

Estimación: ~2 días LLM processing + ~1 día revisión fundador.

## ADRs futuros derivados

- ADR-009 (próximo) — Cross-reference engine (TSK-based) — resuelve Q1 con findings del investigador
- ADR-010 — Per-user library: UX de declaración de license/ingestion al upload
- ADR-011 — Catálogo extensible de licencias soportadas (cuando agreguemos CC BY-SA, etc.)

## Referencias

- JSON canónico: [data/core-library-seed.json](../data/core-library-seed.json)
- Bridge operacional: [07-citation-policy.md](../07-citation-policy.md)
- Manifesto: [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md) (política de autoridad)
- ADRs relacionados: [ADR-001](./ADR-001-confession-anchored-correction.md), [ADR-005](./ADR-005-exegetical-confessional-pedagogy.md)
- Citation engine actual: Fases B + C (branch `feat/phase-c1-export-with-citations`), PRs Phase B.1-B.5 + C.1
- Memorias: `feature_pastoral_fidelity_roadmap`, `feature_sermon_pipeline_convergence` (PR #213)
