# ADR-024 — Contexto/Género: reuse BookPanorama + RAG ruta C + AiAssistLog

## Estado

`proposed` — se acepta al arrancar `/iniciar-fase 1.6`.

## Fecha

2026-05-27

## Contexto

El paso 2 (Contexto + Género) tiene dos componentes con estado muy distinto, verificado contra
el código y prod:

1. **Género + outline del libro** — el módulo de exégesis ya lo produce: `BookPanorama`
   (`genre: LiteraryGenre` con 9 valores + propósito + problema pastoral + tema + movimientos +
   términos clave + nota de historia redentiva) vía `GeminiExpositoryAssistant` (LLM puro, sin
   RAG). **No hay que construir clasificador.**
2. **Trasfondo histórico-cultural factual** — §8 #7 del spec exige fuentes reales (no
   alucinación). Estado: **gap total de contenido**. La CORE library solo tiene confesiones/credos
   + SBLGNT + lexicons (25 system sources, cero comentarios/intros/trasfondo). La biblioteca del
   usuario tiene algunos comentarios pero copyright + dispersos + per-usuario (no compartibles).
   La infra de RAG (`retrieveChunks`, `document_chunks`, CORE stores) **existe**; falta contenido.

Además, el audit actual del seed (`toolsConsulted` + `pasteEvents`) es disperso y no captura si
la salida de IA fue editada por el pastor antes de persistir (clave para el "% tuyo").

## Decisión

### Género + outline — reuse

`BookPanorama` / `GeminiExpositoryAssistant` alimentan el paso 2, cacheados per-libro
(`cache.ts` ya existe). La IA **propone** género (`aiProposed` → `userConfirmed`) + outline para
que el pastor ubique la perícopa; el pastor **escribe** la implicancia interpretativa (humano).

### Trasfondo histórico-cultural — RAG ruta C (decisión del fundador)

Híbrido: **piso PD ahora + curación progresiva por telemetría**.

- **Piso (inmediato)**: ingestar como `isSystemSource` comentarios/diccionarios de **dominio
  público** rights-cleared (ADR-006 / 07-citation-policy): ISBE (1915), Keil & Delitzsch (AT),
  Jamieson-Fausset-Brown; opcionales Matthew Henry, Barnes, Pulpit, Cambridge Bible. RAG sobre
  ellos; output en español (asistente ya responde ES sobre fuentes EN).
- **Curación progresiva**: dataset propio en español por libro (estilo `lexicon-curated-v1`),
  priorizado por telemetría de libros más predicados (`book_background_gap_*`). Sube calidad y voz.
- **Degradación elegante**: si no hay match RAG para un libro, el paso surfacea solo
  género+outline + Faculty (marcado como no-sourced) — nunca inventa trasfondo con cita falsa.
- **Faculty inline** (panel) en este paso, fallback a pestaña.

**NO ingestar sin derechos**: study bibles modernas (ESV/NIV), Carson/Beale, Longman, NICOT/NICNT,
WBC.

### AiAssistLog — audit de primera clase

Colección nueva `aiAssistLogs/` (o subcolección del seed) con:
`{ stepKey, assistType, outputWasEditedByUser, createdAt }`. `assistType` ∈ { parsing,
genreProposal, bookOutline, structuralDisplay, grammarCheck, wordCandidates, lexicalTutor,
crossRefEngine, historicalContext, eisegesisCheck }. Reemplaza el audit disperso; alimenta el
"% tuyo" (Fase 4). **Pasos 1 (impresión) y 8 (insight) NO generan `AiAssistLog`** (test).

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Construir clasificador de género nuevo | `BookPanorama` ya lo hace; reuse. |
| Solo RAG PD (sin curación) | Calidad "buena" pero voz no controlada e inglés. Ruta A insuficiente para "calidad superior". |
| Solo dataset curado (sin piso PD) | Lento; no hay trasfondo hasta curar N libros. Ruta B sola deja el paso vacío meses. |
| Licenciar fuentes modernas ya | Costo + fricción legal; diferible. |
| Faculty libre (LLM sin RAG) para trasfondo | Viola §8 #7 (fuentes reales) — riesgo de alucinación con cita falsa. |
| Mantener audit disperso | No captura editabilidad; no alimenta "% tuyo". |

## Consecuencias

### Positivas
- Género sin construir nada (reuse).
- Trasfondo con fuente real desde ya (piso PD), mejorando con curación.
- `AiAssistLog` habilita "% tuyo" trazable (Fase 4) + audit del tripwire (ADR-023).

### Negativas
- Curación de contenido es trabajo del fundador (sourcing PD + dataset progresivo) — fuera del código.
- RAG PD inglés → output español puede perder matices; curación lo corrige.
- Ingesta de comentarios PD grandes (ISBE, K&D) consume storage + indexing.

### Neutrales
- Reusa pipeline de ingest + RAG existente (sin infra nueva).

## Impacto

- **Contenido (fundador)**: sourcing PD (CCEL/StudyLight/archive.org) + curación ES progresiva.
- **Functions**: ingest de system sources PD; RAG retrieval en el paso 2; `aiAssistLogs/` writes.
- **Domain**: tipo `AiAssistLog` + `assistType`.
- **Web**: `ContextGenreStep` (panorama + género confirmable + Faculty inline + trasfondo RAG).
- **Telemetría**: `book_background_gap_*` para priorizar curación.
- **Reversibilidad**: alta — contenido aditivo; género reusa infra existente.

## Referencias

- Reusa: `BookPanorama` / `GeminiExpositoryAssistant` (módulo exégesis), RAG infra (`retrieveChunks`).
- Rights: [ADR-006](./ADR-006-rights-aware-citation-system.md), [07-citation-policy.md](../07-citation-policy.md)
- Patrón curación: `lexicon-curated-v1` (Fase 1.5)
- Phase doc: [phase-1-6-context-genre-principle.md](../phases/phase-1-6-context-genre-principle.md)
