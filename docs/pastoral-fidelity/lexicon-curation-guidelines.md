# Lexicon Curation Guidelines

Guía operativa para curar entradas del lexicon pastoral interno (`packages/infrastructure/src/data/lexicon-curated-v1.json`). Adoptada por ADR-017.

## Propósito del lexicon curado

El lexicon curado es la **fuente primaria** del análisis de palabras en `PastoralWordStudyModal`. Sus entradas alimentan al LLM como contexto (en lugar de BDAG copyright, Strong's datado o LSJ académico). Cuando el LLM identifica una palabra cuyo lema **no** está en el curated, el `CompositeLexicon` recurre a LSJ (griego) o BDB (hebreo) como fallback.

## Naturaleza pastoral, no académica

Cada entrada debe responder a la pregunta del pastor preparando un sermón, no a la pregunta del académico catalogando un corpus:

- ✅ Glosa concisa que **destila peso** teológico del verso.
- ✅ Rango semántico ordenado por relevancia bíblica (no por frecuencia o cronología).
- ✅ Nota teológica que **señala el punto donde el sentido vivo difiere del calco** (e.g. `nepeš` ≠ "alma" platónica).
- ❌ Etimología profunda.
- ❌ Discusión de variantes textuales o crítica.
- ❌ Disputas inter-confesionales recientes.

## Schema de cada entrada

```json
{
  "lemma": "δικαιοσύνη",
  "language": "greek",
  "transliteration": "dikaiosynē",
  "primaryGloss": "justicia que viene de Dios; estar en relación correcta con Dios",
  "semanticRange": [
    "justicia divina otorgada al creyente",
    "rectitud práctica que el Espíritu produce",
    "norma justa de Dios sobre su pueblo"
  ],
  "theologicalNote": "Pablo la usa en Romanos no como cumplimiento legal romano sino como estatus pactual concedido por gracia y vivido por el Espíritu."
}
```

| Campo | Regla |
|---|---|
| `lemma` | Forma de diccionario, en el script original. Sin diacríticos opcionales. |
| `language` | `'greek'` o `'hebrew'`. |
| `transliteration` | Latín, sistema sencillo (no técnico SBL). El pastor debe poder pronunciar la palabra. |
| `primaryGloss` | 6-18 palabras. Es la gloss que el LLM hereda. Pastoral, no académica. |
| `semanticRange` | 2-5 ítems, ordenados por relevancia. Cada uno una frase. |
| `theologicalNote` | Opcional pero recomendado en palabras teológicamente cargadas. Señala el *insight* que un pastor sin formación lingüística perdería sin ayuda. |

## Criterios para incluir un lemma

Una palabra entra al curated si **cumple uno o más**:

1. **Frecuencia + peso teológico combinados**. Aparece >100 veces en su testamento y carga argumentos doctrinales mayores.
2. **Trampa común**. Un pastor sin griego/hebreo la malentenderá por defecto (`sarx` ≠ cuerpo físico; `nepeš` ≠ alma platónica).
3. **Hereda peso del AT**. Términos griegos del NT que recogen un campo semántico hebreo amplio (`agapē` ← `ʾahăvāh`/`ḥesed`; `eirēnē` ← `šālôm`; `doxa` ← `kāvôd`).
4. **Núcleo de pasaje canónico de predicación**. Pablo en Romanos, Hebreos sobre el sacrificio, Salmos sobre el pacto, etc.

## Lo que NO entra al curated v1

- Artículos, preposiciones, conjunciones, partículas (excepto si carga teológica clara: `ἵνα` propósito; `ὅτι` causal/declarativo en contexto específico, pero esto es marginal).
- Sustantivos comunes sin peso (`mesa`, `casa`, `camino` salvo `derek` que sí lo carga).
- Nombres propios (van a otro recurso).
- Lemmas hapax salvo que el hapax sea el núcleo de un argumento mayor (e.g. `apolytrosis` aparece pocas veces pero define la redención).

## Tono de las notas teológicas

Las notas teológicas son la diferencia entre Strong's y este recurso. Deben:

- Hablar al pastor, no al académico.
- Señalar el *insight* operativo del término (cómo cambia la lectura del verso).
- Evitar jerga académica innecesaria. Si usa un término técnico (paralelismo, casus pendens), explicarlo brevemente.
- Ser específicas sobre el uso bíblico, no generales.

❌ "Importante palabra del vocabulario teológico paulino."
✅ "Pablo la usa como veredicto forense — Dios declara justo al creyente. No describe transformación interior (eso es santificación)."

## Versión, attribution y bump policy

- `version`: SemVer en `version` del archivo. v1.0.0 = ~50 entradas v1 ship.
- `license`: `"Internally created"` — el catálogo es activo del producto.
- Bump major (`2.0.0`) **invalida cache** de `PastoralWordAnalysisCacheKey.curatedVersion`. Minor (`1.x.0`) agrega entradas sin invalidar cache existente.
- Cada agregación documenta lemma + autor + fecha en `CHANGELOG.md` del dataset (futuro).

## Expansión post-v1

v1 ship intencional con ~50 entradas. Expansión guiada por telemetría:

- `lexicon_gap_greek` / `lexicon_gap_hebrew`: log cuando `IdentifyKeyWordsUseCase` ranquea palabra fuera del curated. Si una palabra acumula >10 gaps en 30 días, candidato a curación v1.1.
- Hero books prioritarios: Romanos, Juan, Hebreos, Salmos, Génesis.

Meta v1.1 (post-launch ~4-6 semanas): 200 griego + 150 hebreo = 350 total.

## Proceso de revisión

1. Autor de la entrada redacta + PR.
2. Revisor confirma: gloss pastoral, no académica; rango ordenado; nota teológica concreta.
3. Si el lemma toca un `distinctive` confesional (e.g. `baptizō`), incluir nota neutral que no privilegie una confesión sobre otra; el sistema de tres niveles (ADR-007) decide cómo se renderea downstream.
4. Merge a `main` después de revisión.

## Política sobre disputas inter-confesionales

Para términos cuya interpretación divide tradiciones evangélicas fieles (`baptizō`, `eklegomai`, `monogenēs` en debate antiguo, etc.):

- Gloss + rango semántico se mantienen **neutrales** (presentan opciones, no fallan a favor).
- Nota teológica explicita que el término tiene **disputas legítimas** sin nombrar tradiciones específicas.
- El sistema downstream (Testigo 3 + Faculty doctrinal) consume el `doctrineLevel` del confessional context, no del lexicon.

## Referencias

- ADR-017 — lexicon source decision
- 05-pedagogy-manifesto — sobre disciplinas teológicas y peso del original
- 07-citation-policy — attribution rendering
