# Session Kickoff Template

Plantilla de arranque para cada nueva conversación que trabaje en una fase de la iniciativa Pastoral Fidelity.

**Cuándo usar**: al abrir una conversación nueva para empezar (o continuar) una fase. NO usar para tareas ad-hoc fuera de la iniciativa.

**Cuándo NO usar**:
- Sub-tareas dentro de la misma fase (continúa en la conversación abierta)
- Bug fixes urgentes cross-fase (corrige en la sesión donde apareció)
- Tareas no relacionadas con la iniciativa

---

## Modo recomendado — slash command

En cualquier conversación nueva escribí:

```
/iniciar-fase 0
```

(o `/iniciar-fase 1`, `/iniciar-fase 2`, etc. según la fase que arranques)

El slash command vive en `.claude/commands/iniciar-fase.md` y ejecuta automáticamente todo el protocolo de abajo. No requiere copia-pega de templates.

Para cerrar fase: `/cerrar-fase 0` (ejecuta protocolo de [PHASE_CLOSEOUT.md](./PHASE_CLOSEOUT.md)).

---

## Plantilla equivalente (si el slash command no está disponible)

Si por alguna razón el slash command no funciona, copia-pega manualmente:

```
Continuamos la iniciativa Pastoral Fidelity. Arrancamos Fase N.

Antes de cualquier propuesta o código, hacé esto en orden:

1. Leé `docs/pastoral-fidelity/README.md` (estado actual de fases)
2. Leé `docs/pastoral-fidelity/phases/phase-N-<slug>.md` (objetivo + decisiones + diseño técnico + criterios de aceptación)
3. Leé ADRs relevantes a esta fase listados en el phase doc
4. Leé `docs/pastoral-fidelity/05-pedagogy-manifesto.md` + `06-pedagogy-applied.md` si la fase toca prompts/UX/citation
5. Leé `docs/pastoral-fidelity/07-citation-policy.md` si la fase toca el citation engine
6. Leé `CLAUDE.md` raíz para protocolo + reglas operacionales del repo

Después de leer, dame:
- Resumen en 5 bullets de qué entrega esta fase
- Plan de PRs (siguiendo `feedback_pr_complete_units`: cada PR = unidad testeable en UI)
- Preguntas abiertas que tengas antes de empezar
- Cualquier discrepancia que detectes entre el phase doc y el estado real del codebase

NO escribas código todavía. Esperá mi confirmación del plan.
```

## Adaptaciones por fase

Agregar líneas al template según la fase:

### Fase 0 — Foundations

Agregar:
- "Leé `docs/pastoral-fidelity/data/core-library-seed.json` — catálogo CORE a ingestar"
- "Verificá si hay infraestructura de feature flags existente en el repo (grep por `featureFlag` o equivalente)"

### Fase 1 — Six-step spine

Agregar:
- "El spine de 6 pasos **reusa** el tutor de griego — leé memoria `feature_greek_tutor_methodology_narrative` antes de proponer rebuild"
- "Verificá ubicación actual del wizard de sermón en el codebase (`/src/.../sermon/wizard/`)"

### Fase 2 — Tres testigos

Agregar:
- "Testigo 2 depende del cross-ref engine de Fase 0 — confirmá que esté operativo"
- "Testigo 3 depende del catálogo de confesiones taggeado con `doctrineLevel` — confirmá tagging completo"

### Fase 3 — Claim↔source fidelity

Agregar:
- "Esta fase **extiende** el citation engine actual (branch `feat/phase-c1-export-with-citations` o sus successores). Leé `validateCitationManifest` y `citationManifest` actuales antes de proponer cambios"
- "Validators nuevos: PluralityReport, AttributionReport, AuthorityReport (definidos en phase doc)"

### Fase 4 — Autoría + contra-scan + voice fingerprint

Agregar:
- "Esta fase tiene 3 sub-features. Confirmá si vamos a hacerlas en un solo round o secuenciales"
- "Voice fingerprint es la sub-feature más costosa (~2-3 sem). Posible diferimiento individual"

### Fase 5 — Project como contenedor

Agregar:
- "Patrón base: PR #211 (`feature_exegesis_paper_artifacts_convergence`). Revisá git log de ese PR para entender el patrón antes de proponer schema"
- "Esto es refactor mayor — coordiná migración con dual-write window"

### Fase 6 — Planner runway

Agregar:
- "Series planner existente vive en código tracked por `feature_sermon_series_pericope_pipeline`. Localizalo antes de modificar"
- "Notifications: verificá si hay infraestructura push/email actual"

### Fase 7 — Exégesis reform

Agregar:
- "Aplicamos mismo marco que Fase 1 al paper. Releé ADRs 002 + 005 antes de proponer adaptación"
- "Acoplamiento con sermón ya está desacoplado (ADR-004). Verificá que sigue así"

## Qué espero del agente antes de escribir código

1. **Resumen del objetivo** de la fase en sus propias palabras (verifica comprensión)
2. **Plan de PRs** numerados con scope claro (siguiendo `feedback_pr_complete_units`)
3. **Lista de archivos** que cada PR tocará (verifica scope realista)
4. **Preguntas abiertas** que necesitan tu input antes de empezar
5. **Discrepancias** entre lo que dice el phase doc y el estado real del codebase (drift detection)
6. **Estimación de tiempo** por PR

## Qué el agente NO debe hacer en el arranque

- Escribir código antes de confirmar el plan
- Crear nuevos ADRs sin discutirlos primero
- Saltarse la lectura de los docs canónicos "porque ya los leí en otra conversación" — esa conversación no existe en su contexto
- Asumir estado del codebase sin verificar (`git status`, leer archivos clave)
- Empezar un PR antes de cerrar el plan completo de la fase

## Confirmación de tu parte

Antes de dar luz verde al primer PR, confirma:

- [ ] Plan de PRs te hace sentido (granularidad correcta)
- [ ] Scope de cada PR es alcanzable en 1 unidad de trabajo
- [ ] Preguntas abiertas las resolviste o las marcaste para resolución intra-fase
- [ ] Cualquier discrepancia con phase doc se actualizó en el doc (con bitácora)

## Cuando hay más de un asistente / sesión en paralelo

Si por alguna razón hay dos sesiones tocando la misma fase simultáneamente (raro, pero posible si trabajas con un colaborador humano):

1. **Una sola sesión "owner" de la fase a la vez**. Otra sesión solo lee/consulta, no escribe.
2. **Comunicar lock via phase doc**: agregar línea en bitácora "OWNER: <identifier> hasta YYYY-MM-DD".
3. **Bitácora actualizada en tiempo real**, no al final.

## Referencias

- Closeout protocol: [PHASE_CLOSEOUT.md](./PHASE_CLOSEOUT.md)
- Índice de fases: [README.md](./README.md)
- Manifiesto pedagógico: [05-pedagogy-manifesto.md](./05-pedagogy-manifesto.md)
- Bridge operacional: [06-pedagogy-applied.md](./06-pedagogy-applied.md)
- Política de citas: [07-citation-policy.md](./07-citation-policy.md)
