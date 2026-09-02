# Sesión de pruebas de punta a punta — 2026-09-02

**Alcance:** el camino completo, de subir un libro a entregar el análisis, contra
un trabajo práctico real de seminario sobre Santiago 1:1-5.
**Entorno:** producción.
**Resultado:** 12 hallazgos. 3 corregidos durante la sesión, 9 pendientes.

Cada cifra de este documento está medida contra el código, los registros de
Cloud Run o los documentos de Firestore. Donde algo es estimación, lo dice.
Los doce están además registrados en la memoria del proyecto (byblos).

---

## Resumen

| Severidad | Cantidad | Qué caracteriza al grupo |
|---|---:|---|
| Bloqueante | 3 | El usuario queda sin salida desde la interfaz |
| Alta | 4 | Daño silencioso que llega al entregable o al saldo |
| Media | 5 | Degrada calidad o confianza sin romper el flujo |
| Corregido | 3 | Cerrado durante la sesión |

**La conclusión que se repite en nueve de los doce:** el sistema afirma que algo
pasó y nadie lo comprueba. Una tarjeta dice "Listo" sin chunks, "Indexando" sin
indexador, "Extrayendo" sobre un proceso muerto. Un grant informa éxito sobre un
saldo que se evapora. Un verificador reporta verde porque no supo leer el
formato. Un compositor publica cuatro secciones de dieciocho sin declarar que
descartó catorce.

El proyecto ya aprendió esta lección dos veces —"la tarjeta ya no se pone Listo
con cero chunks", "un fallo de indexación deja de ser invisible y sin salida"— y
las dos veces la aplicó a un punto concreto. Lo que queda es la generalización:
**cada afirmación de estado necesita su comprobación, y la ausencia de señal
nunca debe leerse como buena noticia.**

---

## 1 · Carga y extracción

### 1.1 · El presupuesto de espera de LlamaParse no cabe en el timeout · BLOQUEANTE

`extractPdfWithGemini` tiene tope de **540 s** —límite duro de la plataforma para
triggers de Storage— y adentro espera hasta **600 s por cuenta**, con dos cuentas
en serie. El comentario del código afirma lo contrario:

```ts
const maxSeconds = options.maxPollSeconds ?? 600;  // 10 min default — fits in storage trigger 540s budget
```

No cabe: 600 > 540 ya con una sola cuenta.

Medido dos veces con el mismo archivo (Adamson, 240 págs):

```
LlamaParse cuenta-1 → PENDING 492 s → failed: unknown
LlamaParse cuenta-2 → PENDING 497 s → failed: unknown
cae al fallback de Gemini con 0 s restantes → 1 de 5 chunks
Cloud Run: status 200 · latencia 540.001560289 s
```

El fallback de Gemini está bien escrito y es **inalcanzable por construcción** en
el único escenario que justifica tenerlo.

**Corrección.** El presupuesto por cuenta se calcula contra el tiempo *remanente*
de la invocación, no como constante ciega. Con dos cuentas y 540 s de tope, ~200 s
cada una deja aire para el fallback.

### 1.2 · La extracción nunca marca `failed` · BLOQUEANTE

Cuando la función muere en su timeout, Cloud Run la mata y nadie escribe el
estado. El recurso queda en `processing` con el `updatedAt` del arranque,
indefinidamente. La tarjeta gira con un contador de tiempo estimado que corre
sobre un trabajo que ya no existe.

```
library_resources en producción:
  textExtractionStatus = ready       83
  textExtractionStatus = failed       0   ← ni uno, en toda la vida del producto
```

Cero `failed` en 83 recursos no significa que nada falló: significa que cuando
falla, **no lo dice**. Los dos de esta sesión no figuran porque se cancelaron a
mano.

Es el mismo agujero que ya se cerró para el indexado —estado `indexFailed` con
su reintento, barrido diario `alertFailedIndexing`, descarte del índice parcial—.
La extracción quedó fuera de aquel trabajo.

**Corrección, en dos mitades que se necesitan las dos:**
1. Un guardia que escriba `failed` con su motivo antes de agotar el tiempo. No
   sirve un `catch`: a la muerte por timeout no se le puede poner `catch`.
2. Un barrido de huérfanos: todo recurso en `processing` cuyo `processingStartedAt`
   sea más viejo que el timeout de la función está muerto por definición.

### 1.3 · Nada evalúa el documento antes de gastar · ALTA (oportunidad)

Los cuatro libros de la sesión se diagnosticaron en **menos de un segundo cada
uno**, con herramientas locales, sin modelo y sin gastar una página. Las señales
resultaron predictivas del resultado final.

| Libro | Origen de la capa de texto | Griego | Diagnóstico |
|---|---|---:|---|
| Mayor | Internet Archive · OCR con griego | 258.109 | sano |
| Metzger | Internet Archive · OCR con griego | 108.660 | sano |
| Wallace | born-digital (Cambria embebida) | 129.262 | sano |
| Adamson ×2 | Internet Archive · OCR sin griego | 0 | ausente |
| Dibelius ×2 | Acrobat Paper Capture | 0 | basura latina, 2,18% |

El nombre de la fuente en `pdffonts` predice la familia de falla: `GlyphLessFont`
es capa OCR de Tesseract; encoding `Custom` sin embeber es griego mal mapeado.
Dibelius trae `ytVwaKEtV` donde va `γινώσκειν`, y `KaTa` donde va `κατά`.

Hoy la secuencia es: subir → nueve minutos → debitar páginas → descubrir que el
libro entró mudo. Las señales estaban en el PDF desde el segundo cero.

**Propuesta.** Un informe al soltar el archivo: qué es este PDF, si la escritura
que el libro declara aparece o falta, qué motor se va a usar, qué va a costar, y
la recomendación en lengua llana. Es la misma cuenta que la compuerta de escalada
a OCR, usada un momento antes.

**Límite honesto que el copy debe respetar:** predice la fidelidad del CONTENIDO,
no la fiabilidad del SERVICIO. No habría anticipado el `failed: unknown` de
LlamaParse.

### 1.4 · Nadie registra lo que el banco de pruebas ya sabe medir · ALTA (oportunidad)

`scripts/extraction-bakeoff/` mide fidelidad de escritura, costo y cobertura por
motor, offline y sobre libros elegidos a mano. La extracción en producción corre
sobre libros reales todos los días y **no registra ninguna de esas métricas**.

Hoy `fast` para todo es una apuesta que acierta el 45% de las veces —12 de 27
libros traen su escritura original— y nadie mide el otro 55%.

**Primer paso, que rinde solo:** que cada extracción escriba su ficha —perfil del
PDF, motor usado, métricas de `scriptFidelity` del resultado, costo real—. Eso
convierte "qué motor sirve para qué PDF" de una constante cableada en una tabla
consultable. La señal más valiosa es gratis y no se guarda: que el usuario
reprocese un libro, lo borre a los dos días o pida Premium sobre él es una
etiqueta de calidad sin costo de anotación.

**Restricción:** la ficha guarda números y perfiles derivados. Nunca páginas. Los
libros son material con derechos y el proyecto ya tiene política de citación
consciente de licencias.

---

## 2 · Indexado y saldo

### 2.1 · La tarjeta dice "Indexando" por inferencia · BLOQUEANTE

En `useLibraryResources.ts`, cuando falta `indexingStatus` pero la extracción
está lista y la versión es auto-indexable, la UI asume que el trigger ya corre:

```ts
// the auto-indexer trigger fires in <1s after the extraction write,
// so the brief gap shouldn't surface as "needs manual action".
```

La suposición es correcta casi siempre. Cuando es falsa **no hay salida**: el
estado `indexing` no ofrece el botón "Procesar", que sólo aparece con
`not-indexed`.

Observado con un recurso que mostró "Indexando… hace 57 s · ~4 min estimado"
mientras el documento no tenía `indexingStatus`, ni `indexedChunkCount`, ni
`indexerVersion`, y los tres servicios de indexado no tenían una sola línea de
log. Nadie estaba indexando.

**Corrección.** El optimismo tiene que **caducar**. Pasados unos segundos sin
confirmación del servidor, el recurso cae a `not-indexed` y recupera su botón. Un
progreso que no puede fallar tampoco puede terminar.

### 2.2 · El índice se trunca en silencio a 800 KB · ALTA

La gramática de Wallace estaba indexada hasta la página **433 de 711**. Sin
error, sin warning, tarjeta verde, 696 chunks.

La cadena tiene tres eslabones y ninguno avisa:

1. LlamaParse devolvió un `structured.md` de 18 KB para 711 páginas: sólo los
   marcadores `<!-- page: N -->` y nada de texto. No falló — devolvió vacío.
2. El indexador cae a su fallback razonable: si el markdown produce menos de 3
   chunks, usa el `textContent` de Firestore.
3. `textContent` está topado a **800.000 bytes** por el límite de 1 MiB por
   documento. El libro no cabe y el corte cae donde caiga.

Lo que lo hace peligroso es que el fallback *funciona*: produce chunks con
páginas reales y calidad normal. La única forma de verlo es comparar el rango de
páginas indexadas contra `pageCount`.

**Correcciones, por valor:**
1. Detectar la cobertura — dos números que ya están en el documento.
2. No usar `textContent` como fuente de verdad: es una copia truncada para vistas
   rápidas. Si el `structured.md` sale vacío, corresponde marcar la extracción
   como fallida, no indexar un pedazo.
3. Un `structured.md` con N marcadores y sin texto entre ellos es una extracción
   vacía, no una exitosa.

### 2.3 · "Otorgar créditos" del admin no acredita nada · ALTA

El saldo tiene dos buckets —`plan*`, que se resetea con la facturación, y
`pack*`, que persiste— más un campo **derivado** que es su suma.

```
grantUserCredits →  premiumPagesAvailable += N        (el derivado)
readBalance      →  packPremiumPages ?? premiumPagesAvailable ?? 0
                    con packPremiumPages: 0 PRESENTE, el ?? no cae al fallback
consumePagesAdmin →  *PagesAvailable = newPlan + newPack   ← pisa lo otorgado
```

El fallback estaba pensado para documentos legacy y terminó tapando el caso
normal: hoy el grant sólo funciona para usuarios sin los campos `pack*`, o sea
nadie posterior al refactor. El admin ve el toast de éxito, el usuario ve el
saldo nuevo, y desaparece en la siguiente subida sin que nadie lo relacione con
el grant. El audit log queda afirmando que se otorgaron páginas que nunca
existieron.

**Corrección.** Acreditar al bucket `pack*` —que además es la semántica correcta
de un crédito manual: persistente— y recalcular el derivado como suma.
**Regla:** `*PagesAvailable` es derivado; nadie lo incrementa suelto.

### 2.4 · El auto-indexador no dispara en creación, y su tope no alcanza para libros grandes · MEDIA

`autoIndexOnExtractionReady` es un `onDocumentUpdated`: exige una *transición* de
`textExtractionStatus` a `ready`. Un documento que nace en `ready` nunca la
produce. Y su propio comentario advierte que sobre 500 chunks puede no entrar en
sus 540 s — Wallace, con 959, hay que indexarlo por el callable de 900 s.

---

## 3 · Estudio y construcción del análisis

### 3.1 · El compositor descarta el análisis riguroso al escribir la prosa · MÁXIMA

El paso de verso produce un `CanonicalVerseAnalysis` de **18 campos**, y los 18
estaban completos y con contenido de calidad. `serializeAnalysis.ts` se los pasa
enteros al compositor. `GeminiAcademicComposer` —un segundo pase de LLM— escribe
prosa quedándose con cuatro secciones.

```
Producido y persistido          Publicado en el paper
  syntacticAnalysis               ✗ descartado
  discourseParticles              ✗ descartado
  translationCruxes               ✗ reducido a una flecha:
    (options, positions,              "Πᾶσαν χαρὰν" → sumo gozo
     commitment)
  textualCriticism                ✗ descartado
  historicalContext               ✗ descartado
  lexicalAnalyses                 ✓
  commentatorEngagement           ✓
  verseThesis                     ✓
```

Las tres preguntas del trabajo que parecían sin responder **estaban
respondidas**: la fuerza cualitativa de `πᾶσαν` por la construcción anartra,
`δέ` como marcador de desarrollo con tres opciones y su fundamento, los dos
participios atributivos bajo un único artículo y el porqué de `μή` frente a `οὐ`.
Todo estaba en los datos.

**La ironía señala el arreglo.** El paso de ensamble se hizo determinista a
propósito —`keeps assembly deterministic`— para que nadie reformule lo aprobado.
Un paso antes hay un LLM que sí reformula, y pierde justo lo más caro.

**Corrección.** Render determinista de los campos estructurados; el modelo sólo
para la prosa conectiva. **Regla:** lo estructurado se renderiza — no se le pide
permiso a un modelo para publicarlo.

### 3.2 · El verificador no ve las citas que el sistema produce · ALTA

El parser exige título entre comillas —`(Lane, "Hebrews 1-8", p. 47)`— y el paper
emite `Adamson (p. 53)`. **Cero coincidencias.** No reporta duda: reporta nada, y
un paper sin citas detectadas pasa como verificado. Verde por vacío.

Y había algo real que atrapar. De quince citas auditadas a mano contra las
páginas indexadas: trece correctas, una corrida por una (`Mayor p. 314` cuando
`ὀνειδίζ` está en la 315), y una con **ejemplo griego inventado** — `Wallace
(p. 329)` atribuía `κατὰ τὴν χάριν τοῦ θεοῦ τὴν δοθεῖσάν μοι` (1 Cor 3:10), que
no aparece en ninguna página de Wallace, sobre una página cuyo tema —el pasivo
divino— sí era correcto.

Al regenerar el paso, **las dos se autocorrigieron solas**. La generación mejora;
lo que falta es que algo mida.

**Corrección.** Aceptar también `Autor (p. N)` y `(Autor, N)`. Y que "cero citas
parseadas en un texto que nombra fuentes del corpus" sea una señal, no un
silencio: un verificador debe distinguir "no hay nada que verificar" de "no supe
leer lo que hay".

### 3.3 · La guía de estilo no se puede editar por trabajo · MEDIA

La rúbrica y el encuadre se **copian** al trabajo; la guía de estilo sólo se
referencia por id, así que editarla afectaría a todos los papers que la apunten,
incluidos los ya entregados. El visor es de sólo lectura por decisión documentada
(`editing is the long-tail`), y no hay selector por trabajo: `styleGuideId` sólo
se escribe desde los defaults del planificador.

**Corrección.** Forkear la guía al trabajo, como ya hacen las otras dos
plantillas, y ofrecer el selector en el setup.

### 3.4 · Una clave de i18n cruda visible en pantalla · MEDIA

La pestaña de corpus imprime `paperSetup.subSteps.corpus.roleCoverage.partialDeficitItem`
literal. Las claves existen pero son plurales (`_one`/`_other`) y la llamada pasa
`gap` sin `count`, que es lo que i18next necesita para elegir la forma. El chip
"FALTA 1", 110 líneas más abajo en el mismo archivo, sí pasa `count` y funciona.

El trinquete de i18n no lo atrapa: vigila español incrustado en el código, no
claves que no resuelven en runtime. Las dos fallas se ven igual de mal en
pantalla y sólo una está cubierta.

---

## 4 · Higiene de datos de la biblioteca · MEDIA

Ninguno rompe nada. Todos degradan en silencio la recuperación o la validación
de la rúbrica.

| Qué | Efecto | Arreglo |
|---|---|---|
| **Duplicados** — Kittel ×2, NTG 28 ×2, Barrick ×3, Gelston ×2 | El mismo pasaje vuelve dos veces y parece confirmación cruzada de dos fuentes | Borrar copias; detectar duplicados al subir |
| **Tipos equivocados** — el léxico de Tuggy tipado `grammar` | No pre-filtra bajo el rol correcto al elegir corpus | Corregir el tipo. Ojo: la rúbrica valida contra el `SourceType` del PAPER, no el de la biblioteca |
| **NTG 28 sin acentos** — 681.644 letras griegas, ratio de diacríticos 0,000 | Buscar `ὀνειδίζοντος` no lo encuentra. Sirve para leer, no para buscar formas | Re-extraer con motor que conserve diacríticos |
| **36 recursos sin `coversBibleBooks`** | El ranqueador no puede priorizarlos por pasaje | El botón "Detectar" ya existe; falta correrlo |
| **Metadatos que mienten** — Metzger rotulado "UBS4" siendo el compañero del UBS3 | Una bibliografía citaría edición y año equivocados | Leer los datos de la portada indexada |

**Lección transversal.** Los datos de publicación se pueden LEER de las primeras
páginas del propio `structured.md`. Al armar la bibliografía Turabian del trabajo,
cuatro de siete entradas escritas de memoria estaban mal: Mayor es la 2ª ed. de
Baker 1978 reimprimiendo 1897 (no Macmillan 1913), Kittel es el *Compendio* de
Libros Desafío 2003, Wallace tiene coautor (Daniel S. Steffen). **La portada
indexada es una fuente de verdad gratis y hoy no se usa.**

---

## 5 · Corregido durante la sesión

### 5.1 · Saneamiento del texto antes de indexar · PR #529, desplegado

No existía ninguna barrera entre el PDF de un tercero y el prompt del modelo. Se
remueven los invisibles —bloque TAG, ancho cero, overrides bidi, controles C0/C1,
uso privado— conservando las marcas combinantes del griego politónico y del
hebreo, que son la carga útil del producto. Se sanea al escribir, al indexar y
también **en la lectura**, lo que protege a los recursos ya indexados sin
reindexarlos.

### 5.2 · Recomposición de espíritus griegos partidos · PR #529, desplegado

`᾿Ι` en vez de `Ἰ` son dos cadenas distintas para toda búsqueda. En Metzger, 289
de 368 iotas mayúsculas estaban partidas. La regla mira el carácter anterior para
no tocar las elisiones —`ἀλλ᾽`, `μεθ᾿`—, que usan el mismo signo. Medido sobre
los libros reales: 609 espíritus recompuestos, 576 elisiones intactas.

### 5.3 · `cancelExtraction` sin permiso de invocación · corregido en vivo

El navegador reportaba un error de CORS, que era el síntoma. La causa: faltaba el
binding `roles/run.invoker` para `allUsers`, así que Cloud Run rechazaba la
petición antes de ejecutar el código, y una respuesta rechazada ahí no lleva
cabeceras CORS. Todas las demás callables sí lo tenían.

**Prevención pendiente:** un chequeo que compare los bindings de invocación de
todas las callables desplegadas, como `check-functions-secrets.sh` ya hace con
los secretos.

---

## 6 · Orden de trabajo propuesto

Tres PRs agrupados por camino, no por severidad — cada grupo comparte código y
pruebas.

**PR A — Compositor.** Render determinista de los campos estructurados (3.1) y
parser de citas que acepte los formatos reales (3.2). *Primero, por tres razones:
es el de máxima prioridad, es el único cuyo daño llega al entregable sin que nadie
lo note, y desbloquea el camino guiado.*

**PR B — Extracción.** Presupuesto de polling contra el tiempo remanente (1.1),
marcar `failed` más barrido de huérfanos (1.2), detección de índice truncado
(2.2), y el chequeo de bindings de invocación (5.3).

**PR C — Estado de la interfaz.** El "Indexando" que caduca (2.1), los 11
`confirm()` nativos, y la clave de i18n sin `count` (3.4).

Fuera de los tres, con su propio diseño: el informe previo al subir (1.3), el
lazo de telemetría de extracción (1.4), y el fork de la guía de estilo por
trabajo (3.3).

---

## 7 · Lo que corrige el pesimismo

La capacidad de análisis **ya está construida y es buena**. Las cuatro preguntas
gramaticales de un trabajo de seminario real quedaron respondidas con rigor
verificable: trece de quince citas correctas de primera, y las dos restantes
autocorrigiéndose al regenerar el paso.

Lo que falla no es el pensamiento del sistema: es lo que el sistema deja ver de lo
que pensó. Eso define el orden del trabajo — primero que se vea lo que ya piensa,
después mejorar cómo piensa.
