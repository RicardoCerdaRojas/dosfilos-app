# Proposal — Tier 3 scaffolding: "Reconstruye la estructura" (puzzle interactivo)

**Estado**: `deferred` (post-PR A). Origen: smoke de PR A (Fase 2.5), 2026-05-28, fundador presionando
el diseño del acompañante después de validar los dos primeros niveles de ayuda.

## Contexto

PR A (Acompañante de Estudio) entrega dos niveles de orientación per-paso (ADR-026):

1. **Tier 1** — "Pedir orientación": datos + preguntas socráticas + confrontación en caso de error
   de método.
2. **Tier 2** — "Explícamelo más sencillo": baja jerga + agrega ejemplo del método aplicado a otro
   pasaje (ZPD scaffolding).

El fundador pide un **Tier 3** específicamente para el paso 3 (Análisis Estructural), inspirado en
deliberate practice + productive struggle: que el pastor reconstruya la estructura del pasaje **él
mismo**, con las cláusulas como piezas y el sistema validando colocaciones sin revelar la respuesta
hasta que la encuentre.

## Por qué solo en paso 3 (Análisis Estructural)

| Paso | Encaje con formato puzzle |
|---|---|
| 1 Lectura | No aplica — impresión libre del pastor |
| 2 Contexto/Género | No encaja — género es elección única (tier-3 distinto: ej. "asociá rasgos del texto al género") |
| **3 Análisis Estructural** | **Encaje natural** — cláusulas = piezas, jerarquía = estructura |
| 4 Palabras clave | Tier-3 distinto posible: "marcá las palabras con peso teológico" |
| 5 Reconocimiento | Engine ya surface paralelos; tier-3 podría ser ranking |
| 6 Función | No encaja — texto libre |
| 7 Principio | No encaja — voz del pastor |
| 8 Insight | Prohibido (voz del pastor) |

Esta propuesta cubre **solo paso 3**. Tier-3 para otros pasos se evalúa per-paso, no se generaliza.

## Diseño funcional

### Disparador
Botón **"Reconstruye la estructura tú mismo"** como 3er nivel dentro del popover de orientación de
paso 3 (visible solo cuando `stepKey === 'structuralAnalysis'`). Al click → abre un **Sheet lateral
ancho** (el popover queda corto; necesitamos espacio para piezas + zonas).

### Interacción (click-to-place, sin librería de drag-drop)
1. Sheet renderiza:
   - **Pila de piezas** (cards desordenadas): cada cláusula del pasaje con su referencia
     (`Juan 1:1a`, `Juan 1:1b`, `Juan 1:1c`).
   - **Tres zonas vacías**: `Cláusula climática` · `Preparatorias` · `Desarrollo posterior`.
2. Pastor click en pieza → click en zona → se ubica. Editable (click sobre pieza colocada → vuelve
   a pila o re-asigna).
3. Botón **"Verificar"** dispara validación cuando el pastor cree que terminó.
4. Validación:
   - ✅ **Acierto por pieza**: queda fijada en su zona, color success, revela el rol
     gramatical/lógico ("conjunción coordinante" / "predicado nominal climático" / etc.) — pero
     **no** la interpretación teológica.
   - ❌ **Error por pieza**: vuelve a la pila + **pista socrática** flotante junto a la pieza:
     *"esta cláusula empieza con conjunción coordinante — ¿te suena que sea la principal?"*. El
     sistema **nunca** dice cuál es la correcta.
5. Cuando completa todas correctamente → estado "Estructura reconstruida" + CTA "Ahora escribí tu
   nota de análisis estructural" → cierra sheet, foco al textarea del paso.

### Lo que protege P1/P2 (manifesto)
- Sistema aporta **scholarship** (qué cláusulas existen + función gramatical/lógica de cada una) →
  eso son hechos del texto, no interpretación.
- Pastor hace **el proceso** (decidir, equivocarse, recolocar) → productive struggle (Kapur).
- Sistema **nunca** revela la interpretación teológica de la estructura → eso queda para el textarea
  del paso (la voz del pastor).
- ZPD aplicada: tier-1 (datos + preguntas) → tier-2 (sencillo + ejemplo en otro pasaje) →
  tier-3 (struggle activo con feedback).

## Diseño técnico

### Callable nuevo: `buildStructuralPuzzle`

```ts
// packages/functions/src/study-companion/buildStructuralPuzzle.ts
// Input
{ passage: string }
// Output
{
  clauses: { id: string; text: string; reference: string }[];
  mainClauseId: string;        // validación, no se renderiza directo
  roles: Record<string, 'climactic' | 'preparatory' | 'development'>;
  hints: Record<string, string>;  // pista socrática per cláusula (cuando colocada mal)
}
```

Implementación: LLM call (Gemini Flash) con prompt:
- Dividí el pasaje en cláusulas según marcadores sintácticos (conectores, puntuación).
- Identificá la cláusula climática (la afirmación que el resto sostiene).
- Clasificá las demás como preparatorias (preceden + preparan la climática) o de desarrollo
  (siguen + desarrollan).
- Por cada cláusula no-climática, escribí UNA pista socrática (1 frase) que la fuerce a reconsiderar
  si la coloca mal — **sin** decir la respuesta correcta.

Mismo patrón verifier-orienter; usa `LlmClient` local (no `@dosfilos/domain`).

### Componente UI nuevo

```
packages/web/src/pages/sermons/generator/pastoralSeed/puzzle/
├── StructuralPuzzleSheet.tsx     # contenedor sheet
├── PuzzlePiece.tsx               # card cláusula
├── PuzzleZone.tsx                # zona target
└── usePuzzleState.ts             # estado + validación
```

Usa `components/ui/sheet.tsx` (Radix Dialog wrapper, ya existe). `cn` + tokens semánticos
(`bg-success-subtle` al acierto, `bg-warning-subtle` para pista, `border-info` para zonas).

### Tipos + AiAssistLog
- Domain `AiAssistType` += `'structuralPuzzle'` (asistencia nueva).
- App `PastoralSeedService.buildStructuralPuzzle(input)` → wrapper del callable.
- Log al completar el puzzle (no en cada click — eso sería ruido).

### Flag
Detrás del mismo `study_depth`. Sin sub-flag adicional v1.

## Estimación
~2-3h concentrado:
- Callable + prompt eng: ~45 min
- Sheet + piece + zone componentes: ~1.5h
- Cableo desde StepCompanion (botón tier-3 condicional a stepKey + i18n): ~20 min
- Test snapshot + smoke manual: ~20 min

## Criterios de aceptación

- [ ] Botón "Reconstruye la estructura" aparece solo en paso 3, dentro del popover orientación.
- [ ] Click abre Sheet lateral con N cláusulas + 3 zonas.
- [ ] Click-to-place funciona; re-colocar funciona.
- [ ] "Verificar" valida por pieza: acierto fija + revela rol; error devuelve a pila + pista.
- [ ] Sistema NUNCA revela la cláusula correcta antes que el pastor la encuentre.
- [ ] Completar todas → CTA al textarea + cierra sheet.
- [ ] `AiAssistLog` con `assistType: 'structuralPuzzle'` se registra al completar.
- [ ] Anchosa responsive (sheet adaptable mobile/desktop).

## Riesgos
- **Calidad del split de cláusulas**: si el LLM divide mal, el puzzle no tiene sentido. Mitigación:
  prompt estricto + tests con pasajes muestra (Juan 1:1, Romanos 8:1, Filipenses 2:5-11).
- **Frustración del pastor** si nunca completa: cap de N intentos antes de surface "Salir y
  revisar mis notas" — graceful exit.
- **Pasajes largos**: muchas cláusulas → puzzle abrumador. v1 cap: máximo 8 cláusulas; pasajes
  más largos muestran un mensaje "este pasaje es muy grande para el puzzle; usa los tiers 1-2".

## Referencias
- Origen: smoke de PR A (Fase 2.5), 2026-05-28.
- Marco teórico aplicado: productive struggle (Kapur), ZPD (Vygotsky), deliberate practice
  (Ericsson) — ver § Marco teórico en [phase-2-5-study-depth-copilot.md](../phases/phase-2-5-study-depth-copilot.md).
- Patrón verifier-orienter: [ADR-026](../decisions/ADR-026-step-orientation-supersede-silence.md).
- Compañero base: PR A (`StepCompanion`).

## Cuándo retomar
Después que PR A merge + se cierren PRs B y C de la fase, o cuando el fundador priorice scaffolding
por sobre las otras piezas. **NO bloqueante** para cierre de Fase 2.5 — el acompañante con tiers 1+2
ya cumple los criterios de aceptación de la fase.
