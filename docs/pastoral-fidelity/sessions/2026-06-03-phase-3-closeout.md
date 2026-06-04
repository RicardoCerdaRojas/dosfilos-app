# Closeout — Fase 3 (Pass de fidelidad claim↔source)

**Fecha**: 2026-06-03
**Comando**: `/cerrar-fase 3`
**Estado final**: `complete` — 5 PRs en main, CI verde.

## Bloque 1 — Verificación de cierre real

Al invocar el closeout, PR 5 estaba **code-complete pero NO integrado**: 0 commits adelante de
`origin/main` (todo el cambio staged sin commit), sin PR abierto. Bloque 1 falló → se paró el
protocolo y se ejecutó la secuencia de integración antes de continuar:

1. Detectada y revertida **contaminación del setup byblos** en el working tree: `byblos-dev`
   agregado a `package.json` como git dep `#main` (rompe CI del repo — `ls-remote permission
   denied`; memoria `byblos NO va en package.json`) + churn de `yarn.lock`. `git checkout --
   package.json yarn.lock`. Untracked `.byblos/`/`.mcp.json`/`.atl/` quedan fuera del commit
   (pendiente `.gitignore`, fuera de scope PR 5).
2. Sanity del staged set: 18 archivos, todos PR 5 (incl. `morphologyRendered?` en `SermonGenerator`
   + export de `computeAttributionCheck` en `domain/index`).
3. Verificación verde: `tsc --noEmit` domain/application/web (0 errores); tests per-package
   (domain 392 + application 73 + infra 51 + web 93 = **609**); `compliance:staged` 0 hard, 1 soft
   (`detail.tsx` 607 líneas, god component pre-existente).
   - Nota de proceso: `vitest run` desde root falla los tests web con `document is not defined`
     (jsdom no configurado a nivel root). **Correr tests web con el config del package**
     (`cd packages/web && vitest run`), no desde la raíz.
4. Commit `94569c5c` → push → **PR #300** → merge a main (merge commit `3aefc7a8`). CI verde
   (Build / Lint+TypeCheck / Run Tests).

Tras el merge, Bloque 1 pasa. Smoke manual UI (export SBLGNT → "Atribuciones") queda diferido al
flip del flag `fidelity_pass` (default off, Q10) — consistente con el patrón de la fase.

## Bloque 2 — Documentación

- `phases/phase-3-claim-source-fidelity.md`: estado → `complete`; PR 5 → MERGEADO #300; criterios PR 5 `[x]`.
- `README.md`: tabla Fase 3 → `completed`; línea "Última actualización" reescrita.
- Memoria `feature_pastoral_fidelity_roadmap.md` + `MEMORY.md`: estado Fase 3 cerrada.
- ADRs: **ninguno nuevo** — ADR-029 ya cubre Q1-Q10. El split SBLGNT (D-SBLGNT-license) es operacional
  y vive en ADR-029 §Q8 + bitácora PR 5. Memoria `tech_debt_sblgnt_hardcoded` ya creada (Q8).
- `CLAUDE.md` raíz: sin cambios — no emergió regla operacional permanente de pastoral-fidelity.
  (La lección byblos↔package.json es canon byblos, no de esta iniciativa.)

## Bloque 3 — Handoff a Fase 4

`phase-4-authorship-contrascan-voice.md` actualizado: prereq "Fase 3 completa" `[x]`, tabla de 7
dependencias satisfechas (FidelityReport schema, publish gate puro, modal/panel, patrón LLM
batcheado, ILlmClient, cross-ref engine, modo experto), 5 dependencias NO satisfechas, 4 preguntas
nuevas, línea de bitácora. Riesgo cross-fase clave: Fase 4 debe **extender** `evaluatePublishGate`
(no crear gate paralelo) y debería esperar al flip+smoke de `fidelity_pass` antes de apilar
verbatim+contra-scan.

## Bloque 4 — Retrospective

**Qué fue mejor que estimado.** El render del footer salió casi gratis: PDF y Docx ya llamaban
`aggregateRequiredAttributions`, así que el split SBLGNT se heredó con cero cambios en esos archivos.
La arquitectura de Fase 0 (citation engine rights-aware) pagó dividendos — PR 5 fue mayormente
domain puro + un componente web. El schema composable de `FidelityReport` (sub-reports opt-in,
decidido en kickoff D3) hizo que cada PR agregara su reporte sin tocar a los otros.

**Qué tomó más tiempo / fricción.** El closeout mismo: PR 5 estaba code-complete pero sin commitear
ni mergear cuando se invocó `/cerrar-fase`, y el working tree traía contaminación de un setup de
tooling no relacionado (byblos en package.json) que habría roto el CI. Verificar antes de declarar
cerrado evitó un cierre falso. Segundo: `vitest run` desde root da falsos rojos en web (jsdom) —
perdió un ciclo hasta correr por-package.

**Qué cambió del plan original.** Dos desviaciones documentadas en bitácora: (a) PR 2 NO creó el
callable `publishSermonWithFidelity.ts` que el phase doc listaba — el gate quedó client-side en
`SermonService` (coherente con ADR-029 §D8, feature flag-gated no adversarial). (b) PR 3 "mismo
batch" (Q4) se implementó como 2ª llamada Flash dentro del mismo callable, no como un solo prompt,
porque las unidades difieren (per-marker vs por-afirmación-doctrinal). El split SBLGNT en dos blocks
(BY 4.0 / BY-SA 4.0) se resolvió con el fundador antes de codear, contra una recomendación inicial
errónea de "un block todo BY-SA".

**Aprendizajes para fases futuras.** (1) `/cerrar-fase` debe verificar integración real (merge +
CI), no confiar en la bitácora que dice "code-complete" — la palabra correcta antes de merge es
"code-complete", no "cerrado". (2) El working tree puede traer cambios de tooling ajenos a la fase;
revisar `git status` y aislar el staged set antes de commitear. (3) Documentar el comando de tests
correcto por-package en el phase doc evita el falso-rojo de jsdom. (4) El gate pre-publish es ahora
un punto de extensión central — Fase 4 lo hereda; mantenerlo como UN gate puro con más inputs, no
proliferar modales.

## Bloque 5 — Sanity check final

- Onboarding mental: un agente que abra `/iniciar-fase 4` tiene prereqs `[x]`, 7 dependencias
  mapeadas, 4 preguntas abiertas y riesgos cross-fase en el phase-4 doc. ✅
- Git: branch PR 5 mergeada; este closeout en `docs/pastoral-fidelity-phase-3-closeout` (docs-only).
- CI verde en main (merge #300).
- Rollout: `fidelity_pass` default off — estado correcto (flip post-smoke, Q10).
