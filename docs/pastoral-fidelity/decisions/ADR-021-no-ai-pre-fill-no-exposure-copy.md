# ADR-021 — Discovery editor: sin pre-fill + copy sin exposure de "IA/asistente/LLM"

## Estado

`accepted`

## Fecha

2026-05-27

## Contexto

El `DiscoveryEditor` del `PastoralWordStudyModal` captura el "descubrimiento pastoral" del pastor sobre la palabra estudiada. Phase doc 1.5 lista una decisión pendiente: ¿es **pre-fill editable** (Opción B propuesta) o **solo prompt visual sin pre-fill**?

Dos restricciones existentes:

1. **Manifesto pedagógico** (`05-pedagogy-manifesto.md` § "Hojas de trabajo del alumno"):
   > Espacios para registrar las observaciones que el alumno mismo hace del texto. No se entregan con la conclusión doctrinal pre-llenada. El alumno escribe la síntesis con sus propias palabras al final del bloque.
2. **Memory `feedback_copy_no_ai_exposure`**:
   > Don't surface "IA/AI/GPT/Gemini/modelo/LLM" in UI/labels/buttons. Use "el asistente" or "Preach" or describe output directly.

Adicionalmente, el usuario aclaró en el kickoff de Phase 1.5 que tampoco quiere enfatizar el concepto de "asistente" en este flow — la voz pastoral es protagonista.

## Decisión

**Sin pre-fill** en el campo `pastorDiscovery` del `DiscoveryEditor`. La textarea arranca vacía.

El editor renderiza **hints visuales estáticos** que guían sin contaminar voz:

- Subtítulo: `"Tu descubrimiento pastoral"`
- Prompt visual (placeholder o hint label, NO injected text): `"¿Qué carga lleva esta palabra para ti? ¿Cómo se usa en otros lugares del texto?"`
- Ejemplos breves expandibles (StepHelp pattern, opt-in): 1-2 ejemplos de buen discovery sobre palabras paradigmáticas (e.g., δικαιοσύνη en Romanos, חֶסֶד en Salmos).

**Copy prohibido en este surface**:
- "IA", "AI", "GPT", "Gemini", "modelo", "LLM"
- "Asistente", "tutor virtual", "chatbot"
- "Pregúntale a la IA", "generar sugerencia"

**Copy permitido**:
- "Tu descubrimiento pastoral"
- "Tu lectura del peso de la palabra"
- "Lo que aprendiste estudiándola"
- "Ver ejemplo" (expone StepHelp con ejemplos)

El análisis léxico mostrado en `WordAnalysisPanel` (gloss + función gramatical + resonancias) es **input para el pastor**, no autocompletar. El pastor lee, integra y escribe en sus palabras.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Pre-fill editable** | Contamina la voz pastoral. Pastor termina editando el pre-fill en lugar de redactar; el manifesto explícitamente lo prohíbe. |
| **Botón "Sugerir borrador"** que inserta texto LLM | Misma contaminación de voz + viola feedback_copy_no_ai_exposure (botón expone el concepto AI). |
| **Sin hint visual** (textarea vacía y nada más) | Pastor sin formación lingüística puede congelarse. Mitigación necesaria: prompt visual estático. |
| **Prompt dinámico generado por LLM** | Costo + latencia + complejidad sin beneficio claro vs prompt estático bien redactado. |

## Consecuencias

### Positivas

- **Voz pastoral protegida**: cada `pastorDiscovery` es autoría real del pastor. Audit log (`pasteEvents` ya en schema para Step 6) puede extenderse a Step 3 si se requiere validación adicional.
- **Cumplimiento del manifesto**: `05-pedagogy-manifesto.md` § hojas de trabajo: "no se entregan con la conclusión doctrinal pre-llenada".
- **Cumplimiento de `feedback_copy_no_ai_exposure`**: producto presenta análisis directamente, sin invocar concepto de asistente/IA.
- **Cero costo LLM en el flujo de descubrimiento**: la generación viva solo en `IdentifyKeyWordsUseCase` y `AnalyzeWordPastorallyUseCase`, no en `DiscoveryEditor`.

### Negativas

- **Pastor novato puede sentir fricción**: textarea vacía + prompt visual puede no ser suficiente. Mitigación: ejemplos expandibles + tooltip + threshold mínimo (≥30 chars, ya en schema) que da feedback de progreso.
- **No hay "fast path"**: pastor con prisa que quería un draft auto-generable no lo tiene. Esto es deliberado.

### Neutrales

- `pasteEvents` audit en Step 3 (Morphology): no se agrega en v1. Posible extensión futura si telemetría muestra paste rate alto.

## Impacto

- **Código afectado**:
  - `packages/web/src/pages/sermons/generator/pastoralSeed/wordStudy/DiscoveryEditor.tsx` (nuevo)
  - `packages/web/src/i18n/locales/es/wordStudy.json` (copy nuevo, audit'd contra wordlist prohibido)
- **Fases impactadas**: Fase 1.5. Patrón replicable a otros surfaces de descubrimiento (Step 4 Recognition usa pattern equivalente).
- **Migraciones requeridas**: ninguna.
- **Reversibilidad**: alta. Agregar pre-fill o botón es PR aditivo (no decidir contra esta posición sin nuevo ADR).

## Referencias

- Phase doc: `phases/phase-1-5-pastoral-word-study.md`
- Manifesto: `05-pedagogy-manifesto.md` § "Hojas de trabajo del alumno"
- Memoria: `feedback_copy_no_ai_exposure`
- ADR relacionado: ADR-016 (separación pastoral vs tutor)
