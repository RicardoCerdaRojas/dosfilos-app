# Spec — Asistentes de preparación de estudio (upstream de la suite de enseñanza)

**Versión:** 1.0 · 12-jun-2026
**Posición en el sistema:** entre la biblioteca RAG del docente y el paso 1 ("Ingerir el material") de la skill `suite-ensenanza-biblica`. El output de estos asistentes ES el "material de estudio del docente" que la skill hoy recibe ya hecho.
**Principio rector (no negociable):** el docente produce, el sistema desarrolla y valida. Si en algún paso la IA puede completar el contenido sin que el docente haya aportado nada, ese paso está mal diseñado.

---

## 0. El problema que resuelve

Hoy el chat con RAG conversa bien pero no conduce. Resultado: el docente cura resúmenes que la IA hizo de su propia biblioteca — es dueño de las fuentes, no del estudio. Esta spec define el proceso que convierte la biblioteca en estudio propio, y el estudio en el insumo exacto que el engine de artefactos ya consume.

Observación clave de diseño: **el arco pedagógico ya está codificado en el output**. Los 8 bloques del plan de clase (pregunta de contexto → texto ancla → exégesis → convergencia → síntesis → confrontación → aplicación → transición) son una metodología didáctica completa. El asistente formativo no inventa un proceso nuevo: recorre ese arco hacia atrás, exigiendo que el docente produzca el contenido de cada bloque mediante estudio guiado.

---

## 1. Arquitectura: un activo, dos asistentes

```
                    ┌─────────────────────────┐
                    │   BIBLIOTECA RAG        │
                    │   (Logos, PDFs, notas)  │
                    └───────────┬─────────────┘
                                │ (modos acotados por paso)
        ┌───────────────────────┴───────────────────────┐
        │                                               │
┌───────▼────────┐                            ┌─────────▼────────┐
│  ASISTENTE A   │                            │   ASISTENTE B    │
│  Formativo     │                            │   Composición    │
│  (descubre)    │                            │   experta        │
│                │                            │   (declara)      │
└───────┬────────┘                            └─────────┬────────┘
        │                                               │
        └───────────────────┬───────────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │   ESTUDIO MADRE    │  ← activo persistente
                  │  (idea validada +  │
                  │   mapa de testigos)│
                  └─────────┬──────────┘
                            │ transposición por destino
        ┌──────────┬────────┴────────┬──────────────┐
        ▼          ▼                 ▼              ▼
     sermón    clase E.D.      clase seminario   díptico /
   (spine 8p)  (plan.json)      (plan.json)      newsletter
```

### 1.1 El Estudio Madre

Activo persistente y reutilizable. Es el contrato entre el estudio y todos los artefactos. Contiene:

| Campo | Descripción |
|---|---|
| `tipo` | `pasaje` \| `doctrina` |
| `referencia` | pasaje(s) ancla o nombre del locus doctrinal |
| `idea_central` | una oración, formulada por el docente, validada por las puertas |
| `mapa_testigos[]` | cada testigo: referencia bíblica + qué afirma + cómo respalda la idea + estado de verificación del motor de citas |
| `observaciones[]` | hallazgos exegéticos del docente (término, estructura, contexto) con sus fuentes RAG citadas y verificadas |
| `testigos_historicos[]` | citas de confesiones/comentaristas, verificadas, marcadas como `cita-humana` (nunca autoridad sobre el texto) |
| `error_confrontado` | la mejor versión del error que la idea corrige + por qué falla con textos |
| `aplicaciones[]` | implicaciones cabeza / corazón / manos |
| `historial_confrontacion` | registro de las puertas: qué se objetó, qué respondió el docente |
| `autoria` | % estimado de texto producido por el docente vs. desarrollado por el sistema (métrica de tesis: debe ser auditable) |

**Regla de derivación:** ningún artefacto se genera sin Estudio Madre con todas las puertas en verde. La fidelidad se valida una vez, arriba; los artefactos la heredan.

### 1.2 Criterio de enrutamiento entre asistentes

No es por tipo de artefacto ni por audiencia. Es por **quién carga la prueba**:

| | Asistente A — Formativo | Asistente B — Composición experta |
|---|---|---|
| Usuario típico | pastor, maestro de escuela dominical | profesor de seminario, conferenciante |
| Supuesto | el tema se está aprendiendo | el tema ya se domina |
| Dirección | el sistema pregunta → el docente descubre | el docente declara → el sistema exige respaldo |
| Flujo | secuencial con puertas (como el spine del sermón) | modular bajo demanda, con puertas |
| RAG | dosificado por paso, en calidad declarada | abierto, pero toda cita pasa por el motor |
| Lo que se relaja | nada | el andamiaje pedagógico, el orden |
| Lo que jamás se relaja | tres testigos · motor de citas · anti proof-texting · confrontación final |

Al crear un estudio, el sistema pregunta una sola cosa para enrutar: *"¿Vienes a estudiar este tema, o ya lo dominas y vienes a componer la sesión?"* — con la advertencia honesta de que el modo experto exige respaldo declarado de cada afirmación.

---

## 2. Asistente A — Preparación formativa

Dos fases: **estudio** (produce el Estudio Madre) y **transposición pedagógica** (produce el plan de la clase). Dos rieles en fase 1 según `tipo`. Cada paso tiene la misma anatomía:

- **Input exigido:** lo que el docente debe escribir. El sistema no avanza sin él.
- **Modo RAG:** qué puede traer la biblioteca en ese paso, y en calidad de qué.
- **Puerta:** condición verificable para pasar al siguiente paso.

### 2.1 Fase 1 · Riel PASAJE (clase desde un texto)

Versión condensada del spine homilético — 5 pasos en vez de 8, porque la clase no exige bosquejo homilético ni proposición predicable, pero sí el mismo rigor exegético.

**P1 — Lectura y observación desnuda.**
Input exigido: el docente lee el pasaje (el sistema lo presenta sin comentarios) y registra ≥3 observaciones propias: repeticiones, conectores, estructura, lo que le extraña.
Modo RAG: **apagado.** Este paso es a solas con el texto. (Mismo principio que el spine: labor antes que output.)
Puerta: ≥3 observaciones registradas con sus propias palabras.

**P2 — Contexto y términos.**
Input exigido: el docente formula 2–4 preguntas que el texto le abrió (¿qué significa X? ¿por qué conecta con Y?).
Modo RAG: `definicion` y `contexto` — léxicos, comentarios y trasfondo de SU biblioteca, citados con referencia verificable. El sistema responde las preguntas del docente; no ofrece un resumen general del pasaje.
Puerta: cada término clave tiene fuente citada y verificada por el motor de citas.

**P3 — Idea central del texto.**
Input exigido: el docente escribe la idea en una oración, con sus palabras. El sistema tiene prohibido proponerla; puede confrontarla ("¿el v.9 cabe en tu idea?") pero no redactarla.
Modo RAG: apagado para generación; encendido solo si el docente pide verificar algo puntual.
Puerta: la idea pasa el primer testigo — **contexto inmediato** (el sistema verifica que la idea no contradiga los versículos circundantes).

**P4 — Convergencia: los tres testigos.**
Input exigido: el docente propone ≥1 paralelo canónico de memoria o búsqueda propia; evalúa los candidatos que el RAG aporte (acepta/rechaza con razón escrita).
Modo RAG: `testigo` — pasajes paralelos candidatos, presentados como *candidatos a evaluar*, nunca como confirmación. Incluye contraejemplos si existen ("este pasaje parece tensionar tu idea — resuélvelo").
Puerta: ≥2 testigos bíblicos aceptados con razón + verificación contra la **confesión declarada** del docente (tercer testigo). Detector de proof-texting activo sobre cada testigo.

**P5 — Confrontación y aplicación.**
Input exigido: el docente nombra el error que su idea corrige (el sistema lo ayuda a formularlo en su *mejor* versión — steelman, no caricatura) y escribe las implicaciones cabeza/corazón/manos.
Modo RAG: `contraejemplo` e `historico` — cómo la iglesia fiel trató este error, citas verificadas de confesiones y comentaristas.
Puerta: confrontación final del estudio — el sistema audita: ¿toda afirmación doctrinal de peso tiene ≥2 testigos? ¿hay citas sin verificar? ¿la aplicación se deriva de la idea o está pegada con cinta?

→ **Sale: Estudio Madre tipo `pasaje`, puertas en verde.**

### 2.2 Fase 1 · Riel DOCTRINA (clase desde un locus, ej. Cristología)

La doctrina no se estudia como un pasaje: es teología sistemática. Y casi siempre es un **curso**, no una clase — eso introduce el paso D0, que no existe en el riel pasaje.

**D0 — Mapa del curso.**
Input exigido: el docente delimita el locus y propone la descomposición en temas (ej. Cristología → preexistencia, encarnación, naturalezas, oficios, títulos, obras, estados).
Modo RAG: `estructura` — cómo organizan este locus las sistemáticas de SU biblioteca, presentadas como opciones comparadas, no como plantilla a aceptar.
Puerta: mapa aprobado por el docente con N clases, cada una con su pasaje ancla tentativo. **Esto crea el objeto `curso` (ver §6.3) y un Estudio Madre por clase.**

**D1 — Definición propia.**
Input exigido: el docente define la doctrina de la clase actual en sus palabras ANTES de consultar fuentes.
Modo RAG: apagado.
Puerta: definición registrada (será confrontada, no corregida en silencio).

**D2 — Base bíblica.**
Input exigido: el docente propone los pasajes que a su juicio fundan la doctrina; evalúa los candidatos del RAG.
Modo RAG: `testigo` — locus classicus candidatos de su biblioteca. Anti proof-texting reforzado: en doctrina es donde más se arrancan versículos de contexto.
Puerta: ≥2 testigos por afirmación doctrinal de peso, cada uno con mini-verificación de contexto inmediato (el primer testigo aplica a CADA pasaje usado, no solo al ancla).

**D3 — Definición histórica y confesional.**
Input exigido: el docente compara su definición de D1 contra los credos/confesiones de su tradición declarada y escribe qué ajusta y por qué.
Modo RAG: `historico` — credos, confesiones, desarrollo del dogma, citado y verificado, marcado `cita-humana`.
Puerta: definición revisada explícitamente contra la confesión declarada (tercer testigo). Las diferencias se registran, no se ocultan.

**D4 — El error que la doctrina corrige.**
Input exigido: el docente formula la negación histórica o contemporánea en su mejor versión.
Modo RAG: `contraejemplo` e `historico` — herejías históricas del locus, cómo respondió la iglesia.
Puerta: el error está formulado como steelman y refutado con los textos de D2, no con adjetivos.

**D5 — Síntesis y aplicación.**
Igual que P5: idea central de la clase en una oración del docente + cabeza/corazón/manos + confrontación final del estudio.

→ **Sale: Estudio Madre tipo `doctrina`, vinculado a su `curso`.**

### 2.3 Fase 2 · Transposición pedagógica (común a ambos rieles)

Del "qué dice" al "cómo se aprende". Es la fase que hoy no existe en ninguna herramienta del mercado y la que tu JSON ya consume implícitamente.

**T1 — Objetivos de aprendizaje.**
Input exigido: el docente completa tres frases: *al salir, mis alumnos sabrán… / sentirán o creerán… / harán…* (cabeza/corazón/manos). El sistema confronta objetivos no medibles ("valorar más a Cristo" → "¿cómo se vería eso el martes?").
Modo RAG: apagado.
Puerta: ≥1 objetivo por dimensión, formulado en conducta observable o contenido verificable.

**T2 — Arco de bloques.**
El sistema propone la distribución del arco estándar (contexto/pregunta → texto ancla → exégesis → convergencia → síntesis → confrontación → aplicación → transición) **rellenada exclusivamente con material del Estudio Madre**, con minutos sugeridos según duración declarada. El docente reordena, poda, ajusta tiempos.
Input exigido: la **pregunta abierta del Bloque 1** la escribe el docente — es el gancho pedagógico, debe nacer de su contexto congregacional, no del RAG.
Puerta: todo bloque con contenido doctrinal trae su trazabilidad al mapa de testigos. Si un bloque introduce una afirmación que no está en el Estudio Madre → bloqueado: "esto no lo estudiaste; vuelve a fase 1 o quítalo".

**T3 — Decisiones de participación (la hoja del alumno).**
El sistema propone qué se convierte en blanco (`blanco corto/largo`), qué en pregunta de observación, qué en líneas de síntesis personal — siguiendo la regla editorial de la suite: el alumno trabaja el texto, no solo escucha.
Input exigido: el docente aprueba blanco por blanco (es una decisión docente: qué quiere que el alumno descubra vs. reciba).
Puerta: la hoja contiene ≥1 momento donde el alumno formula con sus palabras (líneas de síntesis), espejo del principio "labor antes que output" aplicado al alumno.

**T4 — Confrontación didáctica final.** El sistema audita el plan completo:
1. ¿Los alumnos trabajan el texto en algún bloque, o solo escuchan? (≥1 actividad sobre el texto mismo)
2. ¿Cada afirmación doctrinal del plan hereda sus testigos del Estudio Madre?
3. ¿Los objetivos de T1 tienen su bloque correspondiente? (un objetivo sin bloque es un deseo, no un plan)
4. ¿La síntesis doctrinal va después del trabajo con el texto? (regla editorial de la suite)
5. ¿La carga de minutos es realista? (suma de bloques vs. duración declarada)

→ **Sale: material de estudio estructurado, listo para el paso 1 de la skill `suite-enseñanza-biblica` → plan.json → artefactos.**

---

## 3. Asistente B — Composición experta

Para el profesor de seminario o conferenciante. Sin secuencia obligatoria: es una **mesa de trabajo modular**. Pero la entrada y la salida tienen puertas duras.

### 3.1 Entrada obligatoria: la declaración

Antes de habilitar cualquier módulo, el docente declara:
- **Tesis de la sesión** (una oración).
- **Audiencia y nivel** (pregrado / posgrado / conferencia pastoral / etc.).
- **Objetivos** (mismo marco T1, autoformulado, sin tutoría).
- **Confesión de referencia** (si no está ya en su perfil).

El sistema registra la tesis y desde ese momento **toda afirmación de peso que entre a la sesión exige respaldo**: el docente puede declarar de memoria ("Calcedonia define las dos naturalezas sin confusión ni mutación…") y el sistema verifica contra biblioteca y marca verificado/no-encontrado/en-tensión. No tutela; audita.

### 3.2 Módulos (bajo demanda, en cualquier orden)

| Módulo | Qué hace | Borde de fidelidad |
|---|---|---|
| **Estructura** | propone esqueletos de sesión a partir de tesis + objetivos + minutos (deductivo, inductivo, problema-solución, histórico-cronológico) | cada sección del esqueleto declara qué afirmación de la tesis sostiene |
| **Argumento** | desarrolla un argumento que el docente enuncia, con las fuentes de SU biblioteca | el docente da la premisa; el sistema desarrolla y cita verificado — no origina la premisa |
| **Contraargumento** | steelman de las objeciones a la tesis (académicas, históricas, contemporáneas) | las objeciones se presentan en su mejor versión, con fuentes reales; respuestas las dirige el docente |
| **Exégesis dirigida** | mini-spine P1–P4 comprimido sobre UN pasaje que el docente necesita para probar un punto | las cuatro puertas exegéticas aplican completas — este módulo no tiene versión "rápida" |
| **Ilustración / caso** | busca en biblioteca y propone casos, citas, ejemplos históricos | marcado `cita-humana`; nunca sustituye un testigo bíblico |
| **Definición histórica** | trayectoria de un concepto por credos, confesiones y teólogos de su biblioteca | cronología con fuentes verificadas; tensiones entre fuentes se muestran, no se alisan |
| **Hoja / actividades** | igual que T3, con tipos adicionales para nivel seminario (análisis de fuentes primarias, debate estructurado, mini-exégesis del alumno) | regla de participación: el alumno produce, no solo recibe |

### 3.3 Salida: las mismas puertas

La confrontación final de B es idéntica en sustancia a la de A (tres testigos sobre afirmaciones de peso, citas verificadas, anti proof-texting, trazabilidad bloque→respaldo) más una propia:

- **Auditoría de autoría:** el sistema reporta qué % del contenido sustantivo fue declarado/escrito por el docente vs. desarrollado por el sistema. Si el desarrollo del sistema domina (umbral configurable, ej. >60%), advertencia explícita: *"esta sesión la está componiendo el sistema, no tú — ¿quieres pasar al modo formativo sobre los puntos débiles?"* Es el mecanismo anti-Daniel para el usuario experto, que también puede degradarse.

→ Sale: Estudio Madre (modo experto) + plan de sesión → mismo embudo hacia plan.json.

---

## 4. Comportamiento del RAG: los cinco modos

El RAG nunca opera "abierto a todo" en el asistente A; opera en el modo que el paso declara. Cada resultado lleva: fuente, ubicación, y estado del motor de citas (✓ respalda / ✗ no respalda lo afirmado / ~ parcial).

| Modo | Trae | Presenta como | Prohibido |
|---|---|---|---|
| `definicion` | léxicos, diccionarios, gramáticas | respuesta a la pregunta del docente, con fuente | resumir el pasaje completo |
| `contexto` | trasfondo histórico, literario, canónico | datos verificables citados | conclusiones interpretativas |
| `testigo` | pasajes paralelos candidatos | *candidatos a evaluar* (el docente acepta/rechaza con razón) | presentarlos como confirmación |
| `contraejemplo` | pasajes o posturas en tensión con la idea del docente | desafío honesto a resolver | esconder la tensión |
| `historico` | credos, confesiones, comentaristas, casos | `cita-humana`, jamás autoridad sobre el texto | citar sin verificación del motor |

Regla transversal: **el RAG aporta evidencia, nunca conclusiones.** La oración interpretativa siempre la escribe el docente.

---

## 5. Puertas de validación (resumen consolidado)

Heredadas del sistema de fidelidad, aplicadas a enseñanza:

1. **Testigo 1 — contexto inmediato:** toda idea central y todo pasaje usado se verifica contra sus versículos circundantes.
2. **Testigo 2 — paralelos canónicos:** ≥2 testigos bíblicos por afirmación doctrinal de peso (anti proof-texting).
3. **Testigo 3 — confesión declarada:** la síntesis se confronta con la tradición que el propio docente declaró.
4. **Motor de citas:** toda fuente RAG citada en el estudio o el plan lleva estado de verificación; citas ✗ no entran a artefactos.
5. **Puerta de trazabilidad (nueva, didáctica):** todo bloque del plan con contenido doctrinal apunta a su respaldo en el Estudio Madre.
6. **Puerta de participación (nueva, didáctica):** ≥1 actividad donde el alumno trabaja el texto y ≥1 síntesis con sus propias palabras.
7. **Auditoría de autoría (nueva, transversal):** % docente vs. % sistema, visible siempre, con advertencia sobre umbral. Es la tesis de Preach convertida en métrica.

---

## 6. Desembocadura en el contrato `plan.json` (v0-fase1) y gaps

### 6.1 Mapeo directo (ya soportado)

| Del proceso | Al contrato |
|---|---|
| tipo del Estudio Madre | `genero` (`exegesis` / `doctrina` — la skill ya los distingue; el asistente debe setearlo, hoy "no distingue" porque nadie se lo pasa) |
| T2 arco de bloques + minutos | `bloques[]` (`nombre`, `diapo_ini/fin`, `min`) |
| contenido de bloques | `diapositivas[].html` (vía renderizadores de la skill, nunca a mano) |
| guion del docente por lámina | `notas_resumen[]` + `cuerpo_notas_html` |
| T3 decisiones de blancos | `cuerpo_hoja_html` (blancos, preguntas, líneas) |
| curso (D0) | `serie` (string) — **insuficiente, ver gap 2** |

### 6.2 Gap 1 — Los objetivos no se serializan

T1 produce objetivos cabeza/corazón/manos; el contrato no tiene dónde guardarlos. Hoy se perderían entre el estudio y el artefacto.
**Propuesta:** campo `objetivos: { saber: [], sentir: [], hacer: [] }` en el plan. Uso inmediato: la consola del maestro puede mostrarlos como recordatorio permanente; la confrontación didáctica (T4.3) los necesita para validar.

### 6.3 Gap 2 — No existe el nivel curso

`serie` es un string decorativo. Una doctrina como Cristología es un objeto con N clases, secuencia, pasaje ancla por clase y transiciones (tu Bloque 8 ya las hace a mano).
**Propuesta:** objeto `curso.json`: `{ id, titulo, locus, clases: [{ orden, id_clase, tema, pasaje_ancla, estado }], transiciones }`. El Bloque 8 de cada clase se puede derivar automáticamente de la transición declarada en el curso. Esto además habilita el caso seminario (sílabo completo) y es feature vendible por sí solo.

### 6.4 Gap 3 — No hay trazabilidad estudio → artefacto

El plan no registra qué testigo respalda qué bloque. Sin eso, la "fidelidad auditable" del deck es verificable en el estudio pero invisible en el artefacto.
**Propuesta:** campo opcional por diapositiva/bloque: `respaldo: ["testigo:hch6_3", "obs:3.2"]` apuntando a IDs del Estudio Madre. Costo bajo (el asistente lo conoce al generar), valor alto: es la evidencia técnica del slide 6 del deck.

### 6.5 Gap 4 — El Estudio Madre no tiene contrato propio

Hoy el "material del docente" entra a la skill como md/docx/pdf libre. Para que la derivación múltiple (sermón + clase + díptico desde un estudio) funcione, el Estudio Madre necesita su propio schema (§1.1) y la skill debería aceptar `estudio.json` como formato de ingestión preferente, manteniendo md/docx como fallback para material externo.

---

## 7. Roadmap sugerido

**MVP (valida la tesis del upstream):**
- Asistente A · riel pasaje (P1–P5) + transposición (T1–T4), un solo flujo lineal.
- Estudio Madre v0 (schema §1.1, sin versionado).
- Mapeo a plan.json con `objetivos` (gap 1) — es el campo más barato y desbloquea T4.
- Métrica de autoría visible (aunque sea estimación gruesa): es la demo más potente para inversionistas, porque convierte la tesis "formamos, no fabricamos" en un número en pantalla.

**v1:**
- Riel doctrina (D0–D5) + objeto curso (gap 2).
- Derivación múltiple: del mismo Estudio Madre → clase + sermón (conecta con el spine homilético existente).

**v2:**
- Asistente B completo (mesa modular + auditoría de autoría con umbral).
- Trazabilidad estudio→artefacto en el plan (gap 3) y `estudio.json` como ingestión nativa de la skill (gap 4).

---

## 8. Lo que esta spec protege (para no perderlo en la implementación)

1. **El RAG nunca escribe la oración interpretativa.** Evidencia sí; conclusión, jamás.
2. **Las puertas de fidelidad son idénticas en ambos asistentes.** Lo único que cambia entre el principiante y el experto es el andamiaje, no el estándar.
3. **El gancho pedagógico (pregunta del Bloque 1) es siempre del docente.** Es lo único que el RAG no puede saber: su congregación.
4. **La autoría es una métrica, no una promesa.** Si el sistema produce más de lo que el docente produce, el sistema lo dice. Eso es Preach o no lo es.
