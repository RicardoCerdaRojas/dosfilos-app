# Banco de pruebas de extracción

Corre todos los motores de extracción sobre **las mismas páginas del mismo
documento** y los puntúa en lo que este corpus necesita de verdad: griego
politónico, hebreo puntuado y números de página que se puedan citar.

## Por qué existe

El tier Premium se vende como *"tablas, multi-columna y escaneados"*, y
producción llama a LlamaParse en modo `fast` —
[`extractPdfWithGemini.ts:46`](../../packages/functions/src/library/extractPdfWithGemini.ts) —
que es justo el modo que **se salta el OCR y la reconstrucción de layout**.

Eso puede estar bien o puede estar costando calidad. La discusión no se cierra
leyendo listas de precios: se cierra midiendo sobre nuestros propios libros.

## Hallazgos medidos (2026-08-29)

Primera evaluación completa, sobre *The Minor Prophets* (McComiskey), páginas
132–142. Todo lo de esta tabla está medido, no estimado.

| Motor | USD / libro 425p | Niqqud | Espíritus griegos | Veredicto |
|---|---:|---:|---|---|
| LlamaParse `fast` ← producción | ~0 | **0** | **0** | no recupera **nada** |
| LlamaParse `balanced` | — | 0.192 | **fabricado** | traduce al griego moderno |
| LlamaParse `premium` | **$23.91** | 0.815 | ✓ | calidad sí, costo no |
| Mistral OCR | **$1.70** | 0.735 | **✗** | pierde el espíritu inicial |
| **Gemini 3.6 Flash** | **$9.98** | **0.825** | ✓ | mejor relación medida |

**`fast` no recupera lengua original cuando no está en la capa de texto.** La
auditoría de la biblioteca dio 15 de 27 libros indexados sin una sola letra
griega ni hebrea — incluida una gramática griega de 711 páginas. Pero los 27
salieron del mismo extractor y 12 sí la traen (uno con 681.644 letras griegas):
la variable es el PDF, no el motor. Eso apunta a escalar a OCR sólo cuando la
capa de texto no trae lo que el libro declara, no a cambiar el motor para todo.

**`balanced` fabrica escritura sagrada.** Devolvió 4.564 letras griegas donde
otros tres motores coincidieron en ~27: transliteró bibliografía inglesa y
alemana («Micah» → «Μιχαίας», «alttestamentlichen» → «αλττεσταντlichen») y
tradujo prosa al griego moderno. Nunca debe entrar a la cascada.

**`premium` no cabe en el cupo.** Medido aislando el modo y leyendo el panel:
495 créditos por 11 páginas = **45 créditos/página**. Un libro de 425 páginas
son 19.125 créditos contra un cupo mensual de 10.000 — el 191%. No es que
salgan pocos libros al mes: no cabe ninguno. Además tarda 5-8 s/página, que
sobre un libro entero desborda el timeout de 540 s de la función de extracción.

**La API de LlamaParse reporta 0 créditos en plan Free**, en `job_credits_usage`
y en `credits_used`, mientras el panel sí acumula. Todo costo de LlamaParse se
mide leyendo el panel antes y después de una corrida `--fresh`.

**La salida de Gemini incluye tokens de pensamiento**, y son más de la mitad:
6.017 de entrada + 13.330 candidatos contra 39.253 totales. Cobrar sólo los
candidatos subestimaba el costo 2,4 veces.

Falta medir: **un escaneado y un léxico**, que son las clases que el tier
Premium promete resolver y las únicas sin probar.

## Setup

```bash
export LLAMAPARSE_API_KEY=...   # Secret Manager: LLAMAPARSE_API_KEY
export GEMINI_API_KEY=...       # Secret Manager: GEMINI_API_KEY
export MISTRAL_API_KEY=...      # console.mistral.ai
```

Las claves que falten hacen que **ese** motor se marque `NO EJECUTADO`; la
corrida sigue. Ninguna clave se imprime ni se escribe en la salida.

Requiere `poppler` (`pdftotext`, `pdfinfo`) — ya instalado en este equipo.

## Uso

```bash
# Un recurso de la biblioteca real, 10 páginas desde la 120
node scripts/extraction-bakeoff/run.mjs \
  --resource a4f8034b-e0d9-4bc0-8d45-a9a321da7657 \
  --pages 120-130 --greek

# Un PDF local, esperando hebreo
node scripts/extraction-bakeoff/run.mjs --file ~/bhs.pdf --pages 1-8 --hebrew

# Sólo algunos motores
node scripts/extraction-bakeoff/run.mjs --file x.pdf --pages 1-5 \
  --engines pdftotext,llamaparse-fast,mistral-ocr

# Buscar un pasaje concreto en la salida de cada motor
node scripts/extraction-bakeoff/run.mjs --file x.pdf --pages 40-50 --greek \
  --probe "ἐν ἀρχῇ" --probe "חֶסֶד"
```

**Recorta siempre.** Pasar 425 páginas por un parser premium para saber si
conserva los espíritus es tirar dinero y esperar una hora. Diez páginas bien
elegidas responden lo mismo en minutos por centavos. Elige las de aparato más
denso.

## El plan de pruebas que importa

Una sola corrida no decide nada. El motor que gana en texto embebido puede
hundirse en un escaneado. Corre una por clase de documento:

| Clase | Qué prueba | Flags |
|---|---|---|
| **Escaneado** | Lo único que el tier Premium promete y `fast` no puede dar | `--greek` si aplica |
| **Aparato crítico** (NA28/BHS) | Griego politónico y cantilación bajo densidad extrema | `--greek --hebrew` |
| **Léxico** (BDAG/HALOT) | Tablas lema↔glosa, multi-columna, alternancia de escritura | `--greek --hebrew` |
| **Comentario** | El caso corriente, para no optimizar sólo lo difícil | `--greek` |

Decide **por clase**. Nada obliga a usar el mismo motor para todo, y la
cascada actual ya está preparada para elegir.

## Qué se mide

### Fidelidad de escritura — la que decide el tier Premium

`greekDiacriticRatio` = marcas combinantes sobre letras griegas, calculado
sobre la forma NFD para que un motor no puntúe distinto por elegir
precompuesto o descompuesto.

- Griego politónico corrido: **0,35 – 0,60**. Verificado: el fixture de prueba
  con Juan 1:1 da 0,431.
- **Cerca de 0 con muchas letras griegas** = el motor reconoció las letras y
  tiró los espíritus y acentos. Ese texto es inservible para exégesis, y un
  word-error-rate **no lo detecta** porque todas las letras siguen ahí.

`niqqudRatio` hace lo mismo para el hebreo (BHS puntuado: 0,6 – 1,0), y la
cantilación se cuenta aparte porque un aparato crítico la necesita.

También: caracteres de reemplazo (`�`) y **marcas diacríticas huérfanas** —
marcas sin letra base, un fallo especialmente feo porque el texto se ve casi
bien, renderiza mal y rompe cualquier búsqueda literal.

### Integridad de páginas — el ancla de la cita

Contrasta contra el conteo real de `pdfinfo`. Una página que el motor nunca
emitió es contenido que **desaparece del índice en silencio**. Un marcador
duplicado o fuera de orden corre el ancla de todo lo que viene después, y una
cita que apunta a la página equivocada es peor que no tener cita: parece
verificable.

### Corrimiento de página

Compara en qué páginas cada motor encontró griego o hebreo contra la
referencia. Detecta numeración corrida — el fallo que produce citas plausibles
apuntando al lugar equivocado.

### Estructura

Encabezados, tablas y filas. Las tablas importan más de lo que parece: una
entrada de léxico y un aparato crítico **son** tablas, y un motor que las
aplana en prosa destruye la alineación lema↔glosa sin perder un carácter.

### Novedad — sonda de alucinación

Fracción del texto que ningún otro motor produjo. **No es un puntaje de
alucinación por sí solo**, y el informe sólo la muestra cuando el PDF trae
texto embebido: en un escaneado el motor honesto es el único con texto y
puntúa 100% novedoso, que es la respuesta correcta.

Donde sirve es en el caso opuesto: todos leyeron el mismo texto embebido y uno
devuelve material que los demás no tienen. Ahí el modelo estuvo "ayudando", y
un OCR que mejora la redacción del autor es inaceptable en este producto.

## Qué produce

```
bakeoff-out/<timestamp>/
├── informe.md        # los números, comparables y diffeables
├── comparar.html     # el mismo pasaje en cada motor, lado a lado  ← acá se decide
├── datos.json        # todo crudo, para graficar o comparar corridas
├── novedad.txt       # muestras del texto que sólo un motor produjo
└── <motor>.md        # salida completa de cada motor
```

**`comparar.html` es el entregable real.** Renderiza en serif grande con
interlineado amplio porque a 13px en monoespaciado la diferencia entre ἁ y ἀ
es invisible, y eso derrota todo el ejercicio.

## Cómo leer el veredicto

`NO APTO` es mecánico y duro: perdió diacríticos, perdió páginas, o emitió
texto mal formado.

**`INSPECCIONAR` no es aprobado.** Significa que pasó los filtros automáticos y
ahora un humano tiene que mirar el griego. Para un producto cuya tesis es la
cita verificable, esa mirada es obligatoria antes de adoptar cualquier motor.
Ningún número reemplaza ver un espíritu áspero en su sitio.

## Limitaciones, dichas de frente

- **El adaptador de Mistral OCR nunca se ejecutó.** Está escrito contra la
  forma documentada de la API pero no había clave disponible al construirlo.
  Si la respuesta no trae `pages`, el adaptador imprime las claves que sí
  vinieron para que ajustar el mapeo tome un minuto. Los otros cinco motores
  sí se corrieron.
- **Las unidades de costo no son comparables entre sí**: LlamaParse cobra
  créditos, Mistral páginas, Gemini tokens. Multiplica por tu tarifa vigente,
  y verifícala hoy — estos precios se mueven.
- **Las páginas del recorte se renumeran desde 1.** Todos los motores reciben
  el archivo idéntico, así que la comparación es justa; el informe dice de qué
  páginas originales salió el recorte.
- **No hay transcripción de referencia.** Ninguna métrica acá pretende ser un
  word-error-rate. Miden propiedades estructurales verificables sin gold
  standard, que es exactamente lo que se puede hacer sin transcribir a mano un
  aparato crítico.

## Tests

```bash
npx vitest run scripts/extraction-bakeoff
```

20 tests sobre las métricas, con griego politónico y hebreo puntuado reales
(Juan 1:1, Génesis 1:1 con y sin cantilación). Verifican lo esencial: que
griego con diacríticos y griego pelado tengan **el mismo conteo de letras** y
ratios distintos — que es justo la diferencia que un benchmark genérico no ve.
