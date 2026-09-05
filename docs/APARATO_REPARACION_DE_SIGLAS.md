# Reparación de siglas del aparato crítico — requerimiento

**Estado:** requerimiento aprobado, sin implementar.
**Base de evidencia:** mediciones del 2026-09-05 sobre el NA28 born-digital de
la biblioteca del fundador (1.006 páginas) y sobre Metzger, ya indexado.
**Alcance:** uso personal del propietario de la biblioteca y demostración a la
editorial. **NO** es un recurso del core y no se redistribuye.

Todo número de este documento está medido. Donde algo es estimación, lo dice.

---

## 1 · El problema

El PDF del NA28 tiene capa de texto sana —290 fuentes embebidas con mapa
Unicode, ratio de diacríticos 0,198— y el griego del cuerpo sale entero. El
aparato también baja como texto, con sus lecturas, familias y versiones.

**Dos siglas no sobreviven la conversión a caracteres.** Medido sobre 120
páginas (333.198 caracteres de aparato):

| Sigla | Qué es | Apariciones | Qué sale en su lugar |
|---|---|---:|---|
| `ℵ` | Códice Sinaítico | **0** | `a` — 934 veces |
| `𝔓` | Papiro | **0** | `P` + número (`P45`, `P75`) |

**Por qué importa.** En el aparato del NA28 una `a` minúscula ya significa otra
cosa: un manuscrito latino antiguo (Vercellensis, siglo IV). El mismo carácter
nombra ahora a dos testigos distintos y desde el texto no se puede saber cuál.
Una afirmación que diga «lo respalda la tradición latina» donde el aparato dice
Sinaítico **invierte el peso de la evidencia**.

Con los papiros el daño es menor: `P` a secas es el Códice Porphyrianus (025),
pero el número desambigua — `P75` se lee como 𝔓⁷⁵ sin esfuerzo.

## 2 · Por qué es recuperable

**El glifo se dibuja bien.** La fuente está embebida y la página renderiza `ℵ`
correctamente: lo roto es el mapa a Unicode, no el dibujo. La información está
en el archivo, mal etiquetada.

Eso permite algo más quirúrgico que re-OCR-ear el libro: extraer el texto **con
coordenadas** (`pdftotext -bbox`), y sobre cada `a` ambigua del aparato recortar
ese rectángulo y clasificar el glifo. Se resuelven sólo los casos dudosos.

## 3 · La regla que no se negocia

> **Resolver sólo cuando haya certeza. La duda se marca como duda. Nunca
> adivinar.**

Una sigla mal resuelta convierte al Sinaítico en un latino del siglo IV, y el
error es **indetectable al leer**: una lista de testigos equivocada tiene la
misma forma que una correcta. Es el mismo fallo contra el que ya advierte
`docs/EXTRACCION_ESCALADA_OCR_DESIGN.md` sobre reconstruir codificaciones —
plausible y equivocado, fatal al citar.

Que sea para uso personal no lo atenúa: un álef mal resuelto en un trabajo de
seminario sigue siendo una afirmación falsa que firma el estudiante.

## 4 · Cómo se mide el acierto

**Metzger es la vara.** `A Textual Commentary on the Greek New Testament` ya
está indexado, con griego intacto, y nombra los testigos **en prosa**: «several
Western witnesses (D and, with minor variations, it syr) add…». No hay siglas
que decodificar.

Procedimiento de aceptación:

1. Tomar **100 lugares** donde Metzger nombra explícitamente los testigos de una
   variante.
2. Correr el reparador sobre esas mismas páginas del NA28.
3. Comparar sigla por sigla y reportar tres números: **aciertos**, **errores** y
   **abstenciones** (casos marcados como dudosos).

**Criterio de aceptación:** cero errores. Las abstenciones son aceptables —
salen como duda visible—; un error silencioso, no. Si el reparador no llega a
cero errores en la muestra, no se usa.

## 5 · Alcance y límites

**Dentro:**
- Resolver `a` → `ℵ` cuando el glifo lo confirma.
- Normalizar `P<número>` → `𝔓<número>` cuando el número lo desambigua.
- Emitir un reporte por libro: resueltas, abstenidas, y en qué páginas.

**Fuera, explícitamente:**
- Redistribuir el resultado. El recurso queda con
  `license: 'All rights reserved / permission required'` e
  `ingestionStatus: 'approved_metadata_only'`, ya aplicados en producción.
  No entra a `coreStores` ni a `isSystemSource`.
- Reconstruir por reglas de posición en la lista de testigos —«los mayúsculos
  griegos van primero, las versiones latinas después de `it`/`lat`»—. Acierta
  la mayoría de las veces y falla en silencio el resto, que es justamente lo
  prohibido por §3. La decisión se toma mirando el glifo o no se toma.

## 6 · Qué NO resuelve este trabajo

Aunque salga perfecto, **el aparato del NA28 sigue sin poder citarse en un
producto que se distribuye**. Este requerimiento sirve para dos cosas y ninguna
más: el ejercicio personal del propietario, y una demostración a la editorial.

Para tener aparato crítico en el core hace falta una fuente libre. Candidato a
evaluar: **Tischendorf, octava edición mayor** (1869-72, dominio público,
exhaustivo en testigos, existen ediciones digitales). No refleja los papiros
del siglo XX, y por eso es un punto de partida, no un reemplazo.

Y descartado explícitamente: **partir de Tischendorf y «agregar los manuscritos
que faltan»**. Eso es cotejar papiros descubiertos después de 1872 contra el
texto — el trabajo al que el INTF de Münster dedica décadas con la ECM. Si los
datos salieran del NA28 sería copiar el aparato con pasos intermedios; si
salieran de transcripciones abiertas, seguiría siendo un proyecto de
investigación y no un módulo. Y sería *nuestro* aparato, con nuestro nombre,
citado por un pastor: si está mal, el error es nuestro y lo firma él.

## 7 · Relación con lo ya desplegado

`findUnsupportedWitnessClaims` (PR #550) marca las afirmaciones sobre evidencia
manuscrita que ninguna cita respalda. Es la red que hace tolerable trabajar con
un aparato parcial: donde el corpus calla, el trabajo lo dice antes de
entregarse.

Ese es además el argumento para la editorial: no «digitalizamos su aparato»,
sino **«su aparato dentro de una herramienta que impide citarlo mal»**.
