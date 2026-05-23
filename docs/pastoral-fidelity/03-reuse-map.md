# 03 — Reuse map

Mapeo de infraestructura existente al nuevo rol en la iniciativa. Objetivo: minimizar código nuevo, maximizar reorquestación.

**Estimación global**: ~70% reuso de infra existente, ~30% código realmente nuevo.

## Tabla de reuso

| Componente existente | Memoria / PR | Nuevo rol en pastoral fidelity | Fase que lo usa |
|---|---|---|---|
| Tutor griego (metodología 6 pasos) | `feature_greek_tutor_methodology_narrative` | **Spine del Step 1 del wizard de sermón** — gate obligatorio | 1 |
| Tutor hebreo (paralelo) | (a confirmar en codebase) | Spine Step 1 para pasajes AT | 1 |
| SBL GNT canonical analyzer | PRs #134-#136 (`feature_exegesis_module`) | Testigo 1 (contexto inmediato) + Step 1.2 sintaxis | 1, 2 |
| Faculty chat con modos | `feature_faculty_home_redesign` (PRs #176-#182) | Invocación doctrinal en disenso 3/3 + Step 1.5 función | 1, 2 |
| Library + corpus recommendations | PR #93 (`feature_exegesis_v17_corpus_recommendations`) | Testigo 2 (paralelos) + base del contra-scan | 2, 4 |
| Library v1.7 smart match | PR #88 (`feature_exegesis_v17_library_match`) | Ranking semántico para tres testigos | 2 |
| Citation engine (Fases B+C) | Branch actual `feat/phase-c1-export-with-citations` | **Input** del fidelity pass claim↔source | 3 |
| `validateCitationManifest` (server-side) | Phase B (`feature_sermon_pipeline_convergence`) | Hook para insertar fidelity pass en pipeline | 3 |
| PR #211 paper→artifacts convergence | `feature_exegesis_paper_artifacts_convergence` | **Patrón replicado** un nivel arriba: proyecto→artifacts | 5 |
| PR #213 sermon pipeline convergence | `feature_sermon_pipeline_convergence` | `paperContext` field → generalizar a `projectContext` | 5 |
| PR #214 Faculty→wizard convergence | `feature_faculty_sermon_wizard_convergence` | `derivedContext` discriminated union → agregar caso `project` | 5 |
| Series planner | `feature_sermon_series_pericope_pipeline` | Base del runway de formación (calendario inverso) | 6 |
| Series exegesis defaults | `feature_series_exegesis_defaults_recommendations` | Hereda confesión y configuración a proyectos de la serie | 5, 6 |
| Wizard step infrastructure | (varios PRs) | Refactored, NO removido — Step 1 se reemplaza por six-step | 1 |
| Onboarding flow actual | (a auditar) | Se extiende con selector de confesión declarada | 0 |
| `useSubscription.ts` realtime pattern | `tech_debt_admin_realtime_status` | Pattern para gates dinámicos del wizard | 2, 3 |
| Faculty extractions persistence | PR #153 (`feature_faculty_extractions_persistence`) | Almacenamiento de audit trail del proyecto | 0, 5 |

## Detalle por componente clave

### Tutor griego — los 6 pasos

`feature_greek_tutor_methodology_narrative` documenta que la narrativa de 6 pasos fue removida del UI durante el rediseño Faculty 2026-05-15 pero **preservada para reuso**. Este es ese reuso.

Pasos: Lectura → Sintaxis → Morfología → Reconocimiento → Función → Insight.

Antes: tour ilustrativo en `/dashboard/greek-tutor`.
Ahora: gateway obligatorio del Step 1 del wizard de sermón. Cada paso instancia un componente del tutor existente contextualizado al pasaje del proyecto.

No requiere rebuild. Requiere:
- Componente wrapper que orquesta los 6 sub-steps
- Persistencia de outputs por step en `pastoralSeed`
- Audit trail de tiempo + tools invocados

### Canonical analyzer (SBL GNT) — Testigo 1

`feature_exegesis_module` describe la integración del SBL GNT como base text via `SBLGNTBibleProvider` wired into canonical analyzer (PRs #134-#136).

El analyzer ya produce análisis sintáctico por cláusula. Para Testigo 1:

```
Input: { centralIdea: string, passageAnalysis: ClauseAnalysis[] }
LLM prompt: "Given the central idea X and these clauses, identify any structural elements the central idea ignores or misrepresents."
Output: { dissents: boolean, reasoning: string }
```

Cero código de análisis nuevo. Solo nuevo prompt + adapter.

### Faculty modes — invocación doctrinal en 3/3

`feature_faculty_home_redesign` documenta los modos doctrinales del Faculty chat. Modo `useResponseModePref` ya persiste preferencia del usuario.

Nuevo: cuando 3/3 testigos disienten, el sistema construye prompt contextualizado:

```
Context:
- Pastor claim: <centralIdea>
- Pastor confession: <declaredConfession text excerpt>
- Witness 1 dissent: <reasoning>
- Witness 2 dissent: <reasoning>
- Witness 3 dissent: <reasoning>

Mode: doctrinal. Engage socratically. Do not impose; expose.
```

Reuso total del Faculty engine. Nuevo solo el prompt builder.

### Citation engine como input al fidelity pass

El motor de citas actual produce `citationManifest` con cada `[N]` mapeado a un chunk validado por identidad. La Fase 3 (fidelity pass) consume este manifest:

```
For each entry in citationManifest:
  claim = sentence_before(marker)
  chunk = manifest[marker].chunkContent
  verdict = LLM_evaluate(claim, chunk)
  persist(verdict)
```

Ningún cambio al motor de citas. Solo nuevo consumer + nueva tabla de veredictos.

### PR #211 paper→artifacts como patrón replicado

El PR #211 estableció la convergencia: paper → (sermon, study, etc.) con `derivedContext` discriminated union. Esta iniciativa escala el mismo patrón un nivel arriba:

```
Project → (sermon, study, newsletter, post, lesson, letter, devotional)
```

Misma arquitectura, mismo discriminated union, mismo enfoque de provenance. Solo se agrega `Project` como entidad raíz y se refactor los artefactos para apuntar al proyecto en lugar de directamente al paper.

## Componentes nuevos (código realmente nuevo)

| Componente | Fase | Estimación |
|---|---|---|
| Cross-reference engine canónico (si no existe) | 0/2 | **TBD — pregunta pendiente** |
| Confession catalog + tagging por secciones | 0/2 | ~3-5 días |
| Confession selector en onboarding | 0 | ~1 día |
| Three witnesses orchestrator | 2 | ~3 días |
| Pre-publish gates con escalado de disenso | 2 | ~2 días |
| Fidelity pass LLM consumer | 3 | ~3 días |
| Verdict persistence + audit dashboard | 3 | ~2 días |
| Autoría diff tracker | 4 | ~3 días |
| Contra-scan orchestrator | 4 | ~3 días |
| Voice fingerprint adapter | 4 tardía | ~2-3 sem |
| `Project` entity + migrations | 5 | ~5 días |
| Project→artifacts refactor (mover punteros) | 5 | ~3-5 días |
| Runway inverso del planner | 6 | ~2 días |

Total código nuevo estimado: ~5-7 semanas distribuidas en 4 meses de trabajo.

## Lo que NO requiere cambio (intocable)

- Sistema de extracción (LlamaParse + Gemini batched) — `feature_extraction_v17_batched_gemini`
- Sistema de pricing/billing — `billing_monthly_quota_model`, `pricing_roadmap_active`
- Faculty extractions persistence — PR #153
- Library v1.7 long extraction UX — PRs #83-86
- Analytics stack (GA4, Clarity, Meta Pixel, CAPI, Firestore audit) — PR #147

Estos sistemas son sólidos y ortogonales al cambio. No tocar.
