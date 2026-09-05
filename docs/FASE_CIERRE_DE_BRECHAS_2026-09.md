# Fase — Cierre de brechas · septiembre 2026

**Qué es.** Ocho pendientes ordenados por daño actual y valor para quien usa
el producto. Ninguno agrega una función nueva: todos cierran un lugar donde el
sistema pierde trabajo, pierde libros o afirma algo que nadie comprobó.

**De dónde salen.** Lo que el barrido de punta a punta del 2026-09-02
(`docs/SESION_PRUEBAS_2026-09-02.md`) dejó sin PR, más lo que apareció al
probar en producción los PRs #539-#542.

**Definición de terminado, por ítem.** Cambio desplegado, probado a mano en
producción y con la regla durable escrita en byblos. Un ítem no se cierra
porque el código exista: se cierra cuando alguien lo vio funcionar.

---

## Estado

| # | Pendiente | Estado |
|---|---|---|
| 1 | Autosave del editor de recursos, sin acuse | pendiente |
| 2 | El auto-indexador no dispara en creación | pendiente |
| 3 | Higiene de datos de la biblioteca | 🔄 tandas 1 y 2 hechas · falta NTG 28 |
| 4 | Informe previo al subir un PDF | pendiente · pide diseño |
| 5 | Fork de la guía de estilo por trabajo | pendiente |
| 6 | El binding `allUsers` del auto-indexador | pendiente · decisión del fundador |
| 7 | Telemetría de extracción | pendiente · pide diseño |
| 8 | `completeRegistration` sin rate-limit propio | pendiente |

---

## 1 · Autosave del editor de recursos, sin acuse

**Qué pasa hoy.** `updateMarkdown` guarda 1,5 s después de que el usuario deja
de escribir. No dice «guardando» ni «guardado», y si falla no se entera nadie:
la mutación sólo invalida al terminar.

**Por qué va primero.** Es el único pendiente de la lista que puede DESTRUIR
trabajo del usuario. Los demás degradan calidad o hacen esperar; éste borra lo
que alguien escribió.

**Dónde.** `useFacultyExtractions.updateMarkdown`, montado desde
`pages/faculty/library.tsx` y `pages/faculty/ProjectLibraryPage.tsx` sobre
`FacultyDocumentEditor`, cuya barra ya tiene el hueco donde vive
«Procesando…».

**Decisiones del fundador:** dónde va el indicador, y si hay que avisar al
cerrar o navegar con cambios sin guardar.

## 2 · El auto-indexador no dispara en creación

**Qué pasa hoy.** `autoIndexOnExtractionReady` es un `onDocumentUpdated`:
exige una TRANSICIÓN de `textExtractionStatus` a `ready`. La subida normal la
produce; un documento que NACE en `ready` no la produce nunca — que es el caso
de la biblioteca clonada de la cuenta embajador. Y su tope de 540 s no alcanza
para libros de más de 500 chunks: Wallace, con 959, hay que indexarlo por el
callable de 900 s.

**Qué significa para el usuario.** Un libro sin indexar NO EXISTE para el
sistema: no aparece en búsquedas, no se puede citar, y el trabajo se escribe
sin él sin declarar que faltaba.

**Mitigación ya desplegada (#541):** la tarjeta deja de girar para siempre y
recupera su botón «Procesar». Falta que no haga falta pulsarlo.

## 3 · Higiene de datos de la biblioteca

**Corrección al barrido:** los duplicados que reportaba (Kittel ×2, NTG 28 ×2,
Barrick ×3, Gelston ×2) se habían medido sobre la colección entera, con las
DOS bibliotecas juntas. Veintidós títulos existen en la cuenta del fundador y
en la del embajador, y eso no es un duplicado: es que cada usuario tiene su
copia.

**Hecho (2026-09-05):**
- 5 copias reales borradas —detectadas por páginas + caracteres, no por
  título, que es por lo que dos se llamaban distinto— y 3.373 chunks huérfanos
  con ellas. El proyecto «Teología II - Cristología» quedó apuntando a las
  copias completas antes del borrado.
- Cobertura medida chunk a chunk en los 49 libros de más de 50 páginas: 43
  estaban completos, 6 no. Tres eran duplicados; los otros tres se
  re-extrajeron y quedaron al 100% —MacArthur pasó de la página 64 de 1.011 al
  libro entero—. Costo real: cero páginas, porque Gemini agotó tokens en los
  tres y pdf-parse, que es gratis, entregó el texto completo.

**Pendiente:** el NTG 28 (§ aparte, abajo).

Lo que sigue no es desarrollo: es limpieza sobre datos reales.

| Qué | Efecto |
|---|---|
| Duplicados — Kittel ×2, NTG 28 ×2, Barrick ×3, Gelston ×2 | El mismo pasaje vuelve dos veces y **parece confirmación cruzada de dos fuentes**. Es evidencia falsa dentro de un trabajo académico. |
| NTG 28 sin acentos — 681.644 letras griegas, ratio de diacríticos 0,000 | Buscar `ὀνειδίζοντος` no lo encuentra. Sirve para leer, no para buscar formas, que es para lo que se usa. |
| El léxico de Tuggy tipado `grammar` | No pre-filtra bajo el rol correcto al elegir corpus. Ojo: la rúbrica valida contra el `SourceType` del PAPER, no el de la biblioteca. |
| 36 recursos sin `coversBibleBooks` | El ranqueador no puede priorizarlos por pasaje. El botón «Detectar» ya existe. |
| Metadatos que mienten — Metzger rotulado «UBS4» siendo el compañero del UBS3 | Una bibliografía citaría edición y año equivocados. |

**Lección transversal, todavía sin explotar:** los datos de publicación se
pueden LEER de las primeras páginas del propio `structured.md`. La portada
indexada es una fuente de verdad gratis que hoy no se usa.

## 4 · Informe previo al subir un PDF

**Qué pasa hoy.** Subir → nueve minutos → debitar páginas → descubrir que el
libro entró mudo.

**Qué se sabe sin gastar nada.** Los cuatro libros del barrido se
diagnosticaron en menos de un segundo cada uno, con herramientas locales, sin
modelo y sin gastar una página. El nombre de la fuente en `pdffonts` predice
la familia de falla: `GlyphLessFont` es capa OCR de Tesseract; encoding
`Custom` sin embeber es griego mal mapeado.

**Límite honesto que el copy debe respetar:** predice la fidelidad del
CONTENIDO, no la fiabilidad del SERVICIO. No habría anticipado el
`failed: unknown` de LlamaParse.

## 5 · Fork de la guía de estilo por trabajo

**Qué pasa hoy.** La rúbrica y el encuadre se COPIAN al trabajo; la guía de
estilo sólo se referencia por id. Editarla afecta a todos los papers que la
apunten, **incluidos los ya entregados**. No hay selector por trabajo:
`styleGuideId` sólo se escribe desde los defaults del planificador.

## 6 · El binding `allUsers` del auto-indexador

`autoIndexOnExtractionReady` es un disparador de Firestore: lo invoca Eventarc
con una cuenta de servicio, no un navegador. El binding `allUsers` →
`roles/run.invoker` es superficie abierta sin motivo. Detectado por
`scripts/check-functions-invokers.sh` en su primera corrida contra producción.

Valor de usuario: cero. Costo: un comando. Está en la lista porque es gratis,
no porque compita con lo de arriba.

## 7 · Telemetría de extracción

`scripts/extraction-bakeoff/` mide fidelidad de escritura, costo y cobertura
por motor, offline. La extracción en producción corre sobre libros reales
todos los días y no registra ninguna de esas métricas.

**Restricción:** la ficha guarda números y perfiles derivados. Nunca páginas.
Los libros son material con derechos.

## 8 · `completeRegistration` sin rate-limit propio

Residual del endurecimiento de auth previo al lanzamiento. Riesgo bajo,
documentado desde el cierre de aquel bloqueador.
