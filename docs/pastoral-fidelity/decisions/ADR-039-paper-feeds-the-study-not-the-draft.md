# ADR-039 — El paper alimenta el estudio; no lo saltea

## Estado

`accepted`

## Fecha

2026-09-05

## Contexto

El módulo de estudio exegético tenía un botón **«Generar sermón»** en la cabecera
del paper. Disparaba `GenerateSermonFromPaperUseCase`: pasaba `assembledMarkdown`
por Gemini Pro, escribía un sermón completo, sintetizaba stubs de exégesis y
homilética (`paperToWizardProgress.ts`) y depositaba al pastor en el **Paso 3
(Redacción)** del wizard. El copy prometía *«un sermón listo para predicar
(~25-35 min)»*.

Existían tres puertas más al mismo destino, y conviene nombrarlas para ver por
qué esta era la incoherente:

| Puerta | Produce la semilla de 8 pasos | Pasa el portón |
|---|---|---|
| Wizard (`PastoralSeedWizard`) | sí, `origin: 'wizard'` | sí |
| Faculty socrático (`useGuidedSermonIntegration`) | sí, `origin: 'socratic'` | sí |
| **Paper → «Generar sermón»** | **no** | **no** |
| Tutor → «generación exprés» (`tutor.tsx`) | no | no lo cruza: escribe directo a `/edit` |

Tres hechos decidieron el asunto:

1. **Violaba P1 y P2.** Producía el output antes que la labor, y el asistente
   originaba en vez de desarrollar. La [kill list](../04-kill-list.md) ya
   condenaba exactamente esto por la puerta del wizard —*«genera sermón full sin
   requerir study previo»*— pero no había visto la puerta del paper.

2. **No funcionaba.** Con `pastoral_fidelity_flow` encendido (medido: **13 de 13
   usuarios**), el portón duro de `SermonWizard` rebota cualquier paso ≥ 2 sin
   semilla completa. La secuencia real era: cobrar el modelo → prometer un sermón
   listo → aterrizar en Paso 3 → rebote inmediato al Paso 1 con un aviso.

3. **La medición lo confirmó.** Sobre 221 sermones en producción: **9** nacieron
   de un paper, **todos** de la cuenta del fundador, **0** de usuarios reales.
   De esos 9, **1** llegó a tener semilla, y **3 se publicaron sin estudio
   alguno**.

Lo valioso del paper nunca fue su prosa terminada —eso ya lo entrega el composer
ministerial, que devuelve markdown y **no** persiste sermón— sino sus
`canonicalAnalysis` aceptados: análisis léxico con rango semántico separado de
la carga contextual, sintaxis con morfología y función, trasfondo histórico,
comentaristas con página y rol dialéctico, enlaces al AT. Es, literalmente, la
materia prima de los pasos 1 a 5.

## Decisión

**El paper alimenta el estudio de 8 pasos. No produce borradores.**

1. `GenerateSermonFromPaperUseCase`, `paperToWizardProgress.ts`,
   `IPaperToSermonTransformer` y `GeminiPaperToSermonTransformer` se **retiran**.
   `PaperToSermonTone` se muda a `IMinistryComposers.ts`, su único consumidor
   vivo.

2. `StartStudyFromPaperUseCase` los reemplaza. **No contacta ningún modelo**, no
   reserva créditos, no escribe `content` ni `wizardProgress.draft`. Vincula el
   sermón al paper y lo deja en `currentStep: 1` con
   `derivedContext.kind = 'paper'`. Por eso `tone` y `transformerModelId` pasan a
   ser **opcionales** en `Sermon.wizardProgress.derivedContext` (los sermones
   generados antes del cambio los conservan).

3. `buildPaperStudyReference` (dominio, determinista) traduce los análisis
   **aceptados** —nunca los generados sin confirmar— en material de consulta
   indexado por paso. `PaperStudyReferencePanel` lo muestra **debajo** del paso,
   plegado por defecto, sin ningún botón de «usar esto».

4. Ya **no se exige `phase === 'assembled'`**. El caso retirado lo necesitaba
   porque redactaba desde `assembledMarkdown`; este lee análisis verso a verso,
   que existen mucho antes. Empezar el estudio temprano es lo que el producto
   quiere fomentar.

5. **`function`, `timelessPrinciple` e `insight` no reciben material jamás.** Son
   el trabajo interpretativo y pastoral del predicador; `insight` contiene además
   los cinco `PASTORAL_SEED_AI_FORBIDDEN_FIELDS`. La lista blanca vive explícita
   en `PAPER_FED_STEP_KEYS` y hay un test que la fija.

Las tres superficies que llamaban al caso de uso retirado —cabecera del paper,
planificador de series, recuperación de marcadores vacíos del wizard— pasan todas
al nuevo.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Mantener el botón como estaba | Viola P1/P2, y de hecho no funciona: el portón lo rebota. 3 sermones publicados sin estudio lo demuestran. |
| Mantenerlo pero exigir la semilla antes de generar | Sigue produciendo un sermón que el pastor no escribió. El estudio quedaría como peaje, no como labor. |
| Borrar el botón sin reemplazo | Tira el trabajo bueno del paper. Los análisis aceptados son la mejor materia prima que el producto tiene para los pasos 1-5. |
| Pre-poblar los campos de la semilla con el material del paper | Autofill silencioso: convierte el estudio en una revisión de texto ajeno y falsea la métrica de autoría. Consulta sí, relleno no. |
| Dejar que el paper alimente los 8 pasos, incluido `insight` | Poner palabras del asistente justo donde el producto promete que son del pastor. |

## Consecuencias

### Positivas

- La operación pasa a ser **gratis e instantánea**: se retira la entrada del
  catálogo de operaciones y desaparece el estado de espera de ~30-45 s.
- El paper deja de ser un atajo y pasa a ser una ventaja: quien ya hizo el
  trabajo académico llega al estudio con su propia evidencia al lado.
- Se cierra la brecha entre lo que la kill list condena y lo que el código hace.

### Negativas

- Quien usaba el botón para obtener un borrador de una sentada deja de tenerlo.
  Medido: nadie fuera de la cuenta del fundador.
- El camino del paper al sermón se alarga a propósito. Es el punto.

### Neutrales

- Los 9 sermones existentes con `sourcePaperId` conservan su `wizardProgress`; el
  camino de migración legacy del wizard los sigue abriendo. Ninguno se toca.

## Impacto

- **Código afectado**: `domain/exegesis/services/paperStudyReference.ts` (nuevo),
  `domain/exegesis/ports/IMinistryComposers.ts`, `domain/entities/Sermon.ts`,
  `domain/entities/ExegesisOperationCatalog.ts`,
  `application/use-cases/exegesis/StartStudyFromPaperUseCase.ts` (nuevo),
  `web/pages/exegesis/ExegesisPaperPage.tsx`, `web/pages/series/SeriesDetail.tsx`,
  `web/pages/sermons/generator/SermonWizard.tsx`,
  `web/pages/sermons/generator/pastoralSeed/{PastoralSeedWizard,PaperStudyReferencePanel}.tsx`
- **Fases impactadas**: Fase 1 (six-step spine) — cierra la Categoría 4 del
  [UI audit](../phase-0-ui-audit.md) por retiro del mapper, no por docstring.
- **Migraciones requeridas**: ninguna.
- **Reversibilidad**: media. El transformador se puede recuperar del historial,
  pero volver atrás reabre la violación de P1/P2.

## Referencias

- Kill list: [04-kill-list.md](../04-kill-list.md)
- UI audit Fase 0: [phase-0-ui-audit.md](../phase-0-ui-audit.md) (Categoría 4)
- Otros ADRs: ADR-031 (cita narrativa + ancla verificable), ADR-037 (procedencia
  de la idea en la redacción socrática)
