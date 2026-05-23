# ADR-008 — Cross-reference engine: TSK-based build (resuelve Q1)

## Estado

`accepted`

## Fecha

2026-05-22

## Contexto

[Phase 0 Q1](../phases/phase-0-foundations.md) requería investigar si existía un cross-reference engine (motor de paralelos canónicos bíblicos) en el codebase. Este componente es **Testigo 2** del mecanismo de tres testigos ([ADR-001](./ADR-001-confession-anchored-correction.md), [01-architecture.md § Componente 3](../01-architecture.md#componente-3-tres-testigos-para-validación)) y según el manifesto ([06-pedagogy-applied § Notas sobre el mapeo](../06-pedagogy-applied.md#notas-sobre-el-mapeo)) es el componente del **"corazón del trabajo"** del Paso 4 exegético.

### Investigación realizada

Investigación completa del codebase via subagent (caveman:cavecrew-investigator) el 2026-05-22.

### Hallazgos

**NO existe cross-reference engine.** Resultados detallados:

- `/packages/infrastructure/src/bible/` — almacenamiento de texto bíblico únicamente (`rvr1960.json`, `asv.json`)
- `/packages/infrastructure/src/bible/BibleVersionFactory.ts` — retrieval de texto por locale; sin lógica de linking
- `/packages/domain/src/bible/canon/BibleCanon.ts` — metadata de libros + parsing de pasajes; sin data de relaciones entre versos
- `CanonicalVerseAnalysis.ts:148` (exegesis annotations) — campo `oldTestamentLinks` para **documentar** conexiones intertextuales (quotations/allusions/echoes); NO para **descubrirlas** dinámicamente
- `verse-analysis.ts:116` — `OshbReference` con metadata morfológica de OSHB; no paralelos verso-a-verso
- Package.json — **sin dependencias** de APIs bíblicas (STEPBible, BibleAPI, Bible Gateway absent)
- **Sin embeddings semánticos** indexados de la Biblia
- **Sin dataset TSK** o equivalente

### Opciones evaluadas por el investigador

1. **Fast path**: TSK-JSON dataset (~$0 cost; public domain) + REST endpoint `(book, chapter, verse)` → `[related verses]`
2. **Best quality**: embeddings semánticos (Gemini Embedding API) de cada verso bíblico; similarity search at query time (~$100/mes para coverage)
3. **Hybrid**: TSK como baseline + embeddings para descubrimiento de tópicos doctrinales (complementarios, no redundantes)

## Decisión

**Build de cross-reference engine basado en TSK (Treasury of Scripture Knowledge) como baseline v1, con extensión a hybrid (TSK + embeddings) en Fase 4.**

### Estrategia v1 (Phase 0/2)

1. **Ingestar TSK-JSON dataset** (público, dominio público) — fuente: typescript-tsk / openbible.info / equivalente con 340k+ cross-references
2. **REST endpoint** en `/packages/infrastructure/src/bible/cross-references/`:
   - `GET /references/{book}/{chapter}/{verse}` → `[{ ref: "Gal 5:1", strength: 0.8, type: 'parallel' | 'allusion' | 'quotation' | 'echo' }]`
   - `GET /references/{book}/{chapter}/{startVerse}-{endVerse}` → agregado para perícopa
3. **Lookup layer** en `/packages/infrastructure/src/exegesis/` que el orchestrator de tres testigos consume directamente
4. **Sin embeddings en v1** — TSK es lo suficientemente robusto para validar paralelos canónicos de claims pastorales típicos
5. **Estructura del dataset**: chunked por verso, indexed por `(book, chapter, verse)`, lookup O(1)

### Estrategia v2 (Fase 4 — extensión)

6. **Embeddings de Gemini Embedding API** sobre cada verso bíblico (~31k versos)
7. **Almacenamiento**: Firestore vector field o Pinecone/equivalent
8. **Use case complementario**: descubrimiento de paralelos temáticos NO cubiertos por TSK (TSK es bueno para citas/alusiones directas; embeddings encuentran similaridad temática difusa)
9. **Cost estimate**: ~$100/mes en costs de embedding + retrieval
10. **Hybrid retrieval**: TSK primary results + embedding-based secondary results, rankeados juntos

### Por qué TSK primero

- **Costo $0** (PD dataset, sin LLM cost recurrente)
- **Calidad probada históricamente** — TSK existe desde el siglo XIX, revisado por generaciones de pastores y eruditos
- **Compatible con el manifesto**: "pluralidad de pasajes" + "teología bíblica integrada" — TSK está construido exactamente para eso
- **Encaja en infraestructura existente** — `BibleCanon.ts` ya parsea pasajes; cross-ref es lookup adicional
- **Determinístico**: misma query produce mismo resultado (importante para audit pastoral)

### Por qué embeddings después (no en v1)

- Cost recurrente no justificable hasta validar engagement del mecanismo de tres testigos
- TSK cubre los casos doctrinales mayores
- Embedding adds value para casos de discovery, no validation — más relevante a contra-scan (Fase 4) que a Testigo 2 inicial
- Permite priorizar el shipping de Phase 1 + 2 sin más bloqueadores

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **API externa (STEPBible, Bible Gateway)** | Dependencia de availability + rate limits + posibles costos. Para un componente core del sistema (Testigo 2), dependencia externa es riesgo. |
| **Embeddings only (sin TSK)** | Cost recurrente desde día 1 sin baseline determinístico. Embedding similarity puede traer paralelos espurios sin TSK como ground truth. |
| **Construir cross-refs manualmente** | No escala. TSK es lo que la iglesia ya hizo durante 150 años. Re-inventar es desperdicio. |
| **No implementar Testigo 2 en v1** | Manifesto declara que paralelos canónicos son "el corazón del trabajo." Sin Testigo 2, el mecanismo de tres testigos cae a dos. No es opción. |

## Consecuencias

### Positivas

- **Q1 de Phase 0 cerrada**: bloqueador identificado, plan claro.
- **Testigo 2 implementable** sin dependencias externas ni costo recurrente.
- **Compatible con manifesto**: TSK es exactamente lo que el manifesto pide (pluralidad de pasajes, teología bíblica AT→NT integrada).
- **Determinístico**: audit pastoral confiable.
- **Extensible**: Fase 4 agrega embeddings como hybrid sin tirar nada.
- **Reuso ~80%**: lookup layer es código nuevo, pero infraestructura de parsing/canon ya existe.

### Negativas

- **Cobertura limitada a citas/alusiones/ecos canónicos directos**: temas que no aparecen explícitamente en TSK (ej. tópicos contemporáneos sin paralelo textual obvio) no se cubrirán en v1. Mitigación: Faculty doctrinal mode puede invocarse manualmente; embeddings en Fase 4 cubren el gap.
- **TSK refleja la teología de su época**: principalmente Reformed/Puritan inglés del siglo XIX. Algunas tradiciones (Eastern Orthodox, charismatic) pueden tener énfasis distintos no representados. Mitigación: pastor puede agregar paralelos en el Step 4 del spine; no exclusivamente automático.
- **Dataset tagging requerido**: TSK raw es ~340k pares verso-paralelo. Necesita estructurarse + chunkearse para nuestro engine.

### Neutrales

- Storage cost mínimo (~tens of MB).
- Lookup performance O(1) con buen indexing.

## Impacto

- **Código afectado**:
  - Nuevo paquete: `/packages/infrastructure/src/bible/cross-references/`
  - Nuevo dataset: `data/tsk.json` o equivalente (en repo o cloud storage)
  - Loader + indexer en startup
  - REST endpoint nuevo (o callable Firebase function)
  - Lookup layer en `/packages/infrastructure/src/exegesis/`
  - Three witnesses orchestrator consume cross-ref lookup
- **Fases impactadas**:
  - **Fase 0**: setup de dataset + endpoint base
  - **Fase 1**: Step 4 del spine (Reconocimiento) usa cross-ref para sugerencias de paralelos
  - **Fase 2**: Testigo 2 consume cross-ref como primary source
  - **Fase 4**: extender a hybrid con embeddings (TSK + Gemini Embedding)
- **Migraciones requeridas**: ninguna (componente nuevo)
- **Reversibilidad**: alta — componente aislado, fácil de reemplazar

## Trabajo concreto

### Fase 0

- [ ] Identificar dataset TSK específico a usar (typescript-tsk, openbible.info JSON dump, o re-formato desde raw TSK)
- [ ] Definir schema interno del cross-reference
- [ ] Ingerir dataset a Firestore o asset local
- [ ] REST/callable endpoint con tests
- [ ] Document en `06-pedagogy-applied.md` cómo Testigo 2 consume el engine

### Fase 1

- [ ] Step 4 (Reconocimiento) del six-step embed UI que muestra paralelos sugeridos desde cross-ref
- [ ] Pastor selecciona / anota relevancia

### Fase 2

- [ ] Testigo 2 prompt builder usa cross-ref como contexto + LLM evalúa convergencia/disenso

### Fase 4 (extensión hybrid)

- [ ] Embeddings de Gemini Embedding sobre todos los versos
- [ ] Vector store
- [ ] Hybrid retrieval logic
- [ ] Audit dashboard

## Referencias

- Phase docs: [phase-0-foundations.md](../phases/phase-0-foundations.md), [phase-1-six-step-spine.md](../phases/phase-1-six-step-spine.md), [phase-2-three-witnesses.md](../phases/phase-2-three-witnesses.md), [phase-4-authorship-contrascan-voice.md](../phases/phase-4-authorship-contrascan-voice.md)
- Architecture: [01-architecture.md § Testigo 2](../01-architecture.md#componente-3-tres-testigos-para-validación)
- Manifiesto: [05-pedagogy-manifesto.md § Convergencia exegética](../05-pedagogy-manifesto.md#4-convergencia-exegética)
- ADR relacionado: [ADR-001](./ADR-001-confession-anchored-correction.md)
- Investigación: subagent investigator session 2026-05-22 (ver session log)
