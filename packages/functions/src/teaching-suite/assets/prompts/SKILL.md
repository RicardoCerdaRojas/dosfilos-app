---
name: suite-ensenanza-biblica
description: >
  Genera la suite de enseñanza bíblica a partir del material de estudio del
  docente: presentación HTML sincronizada (proyector), consola del maestro
  (notas docentes con temporizador y marcado remoto), hoja de trabajo del
  alumno y/o guía de sesión de consejería. Usar cuando el docente pida
  preparar una clase de escuela dominical, una clase de seminario, una
  sesión o clase de consejería bíblica, o cualquier variante de
  "genera los artefactos / la presentación / las notas / la hoja" a partir
  de un estudio exegético, doctrinal o de consejería. También para
  regenerar o ajustar una clase existente a partir de su plan.json.
---

> **Versión:** diseño v5 · contrato 1.4 (11-jun-2026). La fuente de verdad es el archivo `VERSION` de la raíz del skill; si una conversación duda de qué versión tiene instalada, ese archivo y el sello `/* runtime diseño v5 */` en las plantillas son la verificación.

# Suite de enseñanza bíblica

Tres artefactos HTML autónomos y sincronizados (presentación + consola del
maestro + hoja del alumno), o guía de sesión + hoja del aconsejado para
consejería 1-a-1. El runtime (sincronización, temporizador, canvas de
marcado, alto contraste) está **congelado** en `assets/`: NUNCA se escribe
HTML/JS de artefactos a mano. Todo el trabajo editorial se vuelca en un
**plan de clase** (JSON) que `scripts/inyectar.py` convierte en artefactos.

## Flujo

1. **Ingerir el material** del docente (md, docx, pdf, texto). Leerlo
   completo antes de decidir nada.

2. **Clasificar género y modalidad.** `exegesis` (estudio de un pasaje),
   `doctrina` (tema doctrinal con múltiples pasajes), `consejeria` (y su
   modalidad: `sesion` 1-a-1 o `clase` grupal). Si es ambiguo, PREGUNTAR;
   nunca asumir. Leer entonces SOLO la referencia del género:
   `references/genero-exegesis.md` | `genero-doctrina.md` |
   `genero-consejeria.md`, más `references/tipos-de-lamina.md` y
   `references/contrato-plan.md`.

3. **Seleccionar la marca.** Ver `assets/marcas/registro.md`. Si el
   docente nombra una institución no registrada, pedir el logo (y colores
   institucionales si existen) y crear el perfil siguiendo el registro;
   verificar los contrastes ahí indicados antes de usarla.

4. **Proponer el plan de clase ANTES de generar.** Presentar al docente:
   distribución de bloques con minutos, lista de diapositivas con su tipo,
   qué lecturas se parten y en cuántas partes, qué estructuras merecen
   componente exegético o lámina-esquema, y qué irá en blanco en la hoja.
   Este es el punto de control editorial: el docente aprueba o ajusta el
   PLAN, no los HTML. Iterar hasta su aprobación.

5. **Generar — SOLO mediante los scripts, sin excepción.** Escribir
   `<id>.plan.json` conforme a `references/contrato-plan.md` y ejecutar:
   `python3 scripts/inyectar.py --plan <id>.plan.json
    --plantillas assets --marcas assets/marcas --out <directorio_salida>`
   PROHIBIDO escribir o editar el HTML de los artefactos a mano: si un
   texto aparece en un artefacto y no proviene del plan o de la marca, es
   un bug. El plan debe ser COMPLETO: si la presentación declara N
   diapositivas, `notas_resumen` cubre 1..N, las anclas `data-slide` del
   cuerpo cubren 2..N y los bloques cubren 1..N — la consola contendrá
   entonces 2N réplicas (verificar contra el eco "estructura:" del
   inyector).

6. **QA visual cuando hay diseño en juego:** si el plan incluye láminas
   `lienzo`, o la sesión tocó plantillas o perfiles de marca, ejecutar
   `scripts/capturar.py --artefacto <presentación> --out <dir>` (captura
   cada lámina y detecta desbordes) y MIRAR las capturas con la
   herramienta de visión antes de entregar; corregir el plan o el diseño
   hasta que estén limpias. Un lienzo jamás se entrega sin revisión
   visual.
7. **Validar — OBLIGATORIO antes de entregar.**
   `python3 scripts/validar.py --plan <id>.plan.json --salida
   <directorio_salida>` debe terminar en `TODO OK`. NUNCA entregar
   artefactos sin ese resultado. Si falla, corregir el PLAN y volver a
   inyectar — jamás parchar los HTML generados.

8. **Trinquete:** si la clase incluyó láminas `lienzo`, registrar cada
   forma nueva en `references/trinquete.md`; si una forma ya estaba
   registrada, proponer al docente su promoción a componente ANTES de
   generar (regla completa en ese archivo). Si la serie tiene edición
   registrada en `assets/ediciones/registro.md`, declararla en el plan.
9. **Entregar** los artefactos con un resumen (bloques, minutos, tipos de
   lámina usados) y el checklist manual: abrir consola + presentación en
   dos ventanas del mismo navegador y comprobar scroll-sync, trazo remoto
   desde "Marcar en grande" e indicador "○ sin proyector" al cerrar.
   Entregar también el `<id>.plan.json` (es la fuente editable de la clase).

## Reglas editoriales transversales (todo género)

- **Regla de la Escritura:** el color de Escritura de la marca marca las
  palabras mismas de la Escritura citadas textualmente — nada más, y nada
  menos. Siempre con cursiva. Taxonomía completa en
  `references/identidad.md`. Citas de comentaristas/confesiones JAMÁS en
  ese color (`cita-humana`); la postura errada en `error`.
- La **síntesis doctrinal** va DESPUÉS del trabajo con el texto, nunca antes.
- Lecturas largas: partir en diapositivas de ~3 versículos
  (`parte: "1/2"…`); cada parte necesita su ancla en las notas.
- Una idea por diapositiva; listas de máx. 4 ítems de ~14 palabras.
- Sin emojis en ninguna interfaz; iconos solo SVG inline de trazo.
- Numeración de bloques 1:1 entre artefactos; la hoja numera por bloques.
- `id` nuevo y único por clase (canal `laiglesia_<id>`).
- Consejería: confidencialidad estricta — anonimizar nombres y datos
  identificables del material recibido y ADVERTIRLO al docente.

## Estructura

- `assets/` — plantillas congeladas + `marcas/` (perfiles).
- `scripts/` — `inyectar.py`, `validar.py`, `renderizadores.py`.
- `references/` — contrato, identidad, tipos de lámina, componentes
  exegéticos, géneros, sincronización.
- `ejemplos/` — `plan_clase4.json` (clase real completa),
  `plan_demo_componentes.json` (los 5 componentes exegéticos),
  `plan_demo_sesion.json` (sesión nouthética 1-a-1). Consultarlos como
  modelos antes de escribir un plan nuevo.

Requisitos: Python 3 estándar; `node` para la validación de JS. Sin
`localStorage`/`sessionStorage` en ningún artefacto.
