# Arquitectura — Módulo «Generador de Suite de Enseñanza» para el SaaS

> Documento de implementación para Claude Code (VS Code).
> Stack del SaaS: **React + Firebase (Firestore, Cloud Functions, Storage, Auth)**.
> Objetivo: portar el sistema `suite-ensenanza-biblica` (hoy un *skill* de
> Claude) a un módulo nativo del SaaS, que toma un estudio de la biblioteca
> de recursos del usuario, genera los artefactos de enseñanza para una marca
> (institución), y permite crear marcas nuevas.

---

## 0. Para Claude Code: cómo leer este documento y qué te pasarán

Este documento describe **qué construir y por qué**. Junto a él recibirás la
**fuente del sistema actual** (carpeta `suite-ensenanza-biblica/`), que es la
implementación de referencia en Python + plantillas HTML. Tu trabajo NO es
copiar Python al SaaS: es **traducir cada pieza a su lugar natural** en
React/Firebase, conservando intactos dos activos que NO debes reescribir desde
cero:

1. **Las 4 plantillas HTML** (`assets/plantilla_*.html`) — son el runtime
   congelado (sincronización por BroadcastChannel, temporizador, canvas de
   marcado, escalado, alto contraste). Se reutilizan **tal cual**, como
   plantillas de texto con marcadores `@@…@@`. No las rediseñes.
2. **El contrato del plan** (`references/contrato-plan.md`) — es la interfaz
   estable entre el contenido y el runtime. Tu modelo de datos debe poder
   almacenar y producir exactamente este JSON.

Lee, en este orden, antes de diseñar nada:
`references/contrato-plan.md` → `SKILL.md` → `scripts/inyectar.py` +
`scripts/renderizadores.py` (lógica de render) → `scripts/validar.py`
(reglas duras) → `scripts/crear_marca.py` (creación de marcas) →
`references/identidad.md` (reglas de marca) → `references/trinquete.md`.

**Lista exacta de recursos a adjuntar a Claude Code junto a este doc** (§9).

---

## 1. Qué hace el módulo (alcance funcional)

Un módulo nuevo en el SaaS con tres capacidades:

**A. Generar artefactos desde un estudio de la biblioteca.**
El usuario selecciona un estudio ya cargado en su biblioteca de recursos
(material exegético, doctrinal o de consejería) → elige la institución/marca
(p. ej. la iglesia o el seminario) → el sistema propone un **plan de clase**
(JSON estructurado) que el usuario revisa y aprueba en pantalla → al aprobar,
se generan los artefactos HTML (presentación sincronizada, consola del
maestro, hoja de trabajo, y/o guía de sesión) listos para proyectar,
imprimir o compartir.

**B. Crear marcas nuevas.**
El usuario sube el logo de una institución y define (o deja que el sistema
proponga) la paleta y tipografía; el sistema valida contraste y distinción
perceptual, y registra la marca para reutilizarla en cualquier clase futura.

**C. (Heredado del sistema) Memoria viva del catálogo — el «trinquete».**
Cuando una clase usa una lámina de diseño libre (`lienzo`), su forma se
registra; si una forma se repite entre clases, el sistema sugiere
«graduarla» a componente reutilizable. En el SaaS esto es una colección de
Firestore, no un archivo (§7).

---

## 2. Concepto rector (NO reabrir — es la decisión que hace todo esto posible)

**Contenido ≠ runtime.** El HTML/CSS/JS de los artefactos está *congelado* en
4 plantillas. Cada clase es solo un **plan de clase** (un JSON plano). Generar
los artefactos = inyectar el plan + la marca en las plantillas. Esto significa:

- El SaaS **nunca almacena HTML generado**; almacena el `plan` (editable) y
  re-renderiza a demanda. El HTML es un derivado desechable.
- La generación de artefactos es **determinista y sin IA**: `plan + marca →
  HTML`. Es una función pura. La IA (API de Anthropic) interviene **solo** en
  el paso de redactar el plan a partir del estudio.
- El **punto de control editorial es el plan**, no el HTML. El usuario aprueba
  o ajusta el plan en una pantalla; jamás edita HTML a mano.

Mapa de migración (qué se vuelve qué):

| Pieza del sistema actual | Su lugar en el SaaS |
|---|---|
| `assets/plantilla_*.html` (runtime) | Assets de texto en Storage o en el repo; cargados por la Cloud Function de render |
| `scripts/inyectar.py` + `renderizadores.py` | **Cloud Function `renderizarArtefactos`** (TS, determinista) |
| `scripts/validar.py` | **Cloud Function `validarPlan`** (TS); corre antes de render |
| `scripts/crear_marca.py` | **Cloud Function `crearMarca`** (TS) + UI de creación |
| `SKILL.md` + `references/*` | **Prompt** que se arma para la API de Anthropic al generar el plan |
| `assets/marcas/<clave>/` | Colección **`marcas`** en Firestore + fuentes/logos en Storage |
| `assets/ediciones/<clave>/` | Colección **`ediciones`** en Firestore |
| `references/trinquete.md` | Colección **`formas_lienzo`** en Firestore (memoria viva) |
| `ejemplos/plan_*.json` | Documentos en colección **`planes`** |

---

## 3. Modelo de datos (Firestore)

Todas las colecciones cuelgan del usuario/organización propietaria (respeta el
modelo multi-tenant existente del SaaS; abajo se omite el prefijo de tenant por
claridad). Reusa la biblioteca de recursos existente como origen del estudio.

### `estudios` (YA EXISTE — biblioteca de recursos)
No se crea; se **lee**. Se asume que cada estudio tiene al menos:
`{ id, titulo, contenido (texto/markdown o ref a archivo en Storage),
genero_sugerido?, pasaje?, serie? }`. Si la estructura real difiere, adaptar
el lector del paso de generación (§5.A) — es el único punto de acoplamiento.

### `clases`
La unidad que el usuario crea en el módulo.
```
{
  id, estudioId,            // de qué estudio nació
  marcaId,                  // institución elegida
  titulo, serie, genero,    // exegesis | doctrina | consejeria
  modalidad?,               // clase | sesion (solo consejería)
  edicionId?,               // capa de serie opcional
  planId,                   // → doc en `planes`
  estado,                   // borrador | plan_propuesto | aprobado | generado
  artefactosUrls?,          // { presentacion, notas, hoja, guia_sesion } en Storage
  creado, actualizado, ownerId
}
```

### `planes`
**El corazón.** Es el `plan.json` del contrato (v1.4). Estructura completa y
reglas: ver `references/contrato-plan.md` — replicarlo como esquema validado.
Campos de cabecera: `id, titulo, serie, genero, modalidad?, marca, edicion?,
artefactos[], version_contrato, textos?`. Cuerpo: `bloques[]`,
`diapositivas[]` (cada una con `n`, `tipo`, y campos según tipo),
`notas_resumen[]`, `cuerpo_notas_html`, `cuerpo_hoja_html`,
`cuerpo_guia_html?`. **No inventar campos**: el contrato es exhaustivo.

### `marcas`
```
{
  id (clave: [a-z0-9-]+),
  nombre,
  tokens: { oscuro, panel, medio, acento, claro1, claro2,
            escritura, escritura_tinta, alerta },   // 9 tokens hex
  fuente,                    // pila CSS de interfaz (Inter por defecto)
  fuente_titulos, fuente_escritura,   // pilas CSS serif
  fuentes: [ { archivo (path en Storage), familia, peso, estilo } ],
  logoUrl, iconoUrl,         // en Storage
  cssExtra?,                 // texto CSS de la firma de marca (extra.css)
  creado, ownerId
}
```
Ejemplo real de referencia: `assets/marcas/sebex/marca.json` (incluido).

### `ediciones`
```
{ id (clave), serie, gesto (descripción), css (texto), estado, ownerId }
```
Capa fina de CSS propia de UNA serie. Constitución validada (§6).

### `formas_lienzo`  (el trinquete vivo — §7)
```
{ id, forma (descripción normalizada), claseId, diapoN, fecha, ownerId,
  estado }   // candidata | promovida
```

---

## 4. Cloud Functions (la lógica determinista)

Reescribir en TypeScript. Son funciones puras salvo lectura de Firestore/Storage.

### `validarPlan(plan) → { ok, errores[], avisos[] }`
Traducción literal de `scripts/validar.py`. Reglas duras que DEBE exigir
(extraídas del validador real — lista no negociable):

- `id` con patrón `[a-z0-9_-]+`; `genero` ∈ {exegesis, doctrina, consejeria}.
- Consejería ⇒ `modalidad` ∈ {clase, sesion}. `modalidad: sesion` ⇒ sin
  `presentacion` ni `notas`, **con** `guia_sesion`.
- `version_contrato` ∈ {1, 1.1, 1.2, 1.3, 1.4}. Coherencia: tipos
  `tarjetas`/`pasos`/`secuencia` ⇒ ≥1.1; `variante` ⇒ ≥1.2; `lienzo` ⇒ ≥1.3;
  `edicion` ⇒ 1.4. (Detección automática + error si el número no acompaña.)
- Diapositivas numeradas `1..N` sin huecos; tipos conocidos; `bloques` cubren
  `1..N` sin solapes; `notas_resumen` cubre todas las diapositivas.
- **Regla de la Escritura**: toda `escritura`/`escritura-anotada` con `ref`;
  `cita-humana` jamás con el color de Escritura (se audita en el HTML final).
- `lista` ≤4 ítems (≤6 si `variante: dos-columnas`).
- `quiasmo`: niveles espejados (palíndromo) + exactamente un `centro`.
- `flujo`: toda conexión a un id existente + al menos una raíz.
- `tarjetas` 2–4; `pasos` 2–5; `secuencia` ≥2 etapas con `actual` en rango.
- `escritura-anotada`: cada palabra destacada presente en el `texto`.
- **`variante`** válida para el tipo (catálogo en el contrato §variante).
- **`lienzo`** (constitución, exigida): `alt` obligatorio; sin `<script>`;
  colores SOLO `var(--token)` (rechazar hex/rgb); `font-size` ≥18px; sin
  `vw`/`vh`/`position:fixed`/`overflow:auto|scroll`; todo selector del `css`
  empieza en `.lz`. Emite **aviso** (no error): «QA visual obligatorio».
- **`edicion`** (constitución): selectores en ámbito `.diapo`/`body.alto-contraste`;
  colores solo token/currentColor; ≥13px; sin vw/vh/fixed/scroll.
- Espacios en blanco de la hoja jamás dentro de `h1–h3`.

Sobre el HTML generado (post-render): `node --check` de cada `<script>`
(o validación JS equivalente en el runtime de Functions); canal
`laiglesia_<id>` único; canvas de marcado visible; cero emojis en interfaz;
conteo de diapositivas coincide con el plan.

### `renderizarArtefactos(planId) → { urls }`
Traducción de `inyectar.py` + `renderizadores.py`. Pasos:
1. Cargar `plan`, `marca` (y `edicion` si aplica) de Firestore.
2. Por cada artefacto declarado en `plan.artefactos`, cargar la plantilla
   HTML correspondiente (`plantilla_presentacion.html`, `_notas`, `_hoja`,
   `_guia_sesion`).
3. **Renderizar cada diapositiva** según su `tipo` (portada, lista, escritura,
   escritura-anotada, quiasmo, paralelismo, flujo, termino, esquema,
   confrontacion, sintesis, transicion, **tarjetas, pasos, lienzo**) — la
   función `renderizar(d)` de `renderizadores.py` es el mapa exacto tipo→HTML.
   Nota: la **vía de escape** `html` crudo reemplaza al renderizador EXCEPTO
   en `lienzo`, donde `html` es dato del componente (encapsular su `css` con
   prefijo `.lz`→`#lzN`).
4. **Aplicar tokens de marca**: reemplazar `--oscuro`, `--panel`, … con los
   hex de `marca.tokens` (el guion: `escritura_tinta` → `--escritura-tinta`).
5. **Incrustar fuentes** como `@font-face` base64 (leer woff2 de Storage) en
   el marcador `/* @@FUENTES@@ */`; inyectar `cssExtra` de la marca tras
   `</style>`; luego la `edicion.css` (mayor prioridad en la cascada).
6. Incrustar el logo como base64 en `@@LOGO_B64@@`.
7. Rellenar marcadores de texto (`@@TITULO_*@@`, `@@DIAPOSITIVAS@@`,
   `@@CUERPO_NOTAS@@`, `@@BLOQUES_JS@@`, etc. — lista completa en
   `inyectar.py`). **Importante**: el inyector verifica que no queden
   marcadores `@@…@@` sin rellenar (guardián); replicarlo.
8. Subir los HTML a Storage; devolver URLs; actualizar `clase.artefactosUrls`.

Determinista, sin IA. Mismo plan + misma marca ⇒ mismo HTML byte a byte.

### `generarPlanDesdeEstudio(estudioId, marcaId, opciones) → { plan }`
**El único paso con IA.** Llama a la **API de Anthropic** (Claude). Arma el
prompt con: (a) el contenido del estudio; (b) el `SKILL.md` (flujo + reglas
editoriales transversales); (c) las referencias del género detectado
(`genero-exegesis.md` | `genero-doctrina.md` | `genero-consejeria.md`),
`tipos-de-lamina.md` y `contrato-plan.md`. Pide como salida un `plan.json`
válido. **No** confía ciegamente: pasa el resultado por `validarPlan` y, si
falla, reintenta con los errores en el prompt (bucle de corrección acotado).
Devuelve el plan para que el usuario lo apruebe — NO genera artefactos aún.

Detalles del género/modalidad: si el estudio es ambiguo, la función pide
clarificación al usuario (el SKILL.md indica «nunca asumir»). Consejería:
anonimizar nombres/datos (regla del skill).

### `crearMarca(input) → { marca | errores }`
Traducción de `crear_marca.py`. Recibe logo + tokens propuestos (o los deriva
del logo). **Valida y rechaza** si no cumple:
- Contraste WCAG ≥4.5:1 — `escritura`/`oscuro`, `escritura_tinta`/`#f7fafb`,
  `claro1`/`oscuro`.
- Distinción perceptual ΔE(Lab) ≥18 — `escritura`↔`acento`,
  `escritura`↔`alerta`, `acento`↔`alerta` (si la Escritura no se distingue
  del acento de interfaz, la semántica colapsa).
- Genera versión del logo con fondo transparente.
Las fórmulas exactas (luminancia relativa, RGB→Lab, ΔE) están en
`crear_marca.py` — portarlas tal cual. **Regla de oro** (de `identidad.md`):
toda marca empieza analizando las formas del logotipo; tipografía anclada a
él; Escritura siempre en serif de trazo firme (≥600) por proyector/Zoom.

---

## 5. Flujo de usuario (UI React)

### A. Generar una clase
1. **Seleccionar estudio** de la biblioteca (`estudios`). Mostrar
   título/pasaje/serie.
2. **Elegir marca** (`marcas`) — institución. *Siempre se pregunta; nunca se
   asume.* El título/serie/pasaje/género vienen del **estudio**, no de la marca
   (la marca solo aporta identidad visual).
3. **Confirmar género y, si es consejería, modalidad.** Pre-rellenar con la
   sugerencia del estudio; el usuario confirma.
4. Botón **«Proponer plan»** → `generarPlanDesdeEstudio`. Spinner.
5. **Pantalla de revisión del plan** (el punto de control editorial): mostrar
   bloques+minutos, lista de diapositivas con su tipo, qué se parte, qué va en
   blanco en la hoja. El usuario edita/aprueba. Esta vista reemplaza al «chat»
   del skill — es JSON estructurado renderizado como formulario navegable.
6. Al **aprobar** → `validarPlan` (mostrar errores si los hay, volver a 5) →
   `renderizarArtefactos` → mostrar los artefactos (links a presentación,
   consola, hoja). Si el plan incluyó `lienzo`: **mostrar las capturas y exigir
   confirmación visual** del usuario antes de marcar `generado` (§8).

### B. Crear una marca
1. Subir logo (PNG). 2. El sistema analiza el logo y **propone** paleta +
   tipografía (clasificación del wordmark → familia de licencia abierta que la
   herede). 3. El usuario ajusta. 4. `crearMarca` valida (contraste + ΔE);
   si falla, señala qué token corregir. 5. Vista previa: **inyectar una clase
   demo en la marca** y mostrar 3–4 láminas (reutiliza un plan de ejemplo).
   6. Guardar en `marcas`.

---

## 6. Tipos de lámina y composición (qué soporta el plan)

El contrato define estos `tipo`: `portada, lista, escritura,
escritura-anotada, quiasmo, paralelismo, flujo, termino, esquema,
confrontacion, sintesis, transicion, tarjetas, pasos, lienzo`. Más:
- Campo transversal **`variante`** (composición alternativa por tipo:
  `portada: margen`, `lista: numerada|dos-columnas`, `escritura: plena|banda`,
  `sintesis: plena`, `tarjetas: horizontal`).
- Campo transversal **`secuencia`** `{etapas[], actual}` (riel de progreso para
  contar una idea en láminas hermanas; el scroll vertical en lámina proyectada
  está PROHIBIDO — rompe el canvas de marcado).
- Campo de cabecera **`edicion`** (capa de serie).

Detalle de campos por tipo y constituciones: `references/contrato-plan.md`,
`references/tipos-de-lamina.md`, `references/componentes-exegeticos.md`.

**Regla de la Escritura** (sagrada, en todos los artefactos): el color de
Escritura marca SOLO palabras citadas textualmente; nunca comentarios,
confesiones (`cita-humana`) ni síntesis interpretativa (que va en `--acento`).
Detalle: `references/identidad.md`. El validador la audita.

---

## 7. El trinquete como memoria viva (responde a la pregunta original)

En el skill, el catálogo de componentes «crece desde la práctica»: una forma
hecha con `lienzo` que reaparece en una segunda clase se promueve a componente.
Como un skill no tiene memoria entre conversaciones, esto dependía de
transportar un archivo `trinquete.md` — frágil.

**En el SaaS el problema desaparece**: Firestore ES la memoria compartida.
Implementación:
1. Al generar una clase con láminas `lienzo`, `renderizarArtefactos` escribe
   un doc en `formas_lienzo` por cada forma (con `claseId`, `diapoN`, una
   descripción normalizada de la forma).
2. Antes de proponer un plan nuevo, `generarPlanDesdeEstudio` consulta
   `formas_lienzo`: si una forma ya aparece en ≥2 clases, la marca `candidata`.
3. La UI avisa: «esta forma ya la usaste en N clases — ¿la convertimos en
   componente reutilizable?». Si el usuario acepta, se crea un nuevo `tipo`
   (contrato de datos + renderizador + validación) y los lienzos viejos se
   migran en su siguiente regeneración.
4. La cuenta en la base de datos **es** la regla; no hay archivos que mover, y
   el usuario solo decide la promoción (igual que aprueba el plan).

Normalizar «la forma» es el único punto de criterio: empezar simple (una
etiqueta que el generador asigna al lienzo, p. ej. `linea-de-tiempo`,
`radial`) y refinar. Precedente real: los componentes `tarjetas` y `pasos`
nacieron así (eran SVG libre recurrente).

---

## 8. QA visual (cuando hay diseño en juego)

El sistema institucionaliza el bucle generar→renderizar→mirar→corregir:
- `scripts/capturar.py` (referencia) captura cada lámina headless y **detecta
  desbordes** (contenido que excede el escenario 16:9). En el SaaS: una
  función que rinde los HTML en un navegador headless (Puppeteer/Playwright en
  una Cloud Function o servicio aparte) y compara medidas; bloquea la entrega
  si hay desborde.
- Para láminas `lienzo`, la UI **muestra las capturas** y pide confirmación
  visual del usuario antes de marcar la clase `generado`. Un lienzo jamás se
  entrega sin haber sido visto.
- La medición correcta es por **elementos reales**, no por scroll (los
  sangrados decorativos —marca de agua del logo— no son desbordes). Ver la
  versión final de `capturar.py`.

---

## 9. Recursos a adjuntar a Claude Code (junto a este documento)

Pásale la **carpeta completa de la fuente del skill** (la tienes como
`suite_diseno_v5_fuente.zip`, subcarpeta `suite-ensenanza-biblica/`). En
particular son indispensables:

- `SKILL.md` y `VERSION` — flujo y versión vigente.
- `references/contrato-plan.md` — **el esquema del plan (lo más importante)**.
- `references/identidad.md`, `tipos-de-lamina.md`,
  `componentes-exegeticos.md`, `trinquete.md`,
  `genero-exegesis.md`, `genero-doctrina.md`, `genero-consejeria.md`,
  `sincronizacion.md`.
- `scripts/inyectar.py`, `renderizadores.py` — lógica de render a portar.
- `scripts/validar.py` — reglas duras a portar.
- `scripts/crear_marca.py` — validación de marcas (fórmulas de contraste/ΔE).
- `scripts/capturar.py` — QA visual.
- `assets/plantilla_*.html` (×4) — **el runtime congelado, se reutiliza tal cual**.
- `assets/marcas/sebex/` y `assets/marcas/iglesia-1ra-concepcion/` — dos marcas
  reales completas (marca.json + extra.css + fuentes + logos) como semilla y
  como casos de prueba de la migración.
- `assets/ediciones/diseno-divino/` — una edición real.
- `ejemplos/plan_clase4.json` (clase real completa) y
  `ejemplos/plan_demo_*.json` (cubren todos los tipos, variantes, lienzo,
  edición) — **úsalos como casos de prueba**: el SaaS debe poder almacenar,
  validar y renderizar cada uno con resultado idéntico al de referencia.

---

## 10. Criterios de aceptación (cómo sabemos que la migración es fiel)

1. **Paridad de render**: `renderizarArtefactos` sobre `plan_clase4.json` +
   marca `iglesia-1ra-concepcion` produce artefactos funcionalmente idénticos
   a los del sistema de referencia (sync, timer, marcado, hoja).
2. **Paridad de validación**: `validarPlan` acepta todos los `ejemplos/plan_*`
   válidos y rechaza un plan con anclas incompletas, variante inexistente,
   lienzo con color cableado, o `version_contrato` incoherente (probar cada
   caso).
3. **Marca nueva**: subir un logo + tokens crea una marca usable; rechaza
   contraste <4.5:1 y ΔE<18 señalando el token.
4. **Selección desde biblioteca**: un estudio real de la biblioteca produce un
   plan válido tras revisión del usuario, y de ahí los artefactos.
5. **Trinquete**: dos clases con la «misma» forma de lienzo disparan la
   sugerencia de promoción en la UI.
6. **Cero HTML almacenado como fuente**: editar una clase = editar su `plan` y
   re-renderizar; nunca se parchea HTML.

---

## 11. Notas de implementación y advertencias

- **Costo de API**: `generarPlanDesdeEstudio` consume API de Anthropic por
  uso. Dimensionar en el modelo de negocio; cachear el plan (no regenerar si
  el estudio no cambió).
- **Fuentes**: solo tipografía de licencia abierta (van incrustadas en los
  HTML). Catálogo sugerido y reglas en `identidad.md`.
- **Sin `localStorage`/`sessionStorage`** en los artefactos (ya es regla del
  runtime; mantener).
- **Multi-tenant**: aislar `marcas`, `clases`, `planes`, `formas_lienzo` por
  organización; reglas de seguridad de Firestore acordes.
- **No reescribir las plantillas HTML**: son el activo más caro y validado del
  sistema. Trátalas como binarios de texto con marcadores.
- **El contrato es la frontera**: si dudas dónde vive una pieza, pregunta «¿es
  contenido (→ plan) o runtime (→ plantilla)?». Esa distinción es toda la
  arquitectura.
