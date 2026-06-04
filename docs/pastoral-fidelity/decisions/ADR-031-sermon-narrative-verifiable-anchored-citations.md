# ADR-031 — El sermón cita de forma narrativa CON ancla verificable (popover: texto + libro + página)

## Estado

`accepted` — enmienda [ADR-030](./ADR-030-fidelity-per-marker-belongs-to-paper-sermon-narrative.md).

## Fecha

2026-06-04

## Contexto

ADR-030 movió la fidelidad claim↔source per-marcador al paper y dejó al sermón citando de forma
**narrativa pura** (sin marcadores). La verificación en prod expuso un hoyo: una atribución narrativa
(*"Como enseña el pastor Subukjian, la doctrina es el negocio principal del predicador"*) es **pastoral
pero no verificable** —

1. **Trazabilidad**: el lector no sabe DÓNDE lo dijo (libro, página) para comprobarlo.
2. **Autenticidad**: nada garantiza que la atribución sea fiel a la fuente. Sin chequeo, el modelo puede
   poner palabras en boca de un autor real, desde el púlpito. Es **peor** que un marcador crudo, que al
   menos apuntaba a un chunk real.

Hallazgo de infraestructura (factibilidad confirmada): el callable `retrieveChunks`
(`functions/src/library/retrieveChunks.ts`) recupera por vector search desde **biblioteca personal**
(`userId`) **y CORE** (`stores`) sobre la misma colección `document_chunks`, y devuelve por chunk:
`text` (contenido exacto), `metadata.page`, `resourceTitle` (libro), `resourceAuthor`, `score` semántico
y `publiclyCitable` (flag legal). Es decir: tenemos todo para citar con cita precisa y verificable.

## Decisión

El sermón cita de forma **narrativa CON ancla verificable** (refina ADR-030 §"sermón narrativo"):

1. **Display narrativo + ancla**: la atribución se teje en la prosa pastoral (*"Como enseña Subukjian…"*)
   Y lleva un **ancla** (`[Sn]`) que el renderer convierte en un **elemento clickeable sutil** (no un
   footnote académico crudo) → **popover con el contenido exacto del chunk + libro + página**. El lector
   puede comprobar la cita. Esto **revisa** el "sin marcadores" de ADR-030: el ancla SÍ existe, pero se
   renderiza como anclaje verificable, no como aparato académico visible.

2. **Fuentes + prioridad**: las citas salen de **biblioteca del usuario primero, CORE como fallback**.
   Si el usuario no tiene recursos, o no hay chunks relevantes en su biblioteca, se usa CORE. **Solo
   fuentes `publiclyCitable`.** Retrieval semántico vía `retrieveChunks` (no el File Search opaco).

3. **Cobertura por punto**: **cada punto del sermón debe tener al menos una cita** — SALVO que no haya
   recursos reales (biblioteca vacía o sin chunks relevantes). La ausencia de cita es aceptable solo por
   ausencia de fuente, nunca por pereza del modelo.

4. **Nunca inventar**: PROHIBIDO fabricar una cita, atribuir a una fuente algo que no dice, o citar una
   fuente que no está en el manifest recuperado. Una cita inventada en el púlpito destruye credibilidad
   y viola P1/P2. Si no hay fuente real que respalde un punto, el punto va sin cita.

5. **Grounding**: la atribución narrativa debe ser **representación fiel** del chunk anclado. El prompt
   lo exige; el `[Sn]` debe corresponder a un chunk del manifest cuyo `text` respalde la afirmación.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Narrativa pura sin ancla** (ADR-030 tal cual) | No verificable → riesgo de alucinación atribuida. Es el hoyo que motiva este ADR. |
| **A1: anclar solo biblioteca del usuario, prohibir CORE** | Pierde el aporte de CORE (curado de alta calidad) al sermón. El usuario pidió CORE + personal. |
| **Footnote académico visible `[N]`** | Anti-ethos pastoral (predicar no es footnotear). El ancla va sutil/clickeable, no como cita académica. |
| **Capturar grounding del File Search de Gemini** | Frágil (exposición del SDK) y redundante: `retrieveChunks` ya da los chunks con página desde nuestro vector store. |

## Consecuencias

### Positivas

- Cita pastoral (narrativa) **y** verificable (popover con texto + libro + página). Resuelve trazabilidad
  + autenticidad.
- Aprovecha CORE (curado) + biblioteca personal con prioridad correcta.
- "Nunca inventar" + grounding cierran el riesgo de alucinación atribuida.
- Reusa infra existente (`retrieveChunks`, `CitationMarker` popover, `citationManifest`).

### Negativas

- Revisa el "sin marcadores" de ADR-030: el sermón vuelve a tener un ancla (invisible/sutil). El stripper
  de ADR-030 (#303) debe ajustarse: conservar anclas `[N]` válidas (mapeadas al manifest) y limpiar solo
  basura (`[cite: …]`).
- El manifest del sermón pasa de `searchRelevantChunks` (client-side, solo personal) a `retrieveChunks`
  (callable server-side, personal + CORE) — cambio de pipeline.
- Forzar ≥1 cita por punto puede empujar al modelo a citar débilmente; mitigado por "nunca inventar" +
  grounding + el flag `publiclyCitable`.

### Neutrales

- La fidelidad claim↔source per-marcador del PAPER (ADR-030 punto 1) NO cambia: sigue siendo feature del
  paper. Este ADR es sobre la CITA del sermón, no sobre el fidelity pass.
- El `authorityQuote` (pull-quote formal) sigue existiendo, complementario a la atribución narrativa.

## Plan de implementación (esta feature)

1. **Retrieval**: `buildDraftManifest` → vía `retrieveChunks` con prioridad personal→CORE, solo
   `publiclyCitable`, devolviendo `text`+`page`+`book` en cada entrada del manifest.
2. **Prompt**: atribución narrativa + ancla `[Sn]` por claim; ≥1 cita por punto si hay recursos; grounded;
   nunca inventar.
3. **Stripper**: conservar `[N]` válidos (anclados al manifest), limpiar solo formas basura.
4. **UI**: `[N]` renderiza como ancla clickeable sutil → popover con `text` + libro + página.
5. **Verificación runtime** (fundador): generar sermón → narrativa + ancla clickeable + popover con cita
   precisa, desde personal (prioridad) y CORE (fallback).

## Referencias

- [ADR-030](./ADR-030-fidelity-per-marker-belongs-to-paper-sermon-narrative.md) — enmendado por este ADR.
- [07-citation-policy.md §4-5](../07-citation-policy.md) — estilo de cita por artefacto + atribución requerida.
- `functions/src/library/retrieveChunks.ts` — retrieval semántico personal+CORE con grounding.
- `tech_debt_fidelity_marker_emission` (memoria) — origen del hilo.
