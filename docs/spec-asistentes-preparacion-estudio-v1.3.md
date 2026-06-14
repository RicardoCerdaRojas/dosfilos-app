# Spec — Asistentes de preparación de estudio + transposición (upstream de la suite de artefactos)

**Versión:** 1.3 · 13-jun-2026 · *supersede v1.0, v1.1, v1.2*
**Posición en el sistema:** entre la conversación con tutores y el paso 1 ("Ingerir el material") de la skill `suite-ensenanza-biblica` y demás generadores de recursos.
**Principio rector (no negociable):** el docente produce, el sistema desarrolla y valida. Si en algún paso la IA puede completar el contenido sin que el docente haya aportado nada, ese paso está mal diseñado.

**Cambio v1.2 → v1.3 (el que madura el modelo):** se separa limpio el **Estudio Madre** (qué dice/qué afirma — neutro al destino) de la **Transposición** (cómo se entrega — por destino). La transposición pasa a ser una **capa propia** con un **motor único + perfiles base configurables**. Se precisa la interacción real: el estudio se construye en la conversación con tutores (sin módulo nuevo), promoviendo elementos a slots; un botón ("este es el contenido de la clase") cristaliza y dispara las puertas. Se aclara que el contenido del seminario se desarrolla en un Estudio Madre **por clase**, nunca en el transponedor.

**Decisiones cerradas:**
- *Estudio Madre* = recurso `estudio` actual fortalecido (`extractions/{id}` + sobre estructurado). NO es colección ni objeto nuevo. Vive en la biblioteca/Recursos; proyectos y conversaciones lo **referencian**.
- *Construcción del estudio* = en la conversación con tutores (mismo lienzo actual). **Sin módulo nuevo.**
- *Promoción* = por slot/elemento (opción 2). Los elementos se diseñan para soportar confrontación (opción 3) en v1 sin rehacer el modelo.
- *Cristalización* = un acto explícito del docente ("este es el contenido") que congela el estudio y **dispara las siete puertas**.
- *Transposición* = capa separada. Motor único + perfiles base (escuela dominical, seminario, conferencia, sermón…) **clonables y extensibles**. Cada perfil declara **audiencia, objetivo, foco, estructura**.
- *Reordenamiento didáctico* = decisión **por transposición**, con default por perfil, registrada. **Reordenar nunca agrega contenido.**
- *Migración* = no disruptiva. Estudios viejos = `sin_auditar`; nuevos = con elementos y puertas.
- *Pipeline determinista JSON→HTML y `validatePlan`* = NO se tocan.

---

## 0. El problema, reencuadrado

Dos confusiones de origen que esta spec deshace:

1. **La conversación NO es el estudio.** La conversación con los tutores es el **taller**: exploras, pruebas, abandonas caminos, el LLM ofrece cosas que no te sirven. El **Estudio Madre** es lo que decides quedarte — el mueble, no las virutas. Regla: *nada entra al estudio por defecto; entra solo lo que el docente promueve.*

2. **El estudio NO es el artefacto.** El Estudio Madre es el contenido fiel, neutro al destino. *Cómo* se entrega (clase de escuela dominical, clase de seminario, conferencia, sermón, devocional) es una capa distinta: la **transposición**. Un mismo estudio alimenta N transponedores; cada transponedor tiene su audiencia, objetivo, foco y estructura.

Consecuencia directa que resuelve la duda recurrente: **el contenido (argumentos, distinciones, fuentes de una clase de seminario) se desarrolla SIEMPRE en el estudio, nunca en el transponedor.** El transponedor no puede agregar una afirmación doctrinal que no esté en el estudio — si la necesita, se vuelve al estudio y pasa las puertas. Eso es lo que mantiene la fidelidad heredándose en vez de reinventándose en cada destino.

---

## 1. La jerarquía completa (5 niveles), anclada a la arquitectura real

```
NIVEL 1 · PROYECTO              módulo de proyectos (ya existe) — referencia/archiva
        ↑
NIVEL 2 · PLAN / PROCESO        por tipo de proyecto; mutabilidad por arquetipo
        ↑ contiene N
NIVEL 3 · ESTUDIO MADRE         = extractions/{id} FORTALECIDO — contenido NEUTRO al destino
        ↑ cristaliza desde            ordenable · versionable · clonable
        · TRANSCRIPT (tutores)        taller; efímero para el estudio
        ↓ alimenta transversalmente
NIVEL 4 · TRANSPOSICIÓN         motor único + perfil de destino (audiencia/objetivo/foco/estructura)
        ↓ produce el plan/markdown del artefacto
NIVEL 5 · ARTEFACTOS            TeachingPlan → HTML (pipeline determinista, INTACTO)
```

Un solo Estudio Madre (Nivel 3) cuelga de un plan (Nivel 2) y se proyecta a través de N transposiciones (Nivel 4) hacia N artefactos (Nivel 5). La fidelidad se valida una vez en el Nivel 3 y se hereda hacia abajo.

---

## 2. Nivel 3 · El Estudio Madre

### 2.1 Es contenido neutro al destino, ordenable y versionable

El Estudio Madre es el *qué dice el texto / qué afirma la doctrina*, con las puertas en verde. **No tiene forma de entregable**: no es un sermón, ni una clase, ni una guía. Es la materia prima fiel de la que cualquiera de esos sale. Es el equivalente del cuaderno del pastor antes de decidir si eso será sermón del domingo o clase del miércoles.

Propiedades que esto habilita (todas salen de separar contenido de entrega):
- **Reorganizable** — sus elementos tienen orden editable.
- **Extendible** — se vuelve a la conversación, se trabaja un elemento nuevo, se promueve. (Una afirmación doctrinal nueva vuelve a pasar su puerta.)
- **Clonable** — clonas un estudio validado como base de otro (mismo curso el año próximo, o convertirlo en artículo).
- **Mejorable / versionable** — la clase 3 del año pasado, mejorada, sin perder la original.

### 2.2 Slots fijos (formativo) vs. elementos componibles (experto)

El Estudio Madre es un **conjunto de elementos tipados y ordenados**. La diferencia entre asistentes es cuánta libertad hay para componerlos:

- **Modo formativo (Asistente A — escuela dominical, pastor):** el sistema *exige* llenar un set fijo de elementos y conduce el orden. Tipos: `idea_central`, `observacion`, `testigo`, `testigo_historico`, `error_confrontado`, `aplicacion`.
- **Modo experto (Asistente B — seminario, conferencia):** el docente *compone libremente* elementos y los ordena a su gusto. Tipos: `marco`, `argumento`, `contraargumento`, `cita`, `ilustracion`, `conclusion` (y los exegéticos, si los usa). El sistema no conduce; **audita**.

Misma mecánica de promoción, distinta rigidez. Es la diferencia A/B aterrizada en cómo se sienten los elementos.

### 2.3 Schema (sobre dentro de `extractions/{id}`, backward-compatible)

```jsonc
{
  // --- existente, intacto ---
  "markdown": "...",                    // serializado desde elementos; lo lee buildPlanPrompt

  // --- sobre nuevo; ausente = legacy sin_auditar ---
  "estudio_madre": {
    "tipo": "pasaje | doctrina",
    "modo": "formativo | experto",
    "referencia": "Juan 1:1-3",
    "origen_conversacion_id": "...",    // transcript de origen (trazabilidad, NO fuente de verdad)
    "estado_fidelidad": "sin_auditar | en_progreso | verde",
    "version": 1,
    "clonado_de": null,

    "elementos": [
      {
        "id": "e1",
        "tipo": "idea_central",          // o argumento|contraargumento|cita|... según modo
        "orden": 1,
        "contenido": "...",
        "autoria": "docente | sistema | mixto",
        // verificación según tipo:
        "verificacion_citas": "ok | no | parcial",
        "proof_texting": "limpio | sospechoso",
        "aceptado_por_docente": true,    // soporta confrontación (opción 3) desde el schema
        "razon": "...",
        "respaldo_testigos": ["e4","e5"] // afirmaciones de peso → IDs de elementos testigo
      }
    ],

    "autoria_resumen": { "docente_pct": 0, "sistema_pct": 0 },  // derivado de elementos
    "proyectos_vinculados": [],
    "historial_confrontacion": []
  }
}
```

### 2.4 La cristalización: el botón "este es el contenido"

El flujo real, tal como ocurre en la conversación con tutores:

1. El docente trabaja en el taller: *"definamos el marco de la unión hipostática"* → varios intercambios → *"formúlalo incluyendo el problema al que responde y los pasajes que rebaten nuestra postura"*.
2. **Promueve** esa formulación revisada a un elemento (`marco`). No promueve el mensaje crudo: promueve lo que pidió y revisó.
3. Repite: argumento, contraargumento, cita de Calcedonia, ilustración, conclusión. Los **ordena a su gusto**.
4. Presiona **"este es el contenido de la clase"** → acto de cristalización: congela el Estudio Madre y **dispara las siete puertas** (§8). Si pasa → `estado_fidelidad: verde`, listo para transponer. Si no → el sistema dice qué falta antes de dejar cerrar.

Por eso el contenido entra **solo aquí** y no por el transponedor: las puertas viven en este botón.

### 2.5 La métrica de autoría sale gratis

Cada elemento lleva `autoria`. `autoria_resumen` agrega. Es la demo más potente para inversionistas: la tesis "formamos, no fabricamos" hecha un número en pantalla. Señal de vuelta sana: *"de 27 intercambios cristalizaste 6 elementos propios y aceptaste 3 testigos"*.

---

## 3. Nivel 4 · La Transposición

### 3.1 Motor único + perfiles base configurables (modelo de datos, no de código)

**Un solo motor de transposición.** Los destinos (escuela dominical, seminario, conferencia, sermón…) **no son tipos codificados** — son **perfiles base**: datos que el motor lee igual que leería un perfil que un seminario cree mañana. No hay transponedores de primera y segunda clase: hay un motor y N perfiles, y los de fábrica solo vienen llenos.

Ventajas (vs. tipos codificados): editar el perfil de seminario es editar datos, no abrir código; un seminario (p.ej. SEBEX) puede definir *su* perfil — vendible institucionalmente; una sola superficie que endurecer (mejoras el motor una vez, mejoran todos los destinos).

### 3.2 El perfil declara cuatro cosas; todo lo demás lo hereda del estudio

```jsonc
{
  "id": "perfil_seminario",
  "nombre": "Clase de seminario",
  "es_base": true,                  // de fábrica: clonable, no editable directo
  "audiencia": "posgrado",
  "objetivo": { "marco": "saber/sentir/hacer calibrado al nivel", "nivel": "..." },
  "foco": "qué porción del estudio se exprime y con qué énfasis",
  "estructura": "arco y formato del artefacto (p.ej. clase 8 bloques, hoja de fuentes)",
  "reordenamiento_didactico_default": "respeta_orden_logico | permite_reordenar"
}
```

Perfiles base de arranque: `escuela_dominical`, `seminario`, `conferencia`, `sermon`, más los recursos actuales (`guia_estudio`, `boletin`, `devocional`, `post_blog`, `ensayo`, `tareas_nouteticas`).

### 3.3 La instancia de transposición

```jsonc
{
  "id": "...",
  "estudio_madre_id": "...",
  "perfil_id": "perfil_seminario",
  "reordenamiento_didactico": "respeta | reordena",   // decisión de ESTA transposición; default = perfil
  "orden_didactico": ["e1","e5","e2"],                // si reordenó; null si respeta el orden lógico
  "destino": "TeachingPlan | sermon_draft | devocional | ..."
}
```

### 3.4 Reordenamiento didáctico: decisión por transposición, no global

Al crear una transposición el sistema pregunta (con default del perfil): *"¿hay libertad para adaptar el orden del contenido por razones didácticas, o respetamos tu orden lógico?"* Se decide **por destino**:

```
ESTUDIO MADRE (orden lógico del docente — base intocable)
   marco → argumento → contraargumento → cita → conclusión
      │
      ├─► Transposición SEMINARIO     · reordenar? NO  → entrega en orden lógico
      └─► Transposición ESC. DOMINICAL · reordenar? SÍ → arranca por la aplicación, luego sostiene
```

Tres límites duros:
1. **Reordenar ≠ alterar.** El transponedor cambia la *secuencia* y elige *qué* enfatizar u omitir. **Jamás agrega** una afirmación que no esté en el estudio, ni cambia lo que un elemento dice.
2. **Queda registrado.** Si reordenó, `orden_didactico` lo refleja y la trazabilidad sigue apuntando a los elementos del estudio.
3. **Default sensato por perfil.** `seminario` → respeta orden lógico; `escuela_dominical` → permite reordenar. El docente puede overridear; la pregunta no fastidia en cada clase.

### 3.5 El perfil de transposición ≠ el manifiesto de proceso

No fundir dos cosas distintas: el **proceso** (Nivel 2) dice *cómo se trabaja* (fases, asistente, puertas); el **perfil de transposición** (Nivel 4) dice *cómo se entrega* (audiencia, objetivo, foco, estructura). Una conferencia tiene un proceso de evento (N sesiones) *y* un perfil de transposición por sesión. Separarlos permite usar el perfil "seminario" dentro de un proceso de curso o de conferencia sin reescribir nada.

---

## 4. Dónde viven las puertas: Opción A (cristalización), transversal

**Las siete puertas se ejecutan al cristalizar el Estudio Madre (§2.4), no en la generación de artefactos.** Razón de producto: hay ~7 tipos de recurso y la Suite de Enseñanza es solo un consumidor. Si las puertas vivieran en la skill, el bosquejo, el devocional y el ensayo saldrían sin auditar. Al vivir en el estudio, **todo lo que derive de él hereda la fidelidad** — el slide 7 del deck hecho código.

### 4.1 Mapeo a funciones reales

| Pieza | Hoy | Con v1.3 |
|---|---|---|
| Promoción a elementos | no existe | nueva: UI de conversación → `estudio_madre.elementos` |
| **Puertas de fidelidad** | no se ejecutan | nueva fn `validarEstudioMadre(elementos)` — corre en el botón "este es el contenido" |
| Serialización elementos → markdown | el LLM resume la conversación | nueva fn `serializarEstudio(elementos, orden) → markdown` |
| Perfil de transposición | parcial (`género` exegesis/doctrina) | objeto `perfil_transposicion` que parametriza la generación |
| `encolarPlanSesion.ts` | lee `extractions/{id}.markdown` | **igual** — el markdown viene de elementos cristalizados |
| `buildPlanPrompt.ts` | System=SKILL+contrato+género; User=markdown | **igual**; el `género` se enriquece con el perfil de transposición; opcional: recibe el sobre para poblar trazabilidad |
| `validatePlan.ts` | valida contrato `TeachingPlan` (esquema) | **igual** — valida esquema, NO fidelidad. Dos validaciones distintas, ambas existen. |
| `inject.ts` / `render/` | JSON → HTML determinista | **INTACTO** |

Regla para Claude Code: **no tocar el transformador determinista JSON→HTML ni `validatePlan`.** Todo el trabajo nuevo es upstream del markdown.

---

## 5. El pipeline que NO cambia (límites de implementación)

- Lo que se convierte a JSON nunca fue la conversación cruda — es `extractions/{id}.markdown`. **Sigue igual.**
- `estudio → JSON` = LLM no determinista + `coerceCandidate`, con bucle de corrección por `erroresPrevios` sobre el *esquema*. **Sigue igual.**
- `JSON → artefactos` = función pura determinista. **Intocable.**
- Curso = mismo pipeline N veces (`proponerOutlineCurso` + `encolarPlanSesion` por sesión con `alcance`).

Lo único que se inserta es: **transcript → [promoción] → elementos → [puertas] → [serializar] → markdown.** De ahí, todo es el sistema que ya opera.

---

## 6. Camino de migración (no disruptivo)

1. El recurso `estudio` gana el sobre `estudio_madre` **opcional**. Ausencia ⇒ `sin_auditar`.
2. Los estudios viejos (markdown ≥40 chars) **siguen funcionando** como `sin_auditar`.
3. Los del flujo guiado nacen con elementos y puertas.
4. La UI muestra el estado: badge verde (auditado) / ámbar (`sin_auditar`). Demuestra la tesis en paralelo, sin romper nada.
5. Los botones de acción migran por etapas: primero el tipo `estudio` interpone elementos; luego los demás recursos pasan a derivar *del estudio* (vía transposición) en vez de *de la conversación*.

---

## 7. Niveles 1–2 · Proyecto, plan, proceso

**Cuatro arquetipos de proceso** (lo define el arquetipo, no la audiencia ni el artefacto):

| Arquetipo | Plan | Mutabilidad | # Estudios Madre |
|---|---|---|---|
| Unidad | no | `sin_plan` | 1 |
| Secuencia congelada | sí | `congela_al_aprobar` | N |
| Plan vivo | sí | `revisable` | N |
| Libre | opcional | `opcional` | libre |

**Taxonomía reconciliada** (faltan en la UI los tipos *Curso de enseñanza* y *Conferencia*; por eso Cristología hoy se fuerza en "General"):

| Tipo | Arquetipo | Destino | Asistente |
|---|---|---|---|
| Sermón | Unidad | púlpito | A/B |
| Estudio personal | Unidad | archivo | A/B |
| Serie de predicación | Secuencia congelada | púlpito | A/B por sermón |
| Curso de enseñanza | Secuencia congelada | aula | A por clase |
| Conferencia | Secuencia congelada | aula/evento | B por sesión |
| Consejería | **Plan vivo** | cuidado | A reducido por sesión |
| General | Libre | — | bajo demanda |

**Mutabilidad como propiedad del tipo:** curso/conferencia congelan al aprobar; **consejería es plan vivo** (se extiende/reduce/redirige cada sesión, con registro del porqué). Forzar la rigidez de un curso sobre una consejería traiciona el cuidado pastoral.

### 7.1 Cómo funciona un curso de seminario (resuelve "dónde se agrega el contenido")

```
1. PLANIFICAR (D0, una sola vez)      → plan_curso: Cristología = 12 clases, tema + pasaje ancla c/u.
                                         Solo el índice. Sin contenido.
2. ESTUDIAR cada clase (D1–D5, N veces)→ un Estudio Madre por clase (Asistente B).
                                         AQUÍ se desarrolla el contenido del seminario.
3. TRANSPONER cada clase               → perfil "seminario": objetivos posgrado, arco, hoja de fuentes.
                                         Da forma; no agrega contenido.
4. GENERAR                             → presentación, notas, hoja.
```

La niebla venía de leer D0–D5 como un flujo continuo. Son dos momentos: **D0 corre una vez** (arma el índice); **D1–D5 corren por clase** (desarrollan contenido). Las 12 clases = 12 Estudios Madre reutilizables — por eso el estudio vive en la biblioteca, no dentro del proyecto.

**Procesos como manifiestos declarativos:** cada tipo declara `fases[]` (qué asistente, qué puerta). El roadmap de la UI se renderiza desde ahí. Agregar un flujo ministerial = agregar un manifiesto, no recablear la app.

---

## 8. Las siete puertas (corren en `validarEstudioMadre`, sobre los elementos)

1. **Testigo 1 — contexto inmediato:** idea central y cada pasaje contra sus versículos circundantes.
2. **Testigo 2 — paralelos canónicos:** ≥2 testigos por afirmación de peso (anti proof-texting).
3. **Testigo 3 — confesión declarada:** síntesis contra la tradición del docente.
4. **Motor de citas:** cada cita con estado; citas ✗ no entran a artefactos.
5. **Trazabilidad:** bloque del artefacto → `respaldo_testigos` en elementos.
6. **Participación:** el alumno trabaja el texto + síntesis con sus palabras.
7. **Autoría:** `autoria_resumen` visible, con advertencia de umbral.

Idénticas en todos los arquetipos y todos los destinos. Lo que varía entre tipos de proyecto es el Nivel 2; entre destinos, el Nivel 4. Nunca el estándar del Nivel 3.

---

## 9. Los dos asistentes (Nivel 3 · resumen)

Los distingue **quién carga la prueba.** A pregunta → el docente descubre (slots fijos). B el docente declara → el sistema exige respaldo (elementos componibles). Puertas idénticas.

**A · riel PASAJE (P1–P5):** observación desnuda (RAG off) · contexto/términos · idea central (el sistema no la propone) · tres testigos (candidatos a evaluar) · confrontación + aplicación.
**A · riel DOCTRINA (D0–D5):** D0 mapa del curso (una vez) → `plan_curso` + un Estudio Madre por clase · D1 definición propia · D2 base bíblica · D3 histórica/confesional · D4 error en su mejor versión · D5 síntesis.
**B (mesa modular):** declaración (tesis, audiencia, objetivos, confesión) → módulos bajo demanda (estructura, argumento, contraargumento, exégesis dirigida sin versión rápida, ilustración, definición histórica) → mismas puertas + auditoría de autoría con umbral (anti-Daniel para el experto).

**Cinco modos RAG:** `definicion` · `contexto` · `testigo` (candidatos, nunca confirmación) · `contraejemplo` · `historico` (`cita-humana`). Regla: **el RAG aporta evidencia, nunca la oración interpretativa.**

---

## 10. Contrato `TeachingPlan` y gaps

| Gap | Estado |
|---|---|
| 1 — objetivos no se serializan | `objetivos: { saber, sentir, hacer }` en el plan, desde los elementos. MVP. |
| 2 — nivel curso | objeto `plan_curso`/`plan_conferencia` (Nivel 2); formaliza `proponerOutlineCurso`. `serie` queda como etiqueta. |
| 3 — trazabilidad estudio→artefacto | `respaldo: ["e4","obs:e2"]` por bloque → IDs de elementos. Evidencia visible del slide 6. |
| 4 — Estudio Madre sin contrato | **resuelto:** sobre `estudio_madre` en `extractions/{id}`. |
| 5 — proyecto/plan sin contrato | `proyecto.json` (tipo, proceso_ref) + `plan_*.json`. |
| 6 — transposición sin contrato (nuevo) | `perfil_transposicion` + instancia `transposicion`. Habilita perfiles institucionales. |

---

## 11. Roadmap

**MVP (valida el upstream y la tesis):**
- Promoción por elemento sobre el recurso `estudio` (sobre `estudio_madre`) + botón de cristalización.
- `validarEstudioMadre` con puertas 1–4 + 7. `serializarEstudio → markdown`.
- Asistente A · riel pasaje (P1–P5) + transposición con perfil base `escuela_dominical` y `sermon`.
- `objetivos` en `TeachingPlan` (Gap 1). Badge `verde`/`sin_auditar`.
- **Métrica de autoría visible** — la demo.
- Tipos de proyecto *Sermón* y *Curso de enseñanza* con manifiesto de proceso.

**v1:**
- Confrontación al promover (opción 3) — activar exigencia de `razon`, sin tocar schema.
- Riel doctrina (D0 una vez + D1–D5 por clase) + `plan_curso` + objeto curso en UI.
- Perfiles base `seminario` y `conferencia`; reordenamiento didáctico con default por perfil.
- Estudio Madre clonable/versionable en UI. Derivación múltiple desde un estudio.
- Trazabilidad (Gap 3) en el plan.

**v2:**
- Asistente B completo (mesa modular + auditoría de autoría con umbral).
- Tipo *Consejería* con `plan_cuidado` vivo.
- Perfiles de transposición personalizados (institucionales). `estudio_madre` como ingestión nativa de la skill.
- Migración de bosquejo/devocional/boletín a derivar del estudio vía transposición.

---

## 12. Lo que esta spec protege

1. **La conversación es el taller; los elementos cristalizados son el estudio.** Nada entra sin promoción del docente.
2. **El estudio es neutro al destino; la transposición es por destino.** Un estudio, N transponedores.
3. **El contenido entra siempre por el estudio, nunca por el transponedor.** El transponedor reordena y da forma; jamás agrega doctrina.
4. **Las puertas viven en el recurso, no en la skill.** Por eso todo recurso hereda la fidelidad.
5. **Las siete puertas son idénticas en todo arquetipo y todo destino.** Cambia el proceso (N2) y la entrega (N4); nunca el estándar (N3).
6. **El transponedor es un motor único + perfiles base configurables.** Datos, no código. Extensible sin diluir la fidelidad.
7. **El pipeline determinista JSON→HTML y `validatePlan` no se tocan.**
8. **La autoría es una métrica, no una promesa.** Si el sistema produce más que el docente, el sistema lo dice. Eso es Preach o no lo es.
