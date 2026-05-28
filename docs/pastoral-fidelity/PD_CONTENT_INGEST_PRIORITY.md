# Pastoral Content PD Ingest — Priority Guide

**Estado**: `in-progress` — fundador ingestando en paralelo a Sprint 1 (2026-05-28).
**Objetivo**: cerrar la deuda heredada de Fase 1.6 ADR-024 (trasfondo histórico-cultural sin contenido PD). Paso 2 (Contexto/Género) hoy degrada elegante en prod; con contenido ingestado, RAG retorna fragmentos reales.

## Fuentes priorizadas (PD rights-cleared)

### Tier 1 — INGESTAR PRIMERO (cubre 80% de los pasajes más predicados)

1. **ISBE — International Standard Bible Encyclopedia** (1915)
   - Cobertura: A-Z enciclopédica. Books, persons, places, themes.
   - Por qué primero: amplitud (un solo dataset cubre la mayoría de las consultas trasfondo).
   - Fuente: CCEL https://ccel.org/c/orr/bib_enc/cache/bib_enc.html · StudyLight · archive.org.
   - Tamaño: ~5k entradas, ~25MB texto.
   - Formato esperado: por libro/pasaje + tema.

2. **Keil & Delitzsch — Commentary on the Old Testament**
   - Cobertura: AT completo, detalle exegético + trasfondo.
   - Por qué: AT predicado regularmente (Salmos, Génesis, profetas).
   - Fuente: CCEL https://ccel.org/c/keil/keil.html
   - Tamaño: 10 volúmenes, ~80MB texto.
   - Granularidad: por capítulo + pasaje.

3. **Jamieson-Fausset-Brown — Commentary Critical and Explanatory**
   - Cobertura: Biblia completa, accesible, foco en trasfondo histórico.
   - Por qué: complementa K&D (NT) + más narrativo + accesible para pastor.
   - Fuente: CCEL https://ccel.org/c/jamieson/jfb/cache/jfb.html
   - Tamaño: 6 volúmenes condensados, ~40MB.

### Tier 2 — INGESTAR DESPUÉS (cobertura adicional + voces complementarias)

4. **Matthew Henry — Complete Commentary**
   - Cobertura: Biblia completa, devocional/práctico.
   - Por qué: pastor familiar con su voz, contrapunto pastoral a JFB.
   - Fuente: CCEL https://ccel.org/c/henry/mhc/cache/mhc.html
   - Tamaño grande (~150MB) — considera versión condensada.

5. **Barnes' Notes on the Bible**
   - Cobertura: NT principalmente.
   - Por qué: detalle exegético sin tecnicismo.
   - Fuente: CCEL.

6. **Pulpit Commentary**
   - Cobertura: Biblia completa, multi-autor pastoral.
   - Por qué: enfoque homilético — útil para distinguir trasfondo de aplicación.
   - Fuente: StudyLight.

7. **Cambridge Bible for Schools and Colleges**
   - Cobertura: textos clave del AT/NT.
   - Por qué: críticamente sólido, lenguaje accesible.

### NO INGESTAR (rights NOT cleared)
- ❌ ESV/NIV Study Bibles modernas (copyright vigente).
- ❌ Carson, Beale, Longman commentaries.
- ❌ NICOT/NICNT/WBC series.
- ❌ BDAG (lexicon — Phase 1.5 dataset curado v1 cubre lexical).

## Books priorizados (por uso pastoral histórico)

Si el tamaño del ingest fuerza a recortar, priorizar contenido por estos libros (telemetría `book_background_gap_*` confirmará empíricamente post-launch):

| Prioridad | Libro | Razón |
|---|---|---|
| 1 | **Juan** | Prólogo (1:1-18) + diálogos teológicos densos. Juan 1:1 fue caso de smoke Fase 1.6. |
| 2 | **Romanos** | Predicado expositivo top. Trasfondo Roma + judaísmo segundo templo crítico. |
| 3 | **Génesis** | Prólogo cosmológico + patriarcas. Trasfondo ANE pesado. |
| 4 | **Salmos** | Predicado devocional + worship leader. Géneros diversos (lamento, alabanza, real, sapiencial). |
| 5 | **Mateo** | Sermón del Monte + parábolas. Trasfondo Galilea + farisaísmo. |
| 6 | **Filipenses** | Himno cristológico (2:5-11) + carta corta. |
| 7 | **Hechos** | Misión + iglesia primitiva. Trasfondo greco-romano. |
| 8 | **Efesios** | Doctrina iglesia + ética. |
| 9 | **Hebreos** | Cristología sacerdotal + tipología. Trasfondo judío. |
| 10 | **1 Corintios** | Problemas pastorales + recursos teológicos. Trasfondo Corinto. |

## Formato esperado del ingest

Para que el pipeline RAG existente (`retrieveChunks`) lo consuma:

1. **Documento por entrada**: 1 doc Firestore por entrada de cyclopedia / 1 doc por capítulo de commentary.
2. **Schema sugerido** (campos al insertar en `document_chunks/`):
   ```
   {
     source: "ISBE" | "K&D" | "JFB" | ...,
     book: "John",            // libro bíblico (en inglés canónico)
     chapter: 1,              // opcional, para commentaries
     reference: "Jn 1:1-18",  // pasaje cubierto (string libre)
     topic: "Logos doctrine", // tema principal de la entrada
     text: "...",             // texto del fragmento (ya chunked si es largo)
     embedding: [...],        // 768-dim Gemini text-embedding-004
     license: "PD",           // siempre PD
     publishedYear: 1915,     // año de publicación original
     ingestedAt: <timestamp>
   }
   ```
3. **Idempotencia**: id del doc determinista (e.g., `isbe__logos__john-1`) para que re-ingest no duplique.
4. **CORE store**: marcar `isSystemSource: true` así RAG retrieve pesca como fuente de sistema vs library del user.

## Pipeline ingest (te lo arma yo en Sprint 2)

Cuando tengas contenido subido al Storage (PDFs/text crudo), yo armaré:
- Callable `ingestPdContentSource(source, sourceFolder)` que parsea + chunks + embed + escribe a `document_chunks/`.
- Migration runner one-shot por source.
- Test smoke: pedir orientación en `ContextGenreStep` de Juan 1:1 → debe retornar fragmento ISBE sobre Logos.

## Cómo coordinamos

1. Vos: descargás PDFs/texto crudo de Tier 1 desde CCEL.
2. Vos: subís a Firebase Storage `library_systems/pd/{source}/...`.
3. Vos: avisás cuando tengas los 3 Tier 1 subidos.
4. Yo: armo callable + corro ingest + smoke test.
5. Iteramos con Tier 2 después.

## Riesgos

- **OCR quality**: PDFs antiguos pueden tener texto malo. Preferir formatos `.txt` o `.epub` cuando estén disponibles (CCEL ofrece varios formatos).
- **Chunk size**: textos del XIX/XX tienen párrafos largos. Cap a 1500 chars por chunk con 200 overlap.
- **Idiomas**: ISBE/K&D/JFB son en inglés. El asistente ya responde en español sobre fuentes en inglés (visto en Fase 1.5 con LSJ/BDB). Fine.
- **Storage cost**: ~150MB total Tier 1. Firebase Blaze cap ya configurado.

## Referencias

- ADR-024: [ADR-024-genre-context-rag-ruta-c.md](decisions/ADR-024-genre-context-rag-ruta-c.md) — ruta C decisión del fundador (piso PD + curación progresiva).
- ADR-006: [ADR-006-rights-aware-citation-system.md](decisions/ADR-006-rights-aware-citation-system.md) — política de licencias.
- Phase 1.6 doc: [phases/phase-1-6-context-genre-principle.md](phases/phase-1-6-context-genre-principle.md) — deuda heredada documentada.
