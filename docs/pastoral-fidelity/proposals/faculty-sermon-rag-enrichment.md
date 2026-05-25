# Proposal — Faculty path sermon: RAG enrichment for real author citations

## Estado

`proposed` — pendiente de scheduling como follow-up PR post-Fase 0. NO bloquea cierre de Fase 0 ni arranque de Fase 1.

## Fecha

2026-05-25

## Contexto

Durante smoke test post-Fase 0 (sesión 2026-05-25), el fundador generó un sermón vía Faculty path (PR #214 — `derivedContext: 'faculty'`) y disparó el modal **"Posibles citas inventadas"** del validator (`SermonCitationVerificationDialog`).

El validator detectó correctamente que el sermón atribuyó **versos bíblicos a Charles Hodge**:
- Colosenses 1:17 → "— Charles Hodge"
- Tito 2:13 → "— Charles Hodge"

Investigación reveló dos problemas distintos pero entrelazados:

### Problema 1 — Ambigüedad de prompt (FIXED en sesión)

El template SERMON en [`packages/application/src/use-cases/faculty/ExtractTheologicalContentUseCase.ts`](../../../packages/application/src/use-cases/faculty/ExtractTheologicalContentUseCase.ts) tenía:

```markdown
**Cita de Autoridad:**
> "[Cita de teólogo o comentarista relevante]"
> — *Autor, Fuente*
```

Con regla "si no hay fuente en conversación, **omite el bloque o reemplázalo por una cita bíblica adicional**".

El LLM interpretó "reemplazar texto manteniendo la línea `— Autor`" → bible verses atribuidos a Hodge. Fix aplicado en la sesión clarifica:

1. "Referencias Cruzadas" SIN línea de autor (paréntesis explícito)
2. "Cita de Autoridad" marcada **OPCIONAL** — omite bloque entero (incluida línea de autor)
3. Regla nueva: PROHIBIDO atribuir texto bíblico a autor humano

Este fix establece **el piso**: NO hallucination. Cero citas falsas en sermón.

### Problema 2 — Gap arquitectónico (este proposal)

Mi fix establece el piso pero introduce trade-off no resuelto: si la conversación tutor no trajo material de Hodge/Calvino/Owen/etc., el sermón queda **sin citas de autor**.

El manifesto pedagógico ([05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)) declara:

> "Teología histórica como **testimonio acumulado** de la iglesia haciendo el mismo trabajo a lo largo de los siglos."

> "Los grandes teólogos (Atanasio, Agustín, Calvino, Owen, Edwards) son citados como **ejemplos del método**."

Sermones empobrecidos de testimonio histórico violan este principio — no por mentir, sino por callar. **Faltan citas reales que el sistema debería poder surface.**

Causa raíz: **Faculty path NO tiene RAG library retrieval**. El sermón generator ve SOLO chat history. El path canónico (paper exegético) SÍ tiene retrieval (PR Phase A/B citation manifest). Faculty path quedó parcial.

## Decisión propuesta

**Wire RAG retrieval into Faculty sermon generation**, alineado con el patrón Phase A/B ya shippeado en main + reusando la infraestructura existente.

### Fuentes de retrieval (en orden de prioridad)

| Fuente | Tipo | Provee | Nuevo o existente |
|---|---|---|---|
| **Confession catalog** (`/confessions/{id}/sections`) | Default-on per ADR-010 (multi-witness) | Citas confesionales reales (WCF, Heidelberg, Augsburgo, etc.) | Phase 0 ✓ |
| **User library** (`library_resources/`) | Per-user, scoped | Commentarios, teólogos, monografías subidos por el pastor | Phase A ✓ |
| **CORE Library admin** (`library_resources/` con `coreStores`) | Sistema-curated | Material premium curado por equipo Preach | Phase A ✓ |
| **Faculty extractions previas** (`extractions/`) | Per-user, persistido | Citas que el tutor ya surfaceó en sesiones anteriores | Existing (memoria `feature_faculty_extractions_persistence`) |

### Mecánica

Al generar sermón vía Faculty path:

1. **Pre-LLM retrieval phase**:
   - Query semantic relevance contra (passage, topic central de chat history, doctrina detectada)
   - 4 paralelizadas:
     - `retrieveConfessionSections(passage, topic, userPreferences.useConfessionalWitnesses)` → top-N secciones confesionales relevantes
     - `retrieveChunks(passage + topic, userId, libraryScope)` → top-N chunks de library del user
     - `retrieveChunks(passage + topic, SYSTEM_SOURCE_OWNER_ID)` → top-N chunks CORE Library
     - `getRelevantExtractions(userId, passage)` → extractions persistidas relevantes
   - Aggregate + dedupe + rank → final list of ~8-12 candidate citations
   - Cap por presupuesto del prompt (~3000 tokens material)

2. **Citation manifest construction**:
   - Reuse `buildCitationManifest(chunks, options)` (Phase B.2)
   - Assign monotonic IDs `S1`, `S2`, …
   - Stamp rights snapshot via `resolveRights` callback (Phase 0 PR 0.3)
   - Persist manifest en sermón al final

3. **Prompt injection**:
   - Inject bloque "**MATERIAL DISPONIBLE PARA CITAR**" en SERMON prompt antes del template estructural
   - Cada item con `[S1]`, `[S2]`, … + author + título + excerpt + tipo (confessional / book / extraction)

4. **Prompt rule update**:
   ```
   - "Cita de Autoridad" usa SOLO material del bloque MATERIAL DISPONIBLE
     o del chat history (texto literal). Marca cada cita con su marker
     [S1], [S2], … para trazabilidad.
   - Si ningún material aplica al punto, omite el bloque "Cita de Autoridad"
     enteramente.
   ```

5. **Validation pipeline**:
   - `validateCitations` (Phase B.5) ya valida contra manifest
   - Si LLM cita con [N] marker → validator lo confirma desde manifest entry
   - Si LLM cita autor sin marker → validator marca como `not-found` (probable hallucination)
   - Sermón published preserva manifest persistente

6. **Export pipeline**:
   - PDF + Word export ya tienen "Fuentes consultadas" + "Atribuciones" sections (Phase B.4 + PR 0.3)
   - Confession citations entran a bibliografía via `citation.bibliography` template (Phase 0 PR 0.3)
   - SBLGNT attribution preserved si chunks SBLGNT presentes

## Alineamiento con manifesto

| Principio | Cómo el RAG enrichment lo honra |
|---|---|
| **P1 — Labor antes que output** | Pastor que invocó tutor → conversación trajo material → RAG enriquece. NO bypass de estudio. Pastor que generó sin estudiar todavía recibe citas de catálogo, NO de la nada. |
| **P2 — AI desarrolla, no origina** | RAG retrieves textos REALES escritos por teólogos reales. LLM no inventa, solo selecciona + integra. |
| **P3 — Confrontación obligatoria** | Multi-witness (ADR-010): si pastor activa confessional witnesses (default ON), RAG trae voces convergentes Y divergentes. Pastor ve cómo distintas tradiciones leen — confronta. |
| **Pluralidad de fuentes** | Confession catalog + library + extractions = testigos plurales acumulados. NO single anchor. |
| **Textura del autor** | Citas reales preservan la voz del teólogo. No paráfrasis sintética. |
| **No proof-texting** (manifesto §) | Validator de Phase 3 (futuro) verifica que claims sustantivos tengan ≥2 pasajes bíblicos distintos. RAG no rompe esto — lo refuerza con testimonios humanos adicionales. |

## Reuso identificado

**Existente — solo wire**:
- `buildCitationManifest(chunks, options)` ([packages/domain/src/services/buildCitationManifest.ts](../../../packages/domain/src/services/buildCitationManifest.ts))
- `validateCitations(manifest, markdown)` ([packages/domain/src/services/validateCitations.ts](../../../packages/domain/src/services/validateCitations.ts))
- `retrieveChunks` callable ([packages/functions/src/library/retrieveChunks.ts](../../../packages/functions/src/library/retrieveChunks.ts))
- `aggregateRagSources(...)` ([packages/domain/src/services/aggregateRagSources.ts](../../../packages/domain/src/services/aggregateRagSources.ts))
- `FirebaseConfessionRepository.listSections(confessionId)` (Fase 0 PR 0.2)
- `aggregateRequiredAttributions` (Phase 0 PR 0.3)
- `SermonCitationVerificationDialog` UI (Phase B.5)

**Construir nuevo**:
- `retrieveConfessionSections(passage, topic, useWitnesses)` callable — query Firestore `/confessions/*/sections` con doctrineLevel + topic filter
  - **Bloqueado por Fase 0 follow-up**: content fill 7 confesiones largas (WCF/WSC/WLC/Belgic/Heidelberg/Dort/Augsburg). Sin content, solo 4 creeds retornan secciones.
  - Workaround interim: query restringe a creeds que SÍ tienen content
- `getRelevantExtractions(userId, passage)` retrieval logic (semantic + recency)
- Wiring en `BuildSermonFromFacultyOutlineUseCase`:
  - Llamar retrieval pre-LLM
  - Construir manifest
  - Inject prompt
  - Persistir manifest en sermón
- Update SERMON prompt template con bloque MATERIAL DISPONIBLE
- Update reglas del prompt

**Estimado**: 2-3 días de trabajo concentrado.

## Implementación por fases

### Fase A — Solo confession catalog (4 hrs)

Quick win con baja complejidad:

1. Nuevo callable `retrieveConfessionSections` con simple keyword/topic match
2. Wire en `BuildSermonFromFacultyOutlineUseCase` antes del LLM call
3. Inject bloque "MATERIAL CONFESIONAL DISPONIBLE" en prompt
4. Citation manifest persiste con confession sources

Cobertura inicial limitada (4 creeds taggeados). Más rica cuando content fill landed.

### Fase B — Library retrieval (1 día)

1. Reuse `retrieveChunks` callable (existing)
2. Aggregate con confession results
3. Dedupe + rank por relevance score
4. Token budget cap

### Fase C — Extractions retrieval (1 día)

1. Nuevo callable `getRelevantExtractions` con vector search sobre `extractions/`
2. Aggregate con library + confession
3. Final ranking + dedupe

### Fase D — UI polish (4 hrs)

1. SermonCitationVerificationDialog mejora: mostrar marker `[S1]` con link a chunk fuente
2. Sermon detail view: bibliografía + atribuciones rendering verificado
3. Toast del verifier muestra count: "Verificamos 8 citas atribuidas, todas reales"

## Trade-offs

### Positivos

- **Riqueza citacional sin hallucination**: piso (no hallucination) + techo (citas reales) ambos honrados
- **Pluralidad de testigos**: multi-witness ADR-010 ya tiene infra para esto
- **Audit defendible**: cada cita tiene manifest entry trackeable
- **Cost-effective**: retrieval barato (~$0.005 per generation), prompt enriquecido produce menos hallucination → menos validator iterations

### Negativos / Riesgos

- **Cost LLM aumenta marginalmente**: prompt + ~3000 tokens material retrieved. Estimado +$0.01-0.02 per sermon
- **Content fill dependency**: solo 4 creeds taggeados hoy. Pre-Fase 0 follow-up, retrieval limitado. Pastor que predica sobre temas no cubiertos en creeds verá pocas confession citations
- **Latency**: 4 retrievals paralelas + LLM call ≈ +2-3s. Mitigar con loading state
- **Risk of "cita atornillada"**: si retrieval surface material poco relevante, LLM puede forzar cita. Mitigar con relevance threshold mínimo + LLM rule "si cita no aporta, omite"
- **Per-user library scope variance**: pastors con libraries vacíos solo reciben citas de confession + CORE Library. Sermones de pastors con libraries ricos son visiblemente mejores. Mitigation: surface mensaje "Tu biblioteca tiene N libros. Agregar más enriquece tus sermones."

### Neutrales

- Schema citationManifest no cambia (extensión backwards-compatible aplicada en Phase 0 PR 0.3)
- Validator pipeline unchanged
- Export pipeline unchanged

## Criterios de aceptación (futuro)

- [ ] Faculty sermon generation invoca retrieval pre-LLM
- [ ] Retrieval queries 4 fuentes paralelas (confession + library user + library system + extractions)
- [ ] Aggregate + dedupe + rank produce ≤12 candidate citations
- [ ] Token budget cap respetado (~3000 tokens material en prompt)
- [ ] Citation manifest construido + persistido en `sermons/{id}.citationManifest`
- [ ] Prompt SERMON enriquecido con bloque "MATERIAL DISPONIBLE PARA CITAR"
- [ ] LLM output usa markers `[S1]`, `[S2]`, … (validable mecánicamente)
- [ ] `validateCitations` confirma marker entries vs manifest
- [ ] Verifier dialog NO dispara `not-found` para citas con marker
- [ ] PDF + Word export incluyen bibliografía generada desde manifest
- [ ] SBLGNT attribution preserved si chunks SBLGNT presentes
- [ ] Confessional citations renderizan con `citation.short` template (ej. "WCF 3.1") cuando vienen de confession catalog
- [ ] Pastor con library vacío recibe sermón con citas de confession catalog + CORE library (no quedaría sin citas)
- [ ] Tests integration: faculty session con N tópicos → sermón con M ≥ N citas reales verificadas

## Ubicación en roadmap

**No es nueva phase**. Es PR follow-up post-Fase 0 que cierra deuda específica de PR #214.

Scheduling: tras stabilization de Fase 0 + ADR-010 merge a main. Antes de Fase 2.5 (Study Depth Copilot) — porque SDC dimensión D6 (teología histórica) tiene mejor evidence cuando citation manifest ya está rico con confession sections.

Sugerencia naming del PR: `feat(faculty): RAG-backed sermon citations + confession retrieval`.

## Comparación con prompt fix actual

| Aspecto | Solo prompt fix (actual) | + RAG enrichment (este proposal) |
|---|---|---|
| Hallucination de citas | ❌ Eliminada | ❌ Eliminada |
| Mis-attribution bible→autor | ❌ Eliminada | ❌ Eliminada |
| Riqueza citacional | ⚠ Depende de chat history | ✅ Confession + library + extractions surfaced |
| Testimonio acumulado del manifesto | ⚠ Solo si pastor lo trajo | ✅ Sistema lo surface por default |
| Audit trail per cita | ✅ Manifest existing | ✅ Manifest enriquecido |
| Cost adicional | $0 | ~$0.01-0.02 per sermon |
| Latency adicional | 0s | +2-3s |
| Effort de implementación | ✅ Done | ⏳ 2-3 días |

## Pregunta para resolver al arrancar implementación

1. ¿Token budget cap del material disponible? (default ~3000 tokens)
2. ¿Relevance score threshold mínimo para incluir un chunk? (default 0.65)
3. ¿Per-source ranking weights? (confession > library_system > library_user > extractions, o iguales?)
4. ¿Dedupe strategy si misma cita aparece en 2 fuentes? (prefer confession > library > extraction)
5. ¿UI surface al pastor pre-generation con preview "estas citas se considerarán"? O totalmente opaque?

Cerrar cada una con decisión inline cuando se inicie el PR.

## Referencias

- ADR-006 (rights-aware citation engine) — fundamento del schema
- ADR-010 (multi-witness default-on) — confession catalog como testigo plural
- PR #213 (sermon pipeline convergence via wizard) — patrón análogo en wizard path
- PR #214 (faculty sermon convergence) — entry point que esta proposal completa
- Phase B (PRs #245-#249) — citation manifest infrastructure shippeada
- Phase 0 PR 0.3 — `aggregateRequiredAttributions` + `resolveRights` callback
- Manifesto §[teología histórica como testimonio](../05-pedagogy-manifesto.md)
