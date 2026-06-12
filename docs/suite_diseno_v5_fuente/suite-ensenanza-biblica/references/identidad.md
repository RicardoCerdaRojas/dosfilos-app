# identidad.md — Identidad gráfica y Regla de la Escritura

## Tokens (definidos por la marca activa, nombrados por FUNCIÓN)

| Token | Función | Valor por defecto |
|---|---|---|
| `--oscuro` | fondo de proyección | `#000A16` |
| `--panel` | paneles/cajas sobre oscuro | `#001F34` |
| `--medio` | bordes, texto secundario, estructura | `#34586E` |
| `--acento` | acento de marca: títulos, realces NO bíblicos | `#00B8B0` |
| `--claro1` / `--claro2` | texto sobre oscuro | `#CCE0E7` / `#D6EAF1` |
| `--escritura` | **color de la Escritura sobre oscuro** (semántico) | `#C9A227` |
| `--escritura-tinta` | **color de la Escritura sobre claro** (≥4.5:1) | `#8C6E14` |
| `--alerta` | semántico de error/confrontación + 4º color del marcador | `#FF5A36` |
| `--fuente` | pila tipográfica | Inter/system |

El inyector aplica los tokens de la marca SOLO al `:root`; los valores de
`body.alto-contraste` son runtime fijo y no se tocan. Documentos claros:
texto `#1a2b35` sobre blanco/`#f7fafb`.

## Regla de la Escritura

**Principio único:** el color de la Escritura marca las palabras mismas de
la Escritura citadas textualmente — nada más, y nada menos. La cursiva lo
acompaña SIEMPRE (canal redundante: impresión B/N y daltonismo).

| Clase | Categoría | Tratamiento |
|---|---|---|
| `esc` / `esc-inline` | cita textual (español u original corrido) | cursiva en `--escritura` (oscuro) / `--escritura-tinta` (claro); sin excepción por tamaño |
| `esc-realce` | palabra destacada DENTRO de una cita | sigue en color de Escritura; realce = subrayado `--acento`, nunca cambio de color |
| `esc-num` | números de versículo dentro de la cita | atenuados `--medio`, tamaño menor |
| `ref` | referencia bíblica (1 Ti 3:8) | interfaz, nunca color de Escritura |
| `lexico` | lema aislado (griego/hebreo/latín), translit., morfología | `--acento`/`--medio`; hebreo con `dir="rtl"` |
| `parafrasis` | alusión no textual | texto normal |
| `cita-humana` | comentaristas, confesiones, credos, padres | cita neutra con `<span class="atrib">`; JAMÁS color de Escritura, aunque sea ortodoxa |
| `error` | la postura errada nombrada | `--alerta` |

Casos límite: en la tarjeta `termino` el lema es `lexico` pero la frase del
versículo citada en un `matiz` es `esc-inline`. Una confesión que cita la
Escritura internamente: solo esa porción interna puede ser `esc-inline`.
Distinguir SIEMPRE lo que el texto *dice* (cita → color de Escritura) de lo
que el texto *enseña* (paráfrasis → normal).

## Tipografía (diseño v2: "una página impresa, proyectada")

Dos voces tipográficas por marca:
- `--fuente` (sans de sistema): TODO lo humano — cuerpo, listas, notas,
  interfaz, kickers.
- `--fuente-titulos` (serif display de la marca, incrustada @font-face):
  titulares h1/h2, y **la voz de la Escritura** — la firma del sistema:
  la Escritura es lo ÚNICO compuesto en la serif display itálica
  (color + cursiva + voz tipográfica propia). La síntesis doctrinal usa la
  serif en redonda (solemne, pero voz humana); jamás itálica+color de
  Escritura para texto no bíblico.
Marcas actuales: La Iglesia → Cormorant Garamond · SEBEX → Playfair Display.
El perfil declara `fuente_titulos`, `fuentes[]` (woff2 incrustables) e
`icono` (marca de agua de portada al 5%).

## Tipografía mínima de proyección

Texto bíblico ≥29px · cuerpo ≥28px · títulos ≥40px · texto dentro de
SVG de esquemas ≥20px (el escalado A−/A+ no afecta los SVG).

## Alto contraste

`body.alto-contraste` (tecla `C`) anula la paleta hacia negro puro/blanco/
acento y escritura intensificados. Cualquier estilo nuevo DEBE usar
`var()` para heredar este modo. Probar toda lámina-esquema en ambos modos.

## Logo y pies

Logo recortado con fondo transparente, incrustado base64 (lo hace el
inyector desde `marcas/<clave>/logo.png`). Sobre documentos claros va en
banda oscura de encabezado. Pie: `Serie: <serie del plan>` en proyección;
footer largo de la marca en documentos.

## Iconos

Nunca emojis (el validador lo audita). Solo SVG inline de trazo
(`stroke:currentColor`) con `aria-label`/`title` en botones de solo icono.

## Regla de oro del trabajo de marca (aprendida 11-jun-2026)

**Toda creación o evolución de marca empieza analizando las formas del
logotipo** — antes de proponer paleta o tipografía. El logo es el ancla
tipográfica del sistema: identificar su clasificación (inscripcional,
grotesca, humanista, etc.) y elegir familias de licencia abierta que la
hereden o la complementen CON intención declarada; nunca elegir tipografía
por mérito propio sin haberla confrontado con el wordmark. Las fuentes de
peso único (p. ej. Marcellus) deben blindarse en extra.css contra el bold
sintético del navegador. Las serifas de Escritura se eligen con trazo
firme (≥600 itálica real): proyectores modestos y Zoom castigan primero
los trazos finos, y la Palabra es lo único que no puede perder presencia.
