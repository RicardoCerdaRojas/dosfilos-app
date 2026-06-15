# Instrucción de arranque — Claude Code (Preach · la aplicación en tres dimensiones)

> **Versión 2** · ajustada contra el estado real de byblos al cierre de la sesión anterior (PR1–PR2 mergeados, PR3 pendiente, cola entrante = este trabajo).
> **Antes de pegar esto:** coloca en el repo `docs/teaching-suite/manifiesto-conduccion-formativa-aplicacion.md` (v1.2) y la spec `docs/teaching-suite/spec-asistentes-preparacion-estudio-v1.3.md` (v1.3.1). Luego pega el bloque de la fase correspondiente.

---

## FASE 0 — Carga de contexto y reporte de brechas (SIN escribir código)

Lee `docs/teaching-suite/manifiesto-conduccion-formativa-aplicacion.md` completo. Es un documento de **diseño teológico**: describe cómo debe quedar la aplicación en tres dimensiones (mente, corazón, conducta), con el corazón validado por primera vez. El MVP del upstream ya está en `main` (PR1 #343: motor de fidelidad generalizado + cristalización + los siete exámenes; PR2 #346: `objetivos {saber,sentir,hacer}`). **Este trabajo extiende ese MVP — no lo reconstruye.** Tu primer trabajo NO es implementar: es reconciliar el manifiesto con el código real y reportarme las brechas.

**Reconciliación de vocabulario (léelo antes de consultar byblos):** byblos y la cola de trabajo entrante usan **"puerta del corazón"**; el manifiesto la renombró a **"examen del corazón"** — es el mismo mecanismo, solo cambió el nombre (alineado con la spec v1.3.1: las "puertas" de validación ahora son "exámenes"). Donde byblos diga "puerta", entiende "examen", y **actualiza la terminología de byblos** al registrar tus hallazgos. La cola entrante en byblos es exactamente este trabajo: *conducción afectiva + examen del corazón + subtipar `aplicacion` + re-derivar `sentir` + T1*.

Reglas de comportamiento para toda la sesión:
- **El código gana sobre el manifiesto.** Donde el manifiesto contradiga lo implementado, créele al código y márcame la discrepancia.
- **Cita siempre `archivo:línea`.** Nada de afirmaciones sin evidencia del repo.
- **No asumas.** Si algo no lo encuentras, dilo; no lo inventes.
- **Cero código en esta fase.**
- **Usa byblos como memoria del proyecto.** Al arrancar, consulta byblos por el contexto de PR1–PR3 y las invariantes ya acordadas (motor único, sobre `estudio_madre` additivo, `objetivos` verbatim, deuda T1, grieta del doxological). Tras cada fase y cada capa, registra decisiones, invariantes y hallazgos con sus `archivo:línea`.

Recorre el repo y entrégame un reporte estructurado:

**1. El estado real del campo `aplicacion`.**
- ¿Dónde se define hoy `aplicacion` — en el contrato `TeachingPlan`, en el sobre `estudio_madre.elementos`, o en ambos? ¿Es un campo único sin subtipos? Cita `archivo:línea`.
- El tipo de elemento `aplicacion` en el schema del estudio: ¿qué campos tiene hoy (`contenido`, `autoria`, `respaldo_testigos`, etc.)?

**2. De dónde sale hoy el `sentir` (la causa raíz) y el parche.**
- `objetivos {saber, sentir, hacer}` (PR2 #346): ¿dónde se pueblan? ¿Se derivan **verbatim** de los elementos, o hay algún punto donde el LLM los redacta?
- En concreto: ¿de qué deriva hoy el `sentir`? Confirma o corrige la hipótesis del manifiesto de que no tiene fuente limpia.
- byblos menciona un parche temporal **`sentir-error_confrontado`**. Localízalo, dime qué tapa y dónde — porque al re-derivar el `sentir` desde `aplicacion:corazon` ese parche debería retirarse.

**3. La grieta de producción (más matizada de lo que parece).**
- `doxologicalApplication` en el flujo del sermón: byblos dice que **se valida solo por longitud, salvo un gate detrás de un flag** (flag-gated). Confírmalo con `archivo:línea`: ¿existe ese gate flag-gated? ¿qué valida cuando está activo? ¿qué pasa con el flag apagado? El cierre de la grieta puede ser **completar/activar ese path**, no construir de cero.
- `InsightStepPolicy`: ¿qué hace hoy con el afecto/aplicación? ¿Es el manejo ad-hoc que el manifiesto reemplaza?

**4. El motor único de fidelidad (de PR1) y cómo se le agrega un colector.**
- ¿Dónde quedó el motor generalizado? ¿Cuál es la interfaz de un colector (los "N colectores")? ¿`WITNESS_THRESHOLDS` con `softBlock`/`hardBlock`?
- Pregunta clave de arquitectura: ¿se puede **agregar un colector nuevo** (el del corazón) y un **filtro de admisibilidad previo** (afección vs. emoción) SIN tocar el motor? ¿Dónde enchufarían? Si requiere generalizar más el motor, dímelo antes.

**5. Dónde corren los exámenes hoy.**
- Confirma que `validarEstudioMadre` corre en la cristalización y NO en la generación de artefactos, para que el examen del corazón se enchufe ahí. Cita `archivo:línea`.

**6. El patrón de pasos guiados.**
- Localiza el patrón **"submit estructurado"** de los pasos guiados (PR #345, "Pasos estructurados Insight+Palabras"). La conducción C1–C5 debe reusarlo, no inventar una interacción nueva. Dime dónde vive y cómo se extiende.

**7. La deuda T1 (medibilidad de objetivos).**
- byblos registra una deuda **T1**: *los objetivos no confrontan su medibilidad*. Un objetivo ("al salir sabrán X") debería ser verificable, y hoy no se confronta. ¿Dónde se redactan/validan los objetivos? ¿Qué los confronta y qué no? Repórtame el estado. **La decisión de incluir T1 en este trabajo es del fundador** — solo trae el diagnóstico.

**8. PR3 (autoría visible) pendiente.**
- byblos lo marca como UI plumbing independiente, retomable cualquier día. Confirma que NO bloquea este trabajo, y que cuando PR3 se haga, la capa visible de autoría recogerá los nuevos subtipos de `aplicacion` sin cambios adicionales.

**9. Qué del manifiesto YA existe y qué es neto-nuevo.** ¿Hay algún subtipo de aplicación, alguna conducción afectiva, algún chequeo de afección, ya en el código?

**10. Riesgos y orden de implementación que propondrías.** ¿Qué capa rompe menos si va primero?

Para de ahí. Espera mi visto bueno antes de la Fase 1.

---

## FASE 1 — Plan de implementación reconciliado (SIN escribir código aún)

Solo cuando yo apruebe el reporte. Con las brechas reales claras, proponme el plan en capas pequeñas y revisables. Para cada capa: qué archivos tocas, qué creas, cómo lo pruebo end-to-end contra el engine existente, y qué NO toca. Incluye una recomendación explícita sobre **si T1 entra en este trabajo o va aparte**. Espera mi aprobación antes de codear.

---

## FASE 2+ — Implementación por capas (solo tras aprobar el plan)

Construye en este orden, deteniéndote para revisión y commit pequeño tras cada capa:

1. **Subtipar `aplicacion`** → `subtipo: mente | corazon | conducta`. Mapeo canónico a `objetivos` de PR2: **mente→saber, corazón→sentir, conducta→hacer**. Additivo y backward-compatible: una `aplicacion` legacy sin subtipo se trata como `sin_auditar` y sigue funcionando.

2. **La conducción C1–C5 (corazón)** + las conducciones breves de mente y conducta (§3 del manifiesto), reemplazando el manejo ad-hoc del `InsightStepPolicy`. **Reusa el patrón "submit estructurado" (PR #345)**, no inventes interacción nueva. Regla dura: **el sistema NO escribe la afección** — ofrece pistas de elicitación (marcadores literarios) y confronta; la oración la escribe el docente (misma prohibición que `idea_central`). Cada elemento lleva su `autoria`.

3. **El examen del corazón** (§4 y §4.1 del manifiesto), sobre el motor único de PR1:
   - La condición 4 (afección vs. emoción) = **filtro de admisibilidad binario que corre ANTES**. Lo que no es afección no entra al motor.
   - Las condiciones 1, 2 y 3 = **testigos sobre los colectores existentes**, reapuntados: contexto en el eje textual (trazabilidad) + contexto en el eje temporal (continuidad del puente) + confesión y contexto (raíz teocéntrica).
   - **Ni motor nuevo, ni cuarto testigo forzado.** Enchúfalo en `validarEstudioMadre` (cristalización), no en la generación de artefactos.

4. **Re-derivar el `sentir`** desde `aplicacion:corazon` ya validado por el examen (este es el cierre de la causa raíz: el objetivo afectivo deja de no tener fuente). **Retira el parche `sentir-error_confrontado`** una vez que la fuente limpia exista. Verbatim, no redactado por LLM.

5. **Cerrar la grieta:** enruta el `doxologicalApplication` del sermón **a través del examen del corazón**. Si ya hay un path flag-gated (ver Fase 0 punto 3), complétalo/actívalo en vez de duplicar. Retira la validación-solo-por-longitud. El sermón en producción deja de permitir afecto declarable sin validar.

**(Opcional, decisión del fundador) T1 — confrontación de medibilidad de objetivos.** Solo si lo apruebo en Fase 1. Ojo: medir una afección no es como medir conocimiento; la medibilidad del `sentir` es diseño teológico, no plumbing. No lo toques sin mi visto bueno explícito.

**Registra en byblos, apenas las confirmes, estas invariantes:**
- vocabulario: **"puerta del corazón" = "examen del corazón"** (renombrado); alinear toda mención en byblos;
- el `subtipo` de `aplicacion` es **additivo**; `aplicacion` legacy sin subtipo sigue funcionando como `sin_auditar`;
- el examen del corazón es **colector(es) + filtro previo sobre el motor único de PR1**, NUNCA un segundo motor;
- **afección vs. emoción = filtro de admisibilidad binario y previo**, no un testigo;
- **continuidad del puente = testigo de contexto en el eje temporal**, no categoría nueva;
- el `sentir` se **re-deriva de `aplicacion:corazon` validado**; parche `sentir-error_confrontado` retirado;
- `doxologicalApplication` migrado al examen — grieta de producción cerrada (déjalo asentado para no reabrirla);
- estado de **T1** (incluido / diferido) según lo que yo decida;
- la **bitácora de la congregación es v1+, NO MVP** — no implementar ahora, solo no romper la posibilidad futura.

---

## REGLAS DURAS (no se violan sin avisarme y esperar confirmación)

- **NO tocar `inject.ts` ni `render/`** — el transformador determinista JSON→HTML queda intacto.
- **NO tocar `validatePlan.ts`** — valida el esquema del contrato, no la fidelidad. Son dos validaciones distintas; ambas existen.
- **UN SOLO MOTOR DE FIDELIDAD.** El examen del corazón reusa el motor de PR1 (filtro previo + colectores reapuntados). Si concluyes que no se puede sin generalizar más el motor, **detente y propónmelo** antes de duplicar.
- **El sistema no origina la afección.** Pregunta, confronta, ofrece pistas — la oración afectiva la escribe el docente. Igual que `idea_central`.
- **El examen vive en la cristalización del Estudio Madre**, no en la generación de artefactos. Así el afecto validado se hereda a sermón, clase y devocional.
- **Todo el trabajo nuevo es upstream del markdown.** `buildPlanPrompt` sigue consumiendo `extractions/{id}.markdown`.
- **Backward-compatibility obligatoria:** ninguna `aplicacion` ni estudio existente puede dejar de funcionar; los legacy se marcan `sin_auditar`.
- **T1 no se toca sin mi aprobación explícita** (es decisión del fundador, no automática).
- **NO implementar la bitácora de la congregación** (es v1+). Solo no cerrarle la puerta.
- **Commits pequeños y revisables.** Pausa para revisión tras cada capa.
- **Si un cambio implica refactor amplio o tocar una regla dura**, detente y propónmelo antes de hacerlo.
