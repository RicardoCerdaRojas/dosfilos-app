# ADR-034 — Contrato de feedback socrático (afirmar + enrutar + nudge)

## Estado

`accepted`

## Fecha

2026-06-08

## Contexto

El Acompañante Socrático del estudio guiado (ADR-028) acepta el turno del
pastor con un acuse genérico ("Gracias por compartir… Paso 2"). El smoke del
flujo de 8 pasos expuso tres carencias:

1. No **afirma** lo que el pastor hizo bien — el refuerzo formativo se pierde.
2. No **captura** las dudas que el pastor plantea en su mensaje; o se pierden,
   o el agente cae en la tentación de **responderlas**, violando P1/P2
   (el agente orienta/confronta, nunca escribe la respuesta ni resuelve
   doctrina legítimamente abierta).
3. No **invita a profundizar** cuando el aporte es aceptable pero delgado.

Restricción rectora (manifiesto 05-pedagogy-manifesto): el sistema da DATO,
el pastor escribe el DESCUBRIMIENTO, el agente confronta el MÉTODO. La duda
doctrinal NO es error de método → no se resuelve, se canaliza al paso que la
trabaja.

## Decisión

Cada turno del Acompañante (accept + orient) cumple un **contrato de feedback**:

1. **Afirmar 1 acierto concreto** citando una frase del pastor (≤2 frases).
   Si el aporte es flojo, omitir la afirmación y hacer nudge.
2. **Enrutar dudas**: si el pastor plantea una pregunta/incertidumbre,
   reconocerla y dirigirla al paso que la resuelve, SIN resolverla. Mapa:
   palabra/doctrina → Paso 4+5; estructura → Paso 3; audiencia/aplicación →
   Paso 6/7/8.
3. **Nudge** opcional a profundizar.

Se implementa en 4 PRs (prompt → captura determinista + persistencia
`openDoubts` → UI estructurada → rúbrica por paso). Ver
`proposals/socratic-feedback-contract.md`.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Responder la duda doctrinal inline | Viola P1/P2 + pluralidad confesional (ADR-028). |
| Solo afirmar, no enrutar dudas | Las dudas se pierden; el pastor no sabe dónde se resuelven. |
| Output 100% LLM sin captura determinista | Adherencia frágil; las dudas no se persisten ni resurgen. |

## Consecuencias

### Positivas
- Refuerzo formativo concreto + canalización pedagógica de dudas.
- `openDoubts` persistido → trazabilidad y resurgir en Paso 8 / wizard.

### Negativas
- Riesgo de sobre-afirmación (mitigado con rúbrica + "solo acierto real").
- Adherencia del LLM no garantizada (mitigado con captura determinista + golden cases).

### Neutrales
- Nuevo campo en `PastoralSeed` → migración suave (campo opcional).

## Impacto

- **Código afectado**: `packages/domain/src/guided-sermon/policies/_shared.ts`
  (`BASE_SYSTEM_GUARDS`), `RunSocraticTurnUseCase`, `PastoralSeed`, step policies.
- **Fases impactadas**: extiende Fase 2.5 (estudio guiado). No bloquea otras.
- **Migraciones requeridas**: ninguna (`openDoubts` opcional, default `[]`).
- **Reversibilidad**: alta (prompt + campo opcional).

## Referencias
- Propuesta: `proposals/socratic-feedback-contract.md`
- Otros ADRs: ADR-028
- PRs relacionados: #319 (base guided-sermon)
