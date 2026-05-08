# Diferenciadores competitivos — DosFilos Exégesis

Vivo. Cada feature aquí está shipped y testeado. Copy listo para liftear a la landing, pricing page, blog posts, demos y deck de inversión.

---

## 🎯 Feature headline — Excerpts curados desde tu biblioteca

> **Tú decides qué fragmentos del comentario van al paper. No un retriever invisible.**

### Pitch corto (90 caracteres)
> "El primer wizard exegético que te muestra y deja editar cada fragmento que el LLM va a citar."

### Pitch medio (3 líneas, para hero card)
> Subes tus comentarios técnicos al sistema. Para cada paper, DosFilos pre-extrae los párrafos relevantes desde tu biblioteca personal, te los muestra, te deja editarlos uno por uno y solo entonces compone el trabajo. Tú ves la materia prima exacta antes de que el modelo la use.

### Pitch largo (para landing pillar / about page)

La mayoría de las herramientas de IA para Biblia funcionan como cajas negras: tú haces una pregunta, el sistema busca silenciosamente en algún índice, el modelo responde, tú confías. NotebookLM, ChatGPT con tus PDFs, los chatbots teológicos del momento — todos comparten el mismo defecto: nunca te muestran qué fragmentos pesaron en la respuesta. Si el modelo cita mal, no sabes desde dónde corregir.

DosFilos invierte ese flujo para el trabajo exegético serio. Cuando armas un paper sobre Romanos 8:18-30, antes de generar nada el sistema:

1. **Pre-extrae** los chunks relevantes desde cada comentario, monografía y léxico de tu biblioteca personal — usando el mismo motor RAG que dispara Faculty, pero ejecutado **una vez**, no por cada prompt.
2. **Te los presenta como tarjetas editables**, agrupados por fuente, con número de página y score de relevancia.
3. **Te deja decidir**: aceptas la cita tal cual, la editas inline (corriges una traducción, recortas, agregas contexto), la marcas como `userEdited`, o la descartas.
4. **El composer trabaja únicamente con los excerpts que aprobaste**. Cero alucinación de "el comentarista X dijo…" sin fuente verificable.

Si re-extraes después de cambiar el pasaje o la rúbrica, el sistema preserva tus ediciones manuales y solo regenera lo que era automático. Un banner amarillo te avisa cuándo la extracción quedó stale por edición del paper. Cada fragmento conserva un link "Ver original →" al PDF de la fuente.

### Por qué importa académicamente

- **Trazabilidad de citas**: cada nota al pie del paper final apunta a un excerpt aceptado por ti, con `sourceLocation` (autor, título, página) verificable contra el PDF original.
- **Hallucination guard**: el composer tiene un contrato con el orquestador — sólo puede citar `sourceKey`s presentes en los excerpts. Cualquier referencia inventada se filtra antes de llegar al output.
- **Pre-procesamiento curado, no RAG runtime**: Faculty hace runtime RAG (responde preguntas en chat). El módulo de exégesis hace lo opuesto — RAG como **pre-procesamiento humano-supervisado**, lo cual encaja mejor con la metodología histórico-gramatical donde el alumno **debe ver** la materia prima antes de sintetizar.
- **Idempotente y reversible**: re-extraer reemplaza solo los excerpts no editados. La revisión humana persiste a través de regeneraciones.

### Comparativa rápida

| | NotebookLM | ChatGPT + PDFs | DosFilos |
|---|---|---|---|
| Pre-extracción visible al usuario | ❌ | ❌ | ✅ |
| Editar el chunk antes de citar | ❌ | ❌ | ✅ |
| Trazabilidad página exacta | parcial | ❌ | ✅ |
| Hallucination guard contractual | ❌ | ❌ | ✅ |
| Re-extraer preservando ediciones | ❌ | ❌ | ✅ |
| Especializado en exégesis bíblica | ❌ | ❌ | ✅ |

### Cuándo brillar (casos de uso)

- **Pastor con biblioteca grande**: 80+ comentarios subidos. Para cada nuevo sermón expositivo, DosFilos pre-selecciona los 30 chunks más relevantes de toda la biblioteca y los presenta para revisión. Ahorra horas de búsqueda manual.
- **Alumno de seminario**: tiene los críticos requeridos por la rúbrica (WBC, NIGTC, BDAG). Los sube una vez, los reusa en cada paper del semestre. El sistema mapea automáticamente "esta rúbrica exige 2 commentary-critical → estos chunks de Cranfield + Moo cubren ese requisito".
- **Investigador**: necesita defender que cada cita del paper tiene anclaje en una fuente real. La revisión inline + el link "Ver original →" sirven como audit trail.

---

## 🎯 Feature secundario — Texto base SBL GNT automático

> **El griego del Nuevo Testamento aparece sin que lo subas. Edición crítica, dominio público, integrada al pipeline.**

### Pitch corto
> "Cualquier paper del NT empieza con el texto base SBL GNT precargado — variantes textuales y aparato crítico incluidos."

### Pitch medio
> Cuando arrancas un análisis exegético sobre un pasaje del Nuevo Testamento, el sistema fetcha automáticamente el texto griego desde el repositorio público de MorphGNT — la edición crítica del Society of Biblical Literature, con marcadores del aparato (⸀ para variantes textuales). El LLM recibe el texto autoritativo como base de TODA decisión gramatical, léxica y sintáctica. No paráfrasis desde memoria, no traducción aproximada — el griego real del NA28/SBL GNT.

### Por qué importa

Los modelos de IA general "saben" el griego del NT por entrenamiento, pero ese conocimiento es difuso, sin atribución, y puede contener errores invisibles. Cargar el texto base autoritativo en cada análisis garantiza que las decisiones léxicas y sintácticas se anclen en el texto real, no en una reconstrucción de memoria.

Para el AT funciona idéntico con el **Westminster Leningrad Codex** (Hebreo) — mismo dominio público, mismo dispatcher automático según testamento del libro.

---

## 🎯 Feature secundario — Rúbrica del seminario integrada al composer

> **Subes la rúbrica del profe (PDF, foto del syllabus, texto pegado) y el sistema la convierte en restricciones efectivas para el composer.**

### Pitch corto
> "Tu paper se redacta cumpliendo la rúbrica de TU profesor — extensión, estándar de citación, mínimos por tipo de fuente."

### Pitch medio
> Sube la rúbrica de tu seminario (PDF del syllabus, foto del enunciado, o pega el texto). El sistema extrae los criterios de evaluación con Gemini multimodal: extensión esperada (15-25 páginas), estándar de citación (Turabian / SBL / TMS), mínimos por tipo de fuente (≥2 commentary-critical, ≥1 BDAG, etc.) y emphasis estructural por sección (introducción / cuerpo / conclusión). Esos criterios viajan inyectados al prompt del composer en cada generación. El paper que produces no es genérico — está alineado con el instrumento exacto de evaluación de tu profesor.

### Por qué importa
Diferencial brutal vs cualquier herramienta genérica de IA. Convierte la app en un asistente que **conoce el contexto institucional del alumno**, no un editor de texto enchufado a un LLM.

---

## 🎯 Feature foundation — Estrategia dialéctica de corpus

> **Anclas + contrastes + técnicas. Una metodología explícita que el modelo respeta en la prosa.**

### Pitch corto
> "Tu corpus se balancea automáticamente en 3 roles: lectura base, contrapeso crítico y respaldo técnico."

### Pitch medio
> El módulo entiende que un paper exegético serio dialoga con voces distintas: comentarios expositivos (anclas — la lectura base), comentarios críticos / monografías / diccionarios teológicos (contrastes — voz alternativa), léxicos y gramáticas (técnicas — anclaje lexical y sintáctico). Al armar el corpus, el sistema te muestra cuántas fuentes tienes en cada rol y qué te falta para tener balance dialéctico. El composer recibe esa metodología explícita en el prompt — la prosa resultante refleja engagement dialéctico real, no una lista plana de citas.

---

## Notas para el equipo de marketing

### Tono editorial sugerido

- **Específico, no aspiracional**: "extrae chunks via RAG one-shot" pesa más que "potenciado por IA".
- **Comparativa directa cuando aplique**: la tabla NotebookLM/ChatGPT/DosFilos arriba comunica el moat instantáneamente.
- **Términos teológicos correctos**: "exegético", "pericopa", "histórico-gramatical", "léxico técnico" — el público objetivo (pastores, alumnos de seminario, profesores) los conoce y los usa. Evitar simplificación.
- **Detalle académico como prueba**: mencionar SBL GNT, NA28, BHS, Wallace, BDAG. Estas marcas señalan rigor a quien sabe.

### Hooks visuales sugeridos

- Screenshot del **panel de excerpts** con tarjetas editables + el banner stale amarillo.
- GIF: usuario edita un excerpt → regenera análisis → output cita exactamente esa edición.
- Comparativa side-by-side: "NotebookLM responde con cita opaca" vs "DosFilos te muestra el chunk que usó".

### CTAs candidatos

- "Subí tu comentario técnico. Mirá los chunks que el sistema usaría."
- "Pega la rúbrica de tu profesor. Genera un paper que la cumple."
- "Probá una pericopa. Sin inventar citas."

---

## Estado de implementación (para sales/founder)

| Diferenciador | Estado | PRs / SHAs |
|---|---|---|
| Excerpts curados | ✅ Shipped end-to-end | Commits 1-6 v1.5 (memoria) |
| SBL GNT como base text | ✅ Shipped | PRs #134, #135, #136 |
| Rúbrica → composer | ✅ Shipped | PRs #129, #130 |
| Estrategia dialéctica | ✅ Shipped | PRs anteriores |
| Texto base WLC (Hebreo AT) | ✅ Shipped | Mismo PR que dispatcher provider |
| Recommendations curados de fuentes | ✅ Shipped | PR #93 (v1.7) |
