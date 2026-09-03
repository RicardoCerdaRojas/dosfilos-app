# Verificación de citas: del texto al documento original

**Estado:** propuesta · **Fecha:** 2026-09-03

## Por qué

El 2026-09-02 un paper real de Santiago 1:1-5 atribuyó a Kittel, con página
tomada de la receta de extracción, una posición **contraria** a la que su
página sostiene. La cita pasó todas las guardias automáticas. La descubrió el
fundador **yendo al libro y leyendo la página 149**.

De ahí salió el PR #531, que cerró ocho fallos encadenados y hoy impide que se
cite una fuente sin texto, que una página sea `0`, o que una cita textual no
esté en el material que el modelo recibió.

Pero ninguna de esas guardias produce lo que produjo el fundador esa tarde:
**confianza**. Y su ausencia tiene un coste concreto, dicho por él:

> *"dado lo que nos pasó, yo quedé desconfiado de la veracidad de las citas, y
> los usuarios y profesores también querrán validar de manera rápida para darle
> o no credibilidad al texto."*

Hoy comprobar una cita cuesta: ir a la biblioteca, buscar el libro, abrirlo,
buscar la página, buscar la frase. Cinco pasos y un cambio de contexto. Nadie
lo hace por costumbre, y por eso una cita invertida sobrevivió meses.

**Lo que se propone es convertir ese hábito en un botón.**

## Lo que ya está construido

Buena parte del trabajo difícil está hecho, en su mayoría por otras razones.

### `PdfPageViewer`

`packages/web/src/components/exegesis/setup/page-picker/PdfPageViewer.tsx`

pdf.js con WASM para JPEG 2000 y JBIG2, `cmaps` y `standard_fonts`. No es
accesorio: la mitad de la biblioteca son comentarios escaneados que guardan
cada página como imagen, y sin esos recursos el visor abre el documento,
dibuja la página y no pinta nada. Recibe `url`, `sheet`, `selected`.

### `PageIndexEntry`

`packages/domain/src/exegesis/outline/documentPageIndex.ts`

Por hoja física: `chunkIndices`, `section`, `firstLine`, `charCount`. Se arma
en el servidor con una consulta plana sobre los fragmentos ya indexados —sin
embeddings, sin texto completo, sin tocar el PDF.

### `useDocumentPdfUrl`

`packages/web/src/hooks/exegesis/useDocumentPageIndex.ts`

URL firmada del PDF de un recurso, cacheada 20 minutos. Ya la consume el
selector de páginas, así que el camino completo —autorización, firma,
carga— está probado en producción.

### `printedPageOffset`

`packages/domain/src/exegesis/outline/printedPageOffset.ts`

La pieza que hace viable todo esto. El proyecto ya midió que **la hoja del PDF
no es la página impresa**:

> *"Medido en `Obadiah, Jonah and Micah`: de 186 muestras comparadas, NINGUNA
> coincide, y el desfase es constante en −2 (la hoja 77 lleva impreso el 75)."*

Y ya anticipó este caso de uso:

> *"El visor de PDF navega por hoja física. Mostrar los dos números —«hoja 77 ·
> impresa 75»— es lo único que deja al usuario cruzar entre lo que ve en
> pantalla y lo que dice el libro."*

Su detección es deliberadamente conservadora: ante duda devuelve `null`, porque
*"un desfase inventado es peor que ninguno — mandaría al usuario a la página
equivocada con la confianza de un dato verificado"*. Ese criterio gobierna toda
esta propuesta.

### `verbatimQuote`

Desde el PR #531, toda atribución a un comentarista lleva la oración textual
que la respalda, verificada contra el material que el modelo recibió. **Sin ese
campo esta propuesta no tendría qué resaltar.**

## Nivel 1 — de la cita al documento

Un clic sobre `(Adamson, 60)` abre el visor en esa página, con la frase
resaltada.

Falta menos de lo que parecía. Una revisión del código antes de planificar
encontró que **la URL firmada ya existe** (`useDocumentPdfUrl`, con su callable
detrás) y que `printedPageFor(sheet, offset)` ya está cableado en todo el
selector de páginas. Queda:

1. **La inversa de `printedPageFor`.** Las citas hablan en páginas impresas
   («Adamson, 60»); el visor navega por hoja física. Es una resta, pero sin
   ella el lector cae dos páginas más allá — y una herramienta de verificación
   que manda a la página equivocada es peor que no tenerla.
2. **Resolver `sourceKey` → recurso de biblioteca.** La cita nombra «Adamson»;
   el visor necesita el `sourceLibraryResourceId`. Está en `paper.sources`.
3. **Resaltar la frase.** La única pieza genuinamente nueva. pdf.js expone la
   capa de texto; la búsqueda debe usar el mismo normalizador de
   `verifyAttributedQuotes`, que ya sabe de guiones de partición del PDF,
   rótulos entre fragmentos y costuras.
4. **El punto de entrada.** Hacer clic en una cita del análisis o del
   documento compuesto.

### Cuando no se puede resaltar

Va a pasar. El OCR de la biblioteca a veces es ilegible —una página real de
Mayor llega como `τ πνμ μν υ › s ωσ`— y contra eso no hay coincidencia exacta
posible.

**La respuesta correcta es llevar a la página y decir que no se pudo localizar
la frase.** No aproximar, no resaltar el párrafo más parecido. Es la misma
lección que dejaron los cuatro falsos positivos del verificador durante la
sesión del 2026-09-02: cuando una guardia se equivoca, lo que decide su valor
es cuánto cuesta su error.

Casos y respuesta esperada:

| situación | qué hace el visor |
|---|---|
| Hay `verbatim` y coincide | abre la página y resalta |
| Hay `verbatim`, no coincide (OCR) | abre la página, avisa que no la localizó |
| No hay `verbatim` (cita de rango léxico) | abre la página, muestra las glosas registradas |
| No hay desfase medido | abre por hoja física, rotula «hoja N» sin inventar impresa |

## Nivel 2 — visor experto sobre el corpus

El mismo visor, abierto desde el corpus del trabajo en vez de desde una cita,
con navegación y búsqueda.

Encima del nivel 1 añade:

- Navegación por hojas con `PageIndexEntry` (sección y primer renglón ya están)
- Búsqueda dentro del documento
- **Qué hojas alimentaron cada paso** — dato que ya existe en
  `excerptRecipe.sheetRanges` y en los fragmentos que devuelve el recuperador

Ese último punto es el más valioso y el que no da ninguna otra herramienta:
deja ver **qué leyó el sistema y qué no**, que es exactamente la pregunta detrás
de la cita invertida de Kittel.

## Orden propuesto

**Nivel 1 primero, y dentro de él el caso de la cita con `verbatim`.** Es donde
la desconfianza tiene remedio inmediato y donde el trabajo del PR #531 rinde.

El nivel 2 es más grande y su valor depende del 1: si abrir una cita funciona,
el visor del corpus es la misma pieza con más herramientas alrededor.

## Riesgos

- **El resaltado va a fallar en documentos escaneados.** Aceptado y previsto
  arriba; el fallo debe ser visible, no silencioso.
- **El desfase de página impresa puede no detectarse.** `printedPageOffset`
  devuelve `null` y la interfaz rotula sólo la hoja.
- **PDFs grandes en el navegador.** El visor ya se usa en el selector de
  páginas, así que el riesgo está acotado por precedente, no por suposición.
- **`SourcePagesWorkspace` es casi el visor del nivel 2.** Índice, hoja y
  carrito en tres paneles. Conviene extraer lo común antes de duplicarlo, no
  después.

## Lo que esta propuesta NO resuelve

- `SourceCitation` (rangos léxicos, `loadingSources`) sigue sin campo de cita
  textual. Ahí el visor lleva a la página, no a una frase.
- El compositor sigue sin cubrir crítica textual de forma sistemática.

## Relacionado

- PR #531 — las ocho guardias que hacen posible tener qué resaltar
- `docs/SESION_PRUEBAS_2026-09-02.md` — el barrido donde nació el problema
- `docs/exegesis/CAMINO_GUIADO_DESIGN.md`
