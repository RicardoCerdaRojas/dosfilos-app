# Proposal — PDF export rewrite (HTML→PDF via headless browser)

## Estado

`proposed` — pendiente scheduling como PR follow-up. NO bloquea cierre de Fase 0 ni roadmap Pastoral Fidelity. Deuda pre-existente del export pipeline Phase B/C, surfaced durante smoke 7 de Fase 0.

## Fecha

2026-05-25

## Contexto

Durante smoke 7 (SBLGNT attribution PDF/Word export), exportación de sermón vía Faculty path reveló 5 bugs distintos en `PdfExportService.ts` que comprometen la calidad del artefacto final:

### Bug A — Greek/Hebrew encoding garbage

`PdfExportService.ts:77` usa `doc.setFont('times', 'roman')`. Las fuentes built-in de jsPDF (Times/Helvetica/Courier) **solo soportan WinAnsiEncoding (Latin-1)**. Caracteres griegos (λόγος, ἀρχή, μονογενής) y hebreos se transcodifican como bytes Latin-1 — resultado visual: "Ø=ÜÖ", "ÁÇÇ", "»Ì³¿Â", "&½".

Smoke test screenshot evidencia: secciones "Palabras Clave" con `*arch*`, `*logos*`, `*pros*`, `*ēn*` todas garbadas.

### Bug B — Markdown sin parsear

`PdfExportService.ts:80` hace `sermon.content.split('\n')` + dump raw. Markdown rendering literal:
- `**bold**` → asteriscos literales visibles
- `*italic*` → asteriscos literales visibles
- `<br/>` → tag HTML literal visible
- `[text](#anchor)` → corchetes + paréntesis literales visibles
- `## H2` → solo strip de `#` al inicio (línea 92-93), pero formato heading no aplicado consistentemente
- `> "blockquote"` → mark `>` literal visible

### Bug C — Letter-spacing exagerado

Side-effect de Bug A: cuando jsPDF encuentra chars fuera de encoding, el width calculation falla. `splitTextToSize` produce líneas con spacing intermitente. Smoke screenshot evidencia: párrafos con spacing duplicado entre palabras.

### Bug D — Saltos de página rotos

`checkPageBreak` ([PdfExportService.ts:19](../../../packages/infrastructure/src/export/PdfExportService.ts#L19)) usa altura estimada `paragraphHeight = lines.length * 7`. Cuando font varía o markdown raw contribuye altura no contabilizada (`<br/>`, ilustraciones largas), el cálculo falla → secciones cortadas mid-content.

### Bug E — Word export con mismos problemas

`exportSermonToDocx.ts` (Phase C.1) tiene patrón similar: split por `\n` sin parseo markdown. `stripMarkdownEmphasis` ([packages/web/src/lib/sermon/exportSermonToDocx.ts:175](../../../packages/web/src/lib/sermon/exportSermonToDocx.ts#L175)) solo remueve emphasis (no headers, no links, no blockquotes).

## Decisión propuesta

**Reemplazar pipeline jsPDF/docx con render server-side de HTML via headless browser** (Puppeteer en Cloud Function).

### Por qué Puppeteer (Opción C)

3 alternativas evaluadas:

| Opción | Effort | Calidad | Mantenimiento | Decision |
|---|---|---|---|---|
| **A — Patches mínimos** sobre jsPDF actual (embed Unicode font + basic markdown parser) | ~1 día | Aceptable, sigue limitado | Alto debt (cada formato nuevo = patch) | ❌ |
| **B — Rewrite con `@react-pdf/renderer`** | ~3-4 días | Alta — React components → PDF | Limpio long-term | ⚠ Considerada |
| **C — Server-side HTML→PDF via Puppeteer** | ~2-3 días | **Máxima** — HTML view es source of truth | Mínimo — reuso UI render | ✅ Recomendada |

Razones que inclinan hacia C:

1. **El sermón YA tiene HTML rendering excelente**. "Vista Previa" en el wizard renderiza markdown perfectamente: Greek/Hebrew nativos via browser engine, headings, blockquotes, énfasis. Toda la sofisticación tipográfica del CSS ya está hecha.

2. **Single source of truth**. HTML view = export. Cero divergencia entre lo que el pastor ve preview vs descarga. Bugs que afectan PDF también afectan preview — un solo lugar para fixear.

3. **Greek/Hebrew/Unicode free**. Browser engine maneja Unicode nativo. No font embedding manual, no encoding hacks.

4. **Markdown libraries ya están integradas** en el preview (react-markdown). Reusar.

5. **Word export reusable**. Pandoc o similar convierte HTML → docx con fidelidad alta. Patrón consistente con PDF.

6. **Pagination handled by browser print engine**. CSS `page-break-*` directives controlan exactamente dónde cortar. Mucho más preciso que estimación manual.

7. **Headers/footers via CSS @page**. Numeración, branding, fecha consistente.

### Arquitectura propuesta

```
1. Pastor click "Exportar PDF"
   ↓
2. Web client llama callable `renderSermonPdf(sermonId)`
   ↓
3. Cloud Function `renderSermonPdf` (~512MB memory, Puppeteer):
   a. Lee sermon doc + citationManifest + studyDepthSnapshot
   b. Servirse a sí mismo HTML print-friendly del sermón
   c. Aplica CSS @media print: typography pastoral, page breaks, footer
   d. Puppeteer `page.pdf()` → Buffer
   e. Upload Buffer a Cloud Storage `/sermon_exports/{userId}/{sermonId}.pdf`
   f. Retorna signed URL
   ↓
4. Web client descarga via signed URL
```

### Reuso desde HTML preview

Codebase tiene componente `SermonPreview` que renderiza el sermón markdown perfectamente. Strategy:

- Función `renderSermonHTML(sermon, options)` produce HTML standalone
- HTML reusa los mismos componentes React renderizados server-side via `renderToStaticMarkup`
- CSS print-specific en bundle dedicado: `sermon-print.css`
- Footnotes section + Bibliography section + Attributions section composables

### CSS print stylesheet (esqueleto)

```css
@page {
  size: A4;
  margin: 25mm 20mm;
  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-family: 'Times New Roman', serif;
    font-size: 9pt;
    color: #999;
  }
  @top-right {
    content: "DosFilos.Preach";
    font-size: 9pt;
    color: #ccc;
  }
}

@media print {
  body {
    font-family: 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #1a1a1a;
  }

  h1 { font-size: 22pt; margin-top: 0; page-break-after: avoid; }
  h2 { font-size: 15pt; margin-top: 16pt; page-break-after: avoid; }
  h3 { font-size: 12pt; margin-top: 12pt; page-break-after: avoid; }

  blockquote {
    border-left: 3pt solid #999;
    padding-left: 10pt;
    color: #555;
    page-break-inside: avoid;
  }

  .greek, .hebrew {
    font-family: 'SBL BibLit', 'Cardo', 'Times New Roman', serif;
  }

  .bibliography, .attributions {
    page-break-before: always;
  }

  .citation-marker {
    vertical-align: super;
    font-size: 0.7em;
  }
}
```

### Cost / latency tradeoffs

| Dimension | jsPDF actual | Puppeteer propuesto |
|---|---|---|
| Cold start | ~50ms | ~3-5s (container + Chrome boot) |
| Warm execution | ~200ms | ~1-2s (page render + print) |
| Memory | Client-side, ~10MB JS | Server-side 512MB function |
| Cost per export | $0 (client) | ~$0.002 per export (GB-seconds Cloud Functions) |
| Greek/Hebrew quality | Roto | Perfecto |
| Markdown rendering | Roto | Perfecto |
| Pagination quality | Estimación manual, frecuente off | Browser engine, preciso |
| Mantenimiento | Alto (cada formato = patch) | Bajo (CSS) |
| Word export | Roto similar | Reusable via Pandoc HTML→docx |

Costo recurrente esperado: si 1000 sermons/mes generan export, ~$2/mes en Functions. Defensible.

### Word export via Pandoc

Después del PR PDF:

```
1. Reuso función `renderSermonHTML(sermon, options)`
2. Cloud Function `renderSermonDocx`:
   a. HTML stream a Pandoc binary embedded
   b. Pandoc → docx
   c. Upload Cloud Storage
   d. Signed URL
3. Web client descarga
```

Reuso ~90% de la infra PDF. Estimado adicional: ~1 día.

## Reuso identificado

**Existente**:
- React markdown rendering en preview (existing component)
- Citation manifest persistido (Phase B.2)
- `aggregateRequiredAttributions` (Phase 0 PR 0.3)
- Cloud Storage signed URL pattern (existing)
- Audit log pattern (existing)
- Firebase Functions infrastructure (existing)
- `SermonEntity` + `Sermon` schema (existing)

**Construir nuevo**:
- `renderSermonHTML(sermon, options)` util shared
- `sermon-print.css` stylesheet print-specific
- `renderSermonPdf` callable + Puppeteer integration
- Storage path conventions + cleanup policy (TTL 7 días)
- Web client: replace `PdfExportService.exportSermonToPdf` con callable invocation + signed URL download
- Loading state + error handling UI
- (Phase 2) `renderSermonDocx` callable + Pandoc integration

## Criterios de aceptación

- [ ] PDF export muestra texto griego (λόγος, ἀρχή, μονογενής) con glyphs correctos
- [ ] PDF export muestra texto hebreo (אֱלֹהִים, רוּחַ) con glyphs correctos
- [ ] Markdown renderiza correctamente: `**bold**` → bold, `*italic*` → italic, headers H1-H4
- [ ] Blockquotes (`> "..."`) renderizan con border + indent
- [ ] Page breaks no cortan blockquotes ni headers de su contenido
- [ ] Header/footer con numeración (`p X / Y`)
- [ ] Bibliografía + Atribuciones secciones en página propia (`page-break-before: always`)
- [ ] Signed URL expires 7 días después de generación
- [ ] Loading state durante render (~3-5s)
- [ ] Error handling: timeout, OOM en Puppeteer, fallback message
- [ ] Cold start vs warm cache instrumented
- [ ] Tests: smoke export con sermón griego + hebreo + bibliografía + atribuciones

## Trade-offs

### Positivos

- **Calidad tipográfica máxima**: HTML/CSS render via browser = mejor herramienta posible
- **Greek/Hebrew nativos**: cero hacks de font embedding
- **Single source of truth**: preview = export
- **Markdown libre**: cualquier formato que renderice en HTML, renderiza en PDF
- **Mantenimiento bajo**: cambios de typography en CSS, no en código de pintado
- **Word export reusable**: Pandoc desde mismo HTML

### Negativos / Riesgos

- **Cold start ~3-5s**: aceptable para acción explícita "exportar PDF". Mitigar con loading state.
- **Cost recurrente Functions**: ~$2/mes per 1000 exports. Negligible vs valor.
- **Puppeteer container ~250MB**: mayor que jsPDF. Mitigar con keep-warm function si volumen alto.
- **CSS print bugs específicos del browser engine**: ocasionalmente diferentes browsers tienen quirks. Mitigar pinning Chrome version.
- **Storage growth**: PDFs persistidos en Cloud Storage. Mitigar con TTL 7 días + regenerate on-demand.
- **Latency vs jsPDF**: 1-2s vs 200ms. Acceptable para export, no para inline preview.

### Neutrales

- Schema sermon unchanged
- Citation manifest unchanged
- Validator pipeline unchanged

## Ubicación en roadmap

**No es nueva phase**. PR follow-up de Phase B/C (export pipeline).

Scheduling sugerido: post-Fase 0 stable, antes de Fase 5 (donde nacen artifact types adicionales que también exportan).

Naming PR sugerido: `feat(export): server-side HTML→PDF via Puppeteer + Pandoc fallback`.

## Comparison con estado actual

| Aspecto | jsPDF actual | Puppeteer propuesto |
|---|---|---|
| Greek/Hebrew encoding | ❌ Garbage | ✅ Nativo |
| Markdown parsing | ❌ Raw text | ✅ Full |
| Page breaks | ⚠ Estimación frecuentemente off | ✅ Browser engine preciso |
| Letter-spacing | ❌ Errático | ✅ Consistente |
| Headers/footers | ⚠ Manual loop | ✅ CSS @page |
| Bibliography section | ✅ Renderiza | ✅ Renderiza |
| Attributions section | ✅ Renderiza | ✅ Renderiza |
| Markdown links | ❌ Literal | ✅ Anchor links |
| Blockquotes | ❌ Literal `>` | ✅ Estilo CSS |
| Word export quality | ❌ Mismos problemas | ✅ Via Pandoc HTML→docx |

## Phases de implementación

### Fase 1 — Foundation (1 día)
- Cloud Function scaffolding con Puppeteer
- `renderSermonHTML` util compartido entre preview y export
- CSS print stylesheet básica
- Cloud Storage path + signed URL conventions

### Fase 2 — PDF export (1 día)
- `renderSermonPdf` callable
- Web client switch desde `PdfExportService.ts` a callable
- Loading state + error handling
- Smoke test con sermón griego

### Fase 3 — Polish + Word export (1 día)
- CSS refinement: typography pastoral, page-break rules
- `renderSermonDocx` callable via Pandoc
- Headers + footers + page numbering
- Cleanup policy storage (TTL 7 días via Firebase scheduler)

### Fase 4 — Migration cleanup (medio día)
- Remove `PdfExportService.ts` (deprecated)
- Remove `exportSermonToDocx.ts` (deprecated)
- Update bibliography rendering tests si rompen

Total: **~3-4 días concentrados**.

## Open questions

1. ¿Embedded Pandoc binary o HTTP service externo (Pandoc-as-a-service)?
2. ¿Storage path includes hash de content para cache busting cuando sermon edits?
3. ¿Cleanup automático post-7-días o sticky permanent en sermon attachment?
4. ¿Fallback inline jsPDF si Puppeteer falla? Or single point of failure aceptable?
5. ¿Keep-warm function ($) o accept cold start ($cero)?

Resolver inline al arrancar implementación.

## Referencias

- Phase B (PRs #244-#248): citation manifest infrastructure shippeada
- Phase C.1: PDF + Word export con inline markers + bibliografía
- Phase 0 PR 0.3: SBLGNT attribution aggregator
- ADR-006: rights-aware citation system
- Manifesto: typography pastoral implícita ("Presentación proyectada con texto ancla destacado")
