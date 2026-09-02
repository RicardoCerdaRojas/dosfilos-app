# Extracción — escalada a OCR con fan-out (Design Doc)

**Estado:** Borrador para aprobación antes de implementar.
**Base de evidencia:** banco de pruebas en `scripts/extraction-bakeoff/`, mediciones del 2026-08-29 y 2026-09-01 sobre la biblioteca real.
**Precede a:** re-extracción de los 17 libros afectados.

Todo número de este documento está medido, no estimado. Donde algo no se
midió, lo dice.

---

## 1 · El problema

**17 de 27 libros de la biblioteca están indexados sin su griego ni su hebreo
utilizables**, y el sistema los reporta como "Listos".

Se rompe de tres formas distintas, todas silenciosas:

| Forma | Libros | Qué pasa |
|---|---:|---|
| Escritura ausente | 15 | El índice no tiene una sola letra griega ni hebrea |
| Escritura partida | 2 | Las letras están; las palabras, despedazadas |
| Basura en su lugar | — | Donde iba griego hay texto latino sin sentido |

Un pastor que busque `חֶסֶד` no encuentra nada. No porque el libro no lo
tenga, sino porque el índice nunca lo vio.

### 1.1 · La causa

No son PDFs escaneados. Se verificó con `--classify`: **cero de los 15** lo
son; todos tienen capa de texto sana, 1.800 a 5.700 caracteres por página.

El griego está **mal codificado**. Mismo pasaje, mismo PDF:

| | |
|---|---|
| Leyendo los glifos renderizados | `Ἀκούσατε, λαοί, λόγους` · `כֻּלָּם` |
| Leyendo los códigos de carácter | `’AKOwarE, Xaoi, ^oyoix;` · `0^0` |

`pdffonts` lo explica: fuentes con encoding `Custom`, **no embebidas**, cuyo
mapa a Unicode apunta a los códigos latinos. Es una fuente griega antigua
donde los glifos son griegos y los códigos latinos. Cualquier extractor de
capa de texto reporta fielmente los códigos.

**Y esa basura está en producción.** `'AKOwarE` aparece literal en el
`structured.md` que generó 1.185 chunks. El índice no carece de griego:
contiene ruido latino en su lugar, que ensucia los embeddings y puede
aparecer impreso en una cita.

**Revertir la codificación no es viable.** La sustitución no es consistente
—`λ` sale como `X` en una palabra y distinto en la contigua— y la fuente no
está embebida, así que el archivo ni siquiera contiene la tabla que habría
que invertir. Reconstruirla produciría griego plausible pero equivocado:
indetectable al leer, fatal al citar.

### 1.2 · Por qué no se arregla cambiando de motor

Los 27 libros salieron del **mismo** extractor (`fast`), y 12 sí traen
escritura original — uno con 681.644 letras griegas. `fast` no es incapaz de
recuperar griego: lo recupera cuando está bien codificado y devuelve basura
cuando no.

**La variable es el PDF, no el motor.** Cambiar todo a OCR sería pagar caro y
lento por el 45% que ya funciona bien y gratis.

---

## 2 · Qué motor, y por qué

Medido sobre *The Minor Prophets*, páginas 132–142, con las dos escrituras
presentes:

| Motor | USD/libro 425p | Niqqud | Espíritus griegos | Veredicto |
|---|---:|---:|---|---|
| `fast` ← producción | ~0 | **0** | **0** | no recupera nada |
| `balanced` | — | 0.192 | **fabricado** | traduce al griego moderno |
| `premium` | $23.91 | 0.815 | ✓ | no cabe en el cupo |
| Mistral OCR | $1.70 | 0.735 | **✗** | pierde el espíritu inicial |
| **Gemini 3.6 Flash** | **$6.81** | **0.825** | ✓ | **elegido** |

**`balanced` queda prohibido.** Devolvió 4.564 letras griegas donde otros tres
motores coincidieron en ~27: transliteró bibliografía inglesa y alemana
(«Micah» → «Μιχαίας», «alttestamentlichen» → «αλττεσταντlichen») y tradujo
prosa al griego moderno. Griego inventado con forma de erudición es la falla
más peligrosa posible en este producto.

**`premium` no cabe.** Medido aislando el modo y leyendo el panel: 495
créditos por 11 páginas = 45 créditos/página. Un libro de 425 son 19.125
créditos contra un cupo mensual de 10.000. No es que salgan pocos libros al
mes: no cabe ninguno.

**Mistral pierde los espíritus.** `Ακούσατε` donde debe decir `Ἀκούσατε`.
Barato y rapidísimo, pero destruye justo lo que el tier promete.

---

## 3 · El diseño

```
extractPdfWithGemini (trigger de Storage)
   │
   │  extrae con `fast` — 30 s, barato, resuelve el 95% del texto
   ▼
┌─ COMPUERTA DE ESCALADA ──────────────────────────────────┐
│  ¿el recurso declara libros del AT/NT, o es gramática,   │
│   léxico o comentario exegético?                          │
│  ¿y la escritura esperada NO aparece, o aparece partida?  │
└───────────────────────────────────────────────────────────┘
   │  no  →  se indexa lo de `fast`            ← 10 de 27 libros
   ▼  sí
   crea job de escalada · N trozos de 15 páginas
   │
   ├─ worker → Gemini(trozo, pageOffset) → verifica cobertura → parcial
   ├─ worker → …                                    (2 concurrentes)
   └─ worker → …
   │
   ▼  cuando los N parciales están completos
   coser por número de página → structured.md → indexar
```

### 3.1 · La compuerta

Dispara cuando **ambas** condiciones se cumplen:

1. **Se espera escritura original.** El recurso declara libros del AT o del NT
   en `coversBibleBooks`, o su `type` es `grammar`, `critical-text`,
   `theological-dictionary`, `bible-dictionary`, `commentary` o
   `exegetical-commentary`.

2. **La escritura no está, o está rota.** `scriptFidelity()` sobre la salida
   de `fast` da cero letras griegas y cero consonantes hebreas, **o** marcas
   diacríticas huérfanas por encima de 0,5 por millar de caracteres.

El segundo criterio es el que importa y es el que costó descubrir. **"¿Es
escaneado?" no sirve**: estos PDFs tienen capa de texto perfecta y el filtro
los dejaría pasar a todos. Y **contar letras tampoco alcanza**: los dos
léxicos tienen 1.052 letras griegas y niqqud 0,835 —números impecables— con
las palabras despedazadas.

La compuerta es `scriptFidelity()`, ya escrita, con 24 tests, validada contra
el corpus real: identificó los 15 sin escritura y los 2 con escritura partida.

### 3.2 · Parámetros, todos medidos

| Parámetro | Valor | Por qué |
|---|---|---|
| Páginas por trozo | **15** | Con 40, un trozo devolvió 4 de 40 en silencio. Con 15, 4/4 completos. |
| Concurrencia | **2** | Con 4 aparecieron más 503. Con 2 también, pero el reintento los cubre. |
| Reintentos | **3**, backoff exponencial 2/4/8 s | Un trozo murió con 503 y volvió vivo al segundo intento. |
| Timeout por trozo | holgado en 540 s | Medido 120–170 s por trozo de 15 páginas. |

Para un libro de 425 páginas: **29 trozos · 34 min de pared · $6.81**.

Trozos más grandes son más baratos —el prompt se amortiza— pero pierden
fiabilidad. 15 es el punto donde la cobertura se mantiene: bajó el costo por
página de $0,0235 (trozos de 11) a $0,0160, un 32%.

### 3.3 · Numeración de página

Cada worker recibe `pageOffset`: *"tu primera página es la N del documento
completo; numera desde N, ignorando cualquier número impreso"*.

**Verificado dos veces.** Trozo de páginas 150-159 emitió `150…159`. Corrida
completa: 60 páginas emitidas, 60 esperadas, rango 130–189, sin huecos ni
duplicados, ascendente.

Hace falta decirlo explícitamente: sin el desplazamiento, Gemini numeró
**615-625** para un recorte de 11 páginas — leyó los números *impresos* del
libro. Es una tercera convención, ni posición en el recorte ni posición
global, y no funciona en un libro sin foliar.

### 3.4 · Verificación de cobertura — obligatoria

**El modelo miente sobre haber terminado.** Se le dieron 40 páginas, devolvió
4 completas, gastó 8.884 tokens de un tope de 65.536, y reportó
`finishReason: STOP`. Ni truncamiento declarado, ni error, ni tope alcanzado.
Simplemente dejó de escribir. El mismo tamaño de trozo, en otra corrida,
devolvió las 40: **no es determinista**.

Ninguna señal del proveedor delata esto. La única defensa es contar:

```
páginas emitidas por el trozo  <  páginas pedidas
    →  trozo FALLIDO, reintentable
```

Sin esto, el fan-out cose libros con agujeros que el sistema reporta como
"Listo" — el mismo patrón que este trabajo existe para eliminar.

### 3.5 · Manejo de fallos

| Fallo | Tratamiento | Evidencia |
|---|---|---|
| `503 UNAVAILABLE` | reintentable | El servicio lo declara temporal. Visto a concurrencia 2 y 4. |
| `429` / `5xx` | reintentable | — |
| Excepción de red (`fetch failed`) | reintentable | Un trozo murió así al primer intento. |
| Respuesta vacía con `STOP` | reintentable | Observado. Página que desaparece sin aviso. |
| Cobertura incompleta | reintentable | §3.4 |
| Agotados los reintentos | **el libro queda incompleto y MARCADO** | Nunca "Listo" con agujeros. |

La última fila es la regla que gobierna todo: **si no se puede extraer bien,
el recurso lo dice.** Un índice incompleto que se anuncia como completo es
peor que uno ausente, porque nadie lo audita.

---

## 4 · Lo que NO está validado

**Los bordes entre trozos.** La comparación contra una sola pasada no sirvió:
la referencia salió truncada, así que el cosido tenía *más* texto que ella.
Comparar contra una referencia incompleta no dice nada sobre las uniones.

El riesgo es estructuralmente bajo —los trozos se cortan en límites de
página, que ya son la unidad natural del formato, y un párrafo partido entre
la 144 y la 145 queda contiguo al coser— y con 60/60 páginas presentes la
pérdida tendría que ocurrir dentro de una página. **Pero eso es un argumento,
no una medición.**

Para cerrarlo: correr el spike sobre un rango que quepa de una sola pasada
(~30 páginas) y comparar con referencia entera.

**Concurrencia por encima de 2.** Con 4 hubo más 503. Con reintentos podría
ser viable y bajaría los 34 minutos, pero no se midió con el reintento
activo.

**El costo por crédito de LlamaParse** sigue derivado de una promo de bono,
no de tarifa de lista. No afecta la decisión —`premium` queda fuera por cupo,
no por precio— pero está sin confirmar.

---

## 5 · Plan de implementación

| # | Pieza | Depende de |
|---|---|---|
| 1 | `scriptFidelity` portado a `packages/functions` como compuerta | — |
| 2 | Marcar el recurso `needsOcrEscalation` cuando la compuerta dispara | 1 |
| 3 | Job de escalada: trozos, estado por trozo, cosido | 2 |
| 4 | Worker: Gemini + `pageOffset` + verificación + reintento | 3 |
| 5 | Cosido → `structured.md` → re-indexar | 4 |
| 6 | UI: estado honesto mientras escala; marcado si falla | 5 |
| 7 | Re-extracción de los 17 libros | 1-6 |

**Prerequisito de seguridad, independiente y prioritario:** sanear el texto
extraído antes de indexarlo. Hoy no se sanea nada, y un PDF con caracteres de
ancho cero o controles bidireccionales puede inyectar instrucciones al modelo
a través del índice. Va en el mismo borde de escritura que esta escalada.

### 5.1 · Decisiones abiertas

**Dónde vive el orquestador.** Cloud Tasks es lo natural, pero un documento
de Firestore con estado por trozo es más simple y el patrón ya existe en el
repo. La duración total (34 min) excede cualquier timeout de función, así que
el estado tiene que vivir fuera del proceso en cualquier caso.

**Qué ve el usuario durante 34 minutos.** El trigger ya es asíncrono, pero
hoy la UI no distingue "extrayendo" de "escalando a OCR". Con el riel de
progreso que ya existe, mostrar el avance por trozo es natural.

**Cuándo escalar los libros ya subidos.** Los 17 pueden re-extraerse en lote
(~$116, ~10 horas de pared en serie) o bajo demanda cuando el usuario los
abra. Lo segundo reparte el costo y prioriza lo que se usa.
