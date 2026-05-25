# ADR-010 — Confessional witnesses default-on (multi-witness, no single anchor)

## Estado

`accepted` — **supersede** [ADR-001](./ADR-001-confession-anchored-correction.md) (single-anchor model) y [ADR-009](./ADR-009-confession-opt-in.md) (opt-in framing).

## Fecha

2026-05-24

## Contexto

ADR-001 estableció que la confesión **declarada por el pastor** sería el Testigo 3 del mecanismo de tres testigos (Phase 2). ADR-007 § Q2 lo hizo obligatorio en signup. PR 0.6 implementó el step de onboarding. ADR-009 retiró la obligación, dejándolo opt-in.

Durante smoke test extendido (sesión 2026-05-24), el fundador identificó que la lógica completa de "una confesión rectora" tensiona el manifesto en dos formas:

1. **El manifesto trata la teología histórica como testimonio plural**:
   > "Los grandes teólogos (Atanasio, Agustín, Calvino, Owen, Edwards) son citados como ejemplos del método, no como autoridades últimas."
   > "Teología histórica como testimonio acumulado de la iglesia haciendo el mismo trabajo a lo largo de los siglos."

   Anchor único contradice "testimonio acumulado". Multi-witness es más fiel.

2. **Si historia confirma como parte del método, no debería ser opt-in**:
   > "Exégesis tells meaning. Sistemática orders. Historia confirma + flags edges."

   Hacer la comparación opt-in implica que es add-on, no parte del método. La consecuencia: pastores que no opt-in operan con metodología truncada sin saberlo.

## Decisión

**Multi-witness default-on**:

1. **Schema retired**: `declaredConfession`, `confessionAffirmedAt`, `confessionVisibility` quedan como deprecated (preservados para data continuity, no consumidos).

2. **New field**: `User.useConfessionalWitnesses: boolean` (default `true`). Cuando absent en Firestore, el repository mapper lo trata como `true` (default ON sin migración).

3. **Behavior**: Phase 2 Testigo 3 consume **todas las 14 tradiciones del CORE Library catalog** como testigos plurales:
   - `core` doctrines (Trinidad, Calcedonia, etc.) → fire SIEMPRE, independiente del toggle. Doctrinas ecuménicas universales no son negociables.
   - `distinctive` (paedo vs credo, predestinación, milenales) → fire cuando toggle ON. Pastor ve qué dicen las distintas tradiciones, sin anchor a una sola.
   - `open-evangelical` → fire informativo cuando toggle ON.

4. **Opt-out con justificación**:
   - Pastor puede flip toggle OFF en `/settings/confession`
   - Required: justification escrita ≥50 chars (validation client + server)
   - Repository throws si justification missing en opt-out
   - Audit row con `kind: 'witnesses-toggle'` + previousValue + newValue + justification + changedAt

5. **UI changes**:
   - `ConfessionBanner` eliminado completamente — default ON no necesita CTA
   - `/settings/confession` rewriting: toggle único + roster read-only de 14 traditions + textarea justification when opting out
   - `usePastoralFidelityGate()` retorna `confessionalWitnessesEnabled: boolean` en lugar del `hasConfessionAnchor` previo

6. **No migration script**: schema absent field interpreted as `true` (default). Existing users with `declaredConfession` set siguen teniendo ese campo en Firestore pero ya no es consumido por Testigo 3.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Mantener ADR-009 (opt-in single anchor)** | Reportado por fundador como contradictorio con manifesto. Anchor único + opt-in posiciona historia como add-on optional cuando manifesto la trata como componente constitutivo del método. |
| **Default ON pero anchor único** | Mejora vs ADR-009 pero sigue anchor a una tradición. Manifesto explícitamente celebra plurality of witnesses across centuries. |
| **Multi-witness con filter por tradición** (pastor excluye N) | Adds complexity sin valor claro v1. "Todas o ninguna" es honesto; filter dilute el claim. Si pastores piden filter post-launch, se agrega como ADR-011. |
| **Sin toggle (always ON, sin opt-out)** | Demasiado rigid. Casos legítimos: sesión académica pura, material exegético sin distorsión doctrinal, etc. Opt-out con justification audit-logged es proportional. |
| **Banner permanente recordando que está ON** | Ruido innecesario. Default ON significa no hay state que comunicar. Settings page suficiente. |

## Consecuencias

### Positivas

- **Alineamiento total con manifesto**: historia es testimonio plural, no anchor individual. Método pastoral completo by default.
- **No fricción en onboarding**: signup no fuerza decisión teológica. Pastor empieza con método full.
- **Multi-witness más rico**: pastor ve cómo distintas tradiciones leen las distinctives — formación pastoral más completa que single anchor.
- **Opt-out con barrera proporcionada**: 50 chars justification es trivial para razón legítima, suficiente para frenar opt-out impulsivo. Audit log preserva el reasoning.
- **Schema clean**: nuevo field aditivo. Legacy fields preserved sin consumo.
- **UI simplificada**: 1 toggle vs 14 tile picker. Roster as info, not selection.

### Negativas

- **Phase 2 Testigo 3 design grows in complexity**: en lugar de "anchor → check", el orchestrator debe ejecutar "para cada tradición, lookup distinctive, surface convergence/disagreement". Más LLM calls per claim sobre topics distinctive. Cost monitoring needed.
- **Pastor reformado fuerte que QUERÍA single anchor pierde feature**: el sistema ahora también le muestra Augsburg + Wesleyan readings cuando claim toca paedobautismo. Algunos pastores podrían experimentar esto como ruido. Mitigación: copy del setting explica que el método quiere plurality.
- **Cost LLM aumenta proporcionalmente**: 14× distinctive checks per claim cuando toggle ON. Optimization needed: cache distinctive→tradición mapping, batch queries.
- **Schema retirement parcial**: `declaredConfession` field deprecated pero queda. Dead code latent en algunos paths que aún lo lean. Cleanup completo difering a Phase 5 cuando Project schema migración cubra esto.

### Neutrales

- Catalog Firestore + ingest pipeline unchanged
- doctrineLevel tagging unchanged
- Cross-references engine unchanged
- Citation rights-aware schema unchanged
- Feature flag infrastructure unchanged
- Audit collection extended con nuevo `kind: 'witnesses-toggle'` row type (vs existing `kind` ausente o `'confession-change'`)

## Impacto

- **Código afectado**:
  - `User` entity: add `useConfessionalWitnesses?: boolean`; deprecate `declaredConfession*` jsdoc
  - `IUserProfileRepository`: add `updateConfessionalWitnesses(userId, input)`; deprecate `updateDeclaredConfession`
  - `FirebaseUserProfileRepository`: impl `updateConfessionalWitnesses` con audit, mapProfile reads + defaults true
  - `AdminUserQueryService.mapUser`: reads useConfessionalWitnesses con default true
  - `ConfessionBanner.tsx`: **eliminado**
  - `dashboard-layout.tsx`: remove banner mount
  - `ConfessionSettings.tsx`: rewrite — single toggle + roster + opt-out justification
  - `usePastoralFidelityGate.ts`: retorna `confessionalWitnessesEnabled: boolean` (replaces `hasConfessionAnchor`)
  - New hook `useUpdateConfessionalWitnesses.ts`
  - i18n ES + EN: banner block deleted, settings rewritten, gate reduced to 1 reason
- **Fases impactadas**:
  - Phase 0: cleanup partial revert de PR 0.7 (banner + gate semantics)
  - Phase 2: Testigo 3 orchestrator design cambia de "anchor → check" a "for each tradition → check distinctive". `core` lógica unchanged.
- **Migraciones requeridas**: ninguna. Default field absent = enabled (back-compat clean).
- **Reversibilidad**: media. Schema preserved. Code revert posible pero requerirá restaurar banner + single-anchor logic + reframe UX.

## Verificación post-merge

- [ ] User nuevo signup → wizard 4 pasos (welcome → intent → workflow → confirm), sin step confesional
- [ ] User existente en dashboard → SIN banner (eliminado)
- [ ] `/settings/confession` → muestra toggle "Comparación con tradiciones históricas" en estado ON por default
- [ ] Roster muestra 14 tradiciones (nombres en español si locale ES)
- [ ] Toggle OFF → aparece warning + textarea justification ≥50 chars
- [ ] Save con justification válida → toast "Testigos confesionales desactivados — registrado en audit log"
- [ ] Save sin justification (intent de opt-out) → save button disabled hasta llenar
- [ ] Audit row `confessionChangeAudit/{id}` contiene `kind: 'witnesses-toggle'` + previousValue + newValue + justification
- [ ] `usePastoralFidelityGate()` para user con flag ON → retorna `{ allowed: true, confessionalWitnessesEnabled: true }`

## ADRs futuros derivados

- **ADR-011** (cuando Phase 2 arranque) — Testigo 3 multi-witness orchestrator design: cómo el LLM consume 14 traditions × distinctive checks de forma eficiente. Batch prompts, caching, ranking de relevancia per tradition.
- **ADR-012** (post-launch si aplica) — Filter per tradition: si pastores piden poder excluir tradiciones específicas (ej. solo Reformed traditions), schema extension `excludedConfessionTraditions?: string[]`.

## Referencias

- Supersede: [ADR-001](./ADR-001-confession-anchored-correction.md), [ADR-009](./ADR-009-confession-opt-in.md)
- Manifesto: [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)
- Bridge: [06-pedagogy-applied.md § Sistema de tres niveles](../06-pedagogy-applied.md#4-sistema-de-tres-niveles-de-doctrina-operacionalización)
- Phase doc: [phase-0-foundations.md](../phases/phase-0-foundations.md)
- Sesión de descubrimiento: smoke test 2026-05-24 — banner del settings page disparó conversación sobre framing
