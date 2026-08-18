# Plan de puesta al día — del código inerte al sistema medido

> **Tipo:** plan de ejecución vivo. Se actualiza en cada cierre de ola (marcar casillas + bitácora al final).
> **Creado:** 2026-08-17, tras auditoría del estado real (git + byblos + código).
> **Contexto de partida:** última actividad 2026-07-18 (PR #400). ~1 mes sin commits. CI y Deploy Production
> verdes en el último push. Producto vivo en prod con usuarios reales.

---

## Diagnóstico que ordena el plan

El problema **no** es falta de features. Es que hay mucho código shipped en producción que está
**inalcanzable y sin medir**:

- 13 feature flags en el dominio, **9** encendibles desde el admin. Tres features shipped no se pueden
  activar sin editar Firestore a mano.
- Un flag (`anchor_fidelity_enforce`) que un hook lee pero que **no existe en el registry del dominio** →
  el verify-drop de ADR-036 nunca puede activarse.
- La calibración del gate de suficiencia (Redacción v2 Fase 1) está **en pausa por falta de datos**:
  0 filas `userConfirmed` en prod, causadas por un bug de escritura de un solo sitio.
- Dos implementaciones del spine de 8 pasos; **solo una instrumenta** → los estudios que entran por el menú
  "Nuevo Sermón" no producen ninguna señal de sombra.

**Consecuencia para el orden:** primero se hace el sistema **alcanzable y medible**, después se construye
encima. Construir features nuevas sobre instrumentación que no corre acumula más código inerte.

---

## Ola 0 — Higiene y salud de prod

**Tamaño:** ½ día. **Bloquea:** nada, pero se hace primero tras un mes idle.

- [ ] **0.1** Descartar el diff de `approach-compliance-criteria.md` (195/195 líneas, whitespace/EOL puro,
      cero cambio de contenido).
- [ ] **0.2** Commitear `0b-gap-genero-como-acto.md` (terreno de la Ola 2) + corregir su hueco desactualizado:
      el juez **sí está cableado** (`CallableGenreEngagementJudge` inyectado en `GuidedSermonService.ts:151`
      + callable `passage-profile/genreEngagement.ts`).
- [x] **0.3** `scripts/cohorte-superficies-creacion.mjs` — ampliado a `FOUNDER_UIDS` (lista; el fundador opera
      con dos cuentas y filtrar por una dejaba la otra contaminando), **corrido contra prod**. Resultados en
      § Cohorte real.
- [x] **0.4a** Smoke automático de funciones — **encontró un roto real**: `sendNurtureEmails` fallaba a diario
      por índice faltante y la cascada se llevaba las advertencias de fin de trial. Cero usuarios recibieron
      jamás day-14 ni trial-5d/1d (marcadores `emailsSent` en `users/`). Fix en PR #402.
- [ ] **0.4b** Smoke manual de UI (login, wizard, faculty, biblioteca) + revisar quota LlamaParse/Gemini y
      vigencia de secrets. Queda para el fundador.

---

## Cohorte real (medido 2026-08-17, `scripts/cohorte-superficies-creacion.mjs`)

Base: **13 usuarios · 69 pastoralSeeds · 210 sermones.** "Sin fundador" excluye las dos cuentas del fundador.

| Métrica | Con fundador | Sin fundador |
|---|---|---|
| Seeds socráticos instrumentados (Spine B) | 4 (2 usuarios) | **2** (1 usuario) |
| — de esos, `userConfirmed` | 1 | **0** |
| Estudios del form del menú (Spine A) post-PR1 | 0 | 0 |
| Seeds legacy pre-PR1 (ambiguos) | 65 (3 usuarios) | 4 (2 usuarios) |
| Sermones sintéticos (`AI Generated`) | 3 (1 publicado) | **0** |
| Sermones sin estudio ni tag sintético | 150 (8 usuarios) | 18 (7 usuarios) |

**Tres lecturas que corrigen supuestos del plan:**

1. **El cuello de botella de la Ola 3 no es solo el bug de provenance — es el tráfico.** Post-PR1 hay 4 seeds
   socráticos en total, casi todos del fundador. Aunque 0b-B quede perfecto, con ese caudal no se llega a
   20-30 estudios reales en un plazo razonable. La meta 3.3 necesita **generar uso** (dogfood activo del
   fundador + embajador, o bajar el N y aceptar menos confianza), no solo esperar.
2. **Instrumentar el Spine A (3.2b) NO es urgente.** Cero estudios entraron por el form post-PR1. El atajo (a)
   — entrar por el camino socrático — no está tapando volumen.
3. **El problema del tutor sintético (5.1) es de señal, no de daño.** Los 3 sermones sintéticos son **todos**
   del fundador; ningún usuario real produjo uno. La decisión sigue siendo válida (qué comunica el menú) pero
   pierde urgencia.

**Dato de fondo, más incómodo que los tres anteriores:** los usuarios reales tienen **18 sermones sin estudio**
frente a **2 seeds socráticos**. La tesis del producto — el sermón como fruto del estudio — todavía no se
refleja en el uso.

> **Fix de raíz pendiente** (lo propone el propio script): no existe campo `origin` en seed ni sermón, así que
> toda esta partición se hace por proxies. Instrumentar `origin` en la creación mataría la ambigüedad.

## Ola 1 — Destrabar el panel de control ⬅️ PRIMERO DE VERDAD

**Tamaño:** 1 PR chico. **Bloquea:** todo lo demás — sin esto no se puede encender ni medir nada.

- [ ] **1.1** Sincronizar `ALLOWED_FLAGS` (`packages/functions/src/admin/setUserFeatureFlags.ts:7-17`, hoy 9)
      con `FEATURE_FLAG_NAMES` (`packages/domain/src/entities/User.ts:133-256`, hoy 13). Faltan:
      `sermon_draft_shadow`, `genre_override_enforce`, `step3_genre_help`.
- [ ] **1.2** Resolver `anchor_fidelity_enforce`: **o** entra a `FEATURE_FLAG_NAMES` + allowlist (y el
      verify-drop de ADR-036 pasa a ser encendible), **o** se borra `useAnchorFidelityEnforceGate`
      (`packages/web/src/hooks/usePastoralFidelityGate.ts:124-132`). Hoy es código muerto que aparenta ser un
      gate vivo.
- [ ] **1.3** Test de paridad anti-drift. **Gotcha:** `functions` NO puede importar `@dosfilos/domain`
      (decoupling intencional; importarlo revienta el build con ~180 TS6059). Opciones: test en functions que
      lea el fuente de `User.ts` vía `fs`, o mover la lista a un JSON compartido en la raíz que ambos consuman.

## Ola 2 — 0b-B: provenance desde el acto

**Tamaño:** 1 PR. **Depende de:** Ola 1 (para poder encender y verificar). **Palanca:** la más alta del sistema.

Paga doble: des-confunde la sombra de Fase 3 **y** destraba la calibración en pausa.

- [ ] **2.1** Cerrar los huecos abiertos del doc 0b antes de codear:
      (a) sourcing de la propuesta inferida-del-libro en `persistTo`;
      (b) si `persistTo` corre en la rama `accept-override` (hoy devuelve `undefined` → probablemente se salta).
      El 3er hueco (hogar de `SELECTABLE_GENRES`) ya lo cerró 0b-A.
- [ ] **2.2** Rewire de `ContextGenreStepPolicy.persistTo` → `(propuestaDelLibro, géneroDelChip)`; sacar
      `detectGenreInText` de ese path.
- [ ] **2.3** Verificar en prod que la sombra empieza a escribir `userConfirmed` real.

## Ola 3 — Encender la instrumentación + dogfood

**Tamaño:** poco trabajo, 2-4 semanas de calendario. **Depende de:** Olas 1 y 2.

- [ ] **3.1** Flip en cuentas dogfood, en orden: `passage_profile` → `sermon_draft_shadow` →
      `genre_override_enforce`.
- [ ] **3.2** Resolver la traba del spine duplicado. Dos caminos:
      **(a) barato** — durante el dogfood entrar siempre por el camino socrático (Faculty). Cero código.
      **(b) correcto** — instrumentar el spine A (form del menú) o converger los dos. PR real.
      *Recomendado: (a) ahora, (b) agendado en Ola 8.*
- [ ] **3.3** Meta: **≥20-30 estudios reales** con `userConfirmed` poblado. Recién ahí se toca el umbral del
      gate de suficiencia (condición explícita de reanudar, registrada en byblos).
      ⚠️ **El cohorte medido dice que el caudal no alcanza** (4 seeds socráticos post-PR1, casi todos del
      fundador). Esta meta exige generar uso deliberadamente o bajar el N a sabiendas. Ver § Cohorte real.

**Regla de lectura de los datos:** solo las filas `userConfirmed` + insuficiente miden labor. `aiProposed` y
`userOverride` miden precisión de la inferencia, NO "no analizó".

## Ola 4 — Revisión de catálogos (solo el fundador)

**Corre en paralelo con la Ola 3** — los dos últimos se revisan CON los datos de sombra.

- [ ] **4.1** `approach-compliance-criteria.md` — el catálogo del juez, criterio por criterio, + severidad
      (`critica|estandar`) + tipo (`contenido|tratamiento`) + umbral "mayoría/todos" de §8.6.
      **Bloquea Redacción v2 Fase 2 entera.**
- [ ] **4.2** `GENRE_DISCERNMENT_CRITERIA` (`packages/domain/src/guided-sermon/genreDiscernmentCriteria.ts`).
      **Bloquea el flip de `genre_override_enforce`.**
- [ ] **4.3** `STRUCTURAL_SUFFICIENCY_BY_GENRE` + `workedExamples` (hoy vacíos, los cura el fundador).
      **Bloquea el flip de `step3_genre_help`.**

## Ola 5 — Decisiones de producto pendientes (solo el fundador)

Sin dependencia de orden; cuanto antes, mejor.

- [ ] **5.1** "Generar con el tutor" — produce sermón 100% sintético y es la **1ª entrada** del menú Nuevo
      Sermón. Medido 2026-08-17: 3 sermones sintéticos sobre 210, **todos de cuentas del fundador**; ningún
      usuario real produjo uno. Es un problema de **señal del menú**, no de daño. Reubicar / reetiquetar /
      dejar como está.
- [ ] **5.4** ¿A quién apunta hoy el email de día 14? Filtra por `subscription.planId == 'free'` y en prod hay
      **0 usuarios free** (el registro escribe `planId: 'free'` en `AuthService.ts:240`, pero nadie lo tiene).
      Con el índice arreglado el correo sigue sin audiencia. Decidir target o retirarlo.
- [ ] **5.2** `fidelity_pass` — ADR-032 lo manda a Fase 7 (es feature del paper, no del sermón). Confirmar que
      sigue siendo la decisión o reabrir.
- [ ] **5.3** `contra_scan` — hoy solo en la cuenta del fundador. ¿Ampliar a dogfood?

## Ola 6 — Redacción v2: el corazón

**Depende de:** Ola 4 (catálogos) + Ola 3 (datos). Aquí el track vuelve a ser producto visible.

- [ ] **6.1** **Fase 2 — catálogos como dato**: `ApproachComplianceCatalog` + criterios de género hermanos +
      severidad/tipo + reconciliación del enum.
- [ ] **6.2** **Fase 3 — mapeo género→estructura + constructor de proposición (8 elementos)**. Consume
      `PassageProfile`, NO re-deriva género (invariante: una sola fuente de verdad de género).

## Ola 7 — Cerrar Fase 4 (Pastoral Fidelity)

Solo el contra-scan está shipped (#315-#317). Faltan dos sub-features.

- [ ] **7.1** **Autoría verbatim** — debe **EXTENDER** `evaluatePublishGate`, no crear un tercer modal.
      Requiere ADR: 7 decisiones abiertas (algoritmo de diff, umbral por defecto, orden de confrontación).
- [ ] **7.2** **Voice fingerprint** — la más tardía. Sin decisión de técnica (fine-tune vs few-shot vs RAG) ni
      de privacidad del corpus. Diferible sin costo.

> **Precondición del phase doc:** flipear y validar la confrontación de Fase 3 antes de apilar otra. Con
> `fidelity_pass` dormante esa validación no existe → se resuelve en 5.2.

## Ola 8 — Deuda

Boy Scout salvo donde se indique.

- [ ] Convergencia/instrumentación del spine duplicado (viene de 3.2b)
- [ ] Parser Biblia duplicado (web + infra) — cambios deben mirrorearse o las superficies divergen en silencio
- [ ] Abstracción de proveedor LLM (~34 callers directos a Gemini) — sprint dedicado
- [ ] SBLGNT hardcoded → catálogo CORE (próxima ingesta)
- [ ] Typing de tools del SDK Gemini (upgrade SDK)
- [ ] Chat del paso 1 sin persistir
- [ ] Realtime status en Admin Core Library
- [ ] Rate-limit propio en `completeRegistration`
- [ ] Faculty extractions user-wide sin trimmed callable
- [ ] **Staging env** — 3-4 días, plan ya acordado en byblos. No es Boy Scout.

---

## Camino crítico

```
Ola 0 (higiene)
   ↓
Ola 1 (allowlist de flags)  ← 80% del desbloqueo, 1 PR chico
   ↓
Ola 2 (0b-B provenance)     ← la palanca
   ↓
Ola 3 (dogfood 2-4 sem) ∥ Ola 4 (catálogos del fundador)
   ↓
Ola 6 (Redacción v2 Fase 2 → Fase 3)
```

Olas 5, 7 y 8 cuelgan del camino sin bloquearlo.

---

## Bitácora

| Fecha | Ola | Qué pasó |
|---|---|---|
| 2026-08-17 | — | Plan creado tras auditoría del estado real. |
| 2026-08-17 | 0 | 0.1 diff whitespace descartado · 0.2 doc 0b versionado + corregido el hueco del juez · 0.3 script de cohorte ampliado a `FOUNDER_UIDS` y corrido (§ Cohorte real) · 0.4a smoke de funciones destapó el nurture roto (PR #402). Queda 0.4b (smoke manual de UI + quotas). |
</content>
</invoke>
