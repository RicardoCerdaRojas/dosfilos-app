# Púlpito — plan de la app tablet (predicar + redactar)

> **Estado:** propuesta aprobada para aterrizar (2026-08-27). Diseño visual y mockups en el
> artifact "Púlpito"; este documento es la versión ejecutable.
>
> Relación con [`definicion.md`](./definicion.md): ese documento define la app hermana de
> estudio teológico (herencia IglesiaFiel). Este plan **hereda sus patrones** (offline-first,
> SQLite+FTS5, tokens, reglas de oro) pero **contradice su §2.3 a propósito**: aquí NO va repo
> separado — ver M-01.

---

## 1. Tesis de producto

La web es donde el sermón **se estudia** (exégesis, semilla pastoral, fidelidad de citas).
La tablet es donde el sermón **se encarna**: se ensaya, se predica, se anota con la mano y
queda registro de que ocurrió. La app no compite con la web — cierra el ciclo de vida que la
web deja abierto en el momento más importante: el domingo.

**Orden de entrega (decisión del fundador):** primero el módulo de predicación (Púlpito),
después el de creación/edición (Redactor).

**Prueba ácida (Brooks):** "verdad a través de personalidad". Nada en esta app genera texto.
El canvas de tinta, el registro post-predicación y el modo ensayo existen para que la
personalidad del predicador atraviese el contenido.

## 2. Los tres activos que convergen

1. **`packages/web/src/pages/sermons/preach.tsx` (747 líneas)** — el modo predicación web ya
   resolvió: timer con umbrales y duración objetivo, blackout, fullscreen, secciones parseadas
   del markdown (`##`, `extractSections` + slugify en `:62-98`), progreso de scroll,
   anotaciones. Se porta el *diseño de interacción*, no el código.
2. **El dominio ya modela el ciclo completo sin cliente que lo alimente:**
   - `Sermon.preachingHistory: PreachingLog[]` (`packages/domain/src/entities/Sermon.ts:8-13`)
     con `addPreachingLog()` (`:702`) — fecha, lugar, duración, notas.
   - Subcolección `sermons/{id}/annotations` con doc `main` (`snapshotJSON`) —
     `SermonService.ts:530-558`.
3. **El módulo Biblia offline de `packages/mobile`** (~1.400 líneas funcionales): RVR1960 +
   ASV, lector con navegación, vista paralela, búsqueda, breakpoint tablet. En el púlpito:
   tap en cita bíblica → pasaje en panel lateral **sin red**.

## 3. Inventario de `packages/mobile` (2026-08-27)

Fork congelado desde 2026-02-25 (~6 meses / ~470 PRs detrás de main). Expo 52 / RN 0.76,
Clean architecture de 4 capas (`src/{domain,data,core,presentation}`), ~4.700 líneas propias.

| Pieza | Estado | Decisión |
|---|---|---|
| Módulo Biblia (~1.400 l.) | ✅ funciona e2e | Rescatar; JSON 10 MB → SQLite+FTS5 (F2) |
| Auth email/password + guard | ✅ funciona e2e | Rescatar patrón; SDK JS → nativo |
| Tema/i18n es-en/toasts | ✅ funciona | Rescatar |
| Diseños Stitch (15 pantallas, `stitch_design.mobile/`) | 🎨 solo diseño | Referencia visual; `preaching_mode_(tablet)` coincide con este plan |
| Sermones lista/detalle | ⚠️ modelo incompatible (`title/preacher/videoUrl`) | Reescribir contra dominio real |
| Home dashboard | ⚠️ datos hardcodeados | Reescribir sobre `getSermonsListSummary` |
| Eventos / Tutor / Study | ❌ muerto o placeholder | Eliminar en v1 |
| Firebase SDK JS | ❌ dep fantasma (no está en `package.json`, resuelve por hoisting), sin offline en RN | Reemplazar por `@react-native-firebase` |
| Branding | ❌ template (`com.rcerda.mobile`, íconos Expo, README de create-expo-app) | Rebrand completo |

Deuda puntual adicional: clientId de Google OAuth hardcodeado en `LoginScreen.tsx`; avatar
apuntando a URL externa fija (`UserAvatar.tsx`); fuente Lexend declarada en Tailwind pero
jamás cargada; `+not-found` referenciado sin archivo; `seed_data.ts` y
`firebase-persistence.ts` muertos; cero tests.

## 4. Lo que el backend ya ofrece

- **Contenido**: `sermons/{id}.content` es markdown con secciones `##` y HTML crudo
  (`<br/>`, `---`). Serializador en `packages/web/src/pages/sermons/generator/draft/sermonContent.ts`.
- **Citas**: marcadores ordinales `[N]` → `citationManifest.entries[idx]` (excerpt ≤280,
  título, página, licencia). Footer legal: `aggregateRequiredAttributions()`.
  (`[Sn]` es basura que el sanitizador borra — `stripSermonCitationMarkers.ts`.)
- **Lista barata**: callable `getSermonsListSummary` (PR #297) — resúmenes sin `content` ni
  manifest, con `hasContent`. **Exige App Check** (`appCheckCallableOptions`).
- **Detalle**: lectura directa Firestore (`findById`), sin callable → con SDK nativo cae en
  caché offline gratis.
- **Ciclo de vida**: `working → draft → published → archived`; `publishAsCopy()` crea doc
  nuevo sin `wizardProgress`.
- **Highlights del preach web**: hoy solo `localStorage` (`useHighlights.ts`, clave
  `sermon-{id}-highlights`) — sin sync. Ver M-05.
- **Series**: `Sermon.seriesId` ↔ `SermonSeries.sermonIds[]` (sin transacción — asumir
  posible desincronía al agrupar la lista).

## 5. Decisiones de arquitectura

### M-01 — Revivir `packages/mobile` dentro del monorepo (no repo nuevo)
`definicion.md` §2.3 recomienda repo separado, pero ese consejo aplica al monorepo de
IglesiaFiel (deuda de hoisting, dominio ajeno). Este monorepo está sano y —decisivo—
`@dosfilos/domain` es TS puro consumible por la tablet (tipos `Sermon`, `CitationManifest`,
parseo bíblico compartido del #490). Duplicar tipos en repo aparte recrearía el drift que el
#501 mató. **Costo:** Metro para workspaces (watchFolders + resolver).

### M-02 — Stack canónico: Expo SDK 57 + `@react-native-firebase`
Directiva byblos "Stack mobile canónico": Expo moderno / New Arch / NativeWind /
TanStack Query + Zustand / Expo Router / EAS. **Ajuste 2026-08-27 (aprobado por el
fundador durante F0)**: la directiva decía Expo 56 / RN 0.85, pero Expo 56 arrastra la
regresión de memoria de Hermes V1 (fix en RN 0.86.2); se sube directo a **Expo 57 /
RN 0.86**, que `expo-doctor` recomienda explícito. El SDK JS de Firebase no tiene persistencia
offline en RN (solo memoria) — descalificante para una app cuyo momento de uso no puede
depender del WiFi de la iglesia. El nativo da caché en disco + cola de escrituras offline
gratis. Migrar después cuesta meses; al inicio cuesta cero (lección central de
`definicion.md` ADR-004). **Costo:** sin Expo Go — dev builds EAS (App Check lo exige igual).

### M-03 — Offline explícito: el "maletín"
Acción **"Preparar para predicar"**: baja el doc completo (content + manifest +
bibliography), lo fija localmente, y la lista marca qué sermones están garantizados offline.
El predicador *ve* el check verde antes de subir al púlpito. Escrituras (highlights, log,
tinta) siempre optimistas — se encolan y sincronizan al volver la señal.

### M-04 — App Check desde el día 1
`getSermonsListSummary` — la primera llamada de la app — lo exige. Play Integrity (Android) +
App Attest (iOS) + debug tokens documentados. Si se pospone, la app no lista ni un sermón.
Prototipar en la primera semana de F0.

### M-05 — Highlights y tinta a Firestore, anclados por sección
Los highlights del preach web se promueven a `sermons/{id}/annotations`, anclados a
`(sectionSlug, offset)` — no offset global — para sobrevivir ediciones. Reconciliación
último-en-escribir-gana **por registro**, con `updatedAt + deviceId`. Beneficio doble: la
tablet los ve y la web gana sync entre navegadores.

### M-06 — Biblia local en SQLite + FTS5, parser de dominio compartido
Se rescata el módulo pero los JSON (4.1 + 5.9 MB) salen del bundle → SQLite precargada como
asset. La normalización de referencias usa la tabla compartida de `@dosfilos/domain` (fix
`Gén/Éx/Núm`, #490). **Tercera copia prohibida**; si la tablet necesita adaptador propio,
entra al test de paridad existente.

### M-07 — El wizard de 8 pasos NO se porta
La espina pastoral (semilla, `PASTOR_VOICE_STEPS`, fidelity gate, verificador) depende de
callables pesados y UI de escritorio; portarla duplicaría la política que el #500
des-sextuplicó. El Redactor (v2) edita **borradores existentes** y crea "sermón rápido"
(`title/content/bibleReferences`, camino de `edit.tsx` web). Jamás toca `wizardProgress`
(trampa documentada de `sectionElements` con claves con puntos). El estudio profundo
permanece en la web; la tablet lo consulta read-only.

### M-08 — Auth v1: email/password + Google + Apple
Google Sign-In **nativo** en F1 (decisión del fundador). El intento de febrero murió por el
proxy de Expo Go + clientId hardcodeado; con dev builds (M-02) ese problema no existe:
`@react-native-firebase/auth` + Google Sign-In nativo, mismo UID que la cuenta web. Política
igual a web: Google = login-only, el registro sigue payment-first en web. **Consecuencia
aceptada**: App Store guideline 4.8 exige ofrecer Sign in with Apple si hay Google → Apple
entra también en F1. Costo: OAuth client ids iOS/Android + SHA-1 en consola, ~2 PRs.

### M-09 — Soporte e-ink de primera clase (BOOX)
El fundador predica con una BOOX 10.3 Gen II (Android e-ink, lápiz EMR Wacom). Dos
consecuencias de diseño: (1) el modo púlpito ya navega **por sección, no por scroll** — ideal
para e-ink; se agrega **modo tinta electrónica**: negro/blanco puro, cero animaciones,
timer que refresca por minuto, transiciones de página completa. (2) **Riesgo App Check**:
dispositivos e-ink pueden fallar Play Integrity (certificación GMS variable) — verificar en
F0 con la BOOX real; mitigación: debug token provisionado para dispositivos internos.

## 6. Módulo 1 — Púlpito

Flujo: **Mis sermones → Preparar (offline) → Ensayar → Predicar → Registrar.**

### Pantalla de predicación
- **Tipografía primero**: serif para el cuerpo, 20–40 pt ajustable, interlineado y medida
  configurables, persistidos y sincronizados. Respeta tamaño de fuente del sistema.
- **Cinco modos de luz**: claro, sepia, oscuro, **modo atril** (alto contraste, brillo
  fijo, `expo-keep-awake` siempre) y **modo tinta electrónica** (M-09: negro/blanco puro,
  cero animaciones, refrescos mínimos).
- **Layouts**: página completa / media página (sermón + canvas de tinta al margen).
- **Avance**: zonas de tap (⅓ izq/der), swipe, teclas de volumen, **pasadores BT/pedales**
  (HID flechas — estándar de músicos/teleprompters). Navegación por sección, no scroll libre.
- **Timer**: duración objetivo por sermón, umbrales verde (<80%) / ámbar (80–100%, un pulso
  háptico) / rojo tenue (pasado). Sin sonidos. Blackout con doble tap de dos dedos.
- **Citas vivas**: tap en `[N]` → popover con fuente del manifest; tap en referencia bíblica
  → pasaje en panel lateral desde la Biblia offline.
- **Marcas sobre el texto** (dos etapas): en F1, resaltado por **frase/párrafo con tap
  largo** (colores, sin selección por carácter — la selección fina en RN exige render propio
  por spans). En F2, selección fina + **marcas de predicador**: glifos al margen de una
  línea — pausa, énfasis, bajar la voz, mirar a la congregación, "aquí la ilustración" — lo
  que se hace a lápiz en papel. Todo anclado por `(sectionSlug, offset)` y sincronizado (M-05).
- **Canvas de tinta** (react-native-skia + Apple Pencil / S Pen / lápiz EMR BOOX): margen
  por sección; persiste en `annotations` (M-05). La tinta del ensayo del sábado aparece el
  domingo.

### Modo ensayo
Mismo lector; el timer **registra tiempo real por sección**. Al terminar: tabla sección ×
(tiempo real vs proporcional al objetivo), secciones pasadas de peso marcadas. El predicador
descubre el miércoles que la introducción le come 12 de sus 35 minutos. Datos locales al
sermón; es un cronómetro honesto, cero exposición de "IA" (regla de copy).

### Registro post-predicación
Al salir del modo púlpito tras >10 min: pantalla (no modal apurado) para registrar la
predicación — fecha y duración pre-llenadas por el timer, lugar recordado del último
registro, notas opcionales. Escribe `addPreachingLog()`. La web gana gratis el historial de
predicaciones en el detalle.

## 7. Módulo 2 — Redactor (segunda entrega)

- **Editar borradores existentes**: sermones `draft/working` en editor por secciones
  (outline izquierda + prosa derecha en `expanded`). Edita `content`; jamás `wizardProgress`.
- **Sermón rápido**: título + pasaje + prosa markdown (camino `edit.tsx`).
- **Panel de estudio read-only**: exégesis y semilla pastoral se consultan mientras se
  redacta; se producen en la web.
- **Dictado**: el teclado del sistema lo da; el editor no debe estorbarlo.

## 8. Roadmap

Cada PR = unidad funcional completa testeable (regla del proyecto). Cada fase termina en
algo probable en tablet real.

| Fase | Contenido | ~PRs | Cierre |
|---|---|---|---|
| **F0** Cimientos | Upgrade Expo 52→57, `@react-native-firebase`, App Check (App Attest + Play Integrity + **verificación en BOOX real**), Metro workspace (`@dosfilos/domain` importable), rebrand (app.json, íconos, Lexend real — nombre/bundle id: ver §10), tokens con 5 modos (incl. e-ink), limpieza (eventos/template/dep fantasma), CI job mobile (typecheck + lint + bundle Metro). **iOS y Android desde el inicio** | 3 | Base sana en ambas plataformas, sin pantallas nuevas |
| **F1** Púlpito mínimo | Lista real (`getSermonsListSummary`, published, agrupada por serie) → detalle → modo púlpito: markdown por secciones, tipografía ajustable, 5 modos de luz, timer, keep-awake, blackout, tap/swipe/volumen, riel de secciones, `[N]` popover + footer atribuciones. **Google + Apple Sign-In (M-08). Resaltado por frase/párrafo (tap largo).** Al cierre: **beta interna** (TestFlight internal iOS + Play internal testing Android, 2-3 usuarios) | 5-6 | Se predica un sermón real desde la tablet; beta interna corriendo |
| **F2** Maletín + anotaciones | "Preparar para predicar" (pin offline + indicador), highlights → Firestore (web migra de localStorage), **selección fina de texto + marcas de predicador (glifos)**, canvas de tinta con Pencil/S Pen/EMR BOOX, panel Biblia offline (SQLite, parser compartido), pulido modo e-ink | 5 | Domingo sin WiFi = cero riesgo |
| **F3** Ensayo + registro | Modo ensayo con tiempos por sección, pantalla post-predicación → `addPreachingLog()`, historial visible en web, pasadores BT/pedal | 3 | Ciclo de vida del sermón cerrado |
| **F4** Redactor | Editor de borradores por secciones, sermón rápido, panel estudio read-only, atajos teclado externo | 4 | Segunda entrega mayor |

## 9. Riesgos

| Riesgo | Peso | Mitigación |
|---|---|---|
| App Check en RN estorba el arranque | Alto | Prototipar primera semana de F0; debug tokens en README nuevo |
| Play Integrity falla en la BOOX (e-ink, certificación GMS variable) | Medio | Verificar en F0 con el dispositivo real; debug token provisionado para equipos internos |
| Upgrade Expo 52→57 rompe módulo Biblia | Medio | Es TS puro + AsyncStorage; migración JSON→SQLite (F2) reduce superficie |
| Selección fina de texto en RN más cara de lo estimado | Medio | Por eso F1 lleva tap-largo por frase/párrafo; la selección fina no bloquea el resaltado |
| Markdown con HTML crudo (`<br/>`) | Bajo | Render propio por bloques; no depender de librerías de render HTML muertas |
| Divergencia con Stitch de febrero | Bajo | Stitch sigue siendo referencia; `preaching_mode_(tablet)` coincide |

## 10. Decisiones del fundador (2026-08-27)

| Pregunta | Decisión |
|---|---|
| Google Sign-In | **En v1 (F1)**, nativo, login-only |
| Apple Sign-In | **En F1** (obligatorio por guideline 4.8 al ofrecer Google) |
| Billing/quota en tablet | **V1 solo lee** — sin fricción de planes hasta el Redactor |
| Plataformas | **iOS y Android desde F0** |
| Branding | ✅ **Confirmado**: nombre "Dos Filos Preach", bundle id `com.dosfilos.preach` (iOS y Android). Íconos se producen en F0 |
| Hardware canvas | Apple Pencil + S Pen + **BOOX 10.3 Gen II** (fundador) → M-09 e-ink |
| Beta | **Prueba interna con 2-3 usuarios** al cierre de F1 (TestFlight internal + Play internal testing: distribución privada por invitación, sin revisión pública de tienda) |
| Merge PR #503 | Tras esta actualización |

## 11. Reglas de oro heredadas (de `definicion.md` §11, vigentes aquí)

Ninguna pantalla fuera del router · ningún hex literal (tokens) · ningún string literal en
JSX (i18n) · ninguna pantalla importa Firebase/SQLite (solo `src/data/`) · ningún `any` ·
ninguna escritura del predicador espera a la red · ningún merge sin CI verde.
