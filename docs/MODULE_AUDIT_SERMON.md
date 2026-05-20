# Módulo de Generación de Sermones — Auditoría Profunda

**Fecha**: 2026-05-20
**Versión auditada**: post-merge PRs #210-#216 (convergencia paper + Faculty + wizard backbone + migración legacy + auto-populate)
**Caso de estudio**: sermón `184bae4f-9327-4ef4-a5f2-84300b56b5a6` ("La Paciencia de Dios", 2 Pedro 3:9, funeral, predicado 25 abr 2026)
**Ponderación**: UX 40% / Calidad Teológica 40% / Costo LLM 20%

---

## Resumen Ejecutivo

**Veredicto**: **6.4 / 10**. Módulo funcional pero con 3 problemas que pueden cancelar la confianza del usuario en producción, 5 fricciones UX que pueden cancelar adopción, y 1 oportunidad estratégica enorme sin explotar (única opción Spanish-native + Reformed-expository en el mercado 2026).

| Dimensión | Score | Peso | Aportado |
|---|---|---|---|
| **UX / Usabilidad** | 5.5 / 10 | 40% | 2.20 |
| **Calidad Teológica** | 6.5 / 10 | 40% | 2.60 |
| **Costo LLM** | 8.0 / 10 | 20% | 1.60 |
| **TOTAL** | | | **6.40 / 10** |

### Top 3 Wins
1. **Hermenéutica reformada + griego precisos**: AI baseline correctamente distingue "todos sin distinción" vs "todos sin excepción", produce morfología griega exacta (`bradynei`, `makrothymei`, `apolesthai`, `pantas`, `metanoian`), aplica voluntad revelada vs decretiva. Mejor que la mayoría de estudiantes M.Div.
2. **Pipeline convergente único**: paper → wizard → Faculty → wizard es arquitectónicamente coherente post-PRs #213/#214/#216. Single backbone funciona.
3. **Posicionamiento competitivo**: única opción seria Spanish-native + Reformed/expository + paper-first en el mercado 2026. Sin competidores directos.

### Top 3 Issues
1. **🔴 CRÍTICO — Citas de autoridad hallucinated 3/3** (Owen/Spurgeon/Van Til todas fabricadas en el caso de estudio). El prompt `buildSermonDraftPrompt` REQUIERE el campo `authorityQuote` en su schema, forzando al LLM a inventar cuando no tiene fuente verificable. Esta sola falla puede destruir credibilidad del producto en el pulpito.
2. **🔴 CRÍTICO — "Iniciar sermón" en planner descarta paper exegético sin advertencia**. Si pastor click el botón equivocado (mismo color, mismo estilo que "Generar desde paper"), pierde horas de trabajo exegético sin opción de recuperar.
3. **🟡 ALTO — 3 vocabularios de tono diferentes en el mismo módulo**: paper popover usa `pastoral/expositivo/narrativo`, Faculty modal usa `doxological/pastoral/confrontational/didactic/evangelistic`, wizard banner muestra el de paper. Fractura el modelo mental del usuario.

### Top 3 Recommendations
1. **HOTFIX (1-2h)**: Eliminar `authorityQuote` como campo obligatorio del schema. Hacer opcional + agregar regla "Solo cita autores explícitamente presentes en el paper/conversación. PROHIBIDO inventar." Aplica a `buildSermonDraftPrompt`, `GeminiPaperToSermonTransformer`, ExtractTheologicalContentUseCase SERMON branch.
2. **MEDIUM (1 día)**: Wire `GeminiLlmCitationVerifier` post-generación de sermón. Extraer atribuciones, verificar contra fuentes del paper, flag fuzzy-low/not-found al usuario antes de publish.
3. **STRATEGIC (1-2 semanas)**: Pre-cargar corpus reformado en español (Spurgeon `El Tesoro de David`, Berkhof, Calvino `Institución`, Coalición por el Evangelio). Cierra el gap de "library depth" vs Logos/Sermonary sin requerir uploads del usuario.

---

## 1. Calidad Teológica / Estándar Profesional (40%) — Score 6.5/10

### 1.1 Caso de estudio: sermón `184bae4f` vs baseline AI

Comparé el sermón publicado (versión editada por pastor) vs `wizardProgress.draft` (baseline AI puro).

#### Lo que el AI hizo bien (sobrevivió a la edición del pastor)

| Elemento | Origen | Calidad |
|---|---|---|
| Outline 3 puntos paralelos ("Dios tarda, pero...") | AI | ✅ Estructura homilética sólida |
| Proposición homilética ("Tres verdades que pueden cambiar tu vida...") | AI | ✅ Robinson-aligned |
| Griego (5 palabras con morfología) | AI | ✅ Sin errores académicos |
| Hermenéutica reformada `pantas` | AI | ✅ Voluntad revelada vs decretiva, citando 1 Tim 2:4 + Ez 18 |
| Contexto histórico (gentiles Asia Menor, parusía) | AI | ✅ Defendible |
| Referencias cruzadas (Sal 90:4, Heb 4:7, 2 Co 6:2) | AI | ✅ Bien elegidas |

#### Lo que el AI hizo mal (el pastor tuvo que arreglar)

| Problema | Severidad | Evidencia |
|---|---|---|
| **3/3 citas de autoridad fabricadas** | 🔴 Crítico | Owen no escribió "Sobre la Paciencia de Dios". Spurgeon no compiló "Sermones sobre la Gracia Divina". Van Til escribió "Defense of the Faith" pero NO sobre nuevos cielos/tierra. Quotes son LLM-pastiche sin fuente. |
| **2/3 ilustraciones son la misma metáfora** | 🟡 Alto | Punto II: "Última Llamada del Avión". Punto III: "Último Tren". Ambas "deadline departure". Predicador humano nunca usa dos seguidas. |
| **`callToAction` vacío** | 🟡 Alto | Schema tiene el campo. Parser acepta `""`. Pastor escribió el llamado a mano. |
| **Intro bloated (528 palabras)** | 🟡 Alto | ~5 min solo setup. Robinson/Chapell recomiendan ≤10% tiempo total. Aquí ~20%. |
| **Conclusión anémica (98 palabras)** | 🟡 Alto | Para sermón funeral, cierre debe ser proporcional. Pastor lo expandió. |
| **"Recordatorio" robótico** | 🟢 Bajo | Bloque idéntico en cada `transition` — re-lista los 3 puntos. Patrón de prompt template, no de pastor real. |
| **Implicaciones inconsistentes** | 🟢 Bajo | `body[0].implications` es `null`, `body[1]` y `body[2]` array de 2. Race en JSON parse silenciada. |
| **Personalización ausente** | 🟡 Alto | No hay campo "nombre del difunto", "contexto funeral/boda". Pastor inyectó "Ivan" + historia del tomate manualmente reemplazando intro. |

**Verdict**: AI da un **scaffold 70% terminado** que requiere edición pastoral significativa. NO es "publish and preach".

### 1.2 Audit de prompts vs estándares homiléticos

Evaluación contra Robinson (Biblical Preaching), Chapell (Christ-Centered Preaching), MacArthur/TMS (Expository Preaching).

| Prompt | Modelo | Score | Big Idea? | FCF/Christ-centric? | Halluc guard? | CTA? |
|---|---|---|---|---|---|---|
| `GeminiPaperToSermonTransformer` | Pro 2.5 + thinking | **4/10** | ❌ | ❌ | ⚠️ Débil | ⚠️ Parcial |
| `buildSermonDraftPrompt` (Step 3) | Flash 2.5 | **3/10** | ❌ | ❌ | ❌ Schema FUERZA quote | ✅ |
| `buildExegesisPrompt` (Step 1) | Flash 2.5 | 6/10 | ✅ | ❌ | ⚠️ Condicional | n/a |
| `ApproachDevelopmentPromptBuilder` (expository) | Flash 2.5 | 7/10 | ✅✅ rigid template | ❌ | ❌ | n/a |
| Faculty `SERMON_OUTLINE` | Gemini, thinking off | 8/10 | ✅ Robinson | ❌ | ⚠️ | n/a |
| Faculty `SERMON` (full) | Gemini, thinking on | 7/10 | ✅ | ❌ | ⚠️ Mejor por "solo lo discutido" | ✅ |
| **`GeminiSermonComposer`** (existe, no wired) | Pro 2.5 | **8/10** | ✅ | ❌ | ✅ "do NOT invent sources" | ✅ |
| `GeminiLlmCitationVerifier` (no wired al sermón) | Gemini, temp 0.1 | 9/10 | n/a | n/a | ✅ | n/a |

**Promedio: 6.2/10. El path que el caso de estudio usó (`GeminiPaperToSermonTransformer`) score 4/10.**

#### Hallazgos críticos de prompts

1. **`buildSermonDraftPrompt` (líneas 227-423 de `prompts-generator.ts`) tiene `authorityQuote` como CAMPO REQUERIDO del JSON schema con ejemplo falso en el prompt template**. El LLM tiene que inventarlo porque el schema lo exige y nada lo prohíbe. **Esta es la causa raíz de la hallucination Owen/Spurgeon/Van Til.**

2. **Cero "Christ-Centered" / FCF en ningún prompt**. Sermones serán moralistas por default ("debes hacer X") en vez de redentivos ("Cristo cumplió Y, por tanto..."). Inaceptable para audiencia TMS-rigor.

3. **Anti-hallucination en `buildExegesisPrompt` es CONDICIONAL**: la regla "NO inventes citas específicas" solo se inyecta cuando el usuario NO tiene biblioteca. Cuando hay libros uploaded (caso común), la salvaguarda desaparece.

4. **Temperature 0.7 + Flash para exégesis** es muy alta para tarea que requiere precisión gramatical-histórica. Composer (Pro) correctamente usa 0.5-0.6.

5. **`GeminiSermonComposer` (score 8/10, prompt mejor del codebase) existe en `packages/infrastructure/src/exegesis/ministryComposers/GeminiSermonComposer.ts` pero NO está wired al wizard backbone.** Si esto fuera el path canónico, resolvería la hallucination a nivel de prompt.

### 1.3 Verdict por audiencia

| Audiencia | Calificación |
|---|---|
| **Pastor pragmático sin seminario** | 7/10 — Outline + griego + cross-refs son una mejora ENORME vs su línea base. Pero las citas falsas son peligro si las predica sin verificar. |
| **Estudiante TMS-rigor** | 5/10 — Detecta inmediatamente las citas falsas, la falta de FCF/Christ-centered, las ilustraciones genéricas. Lo usará como starter pero re-escribirá mucho. |
| **Promedio ponderado (70% pragmático / 30% TMS)** | 6.4/10 |

---

## 2. UX / Usabilidad (40%) — Score 5.5/10

### 2.1 Fricciones críticas (🔴)

| # | Friction | Archivo:línea | Impacto |
|---|---|---|---|
| C1 | **"Iniciar sermón" en planner descarta paper exegético silenciosamente** | `SeriesDetail.tsx:572-609` | Pastor pierde horas de trabajo si click el botón equivocado |
| C2 | **Citas hallucinated llegan al pulpit sin verificación** | `prompts-generator.ts:385` + `GeminiPaperToSermonTransformer.ts:155` | Credibilidad pastoral en riesgo |
| C3 | **3 botones distintos en Step 3 hacen cosas diferentes pero parecen iguales** | `StepDraft.tsx` "Refinar" vs "Asistente" vs canvas | Pastor no sabe cuál usar |
| C4 | **`SermonOutlinePreviewModal` 100% hardcoded en español** | `SermonOutlinePreviewModal.tsx` (todo el archivo) | English users ven modal en español. Bug regresivo. |
| C5 | **Click "Refinar" silenciosamente borra historial de chat** | `StepDraft.tsx:306-313` | Pérdida de contexto sin warning |
| C6 | **Auto-save falla silenciosamente** | `useAutoSave.ts:59` | Pastor offline pierde trabajo sin saber |
| C7 | **`GenerateSermonButton` deshabilitado sin path forward para paper no-ensamblado** | `ExegesisPaperPage.tsx:541` | Pastor click botón gris sin saber por qué + sin CTA |

### 2.2 Fricciones altas (🟡)

- **H1**: "Paso 0 de 3" header reads negativo cuando pastor está en StepPassage.
- **H2**: Header dice "Paso 3 de 3" cuando pastor aterriza vía paper-flow — sugiere que terminó cuando no empezó refinement.
- **H3**: 3 vocabularios de tono incompatibles (paper: 3 tonos / Faculty: 5 tonos / wizard banner: 3 tonos).
- **H4**: "100% progress" en card cuando solo se generó draft sin refinar.
- **H5**: Tono "Pastoral" vs "Expositivo" en paper popover sin preview — pastor adivina diferencia.
- **H6**: Greek Tutor button hardcoded "Entrenar Griego" no i18n'd.
- **H7**: "Vista Previa" en Step 3 es modal full-screen READ-ONLY sin export PDF.
- **H8**: Section regeneration silenciosa en costo — pastor sin saber gasta cuota.
- **H9**: Errores API Gemini surgen con mensaje raw ("RESOURCE_EXHAUSTED") al usuario.
- **H10**: Sin onboarding, sin tour. Pastor primera vez aterriza en Step 0 sin contexto del flujo.

### 2.3 Jargon leaks (técnico al usuario)

Términos engineer-only que llegan al usuario:
- "derivedContext" (en logs visible si user abre console)
- "wizardProgress" (idem)
- "RAG" (en `generator.json:23` banner Faculty: *"con Tutor Griego y RAG"*)
- "stub" (en banner Faculty exegesis: *"La exégesis es un stub desde el bosquejo Faculty"*)
- "Pericope" — palabra técnica seminario, no para pastor pragmático
- "Rúbrica" / "Corpus base" / "Guía de estilo" — leak desde paper module
- "Paper" (loanword inglés en español)

### 2.4 i18n quality

Generalmente buena español neutro LatAm (per [feedback_chat_tone_neutral](memory/feedback_chat_tone_neutral.md)). Excepciones:
- `series.json:564` `sermonOverloaded`: *"El servicio está saturado..."* — "saturado" es España-ism. LatAm usaría "ocupado".
- `generator.json:194` `readyDesc`: usa primera persona AI ("crearé"), inconsistente con voz neutral del sistema.
- Strings hardcoded en `ChatInterface.tsx` (líneas 222-419) — nunca se traducen.
- Modal Faculty 100% sin i18n.

### 2.5 Mental model gaps

1. **"Paper" vs "Sermón" vs "Borrador" vs "Predicado"** — pastor sin seminario no entiende la cascada. Sin diagrama, sin tooltip.
2. **"Generador de Sermones" como título del list page** — colisiona con que sea biblioteca + en-progreso. Debería ser "Mis sermones".
3. **Dos taxonomías parallel**: drafts vs published copies. Pastor debe construir esquema mental para entender por qué "publicar" crea nuevo doc en lugar de actualizar el draft.
4. **"Generar desde paper" vs "Iniciar sermón"** — ambos botones verdes primarios con icono parecido (Mic vs Sparkles). Pastor aprende por trial-error.

### 2.6 Empty states + onboarding

- **CERO onboarding.** Sin tour, sin tooltips first-visit, sin explainer "qué es paper vs sermón".
- "Sermones en progreso" empty case: silently bypassed (no list rendered). Pastor primera vez aterriza directo en Step 0 sin contexto.
- Cards filter+sort+view-mode controls show even with 0 sermons.

### 2.7 Mobile

- `lg:flex-row` stacks vertical en mobile pero chat full-width con canvas alto = scroll infinito.
- `style={{ height: 'calc(100vh - 130px)' }}` hardcoded en 3 steps — rompe en mobile Safari con URL bar dinámica.
- WizardHeader oculta "Paso X de 3" `<md` → solo icon LogOut visible.

---

## 3. Costo LLM (20%) — Score 8.0/10

### 3.1 Costo por sermón (típico)

| Componente | Llamadas | Tokens in/out | Costo Flash | Costo Pro |
|---|---|---|---|---|
| Paper transformer (one-shot) | 1 | 8k/2k | n/a | ~$0.040 |
| Step 1 Exegesis (Flash) | 1 | 2.5k/1.5k | $0.00065 | n/a |
| Step 2 Homiletics (preview + develop) | 2 | 4k/4k | $0.0015 | n/a |
| Step 3 Draft (Flash) | 1 | 2.5k/4k | $0.0014 | n/a |
| Chat refinement (~3 turns) | 3 | 9k/4.5k | $0.0021 | n/a |
| Section refines (~3) | 3 | 4.5k/2.7k | $0.0009 | n/a |
| **TOTAL típico (paper-derived sermon)** | ~10 calls | | | **~$0.045** |
| **TOTAL típico (wizard-native sermon)** | ~7 calls | | **~$0.008** | n/a |

### 3.2 Costo competidores (subscription flat)

| Competidor | Plan | Margen vs Preach |
|---|---|---|
| Sermonary | $29-69/mo | Preach gana >10x si > 50 sermones/mes |
| Pulpit AI | $39-129/mo | Preach gana siempre (Pulpit no genera, repurpose) |
| Logos | $12-16/mo (bundled) | Preach gana solo > 30 sermones/mes |
| SermonAI | $15-29/mo | Preach gana > 50 sermones/mes |

**Preach tiene margin advantage estructural por Gemini Flash + arquitectura propia.** Esto es un moat económico real si scale.

### 3.3 Riesgos de costo

- **Refinement chat puede explotar**. Sin warning ni quota visual, pastor que regenera 10x cada sección gasta $0.20+ por sermón.
- **Greek Tutor sin caps**. Cada sesión drill puede ser 15+ LLM calls. Sin warning previo.
- **No caching de paper context** entre regeneraciones. Si pastor regenera draft 3 veces, paper se re-envía 3 veces (8k tokens × 3 = 24k tokens innecesarios). Gemini ofrece context caching pero no está implementado.

### 3.4 Gana o pierde

- ✅ **Gana**: estructura de costo variable vs flat-subscription. Permite tier gratuito agresivo + alta margen en pro tier.
- ⚠️ **Pierde marginalmente**: refinement chat sin cap puede burn cuota más rápido de lo esperado.
- ❌ **Pierde estratégicamente**: no usa context caching de Gemini (50% descuento en tokens cached). Implementación 2-3 días.

---

## 4. Arquitectura (informacional)

### 4.1 Inventario

- **17 archivos principales** en el módulo
- **~5,800 LOC** total
- **3 archivos >700 LOC** (violan estándar 500): `StepExegesis.tsx` (731), `ExtractTheologicalContentUseCase.ts` (765), `GeminiSermonGenerator.ts` (784)
- **3 use cases con tests** (44 tests totales): `GenerateSermonFromPaperUseCase` (18), `BuildSermonFromFacultyOutlineUseCase` (11), `migrateLegacyWizardProgress` (12+)

### 4.2 Deuda técnica

| Issue | Severidad |
|---|---|
| Markdown splitter duplicado en 3 archivos (`splitOnLevel2Headings` + `normalizeHeading`) | 🟡 |
| `GeminiSermonGenerator.ts` (784 LOC) legacy, post-convergence parcialmente bypassed | 🟡 |
| `SermonGeneratorService.ts` (395 LOC) RAG hydration legacy, no llamado por nuevo flow | 🟡 |
| `sermons/detail.tsx` (800+ LOC) legacy detail page coexiste con wizard | 🟡 |
| Inconsistencia: paper flow patchea series, Faculty flow no | 🟢 |
| Cero e2e tests para paper→sermón o Faculty→sermón flows | 🟡 |

### 4.3 Storage model

`Sermon.wizardProgress.derivedContext` discriminated union (paper|faculty) bien diseñado post-#214. 16 fields total en Sermon entity, todos en uso. No overgrowth detectado.

### 4.4 Observability

**Crítica gap**: cero telemetría en auto-populate path (PR #216). Imposible saber cuántos sermones se están auto-recuperando, cuántos fallan, cuáles son los paper IDs problemáticos.

---

## 5. Chats (informacional)

### 5.1 Surface count

**8+ endpoints AI** por wizard:
- Step 1: General chat + 6 section refines + Greek Tutor + Bible reader = 9
- Step 2: General + 4 section refines = 5
- Step 3: General + 3 section refines + coach style + Faculty drawer + Bible reader = 8
- **Greek Tutor**: 15+ training turns + free Q&A

### 5.2 Overlap analysis

Step 3 tiene **3 affordances con propósito distinto pero apariencia similar**:
- "Refinar" → `useDraftRefinement` (patch section + history)
- "Asistente de Redacción" → `useGeneratorChat` (chat scoped, no patch unless accept)
- Canvas inline edit → `handleSectionUpdate` (no AI, pure localStorage)

Pastor no sabe cuál hace qué.

### 5.3 Confusion zones

1. **Coaching Style "Auto"** — selector tiene cero feedback visual. Click "Socrático" produce respuesta idéntica al click "Directo".
2. **Greek Tutor auto-opens** sin CTA claro.
3. **Faculty Drawer vs Faculty Chat Page** — dos entry points para Faculty. Pastor no sabe cuál usar.
4. **`chatMode: 'refine' | 'general'`** — toggle no-user-visible dentro de ChatInterface.

### 5.4 Persistencia crítica

**Wizard chats NO se persisten en Firestore — solo localStorage.** Si pastor refresca, exegesis/homiletics/draft general chat history se PIERDE. Faculty chats y versionado sobreviven.

**User pain point**: pastoral work lost on refresh/crash.

---

## 6. Benchmark Competitivo

### 6.1 Matriz

| Feature | **Preach** | Sermonary | Pulpit AI | Logos | SermonAI | Pastors.ai | Magisterium |
|---|---|---|---|---|---|---|---|
| AI sermon gen zero-to-draft | ✅ | Partial | ❌ Repurposer | ✅ | ✅ | ❌ | ✅ |
| Spanish-native + teología | ✅ | ❌ | ❌ | UI only | ❌ | Translation only | Multi-lang |
| Greek/Hebrew tools | ✅ Greek Tutor | ❌ | ❌ | ✅✅ Best | ✅ Interlinear | ❌ | ❌ |
| Reformed/expository bias | ✅ | ❌ | ❌ | Library-dependent | ❌ | ❌ | Catholic |
| Paper-driven sermon pipeline | ✅ **Único** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Series planner pericope-driven | ✅ | Basic | ❌ | ✅ Sermon Manager | ❌ | ❌ | ❌ |
| Personal library RAG | ✅ | Canned only | ❌ | ✅ Paid library | Partial | Per-church sermons | Curated only |
| Citation verification | Partial paper-level | ❌ | ❌ | Library authoritative | ❌ | ❌ | ✅✅ Built-in |
| Costo por sermón | ~$0.01 marginal | $29-69/mo flat | $39-129/mo flat | $12-16/mo flat | $15-29/mo flat | $30/mo flat | $20/mo flat |
| Multimodal book ingest (OCR) | ❌ | ❌ | ❌ | ❌ | ✅ Photo | ❌ | ❌ |
| Real-time sermon translation | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 150-lang voice clone | ❌ |
| Sermon repurposing | ❌ | Partial | ✅ Best | ❌ | ❌ | ✅ | ❌ |

### 6.2 Donde Preach gana

1. **Spanish-native + Reformed/expository + paper-first** — único en esta intersección.
2. **Paper-as-source-of-truth architecture** — sermon es proyección de paper, auditable.
3. **Greek Tutor drills** (no solo lookups como Logos).
4. **Series planner sintáctico** (no calendar/topic-driven).
5. **Marginal cost** estructural ($0.01 vs flat $15-130).

### 6.3 Donde Preach pierde

1. **Library depth** — Logos tiene 30+ años de commentaries curated. Sermonary bundles Tyndale/IVP. Preach RAG depende de uploads del usuario. **Cold-start weakness.**
2. **Hallucinations** — Owen/Spurgeon/Van Til crisis. Magisterium AI resolvió esto para católicos con RAG sobre corpus vetted. Preach lo tiene en producción.
3. **No sermon repurposing** — Pulpit AI / Pastors.ai ownan ese workflow. Pastores los usan POST-Preach.
4. **No real-time delivery / multi-language preaching** — Pastors.ai's 150-language voice clone es categoría-definitoria para LatAm bilingual churches.
5. **No mobile / Podium Mode** — Sermonary's Podium Mode es muy alabado. Preach es desktop-only.
6. **Brand / distribution** — Sermonary, Logos, SermonCentral tienen décadas SEO.

### 6.4 Verdict competitivo

**Preach NO tiene moat individual.** Posición competitiva descansa en:
- (a) **Único** Spanish-native teológicamente serio
- (b) **Paper-first** arquitectura genuinamente diferente
- (c) **Stack integrado** difícil de ensamblar piecemeal

**Si competidor inglés bien financiado ships versión Spanish + corpus reformado + citation verification, Preach pierde ventana en 12-18 meses.**

**El problema #1 NO es competencia — es la hallucination.**

---

## 7. Recomendaciones Priorizadas

### Tier 1 — HOTFIX (1-2 horas cada uno)

| # | Fix | Archivo | Impacto |
|---|---|---|---|
| 1 | **Eliminar `authorityQuote` como required del schema**. Hacer opcional + agregar regla "PROHIBIDO inventar autores no presentes en source material" | `prompts-generator.ts:385` + `GeminiPaperToSermonTransformer.ts:155` | 🔴 Crítico — elimina riesgo pulpit |
| 2 | **`callToAction` NO puede ser vacío**. Validar pre-publish + agregar al prompt | `prompts-generator.ts:395` | 🔴 Crítico |
| 3 | **"Iniciar sermón" warning si paper assembled exists** | `SeriesDetail.tsx:572-609` | 🔴 Crítico — pérdida de trabajo |
| 4 | **Unify tone vocabulary** a `pastoral/expositivo/narrativo` en TODAS las surfaces | Paper popover, Faculty modal, wizard banner | 🟡 Alto |
| 5 | **Auto-save failure toast** | `useAutoSave.ts:59` | 🟡 Alto |
| 6 | **i18n del SermonOutlinePreviewModal completo** | `SermonOutlinePreviewModal.tsx` | 🔴 Crítico — language regression |
| 7 | **Fix "Paso 0 de 3" header** | `WizardHeader.tsx:94` | 🟡 Alto |
| 8 | **Jargon kill** (RAG/stub/derivedContext en copy usuario) | `generator.json:23` | 🟡 Alto |

### Tier 2 — MEDIUM (1-2 días cada uno)

| # | Fix | Impacto |
|---|---|---|
| 9 | **Wire `GeminiLlmCitationVerifier` post-sermón** — extrae quotes, verifica vs paper sources, flag al usuario | 🔴 Soluciona hallucination raíz |
| 10 | **Per-section length budget en prompt** (intro 200-400, body 1800-2800, conclusión 250-450) | 🟡 Balance |
| 11 | **Illustration diversity guard** — post-gen semantic dedup | 🟡 |
| 12 | **Cost warnings antes de regenerate** + quota visual en cada step | 🟡 |
| 13 | **Personalization slots** wired en wizard (deceased name, occasion: funeral/wedding/sunday) | 🟡 Cierra biggest authorship gap |
| 14 | **Wizard chats persist a Firestore** (no solo localStorage) | 🟡 Data loss fix |
| 15 | **Context caching Gemini** (50% descuento en tokens cached) | 🟢 Cost win |

### Tier 3 — STRATEGIC (1-2 semanas cada uno)

| # | Fix | Impacto |
|---|---|---|
| 16 | **Migrar a `GeminiSermonComposer` como canonical path** — retirar `buildSermonDraftPrompt`. Composer score 8/10 vs draft prompt 3/10. | 🔴 Foundational |
| 17 | **Seed library reformada en español** (Spurgeon PDC, Berkhof, Calvino Institución, Coalición Evangelio) | 🔴 Cierra biggest competitive gap |
| 18 | **Sermon repurposer module** (devotional / small-group guide / social clips / bulletin) — copia Pulpit AI playbook | 🟡 Captura lifecycle, nueva revenue |
| 19 | **Audience-rigor tier** flag ("Pastor sin seminario" vs "Estudiante TMS") afecta prompt rigor | 🟡 Differentiation |
| 20 | **Add FCF / Christ-centered lens** a body structure requirement en cada prompt | 🟡 Eleva teología |
| 21 | **Mobile / Podium Mode** | 🟡 Sermonary parity |

### Tier 4 — KILL (cleanup post-convergence)

| Archivo | Razón |
|---|---|
| `GeminiSermonGenerator.ts` (784 LOC) | Legacy, bypassed por convergence. Solo refinement chats todavía usan partes. |
| `SermonGeneratorService.ts` (395 LOC) | RAG hydration legacy, no llamado por nuevo flow. |
| `sermons/detail.tsx` (800+ LOC) | Legacy detail page, wizard es canonical. Mantener solo si analytics muestra uso. |
| Step 0 (`StepPassage.tsx`) cuando hay paper/Faculty derivedContext | Redundante con derivedContext.passage. Auto-skip a Step 3. |

---

## 8. Plan de Acción Sugerido

### Fase 1 — Emergency Fix (esta semana, 1-2 días)
1. Tier 1 fixes 1, 2, 3, 6 (hallucinations + warning + i18n + CTA)

### Fase 2 — UX polish (próximas 2 semanas)
2. Tier 1 fixes restantes (4, 5, 7, 8)
3. Tier 2 fix 9 (CitationVerifier wired)
4. Tier 2 fix 10 (length budget)

### Fase 3 — Foundation (siguiente mes)
5. Tier 3 fix 16 (migrar a Composer)
6. Tier 2 fix 13 (personalization slots)
7. Tier 2 fix 15 (context caching)

### Fase 4 — Moat building (siguiente trimestre)
8. Tier 3 fix 17 (seed library)
9. Tier 3 fix 18 (repurposer)
10. Tier 3 fix 19 (rigor tiers)

---

## 9. Métricas para Validar Mejoras Post-Implementación

| Métrica | Baseline actual | Target post-fix |
|---|---|---|
| % citas verificables en sermón generado | ~0% (3/3 fake) | >95% |
| Tiempo edición pastoral pre-publish | ~2-4h (estimado) | <1h |
| % sermones con callToAction non-empty | ~70% (algunos vacíos) | 100% |
| % sermones con ratio intro/body/conclusion dentro target | ~30% | >80% |
| User-reported jargon confusion en surveys | n/a | medir + reducir |
| Cost per published sermon | ~$0.045 | ~$0.020 con caching |
| Crashes / data-loss reports | unknown (no telemetría) | <0.1% |

---

## 10. Conclusión

El módulo es **funcional, técnicamente sólido en arquitectura, único en posicionamiento, pero peligroso en calidad de output por la hallucination crisis**.

**Si el caso de estudio que auditamos (sermón funeral 2 Pedro 3:9) se hubiera publicado sin el editing del pastor, habría incluido 3 quotes fabricadas atribuidas a Owen, Spurgeon y Van Til.** Cualquier oyente educado que verifique destruye credibilidad. **Esto es el único defecto que puede matar el producto.**

Todos los demás issues (UX, jargon, mobile, repurposing, library depth) son problemas de mejora que pueden resolverse iterativamente sin riesgo existencial.

**Recomendación firme**: Antes de cualquier feature nueva, Fase 1 (Emergency Fix) DEBE ejecutarse. ~2 días de trabajo para eliminar el #1 riesgo.

---

## Apéndices

### A. Evidencia del Case Study
- Sermón publicado: `184bae4f-9327-4ef4-a5f2-84300b56b5a6`
- Sermón draft origen: `4edcc2d9-b185-407f-b966-132faae97157`
- PDF aportado por usuario (versión predicada)
- Comparación: ver Sección 1.1

### B. Prompts evaluados
Listados con file:line + score en Sección 1.2. Quotes verbatim en informe parcial del agente prompt-auditor (disponible en logs de sesión).

### C. Archivos referenciados
- `packages/web/src/pages/sermons/generator/*` (12 archivos)
- `packages/application/src/use-cases/exegesis/*` (3 archivos relevantes)
- `packages/application/src/use-cases/faculty/extractions/*` (2 archivos)
- `packages/infrastructure/src/gemini/*` + `packages/infrastructure/src/exegesis/*` (5 archivos)
- `packages/domain/src/entities/Sermon.ts` + `SermonGenerator.ts`
- `packages/web/src/i18n/locales/es/{generator,series,exegesis}.json`

### D. Fuentes competitor benchmark
- Sermonary, Pulpit AI, Logos Sermon Builder/Manager, SermonAI, Pastors.ai, Sermonly, SermonCentral, Magisterium AI, Verble
- Búsquedas + fetches en línea (ver agent log para URLs)
