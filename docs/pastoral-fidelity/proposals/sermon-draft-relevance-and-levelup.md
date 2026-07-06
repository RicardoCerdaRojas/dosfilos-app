# Propuesta — Sermón: fix de relevancia de citas + veredicto de salto de nivel

> Investigar → proponer → sin código hasta aprobar. Dos partes: (A) el fix acotado
> de relevancia de la cita (near-term), (B) el veredicto honesto sobre subir de
> nivel toda la redacción + plan por fases. 2026-07-06.

## Parte A — Relevancia de la cita (acotado, cercano)

### El bug (confirmado en código)
La cita sale con el excerpt REAL pero del verso equivocado (punto 3:1-2, excerpt de
3:17). Causa:
- **Retrieval GLOBAL**: una sola query (`homileticalProposition`) para todo el
  sermón → los puntos compiten por los mismos 10 chunks.
- **Los chunks NO tienen metadata de verso** (solo página/sección) → el sistema no
  sabe que el chunk es de 3:17.
- **Matching punto↔fuente = solape de palabras crudo** (≥2 palabras comunes,
  `MIN_POINT_OVERLAP`) → el chunk de 3:17 gana por compartir "burladores/verdades".

### Opciones
1. **Retrieval por-punto** (fix de fondo): query = el punto mismo (sus versos +
   contenido) → la cita es relevante por construcción. +N llamadas de retrieval.
2. **Relajar la cita forzada + subir la vara**: `ensurePointCited` hoy OBLIGA una
   cita por punto y agarra el mejor solape aunque sea débil. Cambiar a fail-closed
   de relevancia: **solo citar con match fuerte; si no, punto sin cita.** Punto sin
   cita > cita del verso equivocado.
3. **Verse-gate** (metadata de verso al indexar): el chunk sabría sus versos →
   filtro exacto. Requiere RE-INDEXAR + extraer versos de comentarios (frágil).
   Deep, deferido.

### Recomendación (A)
**(1) + (2)**: retrieval por-punto para que el excerpt calce, y relajar la
garantía "todo punto lleva cita" a fail-closed de relevancia. Es el mismo
principio de 036 (no afirmar lo que no se puede respaldar). (3) queda para una
mejora de indexado futura.

## Parte B — ¿Salto de nivel de la redacción? Veredicto: SÍ

El pipeline genera sermones **predicables y coherentes**, pero **planos y
superficiales**. **El cuello de botella NO es el modelo** (gemini-2.5-flash es
capaz) — son el prompt, el schema, la ausencia de validadores post-gen, y la
pérdida de fidelidad del estudio al borrador.

### Brechas (agrupadas; código-hecho vs patrón-observado marcado)

**1. Pérdida de fidelidad estudio→borrador** (código). `seedToExegesis` es un
mapeo *lossy*: el análisis vivo del pastor (word studies con morfología, análisis
estructural) se aplasta a una línea (`context.literary = mainClause.pastorNote`;
`keyWord.significance = pastorDiscovery` sin morfología). El sermón **re-inventa**
exégesis en vez de heredar la que el pastor ya hizo en los 8 pasos. **Máximo
leverage**: cargar la exégesis real al borrador.

**2. Oficio homilético como PROMPT, no como estructura** (código). FCF (condición
caída), resolución cristocéntrica, arco de tensión/resolución, transiciones — todo
"pedido en el prompt" pero **sin campo en el schema y sin validador** → sale
genérico ("Jesús nos ayuda"), transiciones que son índices-recap, no narrativa.

**3. Contenido inventado** (observado, ya lo viste). `authorityQuote` viola el
contrato (cita a Spurgeon/Owen sin respaldo); ilustraciones genéricas/inventadas
("El Mapa del Tesoro"). El contrato lo prohíbe pero **no hay enforcement** — es el
mismo modo de falla que ya atacamos con 036/B en las citas de biblioteca.

**4. Cero gate de calidad post-gen** (código). Todo es single-shot; nada verifica
FCF, cristocentrismo, relevancia de cita, ni que la ilustración esté anclada. El
único loop que existe es el de citas (B v2). **El lever es un loop de verificación
de calidad**, como el de citas pero para las otras dimensiones.

**5. Config** (código). flash @ temperatura **0.7** — creativa para el rigor
teológico que se pide. Candidato a modelo más fuerte + temp más baja para las
partes que exigen fidelidad.

### El patrón reusable
Lo que construimos para las citas (verificar → anclar/sanitizar → RE-verificar en
loop, fail-closed) es **exactamente** el patrón para las otras dimensiones:
relevancia, FCF, cristocentrismo, ilustraciones ancladas, autoridades. No hay que
inventar arquitectura nueva — hay que **aplicar el patrón de fidelidad a la calidad
homilética**.

## Parte C — Plan por fases (envío incremental de valor)

1. **Fase 1 (cercana, alto valor de confianza)**: (A) relevancia de citas + matar
   el contenido inventado — extender la fidelidad (036/B) a `authorityQuote` e
   ilustraciones (anclar o omitir). *El pastor deja de ver citas del verso
   equivocado y autoridades inventadas.*
2. **Fase 2 (máximo leverage de profundidad)**: cargar la exégesis REAL del estudio
   al borrador — arreglar el mapeo *lossy* `seedToExegesis`. *El sermón hereda la
   profundidad que el pastor ya trabajó, no la re-inventa.*
3. **Fase 3 (oficio como estructura)**: FCF + resolución cristocéntrica + arco/
   transiciones como campos del schema + validadores post-gen (loop de calidad). *El
   sermón deja de ser plano.*
4. **Fase 4 (modelo/config)**: modelo más fuerte + temp más baja donde importa +
   medir. *Techo de calidad más alto.*

Cada fase = su propio investigar→proponer→construir (mismo ritual). Es material de
un **ADR nuevo** (redacción del sermón v2).

## Framing honesto

- Esto NO es un parche — es una **iniciativa grande** (rediseño de schema + prompt
  + validadores + posible modelo). Vale la pena: **el borrador es el output del
  producto**; plano/genérico + contenido inventado es el techo de confianza y valor.
- Pero **acotalo**: Fase 1 (relevancia + anti-invención) da valor de confianza YA y
  es chica. Fase 2 (heredar exégesis) es el salto de profundidad. Fase 3-4 son el
  oficio y el techo.
- **Distinción de evidencia**: las brechas de código (mapeo lossy, sin validadores,
  sin metadata de verso, config) están confirmadas. Los patrones de "Gemini viola X
  seguido" son observados/inferidos — se medirían con un eval (como el A/B de citas).

## Preguntas para el fundador

1. **¿Arrancamos por Fase 1** (relevancia + anti-invención, cercana) y después
   decidimos el rediseño mayor? Recomiendo sí.
2. **¿Abrimos un ADR** "Redacción del sermón v2" para las fases 2-4, o lo mantenemos
   como propuestas sueltas?
3. **¿Priorizás profundidad (Fase 2, heredar exégesis) u oficio (Fase 3, FCF/
   cristocentrismo/arco)** como el primer salto grande tras Fase 1?

## Referencias

- Retrieval global: `SermonGeneratorService.ts:235`, `retrieveChunks.ts`.
- Sin verso en chunk: `DocumentChunk.ts:6-26`.
- Matching crudo: `injectNarrativeCitationAnchors.ts` (`overlapScore`, `ensurePointCited`).
- Mapeo lossy: `seedToExegesis.ts:21-57`.
- Prompt: `prompts-generator.ts:467-694` (FCF 681-690, cristocentrismo 687-688,
  authorityQuote 677, transiciones 607).
- Schema: `SermonGenerator.ts:302-351`. Config: `gemini/config.ts` (flash, temp 0.7).
- Patrón reusable: la fidelidad de citas (036 + `sanitizeDraftUntilClean`).
