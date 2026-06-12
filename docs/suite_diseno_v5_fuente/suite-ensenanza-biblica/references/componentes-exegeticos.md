# componentes-exegeticos.md — Los cinco componentes del método

El enfoque del docente es hermenéutica histórico-gramatical literal y
predicación expositiva. Estos cinco componentes son el corazón visual del
método: forma fija en el runtime, datos variables en el plan. El validador
los audita estructuralmente ANTES de generar.

## escritura-anotada — la gramática que interpreta

Cuándo: el pasaje contiene verbos/palabras cuyo tiempo, voz, modo o
construcción cambia la interpretación (aoristo vs. presente, voz media,
imperativos). Qué hace: el texto queda íntegro en color de Escritura; cada
palabra destacada recibe subrayado `--acento` y numerador; las notas
gramaticales se listan debajo en interfaz.

Criterios editoriales: 2–4 destacados por lámina (más es ruido); la nota
dice QUÉ es gramaticalmente Y QUÉ implica ("aoristo medio: acción decisiva
del propio creyente"); `palabra` debe aparecer LITERAL en `texto` (el
validador lo exige; cuidar tildes y mayúsculas). En la guía de consejería
impresa es la herramienta ideal de confrontación desde el texto.

## quiasmo — estructura espejada

Cuándo: el pasaje tiene eco invertido real A–B–C–B′–A′ (no forzar quiasmos
donde no los hay: es una afirmación exegética). Invariantes del validador:
niveles en palíndromo y EXACTAMENTE un `centro:true` — el centro es el
punto teológico del quiasmo y se realza. Las líneas citan el texto →
`esc-inline` automático. En la hoja puede imprimirse con etiquetas en
blanco para que el alumno lo complete (clase `q-etq blanco`).

## paralelismo — poesía hebrea

Cuándo: Salmos, Proverbios, literatura sapiencial. Declarar la `clase`:
`sinonimo` (B reafirma A), `antitetico` (B contrasta con A; el conector se
pinta `--alerta`), `sintetico` (B desarrolla A). `relacion` es el conector
visible entre líneas ("pero", "y", "‖").

## flujo — el argumento del pasaje

Cuándo: pasajes argumentativos (epístolas) donde los conectores griegos
llevan el peso lógico. Cada nodo: `rol` (principal/fundamento/proposito/
resultado/contraste), `ref` del versículo, `conecta` (id del nodo padre;
`null` = raíz) y `conector` con el conector visible — INCLUIR el griego:
"porque (γάρ)", "para que (ἵνα)", "por tanto (οὖν)", "si en verdad (εἴγε)".
La sangría visual se calcula sola de la cadena de conexiones. El validador
rechaza nodos huérfanos y flujos sin raíz.

## termino — estudio de palabra

Cuándo: una palabra del pasaje merece estudio léxico. Campos: `lema` (en
caracteres originales; `idioma:"hebreo"` activa RTL), `translit`,
`morfologia` (incluir etimología si ilumina: "de νοῦς + τίθημι"), `glosa`
(definición operativa), `rango` (matices con referencia breve), `usos`
(2–3 pasajes con el matiz de cada uso). Regla de la Escritura: el lema es
`lexico` (NO color de Escritura); si un `matiz` cita palabras del
versículo, esa cita va en `esc-inline`.

## Reutilización en documentos claros

Los cinco componentes existen también en variante clara (hoja y guía de
sesión) con `--escritura-tinta`. Para usarlos en `cuerpo_hoja_html` o
`cuerpo_guia_html`, escribir el mismo marcado que produce el renderizador
(ver un artefacto generado o `ejemplos/plan_demo_sesion.json`, que incrusta
`ea-nota` y `dv` en la guía).
