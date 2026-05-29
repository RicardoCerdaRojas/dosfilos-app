# Proposal — Tier 3 v2: "Diagrama de dependencias" (esqueleto + cláusulas)

**Estado**: `proposed` (Sprint 2 target). **Supersede**: `structural-puzzle-tier3.md` (v1, ya shipped en PR #270).
**Origen**: smoke fundador 2026-05-28 sobre PR #275 (Tier 3 v1 UX pass 1). Ver `sessions/2026-05-28-tier3-v1-smoke.md` (TBD).

## Contexto

Tier 3 v1 (`StructuralPuzzleSheet`) implementa scaffolding-by-struggle con **3 zonas genéricas** (`preparatoria` / `climática` / `desarrollo`) + N cláusulas. El pastor arrastra cada cláusula a una zona; el sistema valida pieza por pieza con pistas socráticas en caso de error.

PR #275 corrigió 5 problemas de UX (pista atada a pieza, badge progreso, CTA dinámico, hint prompt refinado, length guard). Funciona.

**Pero el smoke del fundador surfaceó un problema más profundo**: las 3 zonas son **buckets abstractos** que no comunican la estructura real del pasaje. Síntomas:

1. **Mapping 1:1 implícito**: 3 zonas + 3 cláusulas → pastor asume "una por zona". Para Juan 1:1 (chiasmo 2+1+0) eso falla.
2. **Sin dependencias visibles**: el pastor aprende a **clasificar**, no a **ver subordinación/coordinación/paralelismo**. La pedagogía estructural real es jerárquica, no de buckets.
3. **Pista revela rol pero no posición**: "esta cláusula es preparatoria" deja al pastor sin saber CON QUÉ otra cláusula se relaciona.

PR #277 mitigó el síntoma #1 con copy clarification ("una zona puede tener varias cláusulas o ninguna"). No resuelve #2 ni #3.

## Propuesta — Tier 3 v2

**Reemplazar las 3 zonas por un esqueleto generado** que refleje la estructura específica del pasaje. El esqueleto es la scholarship visible; las cláusulas son la carne que el pastor coloca en cada slot del esqueleto.

### Ejemplo — Juan 1:1

```
┌─────────────────────────────────┐   ← slot α (raíz, indent 0)
│                                 │
└─────────────────────────────────┘
   ┌──────────────────────────────┐   ← slot β (indent 1, paralelo a α)
   │                              │
   └──────────────────────────────┘
   ┌──────────────────────────────┐   ← slot γ (indent 1, climática)
   │                              │
   └──────────────────────────────┘
```

Pile abajo:
- `Juan 1:1a — En el principio era el Verbo`
- `Juan 1:1b — y el Verbo era con Dios`
- `Juan 1:1c — y el Verbo era Dios`

Pastor ve INMEDIATAMENTE: 1 raíz + 2 paralelos. La forma del esqueleto es la pista honesta sobre el chiasmo. No hay ambigüedad de "zona vacía". El roleLabel (`raíz declarativa`, `parallelo coordinado`, `clímax retórico`) **no se muestra** hasta solve — el pastor descubre el rol al lograr la colocación correcta.

### Ejemplo — Romanos 8:28 (cascada de subordinación)

```
┌────────────────────────────┐
│                            │   ← slot α (matriz: "sabemos…")
└──┬─────────────────────────┘
   │  ┌──────────────────────────────────┐
   └──┤                                  │   ← slot β (subord. nominal, indent 1)
      └──┬───────────────────────────────┘
         │  ┌──────────────────────────────────┐
         └──┤                                  │   ← slot γ (contenido, indent 2)
            └──┬───────────────────────────────┘
               │  ┌────────────────────────────────────┐
               └──┤                                    │   ← slot δ (apositivo, indent 3)
                  └────────────────────────────────────┘
```

Pastor aprende **cómo el griego subordina**: que la cláusula `esto es, a los que conforme a su propósito son llamados` modifica a `a los que aman a Dios` por aposición, dos niveles abajo del verbo matriz `sabemos`. Eso es exégesis estructural real, no clasificación abstracta.

## Diseño técnico

### Server — nuevo callable `buildStructuralDiagram`

```ts
interface StructuralDiagramSlot {
    slotId: string;
    indent: number;                    // 0 = raíz, 1+ = subordinada/paralela
    parentSlotId: string | null;
    widthHint: 'short' | 'med' | 'long'; // ancho visual orientativo
    /** Cláusula canónica que va aquí. */
    canonicalClauseId: string;
    /** Pista socrática si el pastor coloca otra cláusula aquí.
     *  Misma regla que v1: 2 partes (rasgo concreto + pregunta), nunca nombra el rol. */
    hint: string;
    /** Etiqueta del rol gramatical/retórico. Solo se muestra POST-solve.
     *  Ej. "raíz declarativa", "subordinada nominal", "apositivo", "paralelismo coordinado". */
    roleLabel: string;
}

interface StructuralDiagram {
    clauses: { id: string; text: string; reference: string }[];
    skeleton: StructuralDiagramSlot[];
    /** Forma global del esqueleto para decidir layout y rendering hints. */
    shape: 'linear' | 'cascade' | 'chiasm' | 'parallelism' | 'block';
}
```

**Prompt requirements**:
- Modelo identifica género literario primero — la shape se deriva del género (narrativa = linear, epístola = cascade, poesía sapiencial = parallelism, profecía = block).
- Cada slot recibe `roleLabel` específico (no genérico). Lista cerrada de roleLabels para evitar drift entre llamadas.
- Hints siguen reglas de v1 (2 partes, rasgo concreto + pregunta, no nombrar rol).
- Validación adicional: la suma de cláusulas debe igualar la suma de slots (no orphans en ningún lado).

### Client — `StructuralDiagramSheet`

Reemplaza `StructuralPuzzleSheet`. Mismo trigger en `StepCompanion` (botón "Reconstruye la estructura tú mismo" en `structuralAnalysis`).

**Layout**:
- CSS Grid con `grid-template-columns: repeat(maxIndent + 1, auto)`. Cada slot ocupa columna `indent + 1`.
- Slot vacío = caja con outline `border-2 border-success/40 border-dashed` + min-width según `widthHint`.
- Conectores verticales/diagonales entre parent/child con SVG overlay (opcional v2.1, no bloqueante).
- Pile lateral derecha en desktop, abajo en mobile.

**Interacción**:
- Click cláusula en pile → cláusula seleccionada (ring info).
- Click slot vacío con cláusula seleccionada → placement provisional.
- Click cláusula colocada → vuelve a pile.
- Botón "Verificar" valida `placements[slotId] === skeleton[slotId].canonicalClauseId`.
- Miss → cláusula bouncea al pile + slot mantiene su outline + hint del slot fallido.
- Hit → cláusula queda lockeada con `roleLabel` revelado debajo.

**Mobile fallback**:
- Si `window.innerWidth < 640px` Y `maxIndent > 2`: render alternativo como lista jerárquica con bullets indentados (sin slots visuales, mismo dataset). Mantiene la pedagogía sacrificando solo el "feel" de diagrama.

### Domain / Application

- Nuevo entity `StructuralDiagram` en `packages/domain/src/entities/`.
- Service method `pastoralSeedService.buildStructuralDiagram(passage)` mirror de `buildStructuralPuzzle`.
- Tier 3 v1 (`buildStructuralPuzzle`) se mantiene como **fallback automático** para pasajes con `N <= 2` cláusulas (el diagrama no agrega valor con 1-2 piezas).

## Pedagogía

**P1 (labor antes que output)**: ✓ refuerza. El pastor coloca cada pieza; el agente no escribe la estructura por él.

**P2 (AI desarrolla, no origina)**: ✓ refuerza. El agente entrega scholarship (esqueleto + hints + roleLabels) — el equivalente visual de un BHS Hebrew Grammar diagram. NO interpreta teología.

**P3 (confrontación obligatoria)**: ✓ idéntico a v1. Hints confrontan errores de subordinación gramatical.

**Ganancia pedagógica vs v1**:
- Pastor aprende a **ver dependencias**, no solo a clasificar.
- Genre-aware shapes enseñan que la estructura cambia con el género (narrativa lineal vs poesía paralelística vs epístola cascade).
- Post-solve, el `roleLabel` revelado transfiere vocabulario gramatical real (`apositivo`, `subordinada causal`) — no labels genéricos como "desarrollo".

## Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación |
|---|---|---|
| El esqueleto en sí spoilea la estructura | Media | Slots vacíos SIN labels visibles. `roleLabel` solo post-solve. Forma global telegrafia solo el género, no la respuesta. |
| Layout cascade no reflowea en mobile | Alta | Fallback lista jerárquica con bullets en width <640px + indent >2. |
| Costo LLM mayor (JSON más grande) | Baja | ~2-3x el callable v1, todavía <$0.002/call con gemini-2.5-flash. Cache (memoria `tech_debt_llm_provider_abstraction`) lo amortiza. |
| Prompt drift (hint generic, role label inconsistent) | Media | Lista cerrada de `roleLabel`s en el system prompt + validation server-side rechaza labels off-list. |
| Edge case: pasaje sin estructura clara (1 versículo simple) | Media | Fallback automático a Tier 3 v1 (3 zonas) si `skeleton.length < 3` o `shape === 'block'`. |
| Mantener compatibilidad con `AiAssistLog` existente | Baja | Logueo idéntico: `assistType: 'structuralPuzzle'` se reusa. No requiere ADR de schema. |

## Plan de implementación

**PR 1** — Server + domain (~3-4h):
- `buildStructuralDiagram.ts` callable.
- Entity `StructuralDiagram` + service method.
- Tests con casos canónicos: Juan 1:1 (chiasm), Romanos 8:28 (cascade), Génesis 1:1-3 (linear), Salmo 1:1 (parallelism).

**PR 2** — Client UI (~4-5h):
- `StructuralDiagramSheet` component.
- CSS Grid layout + slot rendering.
- Mobile fallback (lista jerárquica).
- i18n keys (`puzzle.v2.*` namespace).
- Replace trigger en `StepCompanion` con feature flag `study_depth_diagram_v2`.

**PR 3** — Telemetría + rollout (~1-2h):
- Eventos: `diagram_opened`, `diagram_placed`, `diagram_solved`, `diagram_abandoned`.
- A/B v1 vs v2 durante 2 semanas en dogfooders → decisión data-driven sobre kill v1.

**PR 4** (opcional) — SVG conectores entre slots padre/hijo (~2h).

Total estimado: **~10-13h de trabajo**, en Sprint 2.

## Decisiones abiertas (pre-implementación)

1. **¿Mantener v1 como fallback permanente o killear?**
   Recomendación: mantener para N≤2 cláusulas (el diagrama no rinde) + para shape `block` (no hay jerarquía clara). Killear v1 para shapes `cascade` / `chiasm` / `parallelism` / `linear` con N≥3.

2. **¿Mostrar la forma global (`shape`) como hint upfront?**
   Ej. badge "Estructura: paralelismo" antes de colocar piezas.
   Pro: el género ya se confirmó en step `contextGenre`, no es spoiler.
   Contra: telegraphs la respuesta agregada.
   Recomendación: mostrar solo el género (ya confirmado en seed), no el shape específico (puede haber chiasmos dentro de epístolas, etc).

3. **¿Animaciones al colocar piezas?**
   Pro: feedback satisfactorio, refuerza el "click correcto".
   Contra: 100ms extra latency.
   Recomendación: spring-animation de 150ms al colocar, fade-out 200ms al bouncear. Cheap polish.

4. **¿Soporte de drag-and-drop nativo?**
   Ya está en el todo list como PR aditivo separado al puzzle v1. Si se aprueba v2, mover el DnD a v2 directo (v1 entonces queda click-only como fallback simple).

## Criterios de aceptación

- ✅ Pasaje Juan 1:1 → esqueleto con 1 raíz + 2 paralelos en indent 1. Pastor solveable.
- ✅ Pasaje Romanos 8:28 → esqueleto con cascada de 4 niveles. Pastor solveable.
- ✅ Pasaje Génesis 1:1-3 → esqueleto lineal de 3 raíces secuenciales. Pastor solveable.
- ✅ Pasaje 1 cláusula sola → fallback a v1 o mensaje "no requiere diagrama".
- ✅ Mobile 375px → diagrama indent 3 reflowea a lista jerárquica sin perder hints.
- ✅ Hint en miss → menciona rasgo concreto + pregunta, sin nombrar `roleLabel`.
- ✅ Post-solve → cada cláusula colocada muestra su `roleLabel` revelado.
- ✅ Telemetría capturada con event payload diferenciable de v1.

## Decisiones pendientes para el fundador

1. ¿Aprobás el reemplazo v1 → v2 con plan de A/B telemétrico de 2 semanas?
2. ¿Aprobás invertir ~10-13h en Sprint 2 para esto, o priorizamos otro item del backlog?
3. ¿Querés que la implementación incluya conectores SVG (PR 4) o el MVP sin conectores ya da el insight pedagógico?
4. **NUEVA — caso "epistle-rhetorical"**: ¿incluímos un sexto `shape: 'epistle-rhetorical'` para libros breves (Filemón, Judas, 2-3 Juan, Abdías) que el v1 silenciosamente trataba como macro? Detalle abajo.

## Adenda — caso macro-epistolar (Filemón, 2026-05-28)

### Hallazgo del smoke

Tier 3 v1 deployed en prod aceptó "Filemón" (sin chapter:verse) y devolvió un puzzle de 8 bloques que NO eran cláusulas gramaticales sino **secciones retóricas de la carta completa**:

| Slot | Versículos | Función macro |
|------|-----------|---------------|
| PREP × 6 | 1:1-3 / 1:4-5 / 1:6-7 / 1:8-9 / 1:10-12 / 1:13-16 | Saludo + acción de gracias + preparación retórica |
| CLIM × 1 | 1:17-20 | El ASK: "recíbelo como a mí mismo" |
| DESARROLLO × 1 | 1:21-25 | Confianza + saludos finales |

El pastor pudo solverlo 8/8 (la macro-estructura epistolar es intuitiva) pero:
- El word-count guard NO disparó porque cuenta palabras del STRING ("Filemón" = 1 palabra), no del texto bíblico.
- Cero signal al pastor de que el análisis cambió de **micro** (cláusulas) a **macro** (secciones retóricas).
- Para libros más largos (Romanos, Hebreos, 1 Corintios) el mismo path explota: LLM trunca arbitrariamente contra `MAX_CLAUSES = 8`.

### Mitigación inmediata (PR #279 — guard tibio)

PR #279 añade un guard upstream del word-count:
- Refuse explícito si la referencia no tiene `:` Y no está en whitelist de libros cortos (`Filemón / Judas / 2-3 Juan / Abdías`).
- UI nueva "Necesito capítulo y versículo" con input para acotar.
- Libros cortos en whitelist siguen permitiendo `Filemón` solo → preserva la experiencia macro descubierta accidentalmente, pero solo donde no destruye la pedagogía.

### Implicación para v2

Pedagógicamente, el modo macro es **valioso para epístolas breves** — identificar el ASK retórico de Filemón es exactamente lo que enseñan los manuales de retórica grecorromana. NO es algo a descartar; es algo a **modelar explícitamente**.

Propuesta de absorción en v2:

```
shape: 'epistle-rhetorical'
```

Esqueleto sample para Filemón (skeleton-as-rhetorical-form):

```
┌─────────────────────────────────────┐   ← slot α (saludo / address)
└─────────────────────────────────────┘
┌─────────────────────────────────────┐   ← slot β (acción de gracias)
└─────────────────────────────────────┘
┌─────────────────────────────────────┐   ← slot γ (apelación preliminar)
└─────────────────────────────────────┘
   ┌──────────────────────────────────┐
   │                                  │   ← slot δ (ASK central / propositio)
   │                                  │
   └──────────────────────────────────┘
┌─────────────────────────────────────┐   ← slot ε (confianza / probatio)
└─────────────────────────────────────┘
┌─────────────────────────────────────┐   ← slot ζ (cierre / saludos)
└─────────────────────────────────────┘
```

- `roleLabel` post-solve transfiere vocabulario retórico real: `prescript`, `proemio`, `propositio`, `confirmatio`, `peroratio`, `cláusula epistolar`.
- Esqueleto centra visualmente el slot del ASK (más grande, indent 1) → comunica el clímax retórico sin nombrarlo.

### Decisión de diseño abierta (para fundador)

**Opción A — incluir epistle-rhetorical en v2 MVP**:
- Pro: cubre el caso Filemón pedagógicamente bien.
- Pro: extensible a 2-3 Juan, Judas, Abdías sin esfuerzo extra.
- Contra: prompt del agente más complejo (debe detectar género retórico + diagrammar como epistle).
- Costo extra: +2-3h sobre el MVP base (~10-13h → ~13-16h total).

**Opción B — diferir epistle-rhetorical a v2.1**:
- Pro: v2 MVP más rápido al usuario.
- Pro: aprendemos de telemetría v2 antes de comprometernos a una nueva shape.
- Contra: durante v2 MVP, Filemón sigue con v1 + guard de PR #279 (que ya cubre el caso, simplemente sin diagrama de dependencias).

**Recomendación**: Opción B. PR #279 ya cubre la situación crítica (refuse de pasajes largos no-whitelisted). Filemón completo sigue accesible vía whitelist en v1. v2 MVP cubre los 4 shapes principales (linear/cascade/chiasm/parallelism). epistle-rhetorical se evalúa en v2.1 con datos reales del uso.

## Bitácora

- 2026-05-28 — Doc inicial escrito post-smoke fundador sobre PR #275. Tier 3 v1 funciona pero la mecánica de 3-buckets no enseña dependencias.
- 2026-05-28 — Adenda macro-epistolar después de que Filemón completo solveable surfaceó el caso. Decisión recomendada: diferir `epistle-rhetorical` a v2.1; PR #279 mitiga el bypass de length guard.
