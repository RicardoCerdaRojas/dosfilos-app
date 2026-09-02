# Plan de implementación — Módulo «Suite de Enseñanza» en dosfilosPreach

> Guía de implementación. Porta el skill Python `suite-ensenanza-biblica`
> (en `docs/suite_diseno_v5_fuente/`) a un módulo nativo del SaaS
> (React + Firebase, arquitectura limpia por paquetes).
> Documento fuente de la arquitectura: `docs/ARQUITECTURA_modulo_saas.md`.
>
> **Estado**: PROPUESTO (pendiente aprobación del fundador antes de codear).
> **Última actualización**: 2026-06-12.

---

## 0. Idea rectora (no reabrir)

**Contenido ≠ runtime.** El HTML/JS de los artefactos está **congelado** en 4
plantillas. Cada clase es solo un **`plan` (JSON plano)**. Generar artefactos =
inyectar `plan + marca` en las plantillas → **función pura, determinista, sin
IA**. La IA interviene en **un solo punto**: redactar el `plan` desde un
estudio. El punto de control editorial es el `plan`, nunca el HTML.

Pregunta de oro ante cualquier duda: *«¿esto es contenido (→ plan) o runtime
(→ plantilla)?»*. Esa distinción es toda la arquitectura.

---

## 1. Glosario

| Término | Qué es |
|---|---|
| **Artefacto** | HTML autónomo: `presentacion` (proyector sincronizado), `notas` (consola del maestro), `hoja` (alumno), `guia_sesion` (consejería 1-a-1). |
| **plan** | JSON que describe la clase (cabecera + bloques + diapositivas + cuerpos HTML). Contrato v1.4. El corazón editable. |
| **marca** | Identidad visual de una institución: 9 tokens de color hex + tipografías + logo. Solo aporta identidad; título/serie/género vienen del estudio. |
| **edicion** | Capa fina de CSS propia de UNA serie (gesto distintivo), aplicada sobre la marca. |
| **lienzo** | Lámina de diseño libre (HTML+CSS) con constitución acotada (`.lz`, solo `var(--token)`, ≥18px, sin script/scroll/vw/vh). Válvula creativa. |
| **trinquete** | Memoria viva: si una forma de `lienzo` se repite entre clases, el sistema sugiere promoverla a componente reutilizable. En el SaaS = colección Firestore. |
| **15 tipos de lámina** | `portada, lista, escritura, escritura-anotada, quiasmo, paralelismo, flujo, termino, esquema, confrontacion, sintesis, transicion, tarjetas, pasos, lienzo`. |

---

## 2. Arquitectura destino (dónde vive cada pieza en dosfilosPreach)

dosfilosPreach ya es clean-arch con paquetes `domain / application /
infrastructure / functions / web / mobile`. El módulo nuevo se reparte así:

| Pieza del skill | Lugar en dosfilosPreach | Naturaleza |
|---|---|---|
| `references/contrato-plan.md` | Tipos TS `TeachingPlan` en `packages/domain/src/teaching-suite/` | esquema + zod |
| `scripts/renderizadores.py` (15 renderers) | `packages/domain/src/teaching-suite/render/` (funciones puras `tipo → HTML`) | puro, testeable |
| `scripts/inyectar.py` | `packages/domain` (o `application`) `injectArtifacts(plan, marca, edicion, templates)` | puro |
| `scripts/validar.py` | `packages/domain/src/teaching-suite/validatePlan.ts` | puro |
| `scripts/crear_marca.py` (color math) | `packages/domain/src/teaching-suite/brand/color.ts` (WCAG/Lab/ΔE) | puro |
| logo bg-removal (PIL) | `packages/functions` con `sharp`/`jimp` **o** `<canvas>` en web | dep nueva (acotada) |
| 4 plantillas HTML | `packages/functions/assets/teaching-suite/` (o Storage) — **sin reescribir** | asset congelado |
| `renderizarArtefactos` / `validarPlan` / `crearMarca` / `generarPlan` | callables en `packages/functions/src/teaching-suite/` | wrappers de los puros |
| paso IA (generar plan) | callable contra el puerto **`ILlmClient`** (ya existe; lo usa el fidelity pass con `AnthropicLlmClient`) | IA |
| `estudios` (origen) | **ya existe**: `library_resources` + extractions / exegesis papers | lectura |
| `marcas/clases/planes/formas_lienzo/ediciones` | colecciones Firestore por `ownerId` | datos |
| UI (seleccionar estudio → marca → revisar plan → artefactos; crear marca) | `packages/web/src/pages/teaching-suite/` | UI |
| `scripts/capturar.py` (QA visual headless) | Function con Puppeteer/Playwright **o** servicio aparte | infra pesada — DIFERIR |

Notas de encaje:
- **IA = Anthropic ya disponible**: `@anthropic-ai/sdk` + `AnthropicLlmClient` +
  puerto `ILlmClient`. El doc pide Anthropic. Escribir el paso contra el puerto
  (no el SDK directo) para respetar la deuda `tech_debt_llm_provider_abstraction`.
- **Multi-tenant**: dosfilos es per-usuario (`ownerId`), no org-multi-tenant.
  Las 5 colecciones cuelgan de `ownerId` con reglas Firestore acordes.
- **Render**: es puro y sin secretos. Se decide callable (consistencia + guardián
  post-render). Ver Decisión D2.

---

## 3. El contrato `plan` como TypeScript (lo más importante)

Replica fiel de `references/contrato-plan.md` (v1.4). Vive en
`packages/domain/src/teaching-suite/TeachingPlan.ts`. Se valida con zod.

```ts
export type Genero = 'exegesis' | 'doctrina' | 'consejeria';
export type Modalidad = 'clase' | 'sesion'; // solo consejería
export type Artefacto = 'presentacion' | 'notas' | 'hoja' | 'guia_sesion';
export type VersionContrato = '1' | '1.1' | '1.2' | '1.3' | '1.4';

export type TipoLamina =
  | 'portada' | 'lista' | 'escritura' | 'escritura-anotada'
  | 'quiasmo' | 'paralelismo' | 'flujo' | 'termino' | 'esquema'
  | 'confrontacion' | 'sintesis' | 'transicion'
  | 'tarjetas' | 'pasos' | 'lienzo';

export interface Bloque { nombre: string; diapo_ini: number; diapo_fin: number; min: number; }

export interface Secuencia { etapas: string[]; actual: number; } // 1-based, 2–6 etapas

// Diapositiva: campos comunes + campos por tipo (discriminated union recomendado).
export interface DiapoBase {
  n: number;                 // correlativo 1..N
  tipo: TipoLamina;
  kicker?: string;
  rotulo?: string;
  variante?: string;         // composición alternativa validada por tipo
  secuencia?: Secuencia;
  html?: string;             // vía de escape: si está, se inserta tal cual (salvo lienzo)
}

// Ejemplos de tipos (el resto en el código, fiel al contrato §3):
export interface DiapoEscritura extends DiapoBase {
  tipo: 'escritura'; ref: string; texto: string; version?: string; centro?: boolean; parte?: string;
}
export interface DiapoEscrituraAnotada extends DiapoBase {
  tipo: 'escritura-anotada'; ref: string; texto: string;
  destacados: { palabra: string; nota: string }[]; // cada palabra debe existir en texto
}
export interface DiapoLienzo extends DiapoBase {
  tipo: 'lienzo'; html: string; css?: string; alt: string; titulo?: string;
}
// … (portada, lista, quiasmo, paralelismo, flujo, termino, esquema,
//     confrontacion, sintesis, transicion, tarjetas, pasos)

export type Diapositiva = DiapoBase & Record<string, unknown>; // unión discriminada en impl.

export interface NotaResumen { diapo: number; rotulo: string; texto: string; }

export interface TeachingPlan {
  // Cabecera
  id: string;                // [a-z0-9_-]+, único ⇒ canal laiglesia_<id>
  titulo: string;
  serie?: string;
  genero: Genero;
  modalidad?: Modalidad;     // invariante: sesion ⇒ sin presentacion/notas, con guia_sesion
  marca: string;             // clave de marca
  edicion?: string;          // clave de edición (contrato 1.4)
  artefactos: Artefacto[];
  version_contrato: VersionContrato;
  textos?: Record<string, string>; // títulos/footers opcionales (se derivan de titulo)
  // Cuerpo
  bloques: Bloque[];               // cubren 1..N sin huecos ni solapes
  diapositivas: Diapositiva[];     // n = 1..N sin huecos
  notas_resumen: NotaResumen[];    // 1:1 con diapositivas
  cuerpo_notas_html?: string;      // anclas data-slide cubren 2..N
  cuerpo_hoja_html?: string;
  cuerpo_guia_html?: string;
}
```

**Regla**: no inventar campos. El contrato es exhaustivo. Cada tipo de lámina
tiene sus campos exactos en `contrato-plan.md §3` — replicarlos en la unión.

---

## 4. Modelo de datos Firestore (por `ownerId`)

```
teachingPlans/{planId}      → TeachingPlan (el corazón; editable)
teachingClasses/{claseId}   → { estudioId, marcaId, planId, titulo, serie, genero,
                                 modalidad?, edicionId?, estado, artefactosUrls?,
                                 ownerId, creado, actualizado }
                              estado ∈ borrador|plan_propuesto|aprobado|generado
teachingBrands/{marcaId}    → { id, nombre, tokens{9 hex}, fuente, fuente_titulos,
                                 fuente_escritura, fuentes[], logoUrl, iconoUrl,
                                 cssExtra?, ownerId }
teachingEditions/{edId}     → { id, serie, gesto, css, estado, ownerId }
teachingCanvasForms/{id}    → { forma, claseId, diapoN, fecha, estado, ownerId } // trinquete
```

- Reglas Firestore: lectura/escritura solo `request.auth.uid == resource.ownerId`.
- Fuentes/logos en Storage bajo `teaching-suite/{ownerId}/...`.
- **Nunca** se almacena HTML como fuente: solo el `plan`; el HTML es derivado
  desechable (se re-renderiza a demanda y se guarda en Storage como caché).

---

## 5. Fases (cada una = unidad funcional completa testeable)

> Frontera de PR = unidad testeable de punta a punta (regla del proyecto).
> Orden estricto: cada fase de-risquea la siguiente.

### Fase 0 — Núcleo determinista (SIN IA, SIN UI nueva) ⭐ primera
**Meta**: portar render + inject + validate a TS puro y **probar paridad**
contra los ejemplos de referencia. Es lo más riesgoso de equivocar (fidelidad)
y todo lo demás depende de ello.

Entregables:
1. `packages/domain/src/teaching-suite/`: `TeachingPlan.ts` (+ zod),
   `validatePlan.ts`, `render/` (15 renderers + `_sec` wrapper), `inject.ts`.
2. Assets: copiar las 4 plantillas + 2 marcas semilla (`sebex`,
   `iglesia-1ra-concepcion`) + 1 edición + los 6 `ejemplos/plan_*.json` a
   fixtures de test.
3. Tests de paridad (vitest):
   - `renderizarArtefactos(plan_clase4, iglesia-1ra-concepcion)` ≈ `demos/clase4_*`
     (idéntico funcional: sync, timer, marcado, hoja).
   - `validatePlan` acepta los 6 ejemplos válidos y **rechaza** casos negativos:
     anclas incompletas, variante inexistente, lienzo con color cableado,
     `version_contrato` incoherente, quiasmo sin centro, flujo huérfano.

PR(s): puede ser 1 PR grande o 2 (render+inject / validate). Sin UI.
**Criterio de aceptación**: paridad de render (§10.1) + paridad de validación
(§10.2) del doc de arquitectura.

**Corte mínimo dentro de Fase 0** (para arrancar y validar la tesis rápido):
`validatePlan` + `injectArtifacts` + renderers `portada` + `lista` +
`escritura`, contra un plan mínimo de 3 láminas, con test de paridad. Si eso
sale idéntico, los 12 renderers restantes son repetición mecánica de bajo riesgo.

### Fase 1 — Render on-demand + persistencia + UI «regenerar desde plan»
- Callable `renderizarArtefactos(planId)`: carga `plan` + `marca` (+`edicion`)
  de Firestore, renderiza (Fase 0), embebe fuentes/logo base64, sube HTML a
  Storage, devuelve URLs, actualiza `clase.artefactosUrls`. Guardián: 0 `@@…@@`.
- Persistir `plan` en `teachingPlans`; pantalla mínima que lista una clase y
  re-genera (editar plan = re-render; jamás parchear HTML).
- **Criterio**: un `plan` existente produce artefactos válidos y se re-renderiza
  byte-estable.

### Fase 2 — Crear marca
- `crearMarca`: color math (WCAG ≥4.5:1, ΔE ≥18) — rechaza señalando el token.
- Logo bg-removal (Decisión D3) + recorte + transparencia.
- UI: subir logo → propuesta de paleta → ajuste → validación → preview
  (inyectar un plan demo en la marca, mostrar 3–4 láminas) → guardar.
- **Criterio**: subir logo+tokens crea marca usable; rechaza contraste<4.5 y ΔE<18.

### Fase 3 — Generar plan desde estudio (IA)
- Callable `generarPlanDesdeEstudio(estudioId, marcaId, opciones)` contra
  `ILlmClient`: arma prompt (SKILL + género detectado + `tipos-de-lamina` +
  `contrato-plan`), pide `plan.json`, lo pasa por `validatePlan`, **bucle de
  corrección acotado** (reintenta con errores en el prompt). Devuelve plan SIN
  generar artefactos.
- Conecta con la biblioteca: lector de `library_resources`/extractions como
  origen (único punto de acoplamiento §3 del doc).
- UI: seleccionar estudio → elegir marca (siempre se pregunta) → confirmar
  género/modalidad → «Proponer plan» → **pantalla de revisión del plan** (el
  control editorial: bloques+minutos, lista de diapositivas, qué se parte, qué
  va en blanco) → aprobar → `validatePlan` → `renderizarArtefactos`.
- Consejería: anonimizar nombres/datos + advertir (regla del skill).
- **Criterio**: un estudio real produce un plan válido tras revisión, y de ahí
  los artefactos.

### Fase 4 — Trinquete + QA visual (diferibles)
- Trinquete: `renderizarArtefactos` escribe `teachingCanvasForms` por cada
  `lienzo`; `generarPlan` consulta y marca `candidata` si ≥2 clases; UI sugiere
  promoción.
- QA visual headless (Puppeteer/Playwright): detecta desbordes 16:9; para
  `lienzo`, la UI muestra capturas y exige confirmación antes de `generado`.
- **Criterio**: dos clases con la «misma» forma disparan la sugerencia; un
  lienzo no se entrega sin haber sido visto.

---

## 6. Estrategia de tests (paridad es la red de seguridad)

- **Fase 0 es test-driven**: los 6 `ejemplos/plan_*.json` + los `demos/*.html`
  son el oráculo. Comparar HTML generado vs demo (normalizando espacios) por
  artefacto y por tipo de lámina.
- Casos negativos del validador como tabla (un test por regla dura del §4 del
  doc de arquitectura).
- Cada renderer: snapshot test contra el fragmento esperado.
- Color math: vectores conocidos (sebex/iglesia tokens → contraste/ΔE esperados).

---

## 7. Decisiones abiertas (resolver antes / durante)

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | Paquete del núcleo | `domain` puro vs paquete nuevo `teaching-suite` | Empezar en `domain/teaching-suite/` (sin dep nueva); promover a paquete si crece |
| D2 | Render: callable vs client-side | callable (aísla, guardián) vs TS en web (sin cold-start) | **callable** por consistencia + validación post-render |
| D3 | Logo bg-removal | `sharp`/`jimp` en Function vs `<canvas>` en web | `<canvas>` en web (sin dep server, sin cold-start); Function si se quiere server-side |
| D4 | IA: Anthropic vs Gemini | usar `AnthropicLlmClient` (doc lo pide) vs Gemini existente | Anthropic vía `ILlmClient` (ya cableado en fidelity pass) |
| D5 | Plantillas: repo vs Storage | bundle en functions/assets vs Storage | repo/assets (versionadas con el código; son el activo congelado) |
| D6 | Origen `estudios` | `library_resources` vs extractions vs exegesis papers | definir el lector en Fase 3; es el único punto de acoplamiento |

---

## 8. Riesgos

1. **Fidelidad del port** (riesgo #1): el HTML portado debe ser idéntico al
   runtime. Mitigación = Fase 0 test-driven contra `demos/` antes de cualquier UI.
2. **Costo de API** (`generarPlan`): cachear plan; no regenerar si el estudio no
   cambió.
3. **Reglas Firestore** por `ownerId` para las 5 colecciones nuevas (seguridad).
4. **Constitución de `lienzo`/`edicion`**: el validador debe ser estricto
   (colores solo token, sin script/scroll/vw/vh) — auditar en HTML final también.
5. **Deuda LLM provider**: escribir el paso IA contra `ILlmClient`, no el SDK.

---

## 9. Primer paso propuesto

**Fase 0, corte mínimo**: `validatePlan` + `injectArtifacts` + 3 renderers
(`portada`/`lista`/`escritura`) con test de paridad contra un plan mínimo.
Si el HTML sale idéntico al runtime, se completa el resto de los renderers como
trabajo mecánico de bajo riesgo, y recién entonces se sube a Fase 1.
