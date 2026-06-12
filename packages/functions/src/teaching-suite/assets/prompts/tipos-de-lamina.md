# tipos-de-lamina.md — Catálogo y criterios de uso

Campos exactos de cada tipo: `references/contrato-plan.md` §3.
Ejemplos reales: `ejemplos/plan_demo_componentes.json` y `plan_clase4.json`.

## Decisión: ¿qué tipo usar?

| El contenido es… | Tipo |
|---|---|
| Apertura de la clase | `portada` |
| 2–4 ideas enumerables, una idea por diapositiva | `lista` |
| El pasaje mismo, leído | `escritura` (partir si >3 versículos, `parte:"1/2"`) |
| El pasaje con palabras cuya GRAMÁTICA interpreta | `escritura-anotada` |
| Estructura espejada A–B–C–B′–A′ | `quiasmo` |
| Poesía hebrea: líneas que se corresponden | `paralelismo` (sinónimo/antitético/sintético) |
| Cadena lógica del argumento (porque, para que, por tanto) | `flujo` |
| Estudio de una palabra: lema, morfología, rango, usos | `termino` |
| Comparativa en columnas: oficios, posturas, atributos, antes/después | `tarjetas` (2–4) |
| Progresión o convergencia lineal: AT→NT, promesa→cumplimiento, cadena corta | `pasos` (2–5) |
| Relación estructural NO cubierta por lo anterior (línea de tiempo compleja, mapa, diagrama radial) | `lienzo` (HTML+CSS con constitución y QA visual; `esquema` SVG es legado) |
| La postura errada, nombrada y respondida | `confrontacion` |
| La verdad destilada al final del trabajo textual | `sintesis` |
| Puente a la próxima clase | `transicion` |

Preferir SIEMPRE un componente tipado antes que `esquema`: el componente
se valida estructuralmente y rinde idéntico en presentación, notas y hoja.
`esquema` es la vía de escape para lo genuinamente único.

## Reglas de los `esquema` (SVG libre)

- Solo clases `esq-caja`, `esq-caja-suave`, `esq-linea`, `esq-flecha`,
  `esq-titulo`, `esq-texto`, `esq-griego`, `esq-escritura`, `esq-etq` —
  todas usan `var()` y heredan marca + alto contraste. No inventar colores
  en duro.
- Texto dentro del SVG ≥20px (no lo alcanza el escalado A−/A+).
- `alt` obligatoria y descriptiva (el validador la exige).
- `viewBox` proporcionado a 1280×720 con márgenes; máx. ~1100 de ancho útil.
- Modelos canónicos: D8 (estructura del versículo: una cualidad protegida
  por tres prohibiciones) y D13 (convergencia de pasajes) en
  `ejemplos/plan_clase4.json`.

## Variantes y ritmo (criterio editorial, v5)

Las variantes existen para que la *secuencia* de la clase respire, no
para decorar láminas sueltas. Criterio al armar el plan:
- **El texto ancla** de la clase va en `escritura` plena (centrada,
  ceremonial) UNA vez; las lecturas de trabajo van en la composición
  por defecto; una cita breve usada como evidencia dentro de un
  argumento va en `banda` — tres pesos litúrgicos distintos para tres
  funciones distintas del texto.
- `lista: numerada` SOLO si el orden importa (pasos, requisitos
  contados); si los ítems son paralelos, la numeración miente.
- `lista: dos-columnas` para 4–6 ítems de menos de ~6 palabras
  (referencias, términos); nunca con ítems largos.
- `sintesis: plena` para la declaración mayor de la clase; la caja por
  defecto para síntesis intermedias de bloque.
- `tarjetas: horizontal` cuando 2–3 tarjetas llevan texto largo que en
  columnas quedaría apretado.
- **Ritmo:** evitar tres láminas seguidas con la misma composición si
  existe una variante que sirva al contenido; alternar densidad — tras
  dos láminas densas, una que respire (escritura plena, síntesis,
  transición). La variante se elige al proponer el plan, donde el
  docente la aprueba; nunca se decide por novedad sino por función.

## Secuencias (idea mayor contada por partes)

Cuando una idea no cabe con dignidad en una lámina, NO densificarla ni
pedir scroll: partirla en 2–4 láminas hermanas y declarar en cada una
`secuencia: {etapas:[…], actual:k}` con las mismas etapas. El riel de
progreso da a la audiencia la percepción de una sola pieza gráfica
contada por partes — el equivalente proyectable de la infografía
vertical. La infografía vertical real va en la hoja del alumno (impresa).

## Particionado de lecturas

~3 versículos por diapositiva; cada parte lleva `parte:"k/n"` y SU PROPIA
ancla `data-slide` en el cuerpo de notas (el validador exige cobertura
2..N). El texto bíblico nunca bajo 29px: si no cabe, partir más.

## Densidad

Una idea por diapositiva. Listas: máx. 4 ítems (~14 palabras c/u) — el
validador rechaza más. Si una lista pide 6 ítems, son dos diapositivas o
una lámina-esquema. La consola escala a N variable (clases de doctrina de
25–35 diapositivas son válidas).
