# 02 — Glosario

Términos de uso obligatorio en esta iniciativa. Toda comunicación interna, PR title, doc, ADR, código y UI debe usar estos términos con el significado aquí establecido.

## Términos del flujo pastoral

### Semilla pastoral (`pastoralSeed`)

Output verificable del Step 1 producido por el pastor sin asistencia generativa. Contiene: idea central, observaciones, pregunta abierta, anécdota, más audit de los 6 pasos del tutor. Es el `PRIMARY VOICE` del prompt de generación. Sin semilla, no hay generación. Ver [01-architecture.md § Six-step spine](./01-architecture.md#componente-2-six-step-spine-como-step-1-del-wizard).

### Six-step spine

Metodología de 6 pasos del tutor griego/hebreo (`feature_greek_tutor_methodology_narrative`) aplicada al pasaje del sermón como gateway obligatorio del Step 1. Pasos: Lectura → Sintaxis → Morfología → Reconocimiento → Función → Insight.

### Confesión declarada (`declaredConfession`)

Confesión teológica que el pastor selecciona al onboarding. Funciona como Testigo 3. No la elige el sistema. Si el pastor declara "no-confesional declarado", el Testigo 3 usa credos ecuménicos clásicos (Nicea, Calcedonia) como mínimo común.

### Tres testigos

Mecanismo de validación de la semilla pastoral. Tres fuentes independientes evalúan cada claim del pastor:
- **Testigo 1 — Contexto inmediato**: estructura sintáctica del pasaje y perícopa.
- **Testigo 2 — Paralelos canónicos**: cómo trata la Escritura el mismo tema en otros pasajes.
- **Testigo 3 — Confesión declarada**: posición de la propia confesión del pastor.

Patrón derivado de Deut 19:15. Ver [01-architecture.md § Tres testigos](./01-architecture.md#componente-3-tres-testigos-para-validación).

### Disenso

Cuando un testigo evalúa que el claim del pastor no se alinea con su evidencia. Se cuenta por testigo, no por claim. Escalado:

- **1/3** — Nota informativa, sin fricción
- **2/3** — Bloqueo blando (respuesta breve obligatoria)
- **3/3** — Bloqueo duro (invocación Faculty doctrinal + reformulación o reafirmación con texto)

### Bloqueo blando

Sistema requiere al pastor escribir respuesta de ≥50 caracteres reconociendo o reformulando. Permite continuar después. No bloqueo absoluto. Genera audit log.

### Bloqueo duro

Sistema bloquea avance hasta que el pastor invoque Faculty doctrinal y declare explícitamente "consideré y mantengo / reformulo" con texto ≥100 caracteres. Genera audit log con justificación.

### Bloqueo absoluto

Sin override. Aplica solo a violaciones de credos ecuménicos clásicos (Nicea / Calcedonia: Trinidad, dos naturalezas de Cristo, resurrección corporal, etc.). Lista exacta TBD en ADR de Fase 2.

### Socratismo bíblico

Forma de cuestionamiento del sistema modelada en Jesús (Luc 10:26, Mt 22:42, Mr 8:29). Pregunta antes de afirmar, **pero siempre termina en revelación**: "¿qué dice la Escritura?", no "¿qué piensas tú?". Distinto del Socratismo griego que busca interioridad. El sistema usa el primero.

### Andamiaje pedagógico

Escalado de asistencia: pregunta abierta → pregunta dirigida → recurso ofrecido → exposición. El sistema nunca empieza por exposición. Vygotsky aplicado a teología.

## Términos del motor de generación

### Fidelidad claim↔source

Validación de que el chunk citado en `[N]` realmente sostiene la oración a la izquierda del marcador. Distinto de **identidad de cita** (que el chunk existe en la biblioteca). El motor actual valida identidad. La Fase 3 valida fidelidad.

| Veredicto | Significado |
|---|---|
| `supports` | El chunk respalda directamente la oración |
| `partial` | El chunk respalda parte, pero hay sobre-extensión |
| `unrelated` | El chunk no se relaciona con la oración |
| `contradicts` | El chunk afirma lo contrario de la oración |

### Identidad de cita

Validación de que el autor/título/página citado existe en la biblioteca del usuario, y que `[N]` mapea a un chunk real. Ya implementado en Fases B+C del motor de citas. No suficiente por sí solo.

### Autoría verbatim (`verbatimRatio`)

% del texto final de una sección que el pastor escribió o conservó sin reescribir el draft AI. Tracked por sección. Gate publish: ≥50% mandatorio (configurable). Visualizado como badge.

### Contra-scan

Proceso pre-publish que busca en la biblioteca del usuario chunks que disientan del claim central del sermón. Surface mínimo 3. Pastor debe marcar uno como "considerado" con nota ≥100 chars. No skip. Implementación de Hechos 20:27.

### Voice fingerprint

Adapter de estilo entrenado sobre sermones previos del pastor que ajusta el output del LLM para que suene a él específicamente. Resuelve homogeneización + autenticidad. Fase 4 tardía, costoso.

## Términos arquitectónicos

### Proyecto pastoral (`Project`)

Unidad raíz de trabajo en el sistema reformado. Contiene pasaje, semilla pastoral, audit, refs de biblioteca, y artefactos derivados. Reemplaza la lógica actual de sermón-como-entidad-de-primer-nivel.

### Artefacto derivado

Pieza producida desde un proyecto: sermón, estudio bíblico, newsletter, post de blog, lección de escuela dominical, carta pastoral, devocional, social media. Todos comparten la misma semilla. Reuso del patrón paper→artifacts de PR #211.

### Runway de formación

Calendario inverso generado por el planner para distribuir el trabajo del proyecto a lo largo de N días previos a la fecha de predicación. Reemplaza pre-generación automática del planner actual.

### Audit trail (`projectAudit`)

Log persistente de qué hizo el pastor, qué herramientas consultó, cuánto tiempo invirtió, qué disensos rechazó, qué tutores invocó. Visible al propio pastor (auto-conciencia) y opcionalmente a su accountability eclesial.

### Faculty doctrinal mode

Modo del Faculty chat (`feature_faculty_home_redesign`) invocado automáticamente cuando 3/3 testigos disienten. Recibe contexto del claim del pastor + texto de su confesión + chunks de los testigos. Conversa socráticamente.

### `DerivedContext` (existing)

Discriminated union introducido en PR #214 (`feature_faculty_sermon_wizard_convergence`) que el sermón usa para indicar de dónde viene (paper | faculty). En esta iniciativa se extiende a `project` como tercer caso.

## Términos de pedagogía y product

### Fábrica de sermones (anti-patrón)

Modo de operación rechazado por esta iniciativa: pastor da pasaje → sistema produce sermón → pastor revisa. Coloca al pastor como curador, no autor. Ver [00-vision.md](./00-vision.md).

### Predicación según Brooks

"Verdad a través de personalidad." Si la personalidad del predicador no atraviesa el contenido, no es predicación. Prueba ácida del producto.

### Inversión de Esdras 7:10

Anti-patrón del producto actual: enseñar antes de inquirir o de vivir. El producto debe forzar el orden correcto: estudio → vida → enseñanza.

### Medio de gracia (Westminster)

Doctrina reformada de que la predicación es uno de los medios por los cuales Dios comunica gracia a su pueblo. Eleva los stakes del sermón de productividad a sacramento-adyacente. Marco subyacente de la iniciativa.

### Watchman (Ez 3:17)

El pastor es responsable de las almas que escuchan su predicación. Esta responsabilidad es indelegable y personal. Sistema no puede ser watchman; pastor sí lo es. Justifica todos los gates de fricción.
