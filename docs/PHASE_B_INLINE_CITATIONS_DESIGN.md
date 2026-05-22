# Phase B — Verified Source IDs + Inline Citations (Design Doc)

**Status:** Draft for user approval before implementation.
**Author:** Pre-implementation planning session.
**Depends on merge:** PRs #240 (RAG fix) · #241 (bibliography render) · #242 (token budget) · #243 (wizard sources badge) · #244 (Phase A junk filter).
**Supersedes:** Phase A's defensive junk-pattern filter (kept as belt-and-suspenders).

---

## 1 · Goal (acceptance criteria)

When a pastor reads a generated sermon — whether mid-wizard, in Vista Previa, on the published detail page, or in `.docx`/PDF export — they must:

1. See inline citation markers `[1]`, `[2]`, … embedded next to claims in the prose.
2. Click / hover a marker to surface the source (title + author + page) inline.
3. Scroll to a numbered bibliography at the end where each entry corresponds to its inline marker.
4. **Be certain every cited source corresponds to an actual library chunk the assistant retrieved** — no hallucinated titles, no meta-references to the prompt input, no invented page numbers.

> Non-negotiable: zero tolerance for hallucinated sources. A pastor quoting a fabricated author in the pulpit is a credibility-destroying failure mode.

---

## 2 · Failure modes Phase B closes (vs Phase A band-aid)

| Failure | Phase A behavior | Phase B behavior |
|---|---|---|
| LLM invents author name | Passes through unless matches junk regex | Validator strips: ID not in retrieved set |
| LLM cites real library doc with wrong page | Passes through | Page comes from retrieved chunk metadata, not LLM output |
| LLM cites the prompt's own input ("Usuario proporcionado") | Filtered by junk regex (case-by-case) | Cannot happen — only registered chunk IDs are valid |
| Bibliography exists but pastor can't see WHERE in the sermon a source applies | Bibliography is a flat footer | Inline `[N]` markers tie every claim to a source |
| Multiple sources combined silently in one paragraph | One footer entry, no per-paragraph attribution | Each marker references a specific source; multi-cite supported as `[1,3]` |

---

## 3 · Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER PIPELINE                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. RAG retrieval (DocumentProcessingService)             │  │
│  │    Returns: RankedChunk[] with stable per-chunk IDs       │  │
│  │    (resourceId, chunkIndex, text, page, title, author)    │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────▼─────────────────────────────┐  │
│  │ 2. Citation manifest builder                              │  │
│  │    Assigns short ordinal IDs S1..SN to the top-K chunks.  │  │
│  │    Returns: CitationManifest = { S1: ChunkRef, S2: ... } │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────▼─────────────────────────────┐  │
│  │ 3. Prompt injection                                       │  │
│  │    Renders manifest as `=== FUENTES DISPONIBLES ===`     │  │
│  │    block + binding contract:                              │  │
│  │      - cite ONLY using [S1] … [SN]                        │  │
│  │      - emit ragSources with sourceId field per entry       │  │
│  │      - allowed multi: [S1, S3] when same claim from both   │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────▼─────────────────────────────┐  │
│  │ 4. LLM generation (existing)                              │  │
│  │    Emits prose with `[Sn]` markers + ragSources[].         │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────▼─────────────────────────────┐  │
│  │ 5. Server-side validator (NEW)                            │  │
│  │    - Strips inline `[Sn]` markers whose n ∉ manifest      │  │
│  │    - Strips ragSources entries whose sourceId ∉ manifest  │  │
│  │    - Re-numbers survivors 1..M (drops gaps)               │  │
│  │    - Dereferences sourceId → ChunkRef metadata            │  │
│  │    - Returns: ValidatedSermonContent + ValidatedBibliography│
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                  │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT RENDERING                           │
│                                                                  │
│  - MarkdownRenderer plugin parses [N] → clickable footnote ref  │
│  - Hover/click → popover with source metadata                   │
│  - Bibliography section is the numbered authority               │
│  - WizardSourcesBadge stays the cross-step accumulated view     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4 · Data model changes

### 4.1 · `RAGSource` (domain — additive, back-compat)

```ts
export interface RAGSource {
    title: string;       // existing
    author?: string;     // existing
    page?: string;       // existing
    usedFor: string;     // existing
    /**
     * Stable ID assigned by the CitationManifest at retrieval time
     * (e.g. "S1"). Present on Phase-B-and-later outputs. Absent on
     * legacy sermons published before Phase B — those keep working
     * via the existing free-form fields and just don't get inline
     * markers.
     */
    sourceId?: string;
}
```

### 4.2 · `SermonContent.citationManifest` (NEW, optional)

```ts
export interface SermonContent {
    // ... existing fields
    /**
     * Snapshot of the citation manifest the server validated against,
     * persisted with the sermon so the inline-marker renderer can
     * dereference [Sn] → ChunkRef without re-running retrieval. One
     * manifest spans intro + body + conclusion. Absent on pre-Phase-B
     * sermons (renderer falls back to bibliography-only mode).
     */
    citationManifest?: CitationManifest;
}

export interface CitationManifest {
    entries: CitationManifestEntry[];
    /** Schema version — increments when the manifest shape changes. */
    version: '1';
}

export interface CitationManifestEntry {
    sourceId: string;            // "S1"
    resourceId: string;           // links back to library_resources/{id}
    chunkId: string;              // links back to document_chunks/{id}
    title: string;                // snapshot at generation time
    author?: string;
    page?: string;                // chunk metadata.page (NOT what the LLM said)
    excerpt: string;              // 1-2 sentence snippet from the chunk
}
```

### 4.3 · `Sermon.bibliography` (existing, evolved)

Stays `RAGSource[]`. Each entry now usually carries a `sourceId` so the detail page renderer can match inline markers back to it. Mirrors `SermonContent.citationManifest` for published sermons (the bibliography is a flattened, presentation-ready view of the manifest).

---

## 5 · Prompt contract

Section appended to `buildExegesisPrompt`, `buildHomileticsPromptBody`, `buildSermonDraftPromptBody`:

```
═══ FUENTES DISPONIBLES PARA CITAR ═══

Solo puedes citar las siguientes fuentes. NO inventes títulos, autores, ni
páginas. NO cites contenido que no aparece en esta lista.

[S1]  Teología Básica — Charles C. Ryrie, p. 104
      "El Verbo era Dios... [excerpt continued]"

[S2]  La Predicación Centrada en Cristo — Bryan Chapell, p. 287
      "[excerpt]"

[...]

REGLAS:
1. Cuando uses una idea de [Sn], inserta el marcador `[N]` (donde N es el
   número de la fuente) en el texto, justo después de la oración que la
   contiene. Ejemplo: "El Verbo es Dios eterno [1] y preexistente."
2. Si una oración combina dos fuentes, usa `[1, 3]`.
3. En el campo "ragSources" del JSON de salida, incluye una entrada
   POR CADA fuente que citaste, con el campo `sourceId` igual a "S1",
   "S2", etc. NO inventes entradas para fuentes que no usaste.
4. PROHIBIDO: citar tu propio prompt, citar "el usuario", citar
   "el contexto proporcionado", citar autores genéricos como
   "Grudem" o "Vine" SI no aparecen en la lista de arriba.

═════════════════════════════════════════
```

LLM output shape unchanged structurally — `[N]` markers inside markdown prose, `ragSources` array as before but with `sourceId` field.

---

## 6 · Validator behavior

`packages/application/src/use-cases/sermon/validateCitations.ts` (NEW):

```ts
export function validateCitations(
    raw: SermonContent,
    manifest: CitationManifest,
): { content: SermonContent; bibliography: RAGSource[]; stats: ValidationStats }
```

Per-field pass:
- **introduction / conclusion / callToAction (strings):**
  - Regex find `\[(\d+(?:\s*,\s*\d+)*)\]` markers.
  - For each marker, drop any number not in the manifest (re-numbered set).
  - If marker becomes empty (`[]`), strip the brackets entirely.
- **body[].content (strings):** same.
- **ragSources (array):** filter entries whose `sourceId` ∉ manifest. Drop. Log via `stats.droppedEntries`.

`stats` returned to caller for telemetry:
```ts
interface ValidationStats {
    markersValid: number;
    markersDropped: number;
    droppedEntries: { reason: 'unknown-id' | 'no-id' | 'junk-pattern'; entry: RAGSource }[];
    surfaces: ('introduction' | 'body' | 'conclusion' | 'callToAction')[];
}
```

After validation:
- Inline markers re-numbered 1..M (no gaps).
- Manifest re-pruned to only the entries actually surviving citation.
- Bibliography re-emitted with new sequential IDs.

---

## 7 · Renderer (client)

### 7.1 · Inline marker parser

New `markdownRenderer` plugin: replace `[N]` (where N is 1-based int) within prose with a clickable `<sup>` element. Component receives the manifest as context to dereference.

```tsx
<CitationMarker
    number={N}
    entry={manifest.entries.find(e => /* …match by ordinal */)}
/>
```

Hover → Popover with title + author + page + excerpt. Click → scroll to bibliography entry with the same number (anchor `#bibliography-N`).

### 7.2 · Bibliography numbered

`SermonBibliographySection` switches from `<ol>` auto-numbering to explicit `[N]` prefixes that match inline markers. Anchor each `<li id="bibliography-N">`.

### 7.3 · Markdown rendering surfaces affected

- `SermonPreview` (used by sermon detail + Vista Previa)
- `MarkdownRenderer` in canvas-chat (used by wizard step previews + chat refinement)
- `RichSermonEditor` (sermon edit page) — citations editable / re-numberable on edit
- `PreachMode` — keeps markers visible but disables popover (avoid mid-sermon UI distraction); footnote section optional toggle

---

## 8 · Export (Phase 3, separate PR)

`.docx`:
- Inline `[N]` markers stay as text.
- Bibliography section becomes "Fuentes consultadas" with the same numbering.
- (Future polish: convert `[N]` to Word footnote field references.)

PDF:
- Same `[N]` markers + bibliography table.
- (Future polish: actual Chicago-style footnotes via PDF library.)

---

## 9 · Migration & back-compat

- **Pre-Phase-B sermons** (no `citationManifest`, `RAGSource.sourceId` absent): renderer falls back to current Phase-A behavior — bibliography section only, no inline markers.
- **No backfill required** — pastors who care can regenerate.
- **Wizard mid-edit** when Phase B ships: any in-progress sermon keeps working; once regenerated post-Phase-B, gains markers.

---

## 10 · Tests

### 10.1 · Server-side
- Citation manifest builder: idempotent IDs per (resourceId, chunkIndex).
- Validator drops unknown `[Sn]` markers, drops unknown `ragSources.sourceId`, re-numbers survivors, preserves valid multi-cite `[1, 3]`.
- Junk-pattern + ID validation combined (Phase A's filter still runs as belt-and-suspenders for entries missing `sourceId`).
- Prompt injection rendering: stable order, escapes special characters in excerpts.

### 10.2 · Client-side
- Inline marker parser splits prose correctly, leaves non-citation `[N]`s (Bible refs, etc.) alone.
- Popover content matches manifest dereference.
- Click navigates to anchored bibliography entry.
- PreachMode renders markers but suppresses popover.

### 10.3 · Integration
- Generate sermon end-to-end with mocked LLM → manifest populated, inline markers render, bibliography numbered, click → anchor scroll.
- Generate with LLM emitting invalid `[S99]` and bogus ragSource entry → both stripped, telemetry stats reflect drops.

---

## 11 · Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM ignores ID contract, keeps citing free-form authors | Medium | Validator strips. Junk-pattern Phase A as backup. Reinforce prompt with examples. |
| LLM emits `[N]` markers where N is a Bible verse number, not citation | Medium | Constrain marker syntax to `[N]` followed by space or punctuation; Bible refs use `📖 Juan 3:16` format already, no `[]`. Validator only counts markers immediately following prose words. |
| Validator over-strips when LLM uses creative numbering | Low | Re-number survivors 1..M; never error out on partial mismatch. |
| Manifest persistence bloats Firestore doc | Low | Cap manifest at top-K=10 retrieved chunks. Excerpts truncated to 280 chars. |
| Renderer perf hit on large sermons | Low | Inline parser is single-pass regex; popover lazy-rendered on hover. |
| Pre-Phase-B sermons look "broken" next to Phase-B sermons | Low | Bibliography section + no-markers fallback is acceptable UX. |
| Pastors editing the markdown break `[N]` numbering | Medium | Phase B v1 leaves edits as plain text; future PR could re-validate on save. |

---

## 12 · Scope & sequencing

| PR | Scope | Days | Depends on |
|---|---|---|---|
| **B.1** | Domain: `CitationManifest` schema + validator + tests | 1 | #244 merged |
| **B.2** | Server: prompt injection + manifest persistence in `SermonContent` | 1-2 | B.1 |
| **B.3** | Client: inline marker parser plugin + popover + anchored bibliography | 1-2 | B.2 (so live data exists to test) |
| **B.4** | Refactor `WizardSourcesBadge` + `SermonBibliographySection` to consume manifest | 0.5 | B.3 |
| **B.5** | E2E test scenarios + telemetry dashboards for `ValidationStats` | 0.5 | B.4 |
| **C.1** | Phase 3 export: `.docx` + PDF inline markers + bibliography | 1-2 | B.5 |

Total: **5-8 working days** of focused implementation.

---

## 13 · Open questions for user before B.1 ships

1. **Marker style**: `[1]` (chosen) vs `[^1]` (Markdown footnote syntax) vs `¹` (typographic superscript)? Recommend `[1]` for max renderer compatibility — `[^1]` would need a remark plugin; superscript breaks plain-text export.
2. **Popover vs tooltip vs sidebar**: hover popover with title + author + page + excerpt (chosen) vs simple title tooltip vs full sidebar panel. Recommend popover — enough info to verify, doesn't steal screen.
3. **PreachMode**: hide markers entirely? Show as faint superscript without interaction? Toggle? Recommend faint visible non-interactive — pastor sees them in case they want to mention sources but can't get distracted by clicks.
4. **Verification badge ("Verificada" pill)** in bibliography per source — overkill once everything in bibliography is verified by definition? Recommend omit — presence in bibliography IS the verification.
5. **Editor surface**: should `RichSermonEditor` know about citations (preserve numbering on edit) or treat them as opaque text? B.3 leaves them opaque; B.5+ could add edit-time validation.

---

**Approval needed before B.1 implementation begins.** Surface objections, confirm/adjust the 5 open questions, then ship in the order above.
