# Instrucción de arranque — Claude Code (Preach · upstream de estudio)

> **Antes de pegar esto:** coloca el archivo `spec-asistentes-preparacion-estudio-v1.3.md` en el repo (p.ej. `/docs/spec-asistentes-preparacion-estudio-v1.3.md`) para que Claude Code pueda leerlo. Luego pega el bloque de abajo.

---

## FASE 0 — Carga de contexto y reporte de brechas (SIN escribir código)

Lee `docs/spec-asistentes-preparacion-estudio-v1.3.md` completa. Es un documento de **diseño**: describe el sistema que queremos. El repo es el sistema **real**. Tu primer trabajo NO es implementar — es reconciliar los dos y reportarme las brechas. Reglas de comportamiento para toda esta sesión:

- **El código gana sobre la spec.** Donde la spec contradiga lo que hay implementado, créele al código y márcame la discrepancia. No reescribas la realidad para que calce con la spec.
- **Cita siempre `archivo:línea`.** Nada de afirmaciones sin evidencia del repo.
- **No asumas.** Si algo no lo encuentras, dilo explícitamente; no lo inventes.
- **Cero código en esta fase.**

Recorre el repo y entrégame un reporte estructurado con estas secciones:

**1. Verificación del mapeo técnico (§4.1 y §5 de la spec).**
Confirma o corrige que estos existen y hacen lo que la spec dice. Cita `archivo:línea`:
- `extractions/{id}` y su campo `markdown` — ¿cuál es su schema actual completo? ¿hay validaciones (el "≥40 chars, owner-scoped")?
- `encolarPlanSesion.ts` — ¿de dónde lee el insumo?
- `buildPlanPrompt.ts` — ¿qué arma en System y en User? ¿cómo entra el `género`?
- `planGeneration.ts` / `coerceCandidate` — ¿el bucle `erroresPrevios` valida esquema o algo más?
- `validatePlan.ts` — ¿qué valida exactamente?
- `inject.ts` y `render/` — confirma que es transformador determinista JSON→HTML.
- `proponerOutlineCurso` y el manejo de `alcance` para cursos.

**2. Qué de la spec YA existe en el código (y dónde).**
Especialmente: ¿existe algún concepto de "promoción", "slot", "elemento de estudio", "estudio_madre", o cualquier estructura de fidelidad/puertas? ¿Existe ya la noción de "este recurso derivó de aquel" (vi vínculos `↗ Sermón` en la UI de Recursos)?

**3. Qué CONTRADICE la spec con lo implementado.**
Cualquier choque entre el schema propuesto (`estudio_madre`, `elementos`, `perfil_transposicion`) y lo que ya hay.

**4. Los seis gaps del §10 — ¿reales o ya resueltos?**
Para cada uno (objetivos, nivel curso, trazabilidad, contrato del estudio, contrato proyecto/plan, contrato transposición): ¿es un gap real, o ya está cubierto de otra forma en el código? Cita evidencia.

**5. Riesgos y orden de implementación que propondrías.**
Dado lo que encontraste, ¿en qué orden harías el MVP del §11 y por qué? ¿Qué tocar primero rompe menos?

Para de ahí. Espera mi visto bueno antes de continuar a la Fase 1.

---

## FASE 1 — Plan de implementación reconciliado (SIN escribir código aún)

Solo cuando yo apruebe el reporte. Con las brechas reales claras, proponme el plan de implementación del **MVP (§11 de la spec)**, anclado al repo real, en capas pequeñas y revisables. Para cada capa: qué archivos tocas, qué creas, cómo lo pruebo end-to-end contra el engine existente, y qué NO toca. Espera mi aprobación del plan antes de codear.

---

## FASE 2+ — Implementación por capas (solo tras aprobar el plan)

Construye en este orden, deteniéndote para revisión y commit pequeño después de cada capa:

1. **Sobre `estudio_madre` en `extractions/{id}`** (schema del §2.3), backward-compatible: ausencia del sobre ⇒ `sin_auditar`; los estudios viejos (markdown solo) siguen funcionando igual. + `serializarEstudio(elementos, orden) → markdown`.
2. **`validarEstudioMadre(elementos)`** con las puertas 1–4 + 7 (§8). Corre en la cristalización, no en la generación de artefactos.
3. **Promoción a elementos + botón "este es el contenido"** en la UI de conversación (§2.4). Promoción por elemento (opción 2); los campos `aceptado_por_docente`/`razon` quedan en el schema aunque en MVP se llenen mínimo.
4. **`objetivos: { saber, sentir, hacer }` en `TeachingPlan`** (Gap 1), poblado desde los elementos.
5. **Métrica de autoría visible** (`autoria_resumen`) — es la demo.

---

## REGLAS DURAS (no se violan sin avisarme y esperar confirmación)

- **NO tocar `inject.ts` ni `render/`** — el transformador determinista JSON→HTML queda intacto.
- **NO tocar `validatePlan.ts`** — valida el esquema del contrato, no la fidelidad. Son dos validaciones distintas; ambas existen.
- **Todo el trabajo nuevo es upstream del markdown.** `buildPlanPrompt` sigue consumiendo `extractions/{id}.markdown`; lo único que cambia es que ese markdown ahora viene de elementos cristalizados.
- **Backward-compatibility obligatoria:** ningún estudio existente puede dejar de funcionar. Los legacy se marcan `sin_auditar` y siguen alimentando la skill.
- **Commits pequeños y revisables.** Nada de un PR gigante. Pausa para revisión tras cada capa.
- **Si un cambio implica refactor amplio o tocar algo de las reglas duras**, detente y propónmelo antes de hacerlo.
