# CLAUDE.md — dosfilos-app (Preach)

Este archivo establece reglas de trabajo que aplican a TODA sesión de Claude Code en este repositorio. Las reglas aquí escritas son obligatorias.

## Propósito del proyecto

Preach es una plataforma de formación pastoral y producción de artefactos ministeriales (sermones, estudios bíblicos, newsletters, etc.). El target son pastores hispanohablantes y la convención lingüística es español neutral latinoamericano con uso de "tú".

## Iniciativa activa de mayor prioridad — Pastoral Fidelity

**Lee primero**: [docs/pastoral-fidelity/README.md](./docs/pastoral-fidelity/README.md)

Esta iniciativa reforma el módulo de generación de sermones (y eventualmente exégesis) para alinear el producto con un único propósito: **formar predicadores fieles, no producir sermones sintéticos**. Implementa el principio de que el pastor estudia primero, el sistema desarrolla bajo su dirección, y la fidelidad bíblica se valida por tres testigos antes de publish.

### Protocolo obligatorio al tocar estos módulos

Si tu trabajo toca cualquiera de los siguientes módulos, **ANTES de proponer cambios** debes:

- Wizard de sermón (`src/.../sermon/wizard/...`)
- Módulo de exégesis / paper (`src/.../exegesis/...`)
- Citation engine (`src/.../citations/...`)
- Faculty chat (`src/.../faculty/...`)
- Onboarding flow (`src/.../onboarding/...`)
- Series planner (`src/.../planner/...`)
- Library / source ingestion (`src/.../library/...`)

Pasos:

1. **Si abres conversación nueva para una fase**: el usuario escribirá `/iniciar-fase N` (slash command en `.claude/commands/iniciar-fase.md`). Si por alguna razón no usa el comando, aplicá manualmente [SESSION_KICKOFF.md](./docs/pastoral-fidelity/SESSION_KICKOFF.md).
2. **Si cierras fase**: usuario escribirá `/cerrar-fase N`. Si no usa el comando, ejecutá manualmente [PHASE_CLOSEOUT.md](./docs/pastoral-fidelity/PHASE_CLOSEOUT.md) (5 bloques).
3. Leer [docs/pastoral-fidelity/README.md](./docs/pastoral-fidelity/README.md) — estado actual de fases
4. Leer el phase doc de la fase activa
5. Leer ADRs nuevos desde tu última sesión en `docs/pastoral-fidelity/decisions/`
6. Verificar coherencia de tu propuesta con los **tres principios no-negociables**:
   - **P1** — Labor antes que output (Esdras 7:10)
   - **P2** — AI desarrolla, no origina (Brooks)
   - **P3** — Confrontación obligatoria (Hechos 20:27)
7. Si la fase toca prompts/UX/citation: leer también [05-pedagogy-manifesto.md](./docs/pastoral-fidelity/05-pedagogy-manifesto.md), [06-pedagogy-applied.md](./docs/pastoral-fidelity/06-pedagogy-applied.md), [07-citation-policy.md](./docs/pastoral-fidelity/07-citation-policy.md)

Si la propuesta viola un principio, no la implementes — reformúlala o levanta la tensión con el usuario.

### Decisiones arquitectónicas significativas

Cualquier decisión arquitectónica significativa que afecte esta iniciativa **debe documentarse como ADR** en `docs/pastoral-fidelity/decisions/`. Usa `ADR-template.md`. ADRs son append-only — nunca edites el pasado; si cambias de opinión, crea ADR nuevo que supersede al anterior.

### Update del phase doc

Si tu trabajo avanza el estado de una fase:

1. Update bitácora del phase doc con lo hecho
2. Si cerraste la fase: cambia estado en `README.md` (tabla de fases)
3. Update memoria `feature_pastoral_fidelity_roadmap` si cambia estado mayor

## Estándares de desarrollo

- **Lee `.agent/instructions/development_standards.md`** al inicio de cualquier sesión de trabajo en código.
- Sigue **`.agent/rules/compliance_gate.md`** antes de proponer cambios. El usuario tiene **cero tolerancia** a violaciones de compliance (memoria `feedback_compliance_strict`).
- **PR boundary** = unidad funcional completa testeable en UI (memoria `feedback_pr_complete_units`). No abrir PRs de back-end sin UI o "fase A sin fase B".

## Reglas operacionales

- **Firebase CLI**: SIEMPRE incluir `--project dosfilosapp` en cada comando `firebase`. Sin excepciones (memoria `feedback_firebase_deploy`).
- **Tono conversacional**: español neutral latinoamericano, uso de "tú", "dime", "aquí" (memoria `feedback_chat_tone_neutral`).
- **Copy en UI**: no exponer "IA/AI/GPT/Gemini/modelo/LLM" en strings user-facing. Usar "el asistente" o describir output directamente (memoria `feedback_copy_no_ai_exposure`). No usar "TMS" en marketing copy (memoria `feedback_copy_no_proprietary_tms`).

## Otros documentos relevantes (live)

- `docs/LAUNCH_READINESS.md` — 14 secciones para launch
- `docs/SMOKE_TESTS.md` — 8 tests manuales pre-deploy
- `docs/POST_LAUNCH_ROADMAP.md` — fases post-launch
- `docs/PRICING_PROCESSING_ROADMAP.md` — modelo de cuotas

## Memorias auto-cargadas relevantes

- `priorities_repositioning` — sermón como output derivado, no producto principal
- `roadmap_stable_platform` — máster de 7 fases hacia plataforma estable
- `security_auth_hardening` — bloqueador pre-launch
- Lista completa en MEMORY.md (cargado automáticamente).
