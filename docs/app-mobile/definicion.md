# App de Estudio Teológico — Definición inicial de arquitectura y diseño

> **Proyecto hermano de IglesiaFiel.** Documento fundacional: define el stack, la arquitectura, el modelo de dominio y las reglas de trabajo **antes de la primera línea de código**.
>
> Premisa: no partir de cero. IglesiaFiel dejó dos cosas — un conjunto de prácticas de operación que están a nivel de industria, y un catálogo preciso de errores estructurales que costaron meses. Esta app hereda las primeras y **no repite los segundos**.
>
> Estado: **borrador para decidir**. Ver §1.2 — hay tres preguntas cuya respuesta cambia partes del diseño.

---

## 1. Supuestos y preguntas abiertas

### 1.1 Supuestos de trabajo

Todo lo que sigue asume esto. Si algo no aplica, avisar y se ajusta la sección correspondiente.

| # | Supuesto | Impacto si es falso |
|---|---|---|
| S1 | El producto es **estudio estructurado**: programas → cursos → lecciones, con progreso del estudiante | Cambia el modelo de dominio (§6) |
| S2 | El contenido es **autoral y mayormente de lectura** (lo escribe la institución, no los usuarios) | Habilita el modelo de *content packs* (§7) — la decisión más importante del documento |
| S3 | **Tablet es un objetivo real**, no un teléfono estirado | Define el sistema de layout (§8) |
| S4 | El uso **offline es normal**, no excepcional (viaje, zonas sin cobertura, tablet solo-WiFi) | Es el eje de toda la arquitectura de datos |
| S5 | Hay un rol **docente/tutor** que corrige y acompaña, no solo consumo autoservicio | Agrega superficies y reglas de permisos |
| S6 | El texto bíblico es contenido de primera clase (citas, comparación de versiones) | Requiere motor bíblico dedicado (§7.4) |
| S7 | Equipo pequeño (1–2 personas), como IglesiaFiel | Descarta stacks que exigen equipo de plataforma |
| S8 | Español primero, inglés probable después | i18n desde el día 1 (barato ahora, carísimo después) |

### 1.2 Preguntas que cambiarían este diseño

1. **¿Es multi-institución (multi-tenant) o una sola escuela?** Multi-tenant obliga a que `institutionId` esté en el modelo, en las reglas y en cada índice **desde el primer día**. Agregarlo después es una migración brutal. *El documento asume multi-tenant, porque es el supuesto caro de revertir en la dirección barata.*
2. **¿Hay dinero de por medio?** (matrícula, suscripción, compra de cursos) → agrega pasarela de pago, facturación, entitlements comerciales y superficie regulatoria.
3. **¿Certificación formal?** (créditos, título, acreditación) → agrega integridad académica: verificación de identidad, evaluaciones con control, auditoría inmutable de calificaciones.

---

## 2. Lo que se hereda de IglesiaFiel

### 2.1 Se copia tal cual — está a nivel de industria

| Práctica | Origen | Por qué |
|---|---|---|
| `runtimeVersion: "fingerprint"` | `app.json` | Única política que sabe de verdad si un bundle JS corre sobre un binario |
| `publish-ota.sh` con fan-out por runtime | `apps/mobile/scripts/` | Evita binarios huérfanos. Y **falla si no publica nada** — un no-op en verde es peor que un error |
| `fingerprint.config.js` ignorando `eas.json` | idem | El bloque `submit` no cambia un byte de la app; incluirlo genera falsos negativos |
| Version gate server-driven | `appConfig/mobileRelease` | Los cambios nativos no viajan por OTA; hay que poder exigir actualización desde el servidor |
| Sentry con tags de `runtimeVersion` + `updateId` | `App.tsx` | Sin eso, un crash no dice sobre qué bundle ocurrió |
| Sentry con `sendDefaultPii: false` + breadcrumbs de consola descartados | idem | Hay datos sensibles. Aquí también: notas de estudio, evaluaciones, posiblemente menores |
| **Bundle real de Metro en CI** | `ci.yml` | Metro falla por cosas que `tsc` no ve. Atrapó dos crashes que habrían costado builds de EAS |
| Matriz de timezones en tests de dominio | `ci.yml` | Un bug de fechas pasa bajo `TZ=UTC` (el default de CI) y explota en producción |
| Guardián sintáctico de patrones de fecha | `scripts/check-date-patterns.mjs` | Los tipos no alcanzan: `new Date(civilDate)` compila igual |
| Arquitectura hexagonal (entities / repositories / use-cases) | `packages/core` | Está bien construida. El error no fue diseñarla — fue no adoptarla |
| Comentarios que explican **por qué** y qué incidente lo causó | todo el repo | Práctica excepcional. Es documentación que no se desincroniza |

### 2.2 Se hace distinto — la lista de "no repetir"

| Error en IglesiaFiel | Costo | Regla para este proyecto |
|---|---|---|
| Navegación con `useState` de 58 strings en `App.tsx` (1.197 líneas) | Sin deep links, back stack a mano, 96 props en una pantalla, refactor de 3–4 semanas | **Router desde el primer commit.** Nunca una pantalla fuera del router |
| 2.420 hex hardcodeados, cero tokens | Modo oscuro imposible, contraste AA fallando en 214 lugares | **Tokens antes de la primera pantalla.** ESLint prohíbe hex literales |
| Cero i18n en mobile, ~1.000 strings en español | Retrofit de semanas | **i18n desde el primer string.** ESLint prohíbe literales en JSX |
| 6 props de a11y en 122 archivos | Excluye a usuarios reales; retrofit por pantalla | **a11y en las primitivas base**, no en cada pantalla |
| 1 test en 122 archivos, y no corría en CI | Todo refactor es a ciegas | **CI completo antes de la feature 1**, no después de la 30 |
| 20 pantallas pegándole al SDK de Firestore, saltando los repositorios que ya existían | Sin caché, sin reintento, N+1 en cada login | **Ninguna pantalla importa el SDK.** Regla de ESLint desde el día 1 |
| Persistencia offline imposible (JS SDK en RN) | App inútil sin señal; migración cara descubierta tarde | **Offline decidido en el día 1** (§7), no parcheado en el mes 12 |
| Sin analytics tras 30+ features | Nadie sabe qué módulo se usa | **Analytics con la primera feature** |
| Biblia de 4.1 MB por `require()` de JSON | Riesgo de memoria, parseo caro | **SQLite con FTS5 como asset** (§7.4) |
| Dos copias de `@types/react` por hoisting del monorepo | `tsconfigPaths: false` + workarounds documentados | **Un solo React**, verificado en CI |
| `package-lock` desincronizado → CI usa `npm install` en vez de `npm ci` | Builds no reproducibles | **`npm ci` siempre.** Lock desincronizado = CI rojo |

### 2.3 Decisión de repositorio: **repo nuevo, separado**

Tentador meter `apps/estudio` en el monorepo actual y compartir `packages/core`. **No conviene:**

- El monorepo de IglesiaFiel carga deuda conocida y documentada: dos copias de tipos de React, lockfile desincronizado, `tsconfigPaths: false`, hoisting frágil. La app nueva heredaría todo eso desde el commit 1.
- `packages/core` es **dominio de iglesia** (miembros, ofrendas, consejería, predicación). Estudio teológico es otro dominio. Compartirlo acopla dos productos que van a divergir.
- Ritmos de release distintos. Un OTA de estudio no debería depender de que el CI de la iglesia esté verde.

**Lo que sí se comparte: patrones, no código.** Se copian los archivos que valen (`publish-ota.sh`, `fingerprint.config.js`, los workflows de CI, `check-date-patterns.mjs`, el helper `ScreenLayout`) y se adaptan.

**Excepción, más adelante:** si nacen tres o más apps de la misma casa, extraer un `@dosfilos/rn-kit` (design system + datetime + setup de i18n + primitivas de a11y) versionado por tag de git. **No antes de tener dos consumidores reales.** Abstraer con un solo consumidor produce la abstracción equivocada.

---

## 3. Decisiones de arquitectura (ADR)

> Formato: decisión · alternativas descartadas · por qué.

### ADR-001 — Expo (managed) + EAS
**Decisión:** Expo SDK más reciente estable, con development builds (no Expo Go).
**Alternativas:** RN bare; Flutter; nativo.
**Por qué:** el equipo ya opera Expo/EAS a nivel experto — OTA con fingerprint, fan-out por runtime, version gate, rollouts escalonados. Ése es el activo más valioso que se trae, y no es transferible a Flutter ni a bare. Con un equipo de 1–2 personas, tirarlo sería el error más caro posible.
**Costo aceptado:** sin Expo Go (por los módulos nativos de ADR-004). Irrelevante: ya se trabaja con dev builds.

### ADR-002 — TypeScript en modo estricto, sin escape
**Decisión:** `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. `any` prohibido por lint (`@typescript-eslint/no-explicit-any` en error).
**Por qué:** IglesiaFiel acumuló 115 `any` y una deuda de typecheck que llegó a 669 errores. Se saldó (PR #312), pero el costo fue enorme. Con `strict` desde el commit 1 el costo es cero.

### ADR-003 — `expo-router` desde el commit 1
**Decisión:** ruteo por archivos. **Ninguna** pantalla se renderiza fuera del router.
**Alternativas:** react-navigation manual; navegación por estado (lo que hizo IglesiaFiel).
**Por qué:** el `App.tsx` de 1.197 líneas es la deuda estructural más cara del proyecto hermano, y **nació de una decisión de un día**. Deep linking, back nativo, boundaries por ruta, layouts anidados y estado tipado de ruta salen gratis si se empieza así.
**Regla dura:** un PR que renderice una pantalla fuera del router se rechaza.

### ADR-004 — `@react-native-firebase` (nativo), **no** el SDK JS
**Decisión:** módulos nativos de Firebase para Auth, Firestore y Messaging.
**Alternativa:** SDK JS de Firebase (lo que usa IglesiaFiel).
**Por qué:** el SDK JS **no tiene persistencia offline en React Native** — usa IndexedDB, que RN no provee. Solo hay caché en memoria: matar la app borra todo. Para una app de estudio, donde el supuesto S4 dice que el uso offline es normal, eso descalifica al SDK JS. El nativo trae persistencia en disco, **cola de escrituras offline** y reconciliación automática, gratis.
**Beneficio secundario:** push nativo bien resuelto. IglesiaFiel gastó un ciclo entero en que iOS no recibía nada (token APNs crudo rechazado por FCM).
**Costo aceptado:** sin Expo Go; config plugins en el build. Ambos ya asumidos por ADR-001.
**Nota:** es exactamente la migración que en IglesiaFiel se pospuso por ser demasiado cara *a posteriori*. Al inicio cuesta cero. Ésta es la lección más valiosa del documento.

### ADR-005 — Contenido en *packs* versionados sobre SQLite; estado del alumno en Firestore
**Decisión:** arquitectura de datos partida en dos por naturaleza del dato (detalle en §7).
- **Contenido** (cursos, lecciones, texto bíblico, glosario): inmutable y versionado. Se publica como *pack* firmado, se descarga y vive en **SQLite local** (`expo-sqlite`), con búsqueda full-text FTS5.
- **Estado del alumno** (progreso, notas, subrayados, entregas): mutable, por usuario, necesita sincronizar → **Firestore nativo** con su cola offline.

**Alternativa descartada:** todo en Firestore. Falla por costo (cada lectura de lección se paga), por rendimiento (una lección larga son cientos de documentos) y por búsqueda (Firestore no hace full-text).
**Alternativa descartada:** local-first puro con motor de sync (PowerSync, ElectricSQL). Técnicamente superior, pero agrega un backend nuevo y un modelo de conflictos que un equipo de 1–2 personas no debería mantener. **Sobre-ingeniería para esta escala.**
**Por qué esta:** cada tipo de dato queda donde su naturaleza lo pide. El contenido —que es el 95% de los bytes y el 99% de las lecturas— nunca toca la red después de descargarse.

### ADR-006 — TanStack Query como única capa de estado de servidor
**Decisión:** ninguna pantalla hace fetching. Los hooks envuelven repositorios; Query administra caché, deduplicación, reintento y revalidación.
**Por qué:** IglesiaFiel tiene 55 llamadas sueltas a Firestore en 20 pantallas, sin caché ni reintento. Query lo resuelve de fábrica.
**Regla de ESLint:** `firebase/*` y `@react-native-firebase/*` solo importables desde `src/data/**`.

### ADR-007 — Zustand para estado de cliente
**Decisión:** Zustand para lo que no es dato de servidor (preferencias de lectura, sesión de estudio en curso, borradores).
**Por qué:** los Context de IglesiaFiel recrean su value en cada render y re-renderizan a todos sus consumidores. Zustand tiene suscripción selectiva y no arrastra ese problema. Context queda solo para lo verdaderamente global e inmutable (theme, i18n, sesión).

### ADR-008 — Design system con tokens semánticos, antes de la primera pantalla
**Decisión:** `theme/` con tokens primitivos + **capa semántica**, tres modos (claro / oscuro / **sepia**), y primitivas base (`Text`, `Button`, `Card`, `Screen`, `SplitView`).
**Por qué:** 2.420 hex en la app hermana. Y el modo sepia no es capricho: es una app de **lectura larga** — sepia y oscuro son funcionalidad, no decoración.
**Regla de ESLint:** hex literales prohibidos en `src/**`.

### ADR-009 — Accesibilidad en las primitivas
**Decisión:** los componentes base traen `accessibilityRole`, `accessibilityLabel` requerido por tipos y touch targets ≥ 44×44 **por construcción**. Contraste AA verificado en los tokens, no por pantalla. Tipografía respeta el tamaño de fuente del sistema.
**Por qué:** en IglesiaFiel la a11y es prácticamente cero y su retrofit cuesta una barrida completa de 58 pantallas. Si `<Button>` no compila sin label, el problema no existe nunca.
**Extra en esta app:** lectura prolongada de texto denso → tamaño de fuente, interlineado y ancho de línea ajustables son requisito de producto, y coinciden con lo que pide la accesibilidad.

### ADR-010 — i18n desde el primer string
**Decisión:** `i18next` + `react-i18next`, `es` y `en` desde el commit 1 (`en` puede ir incompleto). ESLint prohíbe literales de texto en JSX.
**Por qué:** IglesiaFiel tiene regla estricta de i18n en web y **cero** en mobile — la asimetría salió de no ponerlo al principio.
**Cuidado propio del dominio:** el contenido teológico se traduce con criterio, no mecánicamente. Los *packs* llevan idioma propio y se versionan por idioma; i18n cubre la **interfaz**, no el contenido.

### ADR-011 — Pirámide de tests desde el día 1, corriendo en CI
**Decisión:**
- **Unitarios** (Vitest): dominio puro — progreso, calificación, planificación de lecturas, referencias bíblicas. Con matriz de timezones desde el inicio.
- **Componentes** (React Native Testing Library): primitivas y flujos con estado.
- **E2E** (Maestro): 5–8 recorridos críticos, en CI con emulador.
- **Reglas de Firestore**: contra emulador, en cada PR.

**Por qué:** IglesiaFiel llegó a 122 archivos con 1 test que ni siquiera corría. Toda la refactorización se vuelve entonces una apuesta. Aquí el CI se monta **antes** de la primera feature.

### ADR-012 — Analytics y feature flags con la primera feature
**Decisión:** PostHog (analytics + flags en una integración) desde el arranque. Eventos con `institutionId` y **id de usuario hasheado**; jamás email, nombre ni contenido de estudio.
**Por qué:** IglesiaFiel construyó 30+ features sin saber cuáles se usan. Instrumentar después nunca llega.

### ADR-013 — Fecha y hora: un solo modelo, desde el inicio
**Decisión:** adoptar el modelo de `packages/core/domain/datetime` de IglesiaFiel (`CivilDate` como string branded, `coerceCivilDate`, `formatCivil`) + el guardián sintáctico en CI + la matriz de timezones.
**Por qué:** el proyecto hermano gastó una arquitectura completa (fases F1–F7, PRs #327–#339) en arreglar fechas retroactivamente, tras un bug de producción donde `new Date('1978-10-05')` devolvía el 4 de octubre. **Ese trabajo ya está hecho y probado — se trasplanta el día 1 y cuesta una tarde.**
**Relevancia directa:** fechas de entrega, plazos de evaluación y planes de lectura son el corazón de una app de estudio. Es exactamente el terreno donde ese bug hace daño.

---

## 4. Stack propuesto

| Capa | Elección | Nota |
|---|---|---|
| Runtime | Expo SDK estable más reciente + RN correspondiente, New Architecture activa | ADR-001 |
| Lenguaje | TypeScript `strict` | ADR-002 |
| Navegación | `expo-router` | ADR-003 |
| Backend | Firebase: Auth + Firestore + Storage + Cloud Functions | Continuidad de expertise |
| Cliente de Firebase | `@react-native-firebase/*` (nativo) | ADR-004 |
| Base local | `expo-sqlite` (FTS5) + Drizzle ORM | ADR-005 |
| Estado de servidor | TanStack Query | ADR-006 |
| Estado de cliente | Zustand | ADR-007 |
| Estilos | StyleSheet + tokens propios (`unistyles` si hace falta reactividad de theme) | ADR-008 |
| Animación | Reanimated + Gesture Handler | Lector con gestos |
| Imágenes | `expo-image` | Caché de disco + downsample desde el día 1 |
| i18n | `i18next` + `react-i18next` + `expo-localization` | ADR-010 |
| Formularios | React Hook Form + Zod | Zod también valida los *packs* al descargar |
| Tests | Vitest · RNTL · Maestro · emulador de reglas | ADR-011 |
| Crashes | Sentry (PII off, tags de runtime/update) | Heredado |
| Producto | PostHog (analytics + flags) | ADR-012 |
| CI/CD | GitHub Actions + EAS Build/Update/Submit | Workflows heredados |

---

## 5. Estructura del repositorio

```
estudio-teologico/
├─ app/                        # rutas (expo-router) — SOLO ruteo y composición
│  ├─ _layout.tsx              # providers: Theme, i18n, Query, Auth, DB
│  ├─ (auth)/                  # login, registro, recuperación
│  └─ (app)/
│     ├─ _layout.tsx           # guard de sesión + shell adaptativo (§8)
│     ├─ index.tsx             # panel del estudiante
│     ├─ cursos/               # catálogo, detalle, temario
│     ├─ leccion/[id]/         # el lector — corazón del producto
│     ├─ biblioteca/           # recursos descargables
│     ├─ cuaderno/             # notas y subrayados del alumno
│     ├─ evaluaciones/         # quizzes y entregas
│     ├─ docente/              # correcciones, cohortes (rol tutor)
│     └─ ajustes/
├─ src/
│  ├─ domain/                  # TS puro, cero dependencias, 100% testeado
│  │  ├─ curriculum/           # programas, cursos, lecciones, prerrequisitos
│  │  ├─ progress/             # cálculo de avance, rachas, hitos
│  │  ├─ assessment/           # calificación, intentos, rúbricas
│  │  ├─ scripture/            # parseo y normalización de referencias bíblicas
│  │  └─ datetime/             # trasplantado de IglesiaFiel (ADR-013)
│  ├─ data/                    # ÚNICO lugar que toca Firebase o SQLite
│  │  ├─ repositories/         # interfaces (puertos)
│  │  ├─ firebase/             # adaptadores de estado del alumno
│  │  ├─ local/                # esquema Drizzle, migraciones, consultas
│  │  └─ packs/                # descarga, verificación e instalación de packs
│  ├─ features/                # por dominio: hooks + componentes + tipos
│  ├─ ui/                      # design system
│  │  ├─ theme/                # tokens, semántica, modos claro/oscuro/sepia
│  │  └─ primitives/           # Text, Button, Card, Screen, SplitView, Reader
│  ├─ i18n/
│  └─ lib/                     # logger, analytics, sentry, flags
├─ assets/
│  └─ bible/                   # SQLite precargada (§7.4)
├─ functions/                  # Cloud Functions
├─ e2e/                        # flujos de Maestro
├─ scripts/                    # publish-ota.sh, check-date-patterns.mjs, build-pack.ts
└─ .github/workflows/
```

**La regla que sostiene todo:** `app/` no contiene lógica. Una ruta compone features. Una feature usa hooks. Un hook usa repositorios. Solo `src/data/` conoce Firebase o SQLite. ESLint lo hace cumplir con restricciones de import — no es una convención que se recuerde, es una que se verifica.

---

## 6. Modelo de dominio inicial

### 6.1 Contenido (inmutable, versionado, viaja en packs)

```
Institution
 └─ Program              # p.ej. "Diplomado en Teología Bíblica"
     └─ Course           # "Doctrina de la Salvación"
         └─ Module       # unidad temática
             └─ Lesson   # unidad de lectura/estudio
                 ├─ Block[]        # contenido: prosa, cita bíblica, cita de autor,
                 │                 #   pregunta, nota al pie, imagen, audio
                 ├─ ScriptureRef[] # referencias normalizadas
                 ├─ GlossaryTerm[] # términos con definición
                 └─ Assessment?    # evaluación asociada
```

Decisiones clave:
- **`Block[]` estructurado, no HTML.** IglesiaFiel arrastra `react-native-render-html`, sin mantención. Un modelo de bloques tipado se renderiza nativo, es accesible, es buscable y no depende de una librería muerta.
- **Prerrequisitos explícitos** entre cursos y módulos: el dominio decide qué está desbloqueado, no la UI.
- **Todo contenido lleva `version` y `contentHash`** — es lo que hace posible la actualización incremental de packs.

### 6.2 Estado del alumno (mutable, por usuario, sincroniza)

```
Enrollment       # alumno ↔ curso: estado, cohorte, fechas
LessonProgress   # posición de lectura, %, completada, tiempo dedicado
Highlight        # rango de texto + color + lección
Note             # texto libre, anclado a lección o a bloque
Bookmark
Submission       # entrega de evaluación: intentos, respuestas, estado
Grade            # calificación + retroalimentación del tutor
ReadingPlan      # plan personal o asignado, con fechas objetivo
StudyStreak      # racha, para hábito
```

Decisiones clave:
- **Todo lleva `updatedAt` y `deviceId`.** La reconciliación es último-en-escribir-gana **por registro**, no por documento. Sin eso, editar una nota en el teléfono pisa el subrayado hecho en la tablet.
- **`Highlight` y `Note` anclan a `(lessonId, blockId, offset)`**, no a un índice global de carácter. Cuando el contenido se corrige en la v2 del pack, las anotaciones sobreviven.
- **`Submission` es append-only**: los intentos no se sobrescriben. Integridad académica (§1.2 pregunta 3).

### 6.3 Personas y permisos

```
User → Membership(institutionId, role)
roles: student | tutor | instructor | coordinator | admin
```

Trasplantar el modelo de **capacidades** de IglesiaFiel (`hasCapability`), no roles rígidos. Ese proyecto ya recorrió la migración de "rol de sistema + rol ministerial" a un eje único de perfiles con plantillas de capacidades — dolorosa, y ya resuelta. Aquí se arranca en el destino.

**Multi-tenant desde el día 1** (§1.2 pregunta 1): `institutionId` en cada documento, en cada regla, en cada índice compuesto.

---

## 7. Arquitectura de datos y offline

**Es la sección más importante del documento.** Define la diferencia principal con IglesiaFiel.

### 7.1 Las dos mitades

```
┌─ CONTENIDO ────────────────────┐   ┌─ ESTADO DEL ALUMNO ────────────┐
│ inmutable · versionado         │   │ mutable · por usuario          │
│ 95% de los bytes               │   │ pequeño, escribe seguido       │
│ 99% de las lecturas            │   │ necesita sync entre dispositivos│
│                                │   │                                │
│ Cloud Storage (pack firmado)   │   │ Firestore nativo               │
│        ↓ descarga única        │   │  ↕ cola offline automática     │
│ SQLite local + FTS5            │   │ caché en disco nativa          │
│        ↓                       │   │                                │
│ lectura instantánea, sin red   │   │ reconcilia al reconectar       │
└────────────────────────────────┘   └────────────────────────────────┘
```

### 7.2 Content packs

Un pack es un curso (o un programa) empaquetado:

```
curso-soteriologia-v3.pack        # zip
├─ manifest.json                  # id, versión, hash, idioma, tamaño, dependencias
├─ content.sqlite                 # lecciones, bloques, glosario, referencias — con FTS5
└─ media/                         # imágenes, audio (opcional, descarga diferida)
```

Ciclo de vida:
1. La institución publica → una Cloud Function construye el pack, lo firma y lo sube.
2. La app consulta el manifiesto de packs disponibles (lo único que necesita red).
3. El alumno descarga (con Wi-Fi por defecto, configurable).
4. Verificación de hash + validación del manifiesto con Zod → si falla, **no se instala**.
5. Se adjunta al SQLite local. **A partir de acá, la lectura no toca la red nunca.**
6. Las actualizaciones son incrementales: solo bajan las lecciones cuyo `contentHash` cambió.

Por qué esto gana:
- **Offline real, no "caché con suerte".** Un curso descargado funciona en un avión.
- **Costo:** cero lecturas de Firestore por leer una lección. Con 500 alumnos leyendo 20 lecciones diarias la diferencia es de órdenes de magnitud.
- **Búsqueda:** FTS5 hace full-text sobre todo el curso, instantáneo y offline. Firestore no puede hacer eso a ningún precio.
- **Rendimiento:** una lección larga se carga en milisegundos desde SQLite.

Costo aceptado: hay que construir el pipeline de empaquetado (una Cloud Function + un script). Es trabajo real, del orden de una semana, y se paga solo en el primer mes.

### 7.3 Estado del alumno

Firestore vía `@react-native-firebase` con persistencia nativa activada. Se obtiene gratis: escrituras offline encoladas y reenviadas al reconectar, caché en disco que sobrevive a matar la app, y listeners que resuelven contra caché primero.

Regla: **el estado del alumno se escribe optimista, siempre.** Marcar una lección como completada no espera a la red — jamás. Es la diferencia entre una app que se siente instantánea y una que se siente rota.

### 7.4 Motor bíblico

Lección directa de IglesiaFiel: allí `rvr1960.json` pesa 4.1 MB y se carga con `require()` — un JSON completo en memoria.

Aquí: **SQLite precargada como asset**, con FTS5.

```
assets/bible/
  rvr1960.sqlite     # versos + índice FTS
  lbla.sqlite        # otra versión (descarga opcional)
```

Habilita, sin costo de red: buscar en toda la Biblia, resolver una referencia (`Rom 8:28-30`) al instante, comparar versiones lado a lado, y que un tap en cualquier cita de una lección abra el texto en contexto.

`src/domain/scripture/` normaliza referencias: parseo de "Ro 8.28", "Romanos 8:28", "Rom 8:28–30" a una forma canónica. Dominio puro → 100% testeable, cero dependencias.

### 7.5 Presupuesto de almacenamiento
Una tablet con 20 cursos instalados no puede ocupar 4 GB. Desde el día 1: pantalla de gestión de almacenamiento, desinstalar un pack conservando notas y progreso, y media diferida (texto primero, audio a pedido).

---

## 8. Diseño mobile/tablet

### 8.1 Adaptativo, no dos apps

Un solo árbol de rutas, layout que responde al ancho. Tres puntos de corte:

| Corte | Ancho | Layout |
|---|---|---|
| `compact` | < 600dp | Teléfono: una columna, tabs abajo |
| `medium` | 600–900dp | Tablet vertical: lista + detalle donde aplica |
| `expanded` | > 900dp | Tablet horizontal: **dos/tres paneles** |

Primitiva `<SplitView>`: en `compact` empuja la ruta hija al stack; en `expanded` la renderiza al lado. **La misma ruta funciona en ambos** — no hay bifurcación de código por dispositivo.

Vista expandida del lector:

```
┌──────────┬────────────────────────────┬──────────┐
│ Temario  │   Lección (lector)         │  Cuaderno│
│          │                            │  notas   │
│ Módulo 1 │   Prosa, citas, preguntas  │  subray. │
│  ✓ 1.1   │                            │          │
│  ▸ 1.2   │                            │  Biblia  │
│    1.3   │                            │  (al tap)│
└──────────┴────────────────────────────┴──────────┘
```

Ese panel derecho es la razón de ser de la versión tablet: **leer y anotar sin cambiar de contexto**. En teléfono, el mismo panel es una hoja inferior.

### 8.2 El lector es el producto

Todo lo demás es andamiaje. Requisitos:

- **Tipografía primero.** Fuente serif para el cuerpo (lectura larga), medida de 60–75 caracteres, interlineado generoso. Ajustables por el usuario y persistidos.
- **Tres modos:** claro, oscuro, sepia. Sepia no es adorno: reduce fatiga en sesiones largas.
- **Posición de lectura persistente**, sincronizada entre dispositivos. Empezar en el teléfono y seguir en la tablet donde se quedó.
- **Subrayar y anotar con gesto**, sin diálogos modales que corten el hilo.
- **Citas bíblicas en línea:** un tap abre el texto en el panel lateral (o en hoja), sin salir de la lección.
- **Progreso implícito:** el avance se calcula por lectura real, no por apretar "completado".
- **Respeta el tamaño de fuente del sistema.** Requisito de accesibilidad y, en esta app, de producto.

### 8.3 Entrada externa en tablet
Teclado y lápiz son normales en tablet. Atajos de teclado para navegar entre lecciones, y anotación con lápiz en las entregas si el hardware lo permite. **No es MVP**, pero el sistema de layout no debe cerrar la puerta.

---

## 9. Calidad, seguridad y operación

### 9.1 CI desde el día 1
Trasplantar los cinco jobs de IglesiaFiel, más dos propios:

| Job | Pregunta que responde |
|---|---|
| `typecheck` | ¿tipa en modo estricto? |
| `lint` | ¿respeta límites de import, a11y, i18n, tokens? |
| `test:domain` | ¿el dominio pasa **en cualquier zona horaria**? |
| `test:components` | ¿las primitivas se comportan? |
| `bundle` | ¿Metro puede empaquetar? *(atrapa lo que `tsc` no ve)* |
| `rules` | ¿las reglas de Firestore cumplen sus promesas? |
| `e2e` | ¿los recorridos críticos funcionan en un emulador? |
| **`packs`** *(nuevo)* | ¿los packs publicados validan contra el esquema Zod? |
| **`fechas`** | ¿alguien reintrodujo un patrón de fecha ya erradicado? |

### 9.2 Release
Copiar íntegro el aparato de IglesiaFiel: fingerprint como `runtimeVersion`, `publish-ota.sh` con fan-out y **fallo cuando no publica nada**, version gate server-driven, rollouts escalonados, Sentry con tags de runtime/update.

Añadir: los **packs de contenido se versionan aparte del código**. Corregir una lección no debe requerir un OTA — es una publicación de contenido. Esa separación es lo que permite que el equipo editorial trabaje sin depender del ciclo de ingeniería.

> ⚠️ Heredar también la trampa: **el fingerprint de iOS solo se calcula correctamente en una Mac.** Desde CI en Linux nunca coincide, y el OTA sale verde publicando solo Android.

### 9.3 Seguridad y privacidad

Esta app maneja rendimiento académico y, posiblemente, alumnos menores de edad.

- **Multi-tenant enforced en el servidor.** Reglas de Firestore con test de aislamiento entre instituciones en cada PR. IglesiaFiel tuvo una fuga cross-tenant de oraciones públicas (MOB-SEC-002) por una rama de regla sin scopear — el test correspondiente la habría atrapado.
- **Sin puertas traseras.** Ese proyecto tuvo un bypass de superadmin por email hardcodeado en una Cloud Function (MOB-SEC-001, crítico). El provisioning de administradores va por script auditado, nunca por condicional en el código.
- **Calificaciones e integridad académica**: solo escritura server-side, con auditoría. Un alumno nunca escribe su propia nota.
- **PII fuera de logs y analytics**: ids hasheados, jamás email, nombre ni contenido de notas.
- **API keys de Firebase restringidas** en la consola de GCP por bundle id y SHA. Pendiente en IglesiaFiel (MOB-SEC-006) — aquí se hace al crear el proyecto, que cuesta cinco minutos.

---

## 10. Plan de arranque

> "Semanas" = trabajo efectivo de una persona. Ordenado para que **la infraestructura preceda a la primera feature** — que es exactamente lo que no ocurrió en IglesiaFiel.

### Semana 0 — Cimientos (sin una sola pantalla de producto)
- Repo, monorepo mínimo, `strict`, ESLint con todas las reglas duras
- CI con los nueve jobs (fallando en vacío, pero configurados)
- Proyecto Firebase, reglas base multi-tenant + tests de aislamiento
- `expo-router` con las carpetas de grupo y el guard de auth
- Design system: tokens, tres modos, seis primitivas con a11y por construcción
- i18n cableado, `es` + `en`
- Sentry, PostHog, logger
- `publish-ota.sh`, `fingerprint.config.js`, workflows de EAS
- `src/domain/datetime` trasplantado con su guardián y su matriz de timezones

**Nada de esto es glamoroso. Es el trabajo entero del documento.** Es lo que hace que los meses 2 al 24 sean baratos.

### Semanas 1–2 — Esqueleto vertical
Una feature completa de punta a punta para validar la arquitectura: **login → catálogo → un curso → una lección → marcar completada**, con su pack real, sus tests unitarios, su test de componente y su flujo de Maestro. Si esta franja se siente incómoda, la arquitectura se corrige ahora, no en el mes 6.

### Semanas 3–5 — Pipeline de packs
Cloud Function de empaquetado, esquema Zod, firma y verificación, descarga con progreso, instalación en SQLite, actualización incremental, pantalla de almacenamiento. Es la pieza de infraestructura más grande y la que define el producto.

### Semanas 6–8 — El lector
Renderizado de bloques, tipografía ajustable, subrayado y notas, posición persistente, panel bíblico. **Aquí se invierte el esfuerzo desproporcionado a propósito**: es el 80% del tiempo de uso.

### Semanas 9–11 — Progreso y evaluaciones
Cálculo de avance, planes de lectura, quizzes, entregas, calificación, retroalimentación del tutor.

### Semanas 12–14 — Tablet y pulido
`SplitView`, layout de tres paneles, atajos de teclado, barrida de rendimiento contra presupuesto, revisión de accesibilidad con lector de pantalla real.

### Semana 15 — Beta cerrada
Un curso, una cohorte, dispositivos reales. Analytics respondiendo si el lector se usa como se diseñó.

---

## 11. Reglas de oro

Pegar en el README. Cada una es una cicatriz del proyecto hermano.

1. **Ninguna pantalla fuera del router.** Nunca navegación por estado.
2. **Ningún hex literal.** Solo tokens semánticos.
3. **Ningún string literal en JSX.** Solo i18n.
4. **Ningún control interactivo sin label de accesibilidad.** Los tipos lo impiden.
5. **Ninguna pantalla importa Firebase ni SQLite.** Solo `src/data/`.
6. **Ningún archivo supera 400 líneas.** El lint avisa; el review decide.
7. **Ningún `any`.** Si de verdad hace falta, `unknown` + validación con Zod.
8. **Ningún `console.*`.** Solo el logger.
9. **Ninguna escritura del alumno espera a la red.** Optimista siempre.
10. **Ningún merge sin CI verde.** Sin excepción, sin "lo arreglo después".
11. **Ninguna dependencia nueva sin verificar el fingerprint.** Las nativas se agrupan en trenes de build.
12. **Ningún pack se instala sin verificar hash y esquema.**

---

## 12. Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| El pipeline de packs se subestima y come el cronograma | **Alta** | Es la pieza más novedosa. Se le asignan 3 semanas completas y se prototipa en la semana 1 |
| Sobre-ingeniería para un producto todavía sin validar | Media | La semana 0 es infraestructura *conocida*, no invención. El esqueleto vertical (semanas 1–2) valida antes de escalar |
| `@react-native-firebase` complica el build | Media | Prototipar en la semana 0. Si obstruye, el fallback es SDK JS + capa de sync propia — peor, pero conocido |
| El equipo editorial no tiene herramientas para producir contenido | **Alta** | **No está en este documento y es un producto propio.** Definir pronto: ¿CMS web? ¿Markdown en un repo? Sin esto no hay app |
| Distraerse del lector | Media | El lector es el producto. Cualquier feature que no lo mejore compite con él |
| Divergencia con IglesiaFiel: dos stacks que mantener | Media | Deliberado (§2.3). Se revisa a los 6 meses: si convergen, extraer `@dosfilos/rn-kit` |

---

## 13. Resumen en una página

**Se trasplanta lo mejor de IglesiaFiel** —fingerprint como runtime, OTA con fan-out, version gate, Sentry con contexto, bundle real en CI, matriz de timezones, arquitectura hexagonal, modelo de fechas— y **se corrigen sus cuatro deudas estructurales desde el día 1**: router de verdad, tokens de diseño, capa de datos única y offline resuelto de raíz.

**La decisión que define el producto** es partir los datos por naturaleza (ADR-005): el contenido viaja en packs versionados sobre SQLite con búsqueda full-text; el estado del alumno vive en Firestore nativo con cola offline. Eso da lectura instantánea sin red, costo casi nulo, y búsqueda que Firestore no puede ofrecer a ningún precio.

**La decisión que define la calidad** es que la semana 0 no produce ni una pantalla de producto. Router, tokens, i18n, a11y, tests, CI, observabilidad y release van **antes** de la primera feature. IglesiaFiel demostró el costo de la alternativa: 58 pantallas que hoy exigen una barrida de 4–6 semanas para conseguir lo que al principio salía gratis.

**Punto de partida esperado:** *excelente* en release, CI, arquitectura de datos y accesibilidad — nivel que IglesiaFiel alcanzará recién al terminar su plan de refactorización, y en el que esta app arranca.

**Antes de escribir código, resolver las tres preguntas de §1.2** (multi-tenant, pagos, certificación) y decidir cómo se produce el contenido — el riesgo señalado como alto en §12 y el único que este documento no cubre.
