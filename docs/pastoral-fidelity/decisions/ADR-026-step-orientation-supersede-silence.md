# ADR-026 — Orientación por paso: extiende el silencio no-core de ADR-023 (verificador-orientador, pull-first)

## Estado

`accepted` — aceptado 2026-05-27 al arrancar `/iniciar-fase 2.5`. Extiende (no revierte) [ADR-023](./ADR-023-two-tier-proactive-verification.md).

## Fecha

2026-05-27

## Contexto

[ADR-023](./ADR-023-two-tier-proactive-verification.md) estableció **silencio total inline en
`distinctive` / `open-evangelical`**: el tripwire solo corre Testigo 3 nivel `core` y calla en todo
lo demás para no violar productive struggle (la IA no debe volverse la voz ni cortocircuitar la lucha
del pastor con el texto).

Durante el smoke de Fase 1.6 el fundador encontró el límite de esa política: un pastor escribió en el
paso 2 (Contexto/Género de Juan 1:1) *"como es una profecía entiendo que todo lo que dice se
cumplirá"* — **doble error no-doctrinal** (género equivocado + regla de lectura equivocada) que el
sistema dejó pasar sin guía, porque no toca un `core`. La política de silencio, calibrada para
proteger la interpretación legítima, también **subutiliza** al asistente frente a errores
metodológicos claros (género, hermenéutica, estructura) que no son disenso confesional legítimo sino
simplemente errores de método.

Tensión: extender la intervención fuera de `core` sin (a) que la IA se vuelva la voz, ni (b)
cortocircuitar la lucha del pastor con interpretaciones genuinamente abiertas.

## Decisión

### Distinguir "error de método" de "interpretación legítima"

El silencio de ADR-023 protegía **interpretación legítima** (distinctive/open). Esta ADR lo extiende
a un eje ortogonal: **corrección de método**. El acompañante orienta cuando detecta error en las
reglas del oficio exegético —no en la conclusión doctrinal del pastor:

- **Género literario equivocado** (leer Evangelio como apocalíptico, poesía como crónica).
- **Regla de lectura inconsistente con el género** (cumplimiento literal de un género no-predictivo).
- **Estructura/sintaxis mal observada** (sujeto/verbo, conectores lógicos).
- **Salto exegético** (afirmar lo que el texto no dice / proof-texting).

Esto es la **exégesis confrontativa del manifesto §7** aplicada a la pedagogía: nombrar el error,
articularlo con justicia, desmantelarlo con el método mismo — *"Juan es Evangelio, no apocalíptico —
¿cómo cambia eso tu regla de lectura?"*.

### Restricciones duras (la clave para no violar P1/P2)

1. **Verificador-orientador, NUNCA generador.** Aporta **datos** (género que el módulo de exégesis
   ya determinó, trasfondo con fuente real vía RAG ADR-024, paralelos) + **preguntas socráticas**.
   **Nunca escribe la respuesta/interpretación del pastor.** Reusa el patrón de
   `verifyTimelessPrinciple` (verificador, no generador).
2. **Pull-first.** Modo primario: botón explícito **"Pedir orientación"** por paso. El pastor invoca;
   el sistema no interrumpe por default.
3. **Nudge suave, no-bloqueante, opcional.** El sistema puede surfacear un aviso sutil (no modal, no
   bloqueante) cuando detecta un error de método de alta confianza; el pastor lo ignora libremente.
   Cap + toggle off (mecánica de nudges en PR B, no aquí).
4. **Silencio se mantiene donde ADR-023 lo puso**: interpretaciones `distinctive`/`open-evangelical`
   legítimas **no** se confrontan inline (eso sigue siendo el gate completo / tres testigos).
   La orientación toca **método**, no disenso confesional legítimo.
5. **`core` doctrinal**: sigue gobernado por el tripwire de ADR-023 (Tier 1 inline) sin cambio.
6. **Degradación elegante**: si el trasfondo histórico no tiene contenido RAG para el libro
   (deuda heredada de ADR-024), la orientación da género+outline+preguntas y marca el trasfondo como
   no disponible — **nunca inventa una cita falsa**.
7. **Auditado**: cada orientación se registra en `AiAssistLog` (`assistType` apropiado +
   `outputWasEditedByUser`), alimentando el "% tuyo" (Fase 4).

### Alcance de superficie

Momento 1 del acompañante (ADR-025): **por paso en el wizard de 8 pasos** (PR A) y **por mensaje en
Faculty** (PR B). Misma cabeza (callable `orientStudy`), distinto disparador.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Mantener silencio total no-core (status quo ADR-023) | Subutiliza al asistente; deja pasar errores de método claros (escenario del fundador). |
| Confrontar TODO inline (incluida interpretación legítima) | Viola productive struggle; la IA se vuelve la voz. Es lo que ADR-023 evitó a propósito. |
| Que el asistente escriba la interpretación correcta | Viola P1/P2; vuelve el sistema fábrica de respuestas. |
| Intrusivo por default (autocompletar / modal) | Rompe pull-first; paternalista. |

## Consecuencias

### Positivas
- Cierra el gap del smoke (error de género/método sin guía) sin volver la IA la voz.
- Aprovecha infra ya existente: `BookPanorama` (género), RAG trasfondo (ADR-024), cross-ref (Fase 0).
- Coherente con manifesto §7 (confrontación) + compromisos (género gobierna lectura).

### Negativas
- Más llamadas LLM (orientación por paso). Mitigado: pull-first (solo on-demand) + cache por (pasaje, paso) + Gemini Flash + nudge de alta confianza cap.
- Riesgo de orientación molesta/equivocada. Mitigado: feedback "no era preciso" + toggle nudges off + pull-first como default.
- Reabre una política aceptada (ADR-023). Mitigado: **extiende, no revierte** — el silencio sigue para interpretación legítima; solo añade el eje "método".

### Neutrales
- `witnessReview` / `AiAssistLog` (Fase 1.6/2) se reusan para auditar resoluciones de orientación.

## Impacto

- **Código afectado**: `packages/functions/src/study-companion/orientStudy.ts` (callable verificador-orientador, contra interfaz `LlmClient`); `packages/web` `StepCompanion` en los 8 pasos del wizard (PR A) + por-mensaje en Faculty (PR B); `AiAssistLog` writes.
- **Fases impactadas**: Fase 4 ("% tuyo" consume los logs de orientación).
- **Migraciones requeridas**: ninguna.
- **Reversibilidad**: alta — detrás del sub-flag `study_depth`; apagarlo deja el tripwire de ADR-023 intacto.

## Referencias

- Extiende: [ADR-023](./ADR-023-two-tier-proactive-verification.md) (silencio no-core)
- Reusa: `verifyTimelessPrinciple` ([ADR-022](./ADR-022-eight-step-spine-rename-migration.md)), `BookPanorama` + RAG trasfondo ([ADR-024](./ADR-024-genre-context-rag-ruta-c.md))
- Modelo: [ADR-025](./ADR-025-study-companion-unified-model.md)
- Manifesto §7 (exégesis confrontativa): [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)
- Phase doc: [phase-2-5-study-depth-copilot.md](../phases/phase-2-5-study-depth-copilot.md)
