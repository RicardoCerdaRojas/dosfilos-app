# contrato-plan.md — Especificación del plan de clase (contrato v1.4 · diseño v5 · jun-2026)

> `version_contrato`: `"1.1"` para planes con `tarjetas`/`pasos`/`secuencia`;
> `"1.2"` si además usan `variante`; `"1.3"` si usan `lienzo`;
> `"1.4"` si declaran `edicion`.
> Los planes `"1"` siguen válidos (aditivo).
> La versión vigente de diseño y contrato vive en el archivo `VERSION` de la raíz.

El **plan de clase** es la interfaz estable entre el trabajo editorial
(Claude + docente) y el runtime congelado. Es un JSON plano, revisable por
el docente y versionable en git. `inyectar.py` lo consume; `validar.py` lo
audita antes y después de generar.

## 1. Cabecera

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | string | `[a-z0-9_-]+`, único por clase ⇒ canal `laiglesia_<id>` único |
| `titulo` | string | título de la clase |
| `serie` | string | nombre de la serie (pie de página por defecto) |
| `genero` | enum | `exegesis` \| `doctrina` \| `consejeria` |
| `modalidad` | enum | solo consejería: `clase` \| `sesion` |
| `marca` | string | clave de carpeta en `marcas/` |
| `artefactos` | array | subconjunto de `presentacion`, `notas`, `hoja`, `guia_sesion` |
| `textos` | objeto | títulos/meta/footers por artefacto; **todos opcionales** (se derivan de `titulo`) |

Invariante: `modalidad: sesion` ⇒ sin `presentacion` ni `notas`, con `guia_sesion`.

## 2. Bloques

```jsonc
"bloques": [ {"nombre":"Bloque 3 · Exégesis", "diapo_ini":7, "diapo_fin":12, "min":15} ]
```
- Numeración de diapositivas **1-based**.
- La unión de rangos debe cubrir `1..N` sin huecos ni solapes.
- `min` alimenta el temporizador de la consola.

## 3. Diapositivas

Toda diapositiva: `n` (correlativo 1..N), `tipo`, opcional `kicker`,
opcional `rotulo` (comentario en el HTML), opcional `html` (**vía de
escape**: si está presente se inserta tal cual y el resto se ignora — es
también el mecanismo de fidelidad para clases legadas como la Clase 4).

### Tipos y campos

**portada** — `titulo` (admite `<br>`), `destacado`, `meta`.
**lista** — `titulo`, `items[]` (máx. 4; HTML inline permitido), `cierre?`.
**escritura** — `ref` (obligatoria), `texto`, `version?`, `centro?`, `parte?`.
**escritura-anotada** — `ref` (obligatoria), `texto`,
  `destacados[] = {palabra, nota}`; cada `palabra` debe existir en `texto`.
  La palabra queda en color de Escritura con realce subrayado `--acento` y
  numerador; las notas se listan debajo (interfaz, no Escritura).
**quiasmo** — `ref?`, `titulo?`, `lineas[] = {etq, nivel, texto, centro?}`.
  Invariantes: secuencia de `nivel` espejada (palíndromo) y **exactamente
  un** `centro`.
**paralelismo** — `clase` ∈ {`sinonimo`,`antitetico`,`sintetico`},
  `pares[] = {a, b, relacion?}`, `ref?`, `titulo?`.
**flujo** — `proposicion?`, `nodos[] = {id, rol, ref?, texto, conecta,
  conector?}` con `rol` ∈ {`principal`,`fundamento`,`proposito`,
  `resultado`,`contraste`}. Invariantes: toda conexión apunta a un id
  existente; al menos una raíz (`conecta: null`). La profundidad visual se
  calcula de la cadena de conexiones.
**termino** — `lema`, `translit?`, `idioma?` (`hebreo` ⇒ `dir="rtl"`),
  `morfologia?`, `glosa`, `rango[]?`, `usos[] = {ref, matiz}?`.
  El lema es `lexico` (interfaz); las frases citadas dentro de `usos`
  pueden marcarse `esc-inline` en el matiz.
**esquema** — `svg` (clases `esq-*` con `var()`), `alt` (obligatoria),
  `titulo?`. Solo para estructuras no cubiertas por los componentes.
**confrontacion** — `error` (texto de la postura errada),
  `respuestas[]?` o `respuesta?`.
**sintesis** — `texto`, `nota?`. Por regla editorial va DESPUÉS del
  trabajo con el texto.
**transicion** — `texto`, `texto_escritura?`, `ref?`.
**tarjetas** — `titulo?`, `intro?`, `tarjetas[]` (2–4) =
  `{titulo, filas[]?, realce?, nota?}`. Cada fila es texto o
  `{etq, texto}`. `realce` es síntesis interpretativa: se pinta con
  `--acento`, JAMÁS con el color de Escritura (Regla de la Escritura);
  citas textuales dentro de filas van en `esc-inline`. Para comparativas
  paralelas (oficios, posturas, atributos) — antes hechas en SVG.
**pasos** — `titulo?`, `intro?`, `pasos[]` (2–5) = `{titulo, sub?,
  realce?}`, `cierre?`. Progresión horizontal con conectores
  (convergencia de pasajes, AT→NT, cadena histórica corta).

### Campo de cabecera `edicion` (capa de serie, contrato 1.4)

`"edicion": "<clave>"` aplica la capa fina de diseño registrada en
`assets/ediciones/<clave>/edicion.css` a todos los artefactos de la
clase, DESPUÉS del extra de marca en la cascada. Una edición pertenece
a UNA serie: gesto distintivo validado una vez, vigente en todas sus
clases — el sistema evoluciona entre series, nunca dentro de una.
Constitución exigida por validar.py: ámbito `.diapo`, colores solo por
token/currentColor, sin vw/vh/fixed/scroll, tamaños ≥13px. Catálogo y
estado en `assets/ediciones/registro.md`. Crear una edición es una
sesión de diseño: QA visual obligatorio antes de adoptarla.

### Tipo `lienzo` (diseño libre con constitución, contrato 1.3)

`{tipo:"lienzo", titulo?, kicker?, html, css?, alt}` — la válvula
creativa para lo que ningún componente cubre (líneas de tiempo
complejas, mapas, diagramas radiales). Libertad ACOTADA, exigida por
validar.py: todo selector del `css` comienza en `.lz` (el runtime lo
encapsula por lámina); colores SOLO `var(--token)` — jamás hex/rgb;
`font-size` ≥ 18px; sin `<script>`, sin `vw`/`vh`, sin
`position:fixed`, sin `overflow:auto|scroll`; `alt` obligatorio.
La Regla de la Escritura aplica dentro del lienzo (clases `esc*`
disponibles). **QA visual OBLIGATORIO**: tras generar, ejecutar
`scripts/capturar.py` (detecta desbordes), MIRAR las capturas de cada
lienzo y corregir el plan hasta que estén limpias — un lienzo jamás se
entrega sin haber sido visto. Si un lienzo se vuelve recurrente entre
clases, se promueve a componente — registro y regla en
`references/trinquete.md`. El `esquema`
(SVG libre) queda como legado: para diseño libre nuevo, preferir
`lienzo`.

### Campo transversal `variante` (composición alternativa, contrato 1.2)

Cualquier diapositiva puede declarar `"variante": "…"` para elegir una
composición alternativa validada del mismo tipo. Variantes disponibles:
`portada: margen` (arquitectura editorial a la izquierda) ·
`lista: numerada` (numerales grandes, solo si el orden es real) ·
`lista: dos-columnas` (4–6 ítems breves) · `escritura: plena` (centrada
ceremonial — el texto ancla) · `escritura: banda` (cita compacta como
evidencia dentro del argumento) · `sintesis: plena` (declaración sin
caja, a escenario completo) · `tarjetas: horizontal` (filas, para 2–3
tarjetas de texto largo). Sin `variante`, cada tipo usa su composición
por defecto. El criterio de selección y ritmo vive en
`tipos-de-lamina.md` («Variantes y ritmo»).

### Campo transversal `secuencia` (storytelling por partes)

Cualquier diapositiva puede llevar
`"secuencia": {"etapas": ["…","…","…"], "actual": k}` (1-based, 2–6
etapas). Renderiza un riel de progreso bajo el kicker que marca en qué
parte de una idea mayor está la lámina. Es la forma canónica de contar
una "infografía" extensa SIN sobrecargar una lámina ni romper el
escenario 16:9: se parte la idea en láminas hermanas y el riel da la
continuidad. Las etapas deben ser idénticas en todas las láminas de la
misma secuencia. El scroll vertical dentro de una lámina proyectada está
prohibido (rompe el canvas de marcado y la sincronización); la infografía
vertical pertenece a la hoja del alumno, que es un documento impreso.

## 4. Notas (consola) y notas-resumen

```jsonc
"notas_resumen": [ {"diapo":1, "rotulo":"Portada · D1", "texto":"…"} ]  // 1:1 con diapositivas
"cuerpo_notas_html": "…"   // documento editorial con anclas data-slide="N"
```
- `notas_resumen` debe cubrir **todas** las diapositivas (alimenta el modo
  presentador y el panel de la consola).
- Las anclas `data-slide` del cuerpo deben cubrir `2..N` (la portada es el
  estado inicial del scroll). Incluidas las partes 2/2 de lecturas.

## 5. Hoja

```jsonc
"cuerpo_hoja_html": "…"
```
- `tipo: espacios` (exégesis/doctrina): `<span class="blanco [corto]">`
  para términos, requisitos y frases clave. **Jamás dentro de `h1–h3`**
  (el término va en línea propia del cuerpo). El texto ancla completo
  SIEMPRE impreso. Ejercicios de marcado permitidos.
- `tipo: aplicacion` (consejería): clases disponibles `dv` (dos columnas
  despojarse/vestirse), `tareas` (casillas), `memorizar` (versículo
  destacado), `lineas`/`linea` (escritura manuscrita 32px).

## 6. Guía de sesión (consejería 1-a-1)

```jsonc
"cuerpo_guia_html": "…"
```
Documento claro sin sincronización. Estructura nouthética sugerida:
repaso de tareas → recolección de datos → esperanza bíblica →
confrontación desde el texto → plan despojarse/vestirse → tareas.
**Confidencialidad:** sin nombres reales (usar códigos de caso); el flujo
del skill anonimiza y advierte.

## 7. Regla de la Escritura (clases disponibles en todos los artefactos)

`esc` / `esc-inline` (cita textual: color de Escritura + cursiva) ·
`esc-realce` (palabra destacada dentro de cita) · `esc-num` (números de
versículo) · `ref` (referencias) · `lexico` (lemas/morfología) ·
`parafrasis` · `cita-humana` (+ `<span class="atrib">`) · `error`.
El color concreto lo definen los tokens `--escritura`/`--escritura-tinta`
de la marca activa (dorado por defecto); la cursiva siempre acompaña.

## 8. Qué valida `validar.py`

**Plan:** id/género/modalidad/artefactos; numeración 1..N; bloques cubren
1..N; tipos conocidos; `ref` en Escritura; listas ≤4; quiasmo espejado con
centro único; flujo sin huérfanos y con raíz; palabras destacadas
presentes; `notas_resumen` completo; anclas 2..N; blancos fuera de
títulos; coherencia consejería-sesión.

**Artefactos:** `node --check` de cada script; canal `laiglesia_<id>`
único; canvas de marcado visible; cero emojis; `cita-humana` sin color de
Escritura; conteos estructurales (N secciones en presentación, 2N en
consola, anclas completas).

### Validaciones añadidas en v4
- `tarjetas`: 2–4 columnas. `pasos`: 2–5 pasos.
- `secuencia`: ≥2 etapas y `actual` dentro de rango.

## 9. Deltas intencionales respecto del original Clase 4

1. Tokens por función: `--acento`, `--escritura`, `--escritura-tinta`.
2. Emoji 🖨 → icono SVG de trazo (§7.1).
3. Términos griegos de la hoja movidos de los títulos al cuerpo (§7.5).
4. Bloque CSS `@@COMPONENTES-FASE2@@` agregado al runtime (componentes
   exegéticos + taxonomía de la Regla de la Escritura + consejería).
5. Logo de La Iglesia actualizado al lockup horizontal oficial (alta
   resolución, fondo removido, optimizado a ~10 KB).
6. Diseño v2 (evolucionado a v4 el 11-jun) del runtime: serif display por marca incrustada (@font-face),
   la Escritura en serif itálica (firma tipográfica), marcadores de filete,
   marcos editoriales de doble filete, resplandor radial de fondo y marca
   de agua del icono institucional en la portada.
