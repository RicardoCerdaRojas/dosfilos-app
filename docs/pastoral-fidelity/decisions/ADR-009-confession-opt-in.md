# ADR-009 — Confession declaration es opt-in, no requisito de onboarding

## Estado

`accepted` — supersede parcialmente [ADR-007 § Q2](./ADR-007-phase-0-policy-resolutions.md) (cláusula "obligatorio en signup").

## Fecha

2026-05-24

## Contexto

[ADR-007 § Q2](./ADR-007-phase-0-policy-resolutions.md) estableció que para users nuevos post-rollout del `pastoral_fidelity_flow`, la declaración de confesión sería **obligatoria en onboarding** (modal en signup flow). PR 0.6 implementó esto agregando un `ConfessionStep` al `OnboardingWizard` entre los pasos `intent` y `workflow`.

Durante smoke test de Phase 0 (sesión 2026-05-24), el fundador identificó tensión entre la UX resultante y el marco hermenéutico que el manifesto declara:

> "Los credos resumen lo que el texto enseña, no lo imponen. La autoridad final es la Escritura."
> — [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)

Tensión observada en el step de onboarding:

1. **Ubicación step 3 de 5**: posiciona confesión como identidad fundacional. UX implica "declara primero, usa el sistema después" — contradice el principio "texto manda".

2. **Copy "anchor del contraste"**: implica que la confesión es el lente que detecta tensiones doctrinales. Más cercano a "lente interpretativo" que a "flag de borde" / testigo histórico que confirma.

3. **Mandatorio para users nuevos**: la justificación operacional (Phase 2 Testigo 3 necesita anchor) NO requiere obligatoriedad — solo necesita estar disponible cuando se invoque.

4. **No-confesional declarado como tile equivalente**: tratarlo como identidad paralela a una confesión es categoría error. Es estado default, no choice.

5. **Mayoría evangelical es no-confesional o independiente**: forzar declaración label que muchos pastores no quieren hacer crea fricción innecesaria + riesgo de churn en onboarding.

## Decisión

La declaración confesional es **opt-in**, no requisito de onboarding.

Cambios concretos:

1. **`ConfessionStep` se remueve de `OnboardingWizard`**. Wizard vuelve a 4 pasos: welcome → intent → workflow → confirm.

2. **`/settings/confession` se mantiene como única superficie de declaración**. Pastor declara cuando lo necesita (no preventivamente).

3. **Banner backfill reformulado**:
   - Antes: "Declara tu confesión teológica" + descripción que sugería que era requisito para activar flow
   - Después: "Activa comparación con tradición histórica (opcional)" + explainer que el texto es la autoridad y la tradición solo confirma o levanta banderas de borde
   - CTA: "Configurar" en lugar de "Declarar"

4. **`usePastoralFidelityGate()` ya NO bloquea por `declaredConfession` ausente**. Single hard requirement es feature flag. La gate retorna `allowed: true` con un nuevo campo `hasConfessionAnchor: boolean` que la UI puede usar para soft nudges, no para bloqueos.

5. **Phase 2 Testigo 3 design ajustado**:
   - `core` ecumenical doctrines (Trinidad, Calcedonia, deidad de Cristo, resurrección, salvación por gracia, suficiencia de Escritura) → **siempre fire**, independiente de declaración confesional. Universal across all evangelical+ecumenical confessions.
   - `distinctive` (paedo vs credo, predestinación, milenales) → fire **solo si pastor declaró confesión Y claim toca distinctive de esa confesión**
   - `open-evangelical` → siempre como nota informativa, nunca bloquea

6. **Spanish display para confesiones**: nuevo módulo `packages/web/src/lib/confessions/displayNames.ts` con mapping ES per `confessionId` para `/settings/confession`. Admin tooling mantiene inglés (canónico técnico).

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Mantener onboarding obligatorio (status quo ADR-007 Q2)** | Reportado por fundador como contradictorio con manifesto. Posiciona confesión como identidad fundacional cuando manifesto la trata como testimonio histórico que confirma. |
| **Soft step in onboarding (skip-able)** | Aún implica importancia foundational por su mera presencia en flow inicial. Menos malo que mandatorio pero no elimina el sesgo de framing. |
| **Diferir decisión a Phase 2 cuando Testigo 3 ship** | Phase 2 viene con muchos consumers ya escritos asumiendo declared confession. Cambio temprano (ahora) evita downstream rework. |
| **Eliminar Confession catalog completo** | Excesivo. Pastors con tradition fuerte (reformados, baptists, anglicanos) sí quieren ser interrogados desde su propia confesión. La declaración opt-in respeta eso. |

## Consecuencias

### Positivas

- **Alineamiento con manifesto**: la declaración confesional pasa de identidad fundacional a herramienta opt-in. Coincide con "texto manda, tradición confirma".
- **Menor fricción de onboarding**: pastors evangelicales independientes / no-confesionales no son forzados a labelar identidad teológica.
- **Phase 2 Testigo 3 se simplifica**: `core` doctrines fire universalmente sin requerir state extra. `distinctive` opera solo cuando hay anchor explícito.
- **UX de banner respeta autonomía pastoral**: pastor decide si invocar tradición como testigo, en lugar de ser empujado a declarar.
- **Compatibilidad backwards**: users que YA declararon en sesión anterior (data en Firestore) siguen teniendo `declaredConfession` activo. Sólo cambia el path para nuevos.

### Negativas

- **Phase 2 Testigo 3 efectividad reducida si pastor nunca declara**: el caso "non-confessional silent" pierde la riqueza del contraste distinctive. Mitigación: nudges suaves cuando claim toca distinctive topic — "considera declarar X confesión para activar este flag".
- **Métricas iniciales de adopción**: si nadie declara, no sabemos si es ignorancia de la feature o rechazo activo. Tracking adicional necesario (telemetría de banner clicks vs ignores).
- **Trabajo de cleanup**: PR 0.6 partial revert. Component `ConfessionStep.tsx` eliminado, wizard logic simplificada. ~30 min de trabajo.

### Neutrales

- Schema Firestore no cambia. `declaredConfession`, `confessionAffirmedAt`, `confessionVisibility` siguen en `User`. Solo se vuelven opcional populated.
- Audit log `confessionChangeAudit/` no cambia.

## Impacto

- **Código afectado**:
  - `OnboardingWizard.tsx` — step 'confession' removido, STEP_ORDER reduce a 4, useUserProfile dep removida
  - `ConfessionStep.tsx` — eliminado completamente (dead code)
  - `usePastoralFidelityGate.ts` — `confession-required` reason removida, agregado `hasConfessionAnchor: boolean`
  - `i18n/locales/{es,en}/dashboard.json` — banner copy reformulada
  - `packages/web/src/lib/confessions/displayNames.ts` — nuevo módulo ES display mapping
  - `ConfessionSettings.tsx` — usa display mapping para render localizado
- **Fases impactadas**:
  - Phase 0: ajuste cierre + bitácora documenta supersedure
  - Phase 2 (futuro): Testigo 3 design ya planeado para 3 niveles encaja perfecto. `core` universal, `distinctive` conditional on declared confession
- **Migraciones requeridas**: ninguna. Schema preserved.
- **Reversibilidad**: alta. Revert del revert es agregar step de vuelta + restaurar gate behavior.

## Lo que NO cambia

- `Confession` catalog Firestore (14 fuentes ingestadas)
- `LibraryResource` rights-aware schema
- doctrineLevel tagging pipeline
- TSK cross-reference engine
- `/settings/confession` page (sigue siendo el lugar para declarar)
- Audit log functionality
- ConfessionBanner component (solo cambia copy)
- Feature flag infrastructure

## Verificación post-merge

- [ ] Nuevo user en onboarding NO ve step confesional
- [ ] Wizard 4 pasos: welcome → intent → workflow → confirm
- [ ] Banner amarillo aparece en dashboard para users sin declared confession, copy nuevo
- [ ] Click banner CTA → `/settings/confession` declarable + grid muestra nombres en español
- [ ] User con flag ON + sin declared confession → `usePastoralFidelityGate()` retorna `{ allowed: true, hasConfessionAnchor: false }`
- [ ] User con flag ON + con declared confession → `usePastoralFidelityGate()` retorna `{ allowed: true, hasConfessionAnchor: true }`

## Referencias

- ADR superseded (parcial): [ADR-007 § Q2](./ADR-007-phase-0-policy-resolutions.md)
- Manifesto que motivó el cambio: [05-pedagogy-manifesto.md](../05-pedagogy-manifesto.md)
- Bridge operacional: [06-pedagogy-applied.md § Sistema de tres niveles](../06-pedagogy-applied.md#4-sistema-de-tres-niveles-de-doctrina-operacionalización)
- Phase doc: [phase-0-foundations.md](../phases/phase-0-foundations.md)
- PRs afectados: PR 0.6 (revert parcial), PR 0.7 (banner copy), follow-up display mapping
