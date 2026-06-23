# ADR-036 — Verificación de fidelidad del ancla

## Estado

`accepted` — aceptado 2026-06-23 (propuesta de arquitectura aprobada por el
fundador con 4 refinamientos). Plan de implementación = paso siguiente.

## Fecha

2026-06-23

## Garantía que promete (el ADR se nombra por esto, no por la técnica)

> **Toda ancla con la que el sistema confronta una lectura errónea es REAL (el
> verso existe) y de verdad REFUTA la lectura. Si no puede garantizarlo, NO
> confronta con ella.**

El nombre es por la garantía. La técnica interna (curado, vectorial, híbrido)
puede evolucionar sin reabrir el ADR.

## Dependencia explícita de ADR-035 (presencia → validez)

ADR-035 (perfil del pasaje + cobertura adaptativa) asumió que
`isFeatureAnchored` valida un ancla por **PRESENCIA**: `correctiveAnchor` con una
`reference` no vacía (`packages/domain/src/entities/PassageProfile.ts:252-265`).
`VerifiableAnchor` (`PassageProfile.ts:137-142`) es `{ reference, note? }` y **no
existe ningún verificador** en el repo (grep: cero `verifyAnchor`/`verseExists`).
El nombre "Verifiable" era aspiracional.

**ADR-036 cierra esa brecha: presencia → validez.** ADR-035 decide *CÓMO se
confronta* una lectura errónea (tres estados, override floor, engagement no
corrección); ADR-036 decide *CON QUÉ se confronta* (que el ancla sea real y
refute). Son de naturaleza distinta — por eso ADR nuevo, no extensión de 035.
**ADR-035 NO se toca.**

## Contexto

Hoy `common-misreading` se detecta 100 % en runtime: el detector LLM
(`profilePassage`, Flash) propone la lectura errónea + un ancla correctiva, y el
único filtro (`isFeatureAnchored`) chequea que la `reference` no esté vacía —
**no** que el verso exista ni que refute. Para las lecturas peligrosas ("se
pierde la salvación", prosperidad, legalismo) eso significa que el sistema puede
confrontar al pastor con un ancla que el modelo inventó o que no refuta. Es un
riesgo de tesis vivo: confrontar con dato falso es peor que no confrontar.

## Decisión — arquitectura (4 partes)

### 1. Tabla curada de lecturas peligrosas (DATO, no código)

Colección Firestore `verifiedMisreadings/` (editable sin deploy). Precedentes
reusados: `bibleCrossReferences/` (store de dato bíblico) + el gate de revisión
de confesiones (`Confession.reviewStatus`, `tagDoctrineLevels` →
`updateSectionDoctrineLevel`).

Schema de entrada (lectura + ancla + fuente + estado):

```
verifiedMisreadings/{id}:
  passageScope: { bookId, chapterStart, verseStart, verseEnd, ... }   // canon
  claim: "se pierde la salvación"
  whyWrong: "..."
  severity: 'critical' | 'standard'
  correctiveAnchors: [{ reference, note, sourceId? }]   // sourceId → chunk (ver §Procedencia)
  reviewStatus: 'pending-pastoral-review' | 'reviewed'  // reuso confesiones
  reviewedBy, reviewedAt
  verification: { versesExist: bool, refutes: 'yes'|'unclear'|'no', adjudicatedAt, modelTier }
  createdAt, sourceProvenance
```

Umbrales (qué es `critical`, pass-rates del flip) → config doc
`config/anchorFidelity` (dato editable, patrón de RECONFRONT_CAPS pero en store).

### 2. Verificación de existencia del verso (determinista, sin LLM)

`verifyAnchorVerse(reference) → { exists, text }` puro: `parsePassageReference`
(canon, ya valida) + `IBibleVersionRepository.getVerses` / `lookupCrossReferences`
(ya existen). Cierra la mitad determinista de presencia → validez.

### 3. Pase de adjudicación "¿el ancla refuta?" (reusa el juez de CA1)

Callable `adjudicateAnchorRefutes({ claim, anchorVerseText }) → { refutes:
'yes'|'unclear'|'no', reasoning, modelTier }`. **Reusa el núcleo de CA1**
(`coverageEngagement.judgeEngagement`, Sonnet) — misma firma {claim, ancla/texto}
→ juicio; y la forma de veredicto de `evaluateClaimSourceFidelity` (dormante, su
shape sirve de template). **Corre en ingest/revisión y se CACHEA en
`verification` — NO por query** (costo + determinismo).

### 4. Merge con la recuperación runtime (coexiste, con precedencia)

En la activación (`useGuidedSermon` → cristalizar perfil), tras el detector LLM:
lookup en `verifiedMisreadings/` por `passageScope`. Para cada entrada
habilitada (ver §Fail-closed): **precedencia** sobre la versión runtime (si el
LLM detectó el mismo claim, se usa la curada verificada; si lo perdió, se
fuerza). El LLM sigue agregando cobertura no-crítica, filtrada por
`verifyAnchorVerse`. El merge vive en la **app-layer** (acceso a Firestore),
DESPUÉS del ensamblado puro de dominio — `assemblePassageProfile` no se ensucia.

## Refinamientos no negociables (decisiones del fundador)

### R1 — Regla explícita para `unclear`

El adjudicador devuelve `yes | unclear | no`. El comportamiento de cada uno es
EXPLÍCITO:
- **`yes`** → única vía que habilita confrontar con esa ancla.
- **`no`** → fail-closed: la entrada NO se habilita, no se confronta.
- **`unclear`** (el caso más frecuente) → **NO confronta** y la entrada va a
  **cola de revisión pastoral** (`reviewStatus: 'pending-pastoral-review'`). **No
  se descarta en silencio** — un humano la adjudica.

Solo `reviewStatus: 'reviewed'` **y** `verification.refutes === 'yes'` llega al
path de confront.

### R2 — Revisor nombrado (responsable de la fidelidad del piso)

La garantía del piso vale lo que vale quien aprueba. El revisor del set crítico
es un **rol nombrado y responsable de la fidelidad del piso curado** — no un
detalle de código. **Rol: `floor-reviewer`** (revisor de fidelidad del piso). La
PERSONA que ocupa el rol (fundador / consejo teológico) la asigna el fundador —
pendiente de su confirmación. El ADR exige que exista el rol; la app gatea el
flip `pending-pastoral-review → reviewed` a ese rol (server-side, como
`updateSectionDoctrineLevel` gatea super_admin).

### R3 — Procedencia REAL, no redactada

`sourceProvenance` y `correctiveAnchors[].sourceId` salen de la **metadata
estructurada del chunk** (`DocumentChunk.metadata.page`, `resourceId`,
`resourceTitle`, `resourceAuthor` — `DocumentChunk.ts:6-26`), **NO de redacción
del LLM** — la misma distinción que cazamos con el tutor (cita en prosa, no
estructurada). Regla:
- Una ancla con `sourceId` → se muestra citable con fuente trazable hasta la
  página (vía el chunk).
- Una entrada curada **sin chunk de respaldo** → **NO se muestra como citable
  sin fuente trazable**. Puede existir como dato (el ancla bíblica sí se verifica
  por §2), pero su `sourceProvenance` queda marcada `sin-fuente-trazable` y la UI
  no la presenta como cita respaldada.

### R4 — `theological-tension` FUERA DE ALCANCE (por naturaleza no refutable)

ADR-036 cubre `verifiedMisreadings` — lecturas con un "incorrecto" **demostrable**
(hay un ancla que las refuta). Las **tensiones teológicas NO son refutables**:
tradiciones fieles difieren y el texto no las zanja; confrontar una postura sería
**imponer**. Meter tensiones a esta tabla rompería la asimetría de ADR-035
(misreading se confronta vs tensión se nudgea para tomar postura, nunca se
confronta). **Explícito: `theological-tension` queda fuera del alcance de
ADR-036.** Su mecanismo (toma-postura consciente) es trabajo aparte (v1.1), no
una entrada de `verifiedMisreadings`.

## Encuadre — qué resuelve 036 y qué NO

ADR-036 resuelve el **set crítico curado a mano** (chico: "pierde salvación",
prosperidad, legalismo, y las que se agreguen una a una con revisión). **NO
resuelve la escala.** La población a volumen vía pipeline semi-auto (extraer
candidatos de comentarios → revisión → store) es **Fase 2** y **depende del
módulo de catálogos de fuentes** (propiedad 3: entidad Catálogo, destrabar el
type-lock `'exegesis'|'homiletics'|'generic'` de los stores, aval/scoping) que se
apartó deliberadamente. El riesgo de volumen está mitigado por algo **que aún no
se construye** — 036 no debe leerse como solución de escala.

## Shadow antes de enforcement

El dato YA acumula: `passageProfileShadow/` (flag `passage_profile` on para 2
usuarios) graba las features runtime. Un job de shadow corre la verificación
sobre esas anclas y mide DOS cortes:
- **Corte 1 (determinista, medible ya)**: % de anclas runtime de
  `common-misreading` cuyo verso existe (`verifyAnchorVerse`).
- **Corte 2 (adjudicación, muestra)**: % que de verdad refutan (juez), sobre una
  muestra adjudicada.

**Gate del flip a enforcement** (descartar anclas no verificadas en runtime +
forzar el piso curado): tras ≥N confronts reales de misreading, si la tasa de
falla de verificación supera el umbral (riesgo real) → enforce. Si las anclas
runtime ya pasan casi siempre → la brecha es chica y el curado cubre solo el set
crítico, sin gate duro. **El shadow decide si es urgente o cosmético — con dato.**

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Extender ADR-035 | 035 está accepted/desplegado y decide comportamiento; mezclar lo vuelve un doc permanentemente abierto y confunde "cómo se confronta" con "con qué". |
| Catálogo curado puro (sin runtime) | Cobertura = exacto lo curado, ni un pasaje más. Pierde la cobertura amplia del runtime. Coexistir con precedencia da piso + cobertura. |
| Reemplazar runtime para el set crítico | Obliga a saber que un claim es crítico antes de detectarlo — más sucio. Precedencia en merge es más limpia. |
| Verificar por query (no en ingest) | Costo + no determinista. Cachear la verificación en la entrada al curar es barato y reproducible. |
| Listas hardcodeadas (como los keyword arrays de método) | No escala, requiere deploy por entrada. La tabla es dato con revisión. |

## Consecuencias

### Positivas

- Cierra la brecha presencia → validez para el set peligroso: el sistema nunca
  confronta con un ancla falsa o que no refuta (fail-closed).
- Procedencia real hasta la página en toda ancla citable, reusando la metadata de
  chunk existente.
- Dato editable + revisión humana: el piso crece sin deploy, con responsable
  nombrado.
- Reusa precedentes (confesiones review, cross-ref store, CA1 judge) — cero tech
  nueva.

### Negativas

- Trabajo de curación manual del set crítico inicial (mitigado: es chico).
- La escala depende de Fase 2 (catálogos) — no resuelta aquí.
- Una llamada de adjudicación (Sonnet) por entrada al curar (acotada a ingest).

### Neutrales

- `unclear` engrosa la cola de revisión pastoral — costo de revisión humana, por
  diseño (mejor que silenciar).
- Requiere asignar la persona del rol `floor-reviewer` (decisión del fundador).

## Referencias

- ADR-035 (perfil del pasaje + cobertura adaptativa) — la dependencia.
- Procedencia estructurada: `DocumentChunk.ts:6-26`, `retrieveChunks.ts:235-253`,
  `buildCitationManifest.ts`.
- Juez reusable: `coverageEngagement.ts` (CA1), `evaluateClaimSourceFidelity.ts`
  (dormante, template de veredicto).
- Gate de revisión reusado: `Confession.reviewStatus`,
  `admin/confessions/updateSectionDoctrineLevel.ts`.
- Fase 2 (fuera de alcance): módulo de catálogos de fuentes (propiedad 3).
