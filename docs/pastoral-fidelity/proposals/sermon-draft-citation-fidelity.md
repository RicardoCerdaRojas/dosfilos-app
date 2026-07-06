# Propuesta — Fidelidad de citas en la REDACCIÓN del sermón

> Investigar → proponer → sin código hasta aprobar. Hermano de ADR-036 (fidelidad
> del ancla), pero en el pipeline del sermón (citas a fuentes/comentaristas, no
> anclas bíblicas). Estado: DRAFT para revisión del fundador. 2026-07-05.

## El problema (observado en vivo)

Al publicar un sermón, el gate `evaluateClaimSourceFidelity` marcó **4 citas
inventadas** atribuidas a autores reales (Kistemaker, Green) que no están en el
material fuente. El gate funcionó (backstop). Pero el pastor las ve **al final**;
el borrador ya nació con citas fabricadas.

## Causa raíz (de diseño, no bug)

El redactor recibe **solo metadatos** de las fuentes, no el texto:

```
[S1] Título — Autor (p. 42)
[S2] Título — Autor (p. 15)
```

Decisión DELIBERADA (`prompts-generator.ts:254-259`): meter los excerpts verbatim
en el prompt dispara el filtro **RECITATION** de Gemini → bloquea el sermón
entero. Por eso se pasa solo la identidad de la fuente.

Consecuencias encadenadas:
1. **Sin grounding**: el modelo atribuye "como enseña Kistemaker…" de memoria
   general — nunca ve lo que la fuente dice → alucina citas plausibles.
2. **"NUNCA inventes" sin dientes** (regla 4 del contrato): prohíbe sin darle al
   modelo el texto contra el cual verificar.
3. **La validación post-gen** (`validateCitations`, `SermonGeneratorService.ts:280-302`)
   solo revisa que los IDs `[Sn]` coincidan con el contrato — NO el TEXTO de la
   cita. La prosa fabricada pasa el filtro.
4. **Verificación solo al publicar** (`StepDraft.tsx:handlePublish`), no en la
   generación → el borrador se guarda sucio en `wizardProgress.draft`.

Dato clave: los excerpts reales SÍ existen (`CitationManifest.excerpt`, ≤280
chars) pero viven en el objeto de retorno, no en el prompt.

## La tensión de diseño a resolver

Necesitamos que el modelo atribuya SOLO lo que la fuente dice, pero NO podemos
meter los excerpts largos verbatim (RECITATION). Cualquier fix vive dentro de esa
restricción.

## Opciones (tradeoffs honestos)

### A. Grounding en el prompt (excerpts cortos)
Meter el excerpt **truncado corto** (≤150 chars) de cada fuente en el contrato +
exigir PARÁFRASIS (ya prohibido reproducir verbatim). El modelo atribuye sobre
texto real, no de memoria.
- **Pro**: ataca la raíz. El modelo deja de inventar porque tiene el contenido.
- **Contra**: riesgo RECITATION a validar (¿un excerpt de 150 chars + "parafrasea"
  dispara el filtro? — hay que medirlo, no asumir). Cambio en el prompt核心.

### B. Verificación IN-DRAFT (reusa el verificador de publish)
Tras generar, correr el verificador que YA existe
(`VerifySermonCitationsUseCase` / `evaluateClaimSourceFidelity`) **antes** de
mostrarle el borrador al pastor. Para cada cita `not-found`: un pase quirúrgico
del LLM reescribe esas oraciones — **quita la atribución fabricada, conserva la
idea** ("en línea con la enseñanza reformada…" sin comillas ni autor falso).
- **Pro**: reusa maquinaria probada, cero riesgo RECITATION, el pastor ve un
  borrador LIMPIO. Prevención desde su punto de vista.
- **Contra**: no evita que el modelo las genere (las limpia después); +1 pase LLM
  cuando hay fabricaciones (costo condicional).

### C. Endurecer el prompt (barato, inmediato)
Reforzar el contrato: prohibir atribuir a CUALQUIER autoridad que no esté en
`[S1..Sn]`; si no tiene la cita exacta, **parafrasear sin comillas ni nombre**.
- **Pro**: 20 min, baja las fabricaciones que citan autores FUERA de la lista.
- **Contra**: no frena una cita fabricada atribuida a un autor que SÍ está en la
  lista (el modelo igual inventa qué dijo). Parcial.

## Recomendación — fásico

1. **C ahora** (prompt hardening): win inmediato, corta las atribuciones a autores
   fuera de la lista.
2. **B como entrega principal** (verify-in-draft + pase quirúrgico): es lo que el
   pastor SIENTE — borrador limpio, sin alertas al publicar. Reusa lo construido,
   sin riesgo RECITATION. Fail-closed: si el verificador no puede confirmar una
   cita, se quita la atribución (no se publica una cita sin respaldo).
3. **A como follow-up** (grounding), SOLO si B no basta: primero medir si excerpts
   cortos disparan RECITATION. Si no lo hacen, es el fix de fondo.

El gate de publish se **queda** como red de seguridad — nunca se saca.

## No negociables (mismo espíritu que 036)

- **Fail-closed**: una cita que no se puede confirmar contra la fuente NO se
  publica atribuida — se quita la atribución, no se arriesga.
- **El gate pre-publish permanece** — B/C reducen lo que llega, no reemplazan el
  backstop.
- **Dato, no invención**: la atribución vale solo si hay excerpt de respaldo
  (`CitationManifest.excerpt`), la misma procedencia estructurada de R3.

## Preguntas para el fundador

1. ¿Empezamos por **B** (verify-in-draft, el fix que el pastor siente) o querés
   **C** primero (prompt hardening, más barato pero parcial)?
2. Para las citas `not-found`: ¿preferís **quitar la atribución** (conservar la
   idea parafraseada) o **regenerar** la sección entera? (Quitar es más quirúrgico
   y barato; regenerar es más limpio pero cuesta un draft nuevo.)
3. ¿Medimos el riesgo RECITATION de la opción A en paralelo (para saber si el fix
   de fondo es viable), o lo dejamos para después de ver si B basta?

## Referencias

- Composer: `GeminiSermonGenerator.ts:219-306`, `prompts-generator.ts:467-693`.
- Contrato de citación (sin excerpts): `prompts-generator.ts:252-320`.
- Post-gen (solo IDs): `SermonGeneratorService.ts:280-302`.
- Verificador (reusable para B): `VerifySermonCitationsUseCase.ts`,
  `evaluateClaimSourceFidelity.ts`.
- Gate en publish: `StepDraft.tsx:handlePublish` → `runCitationVerifier`.
