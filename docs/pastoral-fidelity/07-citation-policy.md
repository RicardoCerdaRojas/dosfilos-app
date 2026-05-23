# 07 — Política de citas rights-aware

Documento puente. Convierte el JSON canónico ([data/core-library-seed.json](./data/core-library-seed.json)) y los principios de derechos de autor + atribución + display contextual en spec operacional para el citation engine.

Adoptado formalmente por [ADR-006](./decisions/ADR-006-rights-aware-citation-system.md).

---

## 1. Por qué este documento existe

El motor de citas actual (Fases B + C, branch `feat/phase-c1-export-with-citations`) resuelve **identidad** de cita: el `[N]` mapea a un chunk validado que existe en la biblioteca. Pero NO resuelve tres problemas críticos:

1. **Atribución legal correcta**: SBLGNT (CC BY 4.0) requiere atribución obligatoria con copyright notice + license URL. Hoy no la honramos formalmente.
2. **Display contextual**: la misma cita se renderiza igual en sermón, en estudio bíblico, en post de blog y en respuesta RAG. Cada contexto exige un estilo distinto.
3. **Material moderno copyright**: Chicago Statement (1978/1982/1986) no puede ingestarse en full. Hoy el sistema no distingue entre "ingerible full" e "ingerible solo como metadata + summary interno".

Esta política cierra los tres gaps.

## 2. Modelo de dos ejes

Cada fuente se clasifica en **dos ejes independientes**:

### Eje A — `ingestion_status` (qué podemos almacenar e indexar)

| Estado | Significado | Acción del sistema |
|---|---|---|
| `approved_full_ingestion` | Texto completo público / dominio público | Ingestar texto completo + indexar para RAG |
| `approved_full_ingestion_with_attribution` | Texto completo bajo licencia que exige atribución (ej. CC BY) | Ingestar + render incluye atribución obligatoria |
| `approved_full_ingestion_for_historical_text_only` | Texto histórico es PD, pero edición moderna puede tener material editorial con derechos | Ingestar solo el texto histórico canónico; verificar appendices/notes antes de incluirlas |
| `approved_metadata_only` | Texto copyright sin permiso; solo metadata + summary interno | NO ingerir texto completo; permitir referencia + quote breve si legalmente apropiado |
| `requires_manual_review` | Estado legal incierto | Bloqueo hasta revisar |

### Eje B — `license` (cómo debemos atribuir)

| Licencia | Implicación de display |
|---|---|
| `Public Domain` | Sin requisitos de atribución; render libre |
| `CC BY 4.0` (u otra CC con atribución) | Atribución obligatoria: título + autor + license name + license URL + nota de cambios |
| `All rights reserved / permission required` | Solo referencia + summary + quote breve (fair use) |
| `Internally created` | Tratar como PD del proyecto |

### Matriz combinada

|  | `Public Domain` | `CC BY 4.0` | `All rights reserved` |
|---|---|---|---|
| `approved_full_ingestion` | ✅ render libre | ⚠ render con atribución | ❌ no aplicable |
| `approved_metadata_only` | N/A (sería full) | N/A | ✅ render como reference + summary |
| `requires_manual_review` | 🛑 bloqueado | 🛑 bloqueado | 🛑 bloqueado |

## 3. Schema implications

### Source schema (CORE Library)

```typescript
interface Source {
  sourceId: string;
  title: string;
  shortTitle: string;
  authorOrEditor?: string;
  year: number | string;
  sourceType: string;             // 'Confession' | 'Catechism' | 'Ecumenical creed' | 'Biblical text' | 'Modern doctrinal statement' | ...
  tradition: string;
  language: string;
  rightsStatus: string;           // human-readable explanation
  license: License;
  licenseUrl?: string;
  copyrightNotice?: string;
  ingestionStatus: IngestionStatus;
  riskLevel: 'low' | 'low_to_medium' | 'medium' | 'high_for_full_ingestion';
  sourceUrl: string;
  downloadUrl?: string | null;
  ragUse: string[];
  doNotUseFor?: string[];
  specialHandling?: string[];
  requiredAttribution?: string[];
  citation: CitationTemplates;
}

interface CitationTemplates {
  short: string;                  // "WCF {section_reference}"
  footnote: string;               // "The Westminster Confession of Faith, {section_reference}."
  bibliography: string;           // "The Westminster Confession of Faith. 1646."
  ragDisplay: string;             // "Source: Westminster Confession of Faith, {section_reference}."
}

type License =
  | 'Public Domain'
  | 'CC BY 4.0'
  | 'All rights reserved / permission required'
  | 'Internally created'
  | string; // extensible
```

### Chunk schema (Library extension)

Cada `chunk` de la library hereda metadata de su `Source` + propios:

```typescript
interface Chunk {
  chunkId: string;
  sourceId: string;
  sectionReference: string;       // "1.1" para WCF, "Q&A 1" para WSC, "John 1:1" para SBLGNT
  text: string;
  // ... existing chunk fields
}
```

Citation render se computa al momento del display via:

```typescript
function renderCitation(chunk: Chunk, source: Source, context: CitationContext): RenderedCitation {
  const template = source.citation[contextToStyle(context)];
  const text = template.replace('{section_reference}', chunk.sectionReference);
  const attribution = computeRequiredAttribution(source);
  return { text, attribution, license: source.license };
}
```

## 4. Citation rendering per context

El JSON define **4 estilos base** + 1 estilo especial para material moderno. En Preach, estos estilos se mapean al `pedagogyPattern` del artefacto (ver [ADR-005](./decisions/ADR-005-exegetical-confessional-pedagogy.md) + [06-pedagogy-applied.md](./06-pedagogy-applied.md)).

### Mapeo `ArtifactType` → `citationStyle`

| ArtifactType | pedagogyPattern | citationStyle | Ejemplo |
|---|---|---|---|
| `sermon` | `exegetical` | `sermon` (pastoral) | "Como resume la Confesión de Westminster 1.1, Dios quiso dejar su revelación por escrito..." |
| `bible-study` | `exegetical` | `bible_study` (document + section) | "Véase Westminster Confession of Faith 1.1; Heidelberg Q&A 1." |
| `sunday-school-lesson` | `exegetical` | `bible_study` | igual |
| `pastoral-letter` | `synthetic` | `sermon` (pastoral, fluido) | "Como bien dice Heidelberg en su primera pregunta y respuesta..." |
| `newsletter` | `synthetic` o `methodological` | `sermon` | igual |
| `blog-post` | `panoramic` o `methodological` | `essay_or_article` (footnote) | "The Westminster Confession of Faith, 1.1." |
| `devotional` | `synthetic` | `sermon` corto | "Recordemos lo que dice Heidelberg Q&A 1..." |
| `exegetical-paper` | `exegetical` | `essay_or_article` (footnote + bibliografía) | "The Westminster Confession of Faith, 1.1." + entrada bibliográfica |
| `series-introduction` | `panoramic` | `sermon` | igual |
| `series-closing` | `synthetic` | `sermon` | igual |
| `methodology-talk` | `methodological` | `essay_or_article` o `sermon` según target | variable |
| `rag-answer-chat` (Faculty chat) | N/A | `rag_answer` (transparent) | "Source: Westminster Confession of Faith, 1.1. Historical confessional reference subordinate to Scripture." |

### Estilo especial — modern statements (Chicago)

Independiente del artifact type, cuando la fuente es `approved_metadata_only`, el render usa **`modern_statement_warning`**:

```
Reference: Chicago Statement on Biblical Inerrancy, Article XVIII. Full text not indexed; cited as a modern evangelical doctrinal statement.
```

Esto se aplica como override del citationStyle del artefacto. Razón: respeto al copyright + transparencia al lector.

## 5. Required attribution rules

Para fuentes con `requiredAttribution`, el render del artefacto **incluye obligatoriamente** los elementos listados, sea inline o en pie de página.

Ejemplo SBLGNT en un sermón:

```
[en el cuerpo del sermón]
"En el principio era el Verbo" (Juan 1:1, SBLGNT).

[en pie de página o nota final del artefacto]
Greek text: The Greek New Testament: SBL Edition, ed. Michael W. Holmes.
Copyright 2010 Logos Bible Software and the Society of Biblical Literature.
Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
Used with segmentation and tokenization for retrieval.
```

Implementación:

- Citation engine computa una lista de `requiredAttributions[]` para todo el artefacto
- Export pipeline (PDF, Word, web) renderea esta lista en sección "Atribuciones" al final
- Si el artefacto se publica web (blog), aparece como footer

## 6. Modern statements — política específica

Chicago 1978/1982/1986 (y futuras adiciones modernas similar copyright):

### Permitido

- Almacenar metadata (título, autor, año, URL fuente)
- Almacenar **summary interno** redactado por nosotros (no copy-paste del texto original)
- Mostrar reference + summary en el sistema RAG
- Quote breve (≤ 50 palabras) si legalmente apropiado bajo fair use
- Linkear al texto completo en el URL externo

### NO permitido

- Ingerir texto completo
- Reproducir secciones extensas
- Indexar para RAG el texto verbatim
- Tratar como confesión histórica con misma fuerza eclesial

### Cómo se ve en práctica

Cuando un pastor (en su `Project` Reformado) hace una pregunta a Faculty sobre inerrancia bíblica:

```
Faculty respuesta:
"La doctrina de la inerrancia se afirma en la tradición evangélica moderna,
notablemente en la Declaración de Chicago sobre la Inerrancia Bíblica (1978),
Artículo XVIII, que sostiene que [resumen breve elaborado internamente del Art. XVIII].

[Citation block]
Reference: Chicago Statement on Biblical Inerrancy, Article XVIII.
Full text not indexed; cited as a modern evangelical doctrinal statement.
Texto completo disponible en: https://library.dts.edu/Pages/TL/Special/ICBI.shtml
"
```

## 7. Bridge al manifiesto

El manifiesto pedagógico ([05-pedagogy-manifesto.md](./05-pedagogy-manifesto.md)) establece:

> "Los credos resumen lo que el texto enseña, no lo imponen. La autoridad final es la Escritura."

El JSON declara explícitamente:

```json
"authority_policy": {
  "final_authority": "Scripture",
  "citation_rule": "Never cite a confession, creed, catechism, or modern statement
   as the final authority over a biblical passage. Use it as historical,
   theological, or confessional support."
}
```

**Esta es la misma convicción.** El JSON es el manifesto operacionalizado en política del citation engine.

### Manifestación práctica

- Todo render `rag_answer` que cite confesión/credo/declaración añade la frase: "Historical confessional reference subordinate to Scripture."
- Faculty prompts incluyen: "Never present a confessional document as the final authority. Always frame it as the church's faithful reading of the biblical text."
- Gates: si el `centralIdea` del sermón cita una confesión como AUTORIDAD ("la WCF dice X, por tanto X es verdad"), el fidelity pass emite warning: "Reformula apelando al texto bíblico que la WCF resume."

### Compromiso "no proof-texting"

El manifiesto exige: "ninguna doctrina sustantiva descansa sobre un solo versículo." Implementación en citation engine:

- Para cada claim del borrador final con etiqueta `doctrinaSustantiva` (detectada via prompt o heurística), validador verifica que tenga **≥2 citas de pasajes bíblicos distintos** además de cualquier confesional support
- Solo confesión + 1 verso = bloqueo blando "necesita testimonio bíblico plural"

## 8. Bridge a la infraestructura existente (Fases B + C)

El motor actual de citas (branch activo `feat/phase-c1-export-with-citations`) provee:

- `citationManifest` por sermón con `[N]` → `chunkRef`
- `validateCitationManifest` server-side hook (validación de identidad)
- Anchored bibliography rendering (Fase B.3)
- Export PDF/Word con marcadores + bibliografía (Fase C.1)

### Extensiones requeridas (Fase 3 + retroactivamente)

1. **Source schema extension**: agregar campos `license`, `licenseUrl`, `ingestionStatus`, `riskLevel`, `requiredAttribution`, `citation: CitationTemplates`, `specialHandling`
2. **Chunk metadata**: heredar `sourceId` (ya existe); persistir `sectionReference` si falta
3. **Render function**: nueva utility `renderCitation(chunk, source, context)` que reemplaza el rendering hardcoded actual
4. **Attribution aggregator**: por artefacto, computa lista de `requiredAttributions[]` y la inyecta en export pipeline
5. **Modern statement renderer**: tratamiento especial cuando `ingestionStatus === 'approved_metadata_only'`
6. **No-proof-texting validator**: extiende `validateCitationManifest` con plurality check para claims sustantivos
7. **Authority subordination footer**: appendable a render `rag_answer`

### Compatibility

Cambios son **aditivos**. Citation engine actual sigue funcionando sin estos campos (default a behavior actual). Roll-out gradual via feature flag por usuario.

## 9. Política de traducción

Del JSON:

```json
"default_language_policy": {
  "preferred_ingestion_language": "English",
  "spanish_usage_note": "Use Spanish translations only if the translation is
   public domain, openly licensed, created internally, or used with explicit permission.",
  "generated_translation_policy": "If the system generates a Spanish translation
   from a public-domain English source, mark it as an internal/generated
   translation and cite the original source."
}
```

### Implementación

- Catálogo CORE almacena **texto en inglés** (canónico) para Westminster, 1689, Heidelberg, etc. (la mayoría tienen textos canónicos en inglés)
- Cuando el sistema requiere render en español (sermón en español, etc.):
  - Si existe traducción PD/open → usarla, con citation que apunte al original + nota de traducción
  - Si no existe → generar traducción internamente y etiquetar como **"Traducción interna desde [fuente original]"**
- Heidelberg en alemán original, Augsburg en latín original: similar política

Audit log persiste qué traducciones son auto-generadas vs canónicas.

## 10. Migración de la biblioteca actual

La library actual del usuario (per-user library) ya tiene chunks con metadata mínima. Migración a nuevo schema:

1. **CORE Library**: ingestar las 14 fuentes v1 desde el JSON (entrega de Fase 0)
2. **Per-user libraries existentes**: backfill conservador
   - `license` default a `'unknown / requires_manual_review'` para chunks legacy
   - `ingestionStatus` default a `'requires_manual_review'` para chunks legacy
   - Pastor puede tagger sus propias fuentes con estados conocidos
3. **Nuevas ingesta de usuario**: wizard de upload pide `license` + `ingestionStatus` (con explicación + defaults conservadores)

Sin migración disruptiva. Behavior actual preservado para chunks pre-migración.

## 11. Open questions

- [ ] **Per-user upload UX**: ¿cómo le pedimos al pastor que declare license + ingestion_status de fuentes que sube él? Default conservador + tooltip explicativo + opción "no sé / revisar después" que mete chunk en `requires_manual_review`?
- [ ] **Quién hace la revisión legal de fuentes `requires_manual_review`**: ¿proceso interno equipo Preach? ¿hold queue visible al admin?
- [ ] **¿Permitimos disable de attribution en el artefacto?**: SBLGNT exige atribución, pero pastor puede objetar visibilidad. Recomendación: NO permitir disable (compromiso de la licencia es nuestro); footer compacto pero presente.
- [ ] **Catálogo de licencias soportadas**: ¿solo PD + CC BY + All rights reserved + Internally? ¿agregar CC BY-SA, CC BY-NC, GFDL, custom?
- [ ] **Heidelberg / Augsburg en idiomas originales**: ¿almacenar en alemán/latín además de inglés/español?
- [ ] **Audit de cumplimiento por artefacto exportado**: dashboard que muestre por proyecto cuántas atribuciones se cumplieron, cuáles fueron skipped, etc.

Cerrar cada una con ADR específico al momento de implementación.

## Referencias

- JSON canónico: [data/core-library-seed.json](./data/core-library-seed.json)
- ADR formal: [ADR-006](./decisions/ADR-006-rights-aware-citation-system.md)
- Manifesto: [05-pedagogy-manifesto.md](./05-pedagogy-manifesto.md)
- Bridge pedagogía: [06-pedagogy-applied.md](./06-pedagogy-applied.md)
- Phase docs impactadas: 0 (catálogo CORE), 3 (fidelity pass + attribution), 5 (artifact citation styles)
