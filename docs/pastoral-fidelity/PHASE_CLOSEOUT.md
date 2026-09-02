# Phase Closeout Protocol

Protocolo para cerrar una fase de la iniciativa Pastoral Fidelity y **generar los inputs para la siguiente fase**.

**Cuándo usar**: al terminar de implementar y testear todos los entregables de una fase, antes de cerrar la conversación.

**Por qué importa**: cada fase produce schemas, feature flags, datasets, decisiones y aprendizajes que la siguiente fase consume. Sin closeout disciplinado, la siguiente fase inicia con contexto incompleto, asunciones equivocadas y deuda invisible.

El closeout es la **bisagra** entre fases. Hecho bien, la siguiente fase onboarda en <30 seg.

---

## Modo recomendado — slash command

Escribí en la conversación de la fase que estás cerrando:

```
/cerrar-fase 0
```

(o el número que corresponda)

El slash command vive en `.claude/commands/cerrar-fase.md` y ejecuta el protocolo completo abajo bloque por bloque. Reporta progreso en cada bloque para confirmación.

Para arrancar la siguiente fase después del closeout: nueva conversación + `/iniciar-fase 1`.

---

## Checklist de 5 bloques

Ejecutar en orden. NO saltar bloques.

### Bloque 1 — Verificación de cierre real (no falso-completed)

Antes de declarar la fase cerrada:

- [ ] **Todos los criterios** de la sección `Tests / verificación` del phase doc están marcados `[x]`
- [ ] **Tests automatizados** corren verde (unit + integration)
- [ ] **Tests manuales** (si la fase tiene UI) se ejecutaron con observación directa, no solo "asumiendo que funciona"
- [ ] **PRs mergeados** a main, o explícitamente parked con justificación documentada
- [ ] **Feature flag** rolled out al estado correcto (off para users hasta validación; on para early access si aplica)
- [ ] **NO hay items deferred** pretendiendo estar done. Si algo se difirió, está documentado como diferimiento explícito.

Si algún check falla → la fase NO está cerrada. Sigue trabajando o documenta el diferimiento + ajustá scope antes de cerrar.

### Bloque 2 — Actualización de documentación

Actualizar en este orden:

#### 2.1 — Phase doc cerrado

En `docs/pastoral-fidelity/phases/phase-N-<slug>.md`:

- [ ] Cambiar `## Estado` de `in-progress` a `complete`
- [ ] Bitácora final con fecha + resumen de 3-5 líneas: qué se entregó vs qué se planeó, principales decisiones intra-fase
- [ ] Si hubo cambios al diseño técnico durante implementación: actualizar la sección `Diseño técnico` para reflejar lo realmente construido
- [ ] Si hubo decisiones nuevas significativas: link a los ADRs creados durante la fase
- [ ] Si surgieron riesgos no anticipados: agregarlos a `Riesgos` con mitigación tomada o pendiente

#### 2.2 — README actualizado

En `docs/pastoral-fidelity/README.md`:

- [ ] Tabla de fases: cambiar estado de la fase a `complete` con fecha
- [ ] Línea "Última actualización" con fecha + nota breve (`"Fase N cerrada — <highlight>"`)

#### 2.3 — Memoria roadmap

En `~/.claude/projects/-Users-ricardocerda-dev-dosfilosPreach/memory/feature_pastoral_fidelity_roadmap.md`:

- [ ] Agregar ADRs nuevos a la lista de aceptados
- [ ] Actualizar estado de la fase
- [ ] Actualizar entrada en `MEMORY.md` con info más relevante (cambio de estado, ADRs nuevos)

#### 2.4 — CLAUDE.md raíz (si aplica)

Solo si emergió una regla operacional permanente:

- [ ] Agregar línea en CLAUDE.md raíz (ej. "Toda nueva ingesta a la library debe pasar por `IngestionStatus` validation. Ver ADR-XXX")

#### 2.5 — ADRs nuevos creados

Por cada decisión arquitectónica tomada durante la fase:

- [ ] ADR escrito en `decisions/ADR-NNN-<slug>.md` siguiendo `ADR-template.md`
- [ ] Estado `accepted` (no `proposed`) si efectivamente se aplicó
- [ ] Referencia cruzada al phase doc donde se originó
- [ ] Si supersede otro ADR: link explícito + marcar el anterior como `superseded by ADR-NNN`

#### 2.6 — Session log

En `docs/pastoral-fidelity/sessions/YYYY-MM-DD-phase-N-closeout.md`:

- [ ] Crear archivo nuevo con fecha
- [ ] Resumen de lo entregado
- [ ] Lista de PRs mergeados con # y título
- [ ] Decisiones tomadas durante la fase (link a ADRs)
- [ ] Cosas que no salieron como planeado (input para retro)

### Bloque 3 — Handoff a la siguiente fase

**Este es el bloque que distingue closeout disciplinado vs. abandonar la conversación.**

Por cada fase siguiente que dependa de esta:

#### 3.1 — Identificar dependencias satisfechas

Listar en el handoff:

- **Schemas/tipos creados** que la siguiente fase consume (ej. "Fase 0 entregó `Source` schema con campos rights-aware; Fase 3 los consume en el fidelity pass")
- **Feature flags activados** y a qué porcentaje de users
- **APIs/endpoints expuestos** con su contrato (input/output)
- **Datasets ingestados** (ej. "14 fuentes CORE en Firestore en colección `confessions/`")
- **Componentes UI reutilizables** creados

#### 3.2 — Identificar dependencias NO satisfechas

Tan importante como lo anterior. Listar:

- **Entregables originalmente planeados** que se difirieron
- **Asunciones que se hicieron** y que la siguiente fase debe verificar
- **Tech debt creado intencionalmente** con plan de pago
- **Workarounds temporales** con condición de remoción

#### 3.3 — Update del phase doc de la siguiente fase

Abrir `docs/pastoral-fidelity/phases/phase-(N+1)-<slug>.md` y:

- [ ] **Sección `Prerequisitos`**: actualizar para reflejar el estado real entregado, no el estado planeado
  - Marcar prereqs satisfechos: `- [x] Schema X disponible (entregado en Fase N, PR #YYY)`
  - Listar prereqs NO satisfechos con justificación
- [ ] **Sección `Decisiones pendientes`**: agregar preguntas nuevas que esta fase surfaceó y la siguiente debe responder
- [ ] **Sección `Diseño técnico`**: revisar si cambios de esta fase invalidaron o refinaron el diseño planeado de la siguiente
- [ ] **Sección `Bitácora`**: agregar línea "Prereqs actualizados al cerrar Fase N (YYYY-MM-DD)"

Si la fase siguiente está como placeholder (estado `planning` sin detalle): considerar si vale la pena escribir su detalle ahora (con contexto fresco) vs. esperar al kickoff (con contexto frío).

#### 3.4 — Si hay riesgos cross-fase

Si esta fase reveló un riesgo que afecta fases siguientes (ej. "el cross-ref engine TSK tiene cobertura limitada en AT poético; Fase 4 contra-scan puede sufrir"):

- [ ] Documentar en `phase-(N+1)` o fase relevante
- [ ] Considerar si requiere nuevo ADR o cambio de plan
- [ ] Notificar al fundador

### Bloque 4 — Retrospective (opcional pero valioso)

En el session log de closeout, escribir 4 párrafos cortos:

#### 4.1 — Qué fue mejor que estimado
- ¿Qué tomó menos tiempo del esperado?
- ¿Qué reutilizamos exitosamente sin fricción?
- ¿Qué decisión previa nos salvó?

#### 4.2 — Qué tomó más tiempo
- ¿Dónde subestimamos complejidad?
- ¿Qué dependencias no anticipamos?
- ¿Qué decisiones del fundador llegaron tarde y bloquearon?

#### 4.3 — Qué cambió del plan original
- ¿Qué entregable se transformó? ¿Por qué?
- ¿Qué decisión arquitectónica revertimos?
- ¿Qué scope se ajustó?

#### 4.4 — Aprendizajes para fases futuras
- Patrones que funcionaron y vale la pena replicar
- Anti-patrones identificados
- Convenciones nuevas adoptadas implícitamente que vale la pena formalizar

Este bloque NO es burocracia. Es la única forma de mejorar el método entre fases. Sin retro, cada fase se hace en aislamiento y los aprendizajes se pierden.

### Bloque 5 — Sanity check final

Antes de cerrar la conversación:

- [ ] **Onboarding test mental**: si un agente nuevo abre una conversación mañana y ejecuta el `SESSION_KICKOFF.md` apuntando a Fase N+1, ¿tiene todo el contexto necesario?
- [ ] **Git limpio**: no hay cambios uncommitted relevantes al trabajo de la fase
- [ ] **Branches**: branches de PRs mergeados deleted (cleanup)
- [ ] **CI verde**: el pipeline corre verde en main después del último merge
- [ ] **Production rollout**: si la fase entregó feature visible, está deployed al estado correcto

Si los 5 checks pasan: cierra la conversación con confianza. Si alguno falla: NO cierres todavía; tu siguiente conversación se va a confundir.

---

## Template de handoff doc (opcional)

Para fases grandes o cross-cutting, considera escribir un handoff doc adicional:

```markdown
# Handoff: Fase N → Fase N+1

## Estado entregado
- [contexto sintético de qué quedó done]

## Schemas / APIs / datasets disponibles
- [lista concreta con paths del repo]

## Feature flags
- [estado actual]

## Asunciones de esta fase que la siguiente debe validar
- [lista]

## Tech debt creado intencionalmente
- [con plan de pago]

## Decisiones críticas que la siguiente fase NO puede revertir sin discutir
- [lista]

## Recomendación de primer PR de la siguiente fase
- [scope sugerido + razón]
```

Guardar en `sessions/handoff-phase-N-to-phase-(N+1).md`.

---

## Lo que NO es closeout

Cosas que parecen closeout pero no lo son:

- ❌ "Mergeé el PR, listo"  → falta actualizar phase doc + README + memoria
- ❌ "Actualicé el README"  → falta verificar tests + cerrar handoff
- ❌ "Escribí el ADR" → falta marcarlo accepted + actualizar phase doc que lo motivó
- ❌ "Todo está en mi cabeza" → no sobrevive la próxima conversación

Closeout = persistencia de contexto + verificación de calidad + handoff explícito. Las tres juntas.

---

## Cuando saltar bloques (raro)

El único escenario válido para saltar bloques:

**Fase abortada/cancelada**: si una fase se decide cancelar mid-flight (cambio de prioridad, descubrimiento de que no era necesaria, etc.):

- Bloque 1 (verificación) → marcar fase como `cancelled` en lugar de `complete`
- Bloque 2 (docs) → documentar la cancelación con razón en bitácora
- Bloque 3 (handoff) → reescribir fases siguientes que dependían de esta
- Bloque 4 (retro) → MANDATORIO (aprender de la cancelación)
- Bloque 5 (sanity) → confirmar que el codebase quedó limpio

Cancelación es excepcional, no rutina.

---

## Referencias

- Kickoff protocol: [SESSION_KICKOFF.md](./SESSION_KICKOFF.md)
- Índice de fases: [README.md](./README.md)
- ADR template: [decisions/ADR-template.md](./decisions/ADR-template.md)
- Feedback `feedback_pr_complete_units` (PRs como unidades testeable en UI)
