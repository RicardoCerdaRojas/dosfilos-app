# Plan de implementación — Fase 1 de ADR-036 (verificación de fidelidad del ancla)

> **DRAFT para revisión.** No es código. Implementa
> [ADR-036](../decisions/ADR-036-anchor-fidelity-verification.md). Aprobar antes
> de tocar código. Mismo ritual que el plan de ADR-035.

## 0. Principios que ordenan el plan

- **Fail-closed por construcción**: solo entradas `reviewed` + `refutes==='yes'`
  (o anclas runtime que pasan verso-existe) llegan al path de confront. Lo no
  verificado NUNCA confronta.
- **Verificación en ingest, NO en runtime**: el adjudicador (Sonnet) corre al
  curar/revisar y se cachea. **Cero LLM en el path del pastor.** Runtime solo lee
  Firestore + chequea verso-existe (determinista).
- **Shadow antes de enforce** (como 035): el verify-drop de anclas runtime se
  mide en sombra antes de aplicarlo.
- **Dato, no código**: la tabla y los umbrales viven en Firestore/config.
- **Dependencias externas explícitas** (§9): la PERSONA del `floor-reviewer` y el
  módulo de catálogos (Fase 2) NO se cierran aquí.

## 1. Orden de PRs y commits (dominio puro → app → web)

| PR | Capa | Entrega | Testeable |
|---|---|---|---|
| **PR1** | **dominio puro** | `VerifiedMisreading` entity + schema; `decideAnchorAdmission` (la decisión fail-closed pura: !verso→reject, no→reject, unclear→review-queue, yes+reviewed→confront) | unit (todas las ramas, esp. fail-closed) |
| **PR2** | aplicación | `verifyAnchorVerse(reference)` (determinista: `parsePassageReference` + `IBibleVersionRepository.getVerses`) → `{exists, text}` | unit (Cut 1) |
| **PR3** | functions | callable `adjudicateAnchorRefutes({claim, anchorVerseText})` (reusa el juez CA1, Sonnet) → `{refutes, reasoning, modelTier}`; cachea | det. (fake client) + eval vivo guarded |
| **PR4** | functions + admin | store `verifiedMisreadings/` + ingest callable + **review callable role-gated** (corre verify+adjudica, cachea, flip pending→reviewed) + tab de cola en admin | callable + role-gate |
| **PR5** | app/web | **merge con precedencia** en activación (entre `assemblePassageProfile` y `crystallize`, `useGuidedSermon.ts:55-59`) + filtro verso-existe a anclas runtime + **garantía fail-closed al path de confront** | unit (Cut 4 + **fail-closed**) |
| **PR6** | functions | job de **shadow** (corre verify+adjudica sobre `passageProfileShadow/`, mide Cut 1/2) + flag `anchor_fidelity_enforce` (gatea el verify-drop runtime) | shadow + flag off |

**Confirmo el orden propuesto por el fundador** (store → verify → adjudicador →
merge → shadow) con un ajuste: **la decisión pura (`decideAnchorAdmission`) va
PRIMERO (PR1)**, aislada y verde, antes que nada la consuma — igual que
`decideMisreadingTurn`/fila-ortogonal en 035. El store (PR4) va después de los
verificadores (PR2/PR3) porque la review callable los usa.

**Qué es dominio puro vs app vs web**:
- **Dominio puro**: `VerifiedMisreading` entity, `decideAnchorAdmission` (sin
  LLM/IO — la lógica fail-closed). Testeable sin nada.
- **Aplicación**: `verifyAnchorVerse` (usa el puerto `IBibleVersionRepository`,
  determinista); el merge con precedencia (lee Firestore, ensucia NADA del
  dominio — `assemblePassageProfile` queda intacto).
- **Functions**: el adjudicador (Sonnet), el store/ingest/review callables, el
  shadow job. (functions no importa domain → espeja shapes, como ya hacemos.)
- **Web**: cablear el merge en `useGuidedSermon.activate` + el tab de cola en
  admin.

## 2. Reuso vs nuevo (contra los precedentes)

| Pieza | Reusa | Greenfield |
|---|---|---|
| Decisión fail-closed | patrón de `decideMisreadingTurn` (pura, exhaustiva) | `decideAnchorAdmission` |
| Verso-existe | `parsePassageReference` (canon) + `RVR1960Repository.getVerses` / `lookupCrossReferences` | `verifyAnchorVerse` (composición) |
| Adjudicador | **`coverageEngagement.judgeEngagement`** (CA1, Sonnet) generalizado + shape de veredicto de `evaluateClaimSourceFidelity` | callable `adjudicateAnchorRefutes` |
| Store + ingest | `bibleCrossReferences/` + `ingestBibleCrossReferences` (store de dato bíblico) | colección `verifiedMisreadings/` |
| Review-gate | **`updateSectionDoctrineLevel.ts`** (onCall role-gated `super_admin` + `reviewStatus` + audit `admin_audit_log`) | review callable de misreadings (mismo patrón) |
| Procedencia | `DocumentChunk.metadata.{page,resourceId}` (estructurada) | regla "sin chunk → no citable" |
| Merge insertion | `useGuidedSermon.ts:55-59` (assemble→crystallize) | paso de merge con precedencia |
| Shadow | `recordPassageProfileShadow` + `passageProfileShadow/` (dato ya acumula) | job de verificación + cuts |
| Flag enforce | topología `passage_profile_enforce` (shadow/enforce) | `anchor_fidelity_enforce` |

Greenfield real = `decideAnchorAdmission`, el callable adjudicador (aunque reusa
el juez), el store + sus callables, el merge, el shadow job. Todo lo demás es
composición de precedentes.

## 3. Los cuatro cortes de verificación en CI + fixtures

| Corte | PR | Qué prueba | Fixture |
|---|---|---|---|
| **Cut 1 — existencia del verso** (determinista, sin LLM) | PR2 | `verifyAnchorVerse` resuelve un verso real, rechaza uno inexistente | "Juan 10:28-29" → exists; "Juan 99:1" → !exists; cross-chapter "Juan 1:50-2:2" → exists (reusa el fix de R1) |
| **Cut 2 — adjudicación `yes`** | PR3 | el juez clasifica un ancla que SÍ refuta | claim "se pierde la salvación" + texto de Jn 10:28-29 → `refutes:'yes'` |
| **Cut 3 — adjudicación `no`/`unclear`** | PR3 | ancla que no refuta o ambigua → NO confronta | claim X + verso irrelevante → `no`; ancla parcial → `unclear` |
| **Cut 4 — merge con precedencia** | PR5 | entrada crítica `reviewed`+`yes` toma precedencia sobre la runtime (reemplaza si dup, fuerza si el LLM la perdió) | perfil runtime con misreading sin ancla verificada + entrada curada del mismo claim → el confront usa la curada |

**El fixture de FAIL-CLOSED es el guardrail más importante** (§5).

## 4. El estado `unclear` cableado (R1)

- `decideAnchorAdmission({versesExist:true, refutes:'unclear', ...})` → **`'review-queue'`**, NUNCA `'confront'`.
- La **cola** = entradas en `verifiedMisreadings/` con `reviewStatus:
  'pending-pastoral-review'` (mismo marcador que confesiones). El admin tab las
  lista. `unclear` **no se descarta en silencio** — queda persistida en la cola
  con su `verification.refutes='unclear'` para que el `floor-reviewer` la
  adjudique a mano.
- Una ancla **runtime** (no curada) que da `unclear` en el shadow → se loguea
  (telemetría de huecos), NO se promueve sola a la tabla; el humano decide.

## 5. Fail-closed probado, no asumido

- **Commit dedicado en PR1**: tests de `decideAnchorAdmission` cubriendo
  `!versesExist → reject`, `refutes:'no' → reject`, `refutes:'unclear' →
  review-queue`, `refutes:'yes' && reviewStatus!=='reviewed' → review-queue`,
  `refutes:'yes' && reviewed → confront`. **Único camino a `confront` = yes +
  reviewed.**
- **Commit dedicado en PR5 — el guardrail**: test de integración del path de
  confront (`maybeMisreadingConfront` / el merge) que verifica que **una entrada
  crítica con verificación fallida (versesExist:false o refutes!=='yes') NUNCA
  llega a confrontar** — el merge la excluye del set confront-eligible. **Este
  test debe romper CI si alguien revierte el filtro**, probado por reversión
  (neutralizar el filtro → el test falla), igual que cross-chapter y la fila
  ortogonal en 035.

## 6. Shadow antes de enforcement + gate del flip

- **Job de shadow (PR6)**: corre `verifyAnchorVerse` + `adjudicateAnchorRefutes`
  sobre las anclas de `common-misreading` ya grabadas en `passageProfileShadow/`
  (flag `passage_profile` on para 2 usuarios → dato acumulando). Mide:
  - **Corte 1 (determinista, medible YA)**: % de anclas runtime cuyo verso
    existe.
  - **Corte 2 (adjudicación, muestra ≥30 + ≥7 días)**: % que de verdad refutan +
    **acuerdo del juez con adjudicación humana** sobre una muestra.
- **`anchor_fidelity_enforce`** (sub-flag, default off) gatea el **verify-drop de
  anclas runtime** (descartar las que fallan verificación). El **piso curado**
  (precedencia de entradas verificadas) NO necesita flag — es la garantía, y por
  construcción solo aporta anclas verificadas.

**Gate del flip — umbrales propuestos** (el fundador ajusta):
- **Verify-drop por verso-existe**: **siempre seguro** (determinista) → se puede
  enforce temprano. Recomiendo enforce apenas Corte 1 confirme la tasa de falla
  (mide el tamaño del problema; el drop nunca elimina un ancla válida).
- **Verify-drop por adjudicación**: enforce SOLO si el **acuerdo del juez con
  humano ≥90%** sobre ≥30 muestras (Corte 2). Si <90% → el juez no es confiable
  para descartar a runtime; se usa solo para el piso curado (revisión humana),
  no para el drop automático. (Mismo espíritu que el Corte 2 de 035: el juicio
  fino no se enforce hasta validarlo contra humano.)

## 7. Costo

- **Adjudicador (Sonnet)**: **una vez por entrada, en ingest/revisión, cacheado**
  en `verification`. ~US$0.01-0.03 por entrada. El set crítico es chico (decenas)
  → costo total de curación en **centavos**.
- **Runtime del pastor**: **CERO LLM.** `verifyAnchorVerse` es determinista (Bible
  repo, sin modelo); el piso curado es lectura Firestore; el merge es código. La
  adjudicación NUNCA corre en el turno del pastor.
- Shadow: corre el adjudicador sobre la muestra (≥30) una vez para el Corte 2 →
  ~US$1 total.

## 8. Resumen de PRs

1. **PR1** — dominio: `VerifiedMisreading` + `decideAnchorAdmission` + tests
   fail-closed (verde primero, aislado).
2. **PR2** — `verifyAnchorVerse` (Cut 1).
3. **PR3** — `adjudicateAnchorRefutes` (Cut 2/3, reusa juez CA1).
4. **PR4** — store + ingest + review callable role-gated + cola admin.
5. **PR5** — merge con precedencia + **fail-closed guardrail** (Cut 4 + el test
   anti-reversión).
6. **PR6** — shadow job (Cut 1/2 sobre dato real) + flag `anchor_fidelity_enforce`.

## 9. Dependencias externas (NO se cierran en este plan)

- **`floor-reviewer` (R2) — PENDIENTE del fundador**: se construye **el rol y el
  flujo de revisión** (la review callable gatea por rol, configurable; default
  `super_admin` hasta que se asigne). **NO se cablea la identidad** de la persona/
  institución. La implementación no depende de quién sea — solo de que exista el
  rol.
- **Módulo de catálogos vectoriales (Fase 2) — FUERA**: 036 es **solo el set
  crítico curado a mano**. NO se construye pipeline semi-auto de poblamiento aquí.
  La escala depende del módulo de catálogos (propiedad 3), apartado.
