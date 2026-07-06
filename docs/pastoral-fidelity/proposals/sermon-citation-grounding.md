# Propuesta — Citas del sermón con SUSTANCIA (grounding del excerpt real)

> Investigar → proponer → sin código hasta aprobar. Continuación de la fidelidad
> de citas (opción B ya en prod). Estado: DRAFT. 2026-07-06.

## El problema (observado en vivo)

Las citas del sermón salen como **name-drop hueco**:

> "Como lo expone Simon J. Kistemaker en «Comentario 1 y 2 de Pedro y Judas» [1]."

Nombra la fuente pero **no dice qué expone**. Y el sermón se **predica en voz
alta** → el popover del `[1]` es invisible. El oyente escucha un nombre y nada
más. No es una cita: es un name-drop.

## Causa raíz (concreta, no difusa)

1. La atribución hueca **la escribe código determinista**: `ensurePointCited`
   (`injectNarrativeCitationAnchors.ts:126-130`) inserta la plantilla fija
   `"Como lo expone {autor} en «{título}» [Sn]."` — **sin el excerpt**.
2. El composer (Gemini) tampoco pone contenido real: nunca recibe el excerpt
   (deliberado, por el filtro RECITATION de Gemini con texto largo).
3. El excerpt real (de tu RAG, `manifest.entries[n-1].excerpt`, ≤280 chars) vive
   **solo en el popover** — read-only, invisible al predicar.

**Dato habilitante:** el marcador `[n]` mapea a `manifest.entries[n-1]` por **índice
ordinal** (`citationMarkers.tsx:71-73`) → cualquier fix puede resolver el excerpt
real de cada marcador sin ambigüedad.

## Opciones (tradeoffs honestos)

### A. Injector determinista usa el excerpt real (recomendada)
Cambiar `ensurePointCited` (y el punto donde se teje la atribución) para que, en
vez de la cáscara, escriba la **idea real del excerpt**:

> "Como observa Kistemaker: «Pedro no introduce nuevas verdades, sino que insta a
> recordar las ya recibidas» [1]."

- **Pro**: FIEL (texto real de tu biblioteca, sin drift), **sin LLM**, sin
  RECITATION (es dato ya recuperado, no generación), quirúrgico (un punto).
- **Contra**: el excerpt es ≤280 chars → la cita es una idea corta, no un párrafo
  hondo. Fraseo determinista (poca variación). Muestra verbatim (fino para citar
  con atribución; el footer de atribución ya existe).

### B. Pase Sonnet que TEJE el excerpt en la prosa
Un pase post-generación (Sonnet, sin RECITATION) recibe el párrafo + el excerpt
real de cada `[n]` → reescribe tejiendo la idea, parafraseada, natural:

> "Como observa Kistemaker, la intención de Pedro no es enseñar algo nuevo sino
> reavivar la memoria de verdades ya recibidas [1]."

- **Pro**: lee como narrativa fluida; unifica con B (un solo pase: fuente real →
  teje; fuente inventada → quita).
- **Contra**: +1 llamada Sonnet por generación; **riesgo de drift** (la paráfrasis
  puede alejarse del excerpt); más complejo.

### C. Renderizar el excerpt visible (sin tocar generación)
El renderer muestra el excerpt inline (como cita corta bajo la atribución), no
solo en el popover.

- **Pro**: cero cambio de generación, cero LLM, muestra el texto real.
- **Contra**: queda "atribución hueca + cita pegada" (redundante/torpe si la
  atribución sigue siendo cáscara); cambia el formato del manuscrito.

## Recomendación

**Opción A** (injector determinista con el excerpt real) como primaria:
- Es lo que pediste — la cita lleva **texto real de tu biblioteca**, visible al
  predicar, sin clicks.
- **Fiel por construcción**: es el excerpt del RAG, no una paráfrasis que pueda
  driftar. Para un púlpito, un texto real citado > una paráfrasis que el pastor no
  escribió.
- Sin LLM, sin RECITATION, quirúrgico.

**Con un ajuste de fondo:** el excerpt hoy se trunca a **≤280 chars** al armar el
manifiesto (`buildSermonCitationManifest`). Para citas ricas conviene subirlo
(ej. ≤600) o guardar el chunk completo. Es un cambio chico pero cambia la calidad
de la cita. Lo incluyo en el alcance.

**Opción B (Sonnet teje) como follow-up** si querés narrativa más fluida — pero
después de ver A en vivo, porque A ya resuelve el dolor y sin drift.

## No negociables

- **Fiel**: la cita muestra/parafrasea el excerpt REAL del RAG, nunca inventado.
  Ante duda, texto real > paráfrasis.
- **Atribuida + trazable**: autor + marcador `[n]` → popover con fuente + página
  (se mantiene).
- **Composa con B**: fuente en tu biblioteca → se enriquece; fuente inventada → se
  quita (B). Nunca una cita sin respaldo.

## Preguntas para el fundador

1. ¿**A** (texto real citado, determinista, fiel) o **B** (Sonnet parafrasea,
   fluido pero con drift)? Recomiendo A.
2. ¿Subimos el largo del excerpt (≤280 → ≤600) para citas más ricas? (Cambio chico
   en `buildSermonCitationManifest`.)
3. ¿Formato de la cita: **inline** ("Como observa X: «…» [n].") o **blockquote**
   (cita destacada en su propia línea)? Inline lee como sermón; blockquote resalta.

## Referencias

- Atribución hueca: `injectNarrativeCitationAnchors.ts:102-133` (`ensurePointCited`).
- Contrato sin excerpt (RECITATION): `prompts-generator.ts:252-320`.
- Marcador↔entry ordinal: `citationMarkers.tsx:65-159`.
- Excerpt ≤280: `CitationManifestEntry.excerpt` (`SermonGenerator.ts:47-63`),
  armado en `buildSermonCitationManifest`.
- Sanitizado Sonnet (base para B): `sanitizeSermonCitations.ts`,
  `SermonCitationSanitizerService.ts`.
