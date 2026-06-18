# Preach — SEO & descubribilidad en buscadores e IAs

**Versión:** 1.0 · 18-jun-2026
**Para qué sirve:** posicionar el sitio en buscadores **y en motores de IA** (Google AI Overview, Perplexity, ChatGPT, Claude web). Eje distinto al de conversión.
**Acompaña a:** `docs/Preach_optimizacion_landing.md` (conversión, Landing→Prueba). Ese afina lo que ya entra; este resuelve que el sitio **sea visible para crawlers/IAs**.
**Métrica que mueve:** tráfico orgánico + citaciones/menciones del producto en respuestas de IA (aguas arriba del embudo).
**Puntero byblos:** este doc es el SSOT de ejecución. byblos guarda el máster + decisiones durables.

---

## 0. Veredicto

La landing **convierte bien** (cubierto en el doc de conversión). Pero para buscadores e IAs está **casi invisible**, por una causa raíz única:

> **El sitio es SPA client-only (CSR). Sin SSR, sin prerender.** El crawler pide `/` y recibe un HTML casi vacío; el contenido solo aparece si ejecuta JS y espera ~3-5s.

Googlebot a veces espera. **Perplexity, ChatGPT, Claude web y la mayoría de bots de IA NO ejecutan JS** → ven cáscara vacía. El contenido (bueno, real, con voz de marca) no existe para ellos. Todo lo demás de este plan es secundario a resolver esto.

---

## 1. Arquitectura de dominio (decisión del fundador, 18-jun-2026)

- **`dosfilos.com`** = dominio canónico de la marca. Hoy SIN sitio en la raíz. Plan futuro: **blog de sensibilización teológica (teología vs IA)** en Astro, paquete nuevo del monorepo. **Va en OTRA tanda** (primero la descubribilidad del producto).
- **Producto** corre en **`preach.dosfilos.com` = host oficial CONFIRMADO**. `dosfilosapp.web.app` deja de ser oficial.
- **Acción SEO:** **301** permanente `dosfilosapp.web.app` → `preach.dosfilos.com`. Señales partidas entre dos hosts matan ranking; el 301 traspasa la autoridad acumulada al host oficial.
- El blog raíz, cuando exista, es **activo SEO de primer orden** para "tomar posición en IAs" sobre teología vs IA — debe nacer con SSR/SSG e indexable desde el día 1.

**Decisión de stack (fundador, 18-jun):** producto = React SPA + prerender (táctico ahora) → **migrar landing a Astro** (estratégico, diferido). Contenido (landing + blog) = Astro. Ver byblos: *Tarea diferida: migrar el landing de React SPA a Astro*.

---

## 2. Bloqueadores críticos

> Sin estos, lo demás no rinde.

| # | Hallazgo | Fix | Esfuerzo |
|---|----------|-----|----------|
| B1 | **CSR puro = invisible para IAs.** `vite.config.ts` sin SSR/prerender; `index.html` es shell vacío. | Prerender estático del landing + rutas públicas (`vite-plugin-prerender` / `react-snap`), o migrar landing a Astro. **Empezar por prerender.** | medio |
| B2 | **Cero structured data (JSON-LD).** Ni `Organization`, ni `SoftwareApplication`, ni `FAQPage`. Las IAs comen schema.org para entender qué eres. | 3 bloques JSON-LD. `FAQPage` además da rich snippets en Google. | bajo |
| B3 | **No hay `robots.txt` ni `sitemap.xml`** en `public/`. | 2 archivos estáticos. | trivial |
| B4 | **i18n sin URL.** es/en viven en la **misma URL** (idioma por localStorage/Accept-Language). Sin `/es/` `/en/`, sin hreflang. Google indexa una sola versión (default español); el inglés es invisible. | i18n por ruta (`/es/`, `/en/`) + hreflang + canonical por idioma. | alto |
| B5 | **Sin canonical tag.** No hay `<link rel="canonical">`. Combinado con B4 y el split de dominio, dilución. | canonical por ruta/idioma. | bajo |
| B6 | **Meta tags hardcoded solo español** en `index.html`; sin head dinámico (no react-helmet). Visitante inglés ve snippet en español en SERP; toda ruta comparte el mismo title. | `react-helmet-async`: head por-ruta y por-idioma. | medio |

---

## 3. Importante (segunda ola)

| # | Hallazgo | Fix | Esfuerzo |
|---|----------|-----|----------|
| I1 | **Jerarquía de headings floja.** H1 solo en Hero; pilares usan `<div>` no `<h3>`; eyebrows/stats/FAQ = divs/spans. | pilares + FAQ questions → `<h3>`. | bajo |
| I2 | **Sin optimización de imágenes.** Solo PNG sin comprimir, sin WebP/AVIF, sin `loading="lazy"`. Hero carousel monta 5 mocks en DOM aunque ocultos. Core Web Vitals castigados. | WebP + lazy + render diferido del carousel. | medio |

---

## 4. Lo que ya está bien — no tocar

OG + Twitter cards presentes (`index.html`). H1 existe. Bilingüe funciona a nivel UX. URLs limpias sin query bloat. Analytics completo (GA4 + Clarity + Meta Pixel + CAPI). Accesibilidad decente (aria, prefers-reduced-motion).

---

## 5. Plan ordenado por impacto/esfuerzo

| Orden | Item | Impacto | Esfuerzo | Estado |
|-------|------|---------|----------|--------|
| 1 | B2 — JSON-LD (Org + SoftwareApp + FAQ) | 🔴 alto | bajo | ☑ PR #362 |
| 2 | B3 — robots.txt + sitemap.xml | 🟠 alto | trivial | ☑ PR #362 |
| 3 | §1 — host `preach.dosfilos.com` conectado + SSL ✅. (True 301 del `.web.app` no existe en Firebase; dedup vía `rel=canonical` → item 5) | 🟠 alto | bajo | ◑ host ✅ / canonical en item 5 |
| 4 | I1 — Headings semánticos (h2 pilares / h3 FAQ) | 🟡 medio | bajo | ☑ PR #362 |
| 5 | **Landing Astro** (paquete nuevo) — SSG + B4 i18n por URL (`/es/` `/en/`) + hreflang + B5 canonical + B6 head por-página, todo NATIVO de Astro. Ver §8. | 🔴 máx | alto | ◑ **PR #363 (draft)** — código completo + build verde; bloqueado por pasos de consola (§8.5) |
| 6 | I2 — Imágenes WebP + lazy + carousel diferido | 🟡 medio | medio | ☐ |

**Quick wins (esta semana):** items 1-4. Bajo esfuerzo, mueven aguja sin tocar arquitectura.
**El grande:** item 5. Pivot de "prerender" a **landing Astro nativa** (ver §8): el prerender era desechable y obligaba a i18n-por-URL a mano; Astro da i18n/hreflang/canonical/SSG gratis. Sin esto las IAs siguen ciegas — pelea principal.
**Otra tanda / fuera de repo:** blog en `dosfilos.com` (familia de productos), proyecto aparte.

---

## 6. Decisiones cerradas (fundador, 18-jun-2026)

1. ✅ **Host de marketing:** `preach.dosfilos.com` (landing Astro). **App React se muda a `app.preach.dosfilos.com`** (auth-gated, sin SEO).
2. ✅ **Camino item 5 = landing Astro nativa** (paquete nuevo `packages/landing`), NO prerender. El prerender era desechable; Astro da i18n/SEO gratis.
3. ✅ **i18n por URL** (`/es/` `/en/`) vía Astro nativo. Precios **estáticos** en config/i18n (mata acople `usePlans`).
4. ✅ **`dosfilos.com` = paraguas de familia** (preach/church/seminary). Blog vive ahí, habla de toda la familia → **proyecto aparte**, fuera de este monorepo.

Pendiente operativo: la mudanza de la app a `app.preach.dosfilos.com` requiere pasos de consola/DNS del fundador (ver §8.5).

---

## 7. Cómo medir

- **Indexación:** Google Search Console (cobertura, páginas indexadas, hreflang errors). Dar de alta el/los dominios.
- **Visibilidad IA:** consultas de control en Perplexity/ChatGPT/Claude sobre "asistente exégesis/predicación" antes y después de B1+B2.
- **Orgánico:** GA4 canal Organic Search, antes/después.
- **Técnico:** Lighthouse SEO + Core Web Vitals antes/después de B1 e I2.

---

## 8. Item 5 — plan detallado (landing Astro)

**Arquitectura final:**
- `preach.dosfilos.com` = landing Astro (`packages/landing`, paquete nuevo), marketing indexable.
- `app.preach.dosfilos.com` = app React (`packages/web` actual), auth-gated.
- CTAs de la landing → absolutos a `app.preach.dosfilos.com/register|login`. `preach.dosfilos.com/dashboard` → 301 a la app.

### 8.1 Paquete
`packages/landing`, nombre `@dosfilos/landing` (el workspace globbea `packages/*`, no hay `apps/`). Astro 4 + `@astrojs/react` + `@astrojs/tailwind` + `@astrojs/sitemap`. React fijado a `18.3.1` (override del root, evita doble React en islands). **Gotcha yarn/BYBLOS_NPM_TOKEN:** instalar deps con npm en root / o con token; build vía `npm run build --workspace=@dosfilos/landing` (resuelve `.bin/astro`), nunca `yarn build`.

### 8.2 i18n + head
`i18n` nativo: `locales: ['es','en']`, `defaultLocale: 'es'`, `prefixDefaultLocale: true` → `/es/` `/en/` explícitos. `/` → redirect a `/es/`. `Layout.astro` emite title/description/**canonical** (siempre a `preach.dosfilos.com`, resuelve B5 + dedup `.web.app`)/**hreflang** recíproco/OG + los **3 bloques JSON-LD** (se MUEVEN desde `packages/web/index.html`; FAQPage se genera desde `faq.items` de `landing.json` para no desincronizar). `@astrojs/sitemap` genera sitemap con hreflang.

### 8.3 Port de componentes (27 archivos)
- **19 estáticos** → `.astro` (o `.tsx` sin `client:`, render server-side). Mocks incluidos (solo usan strings).
- **Islands** (`client:*`): `Nav` (`client:load`), `HeroCarousel` (`client:visible`), `LanguageMockCarousel` (`client:visible`), `FAQ` (`client:visible`).
- **`Reveal`** (envuelve ~11 secciones): NO island (forzaría hidratar todo). Reemplazar por componente Astro + 1 IntersectionObserver inline global. **Decisión de port más importante** para mantener SSG.
- **Islands reciben strings ya resueltos como props** (build-time `t()`), NO usan `useTranslation` → cero `i18next` en bundles.
- **3 acoples eliminados:** Firebase auth (la landing es logged-out) / `react-router Link`→`<a>` absolutos / `usePlans()`→ **precios estáticos** en `src/config/plans.ts` + labels en `landing.json` (capturar valores de prod al codear).

### 8.4 Compartido
- **Tailwind/tokens/fonts:** DUPLICAR ahora (no extraer paquete shared — tocaría la app viva). Copiar subset de `tailwind.config.cjs` (fontFamily incl. hebrew/greek) + fonts SIL a `packages/landing/public/fonts` + `@font-face` a `global.css`. Copiar assets (`logo_dfp.png`, `og-preview.png`, `favicon.png`).
- **`landing.json`:** import directo relativo desde `packages/web/...` (1 sola copia). Acople conocido; promover a `@dosfilos/locales` si molesta.
- **Analytics:** portar `init/config/utm` (IDs públicos) + `track()` TRIMMED (sin el mirror Firebase Functions). Eventos vía delegación `data-track` en `Layout.astro` (secciones quedan estáticas).

### 8.5 Infra (Firebase multi-site)
- `.firebaserc`: targets `marketing`→sitio nuevo, `app`→sitio existente.
- `firebase.json`: `hosting` pasa a ARRAY de 2 sitios. `marketing`=`packages/landing/dist` + 301s (`/dashboard`,`/login`,`/register`→app). `app`=`packages/web/dist` + rewrite SPA.
- CI `deploy-production.yml`: build landing + deploy 2 targets (`firebase deploy --only hosting:marketing,hosting:app`).
- **Fundador (consola/DNS):** (1) crear sitio Hosting `marketing`; (2) `app.preach.dosfilos.com` custom domain en sitio app (ADITIVO, no rompe); (3) provisión SSL; (4) **recién luego** re-apuntar `preach.dosfilos.com`→marketing; (5) autorizar `app.preach.dosfilos.com` en Firebase Auth domains (si no, login OAuth rompe); (6) alta en Search Console.
- **Cutover seguro:** app responde en AMBOS hosts antes del flip → el flip solo cambia qué bundle responde el ápex; app nunca cae. **Rollback:** re-apuntar `preach`→app (bundle intacto, sin rebuild).

### 8.6 Secuencia — 1 PR (consola primero)
Colapsado de 3 PRs a 1 (decisión fundador, eficiencia). El split de 3 era conservador; el gate de consola va ANTES del merge, no en el medio.
- **[Fundador, consola — ANTES del merge]:** crear sitio Hosting `marketing` + targets; `app.preach.dosfilos.com` custom domain en sitio app (ADITIVO, no rompe); SSL; autorizar `app.preach` en Firebase Auth domains. Necesario antes de mergear el `firebase.json` multi-site (si no, el deploy de prod falla por target inexistente).
- **1 PR [código, en paralelo a la consola]:** `packages/landing` completo + `.firebaserc` targets + `firebase.json` multi-site + CI 2 targets.
- **Merge** (tras consola lista) → deploya ambos sitios. Ápex `preach.dosfilos.com` sigue sirviendo la app (sin cambio) hasta el flip.
- **[Fundador, DNS — paso irreversible-ish]:** smoke en `*.web.app`/`app.preach` → flip `preach.dosfilos.com`→marketing. Rollback = flip de vuelta (bundle app intacto, sin rebuild).
- **PR aparte [opcional]:** WebP + carousel lazy (item 6).

La validación pre-flip se mantiene: el flip del ápex es manual y va al final → se prueba todo en las URLs live antes del paso irreversible. Lo único que se pierde vs 3-PR: preview-channel pre-merge (se valida post-merge en live).

### 8.6b Gotchas confirmados en build (PR #363)
- **No instalar Astro con yarn** (roto por `BYBLOS_NPM_TOKEN` en `~/.npmrc` global). Local + CI: `npm install --prefix packages/landing --no-workspaces`. El `yarn install --frozen-lockfile` del root NO se rompe con la landing presente (verificado), pero NO instala astro → por eso el step npm aparte.
- **`@astrojs/sitemap` 3.x incompat con astro 4.16** (i18n routing → `_routes` undefined). Quitado; sitemap a mano en `public/sitemap.xml` con hreflang.
- **`.firebaserc` está gitignored** → no se commitea. Los targets de hosting se aplican en el runner con `firebase target:apply` antes del deploy.
- Build loop local: `cd packages/landing && node_modules/.bin/astro build`.

### 8.7 Riesgos top
- Auth origin-scoped: mudar a `app.preach` = nuevo origen → usuarios se deslogean 1 vez. Verificar `firebaseapp`/`identitytoolkit` AUSENTE en `landing/dist`. Autorizar `app.preach` en Auth domains.
- Multi-site rewrite/redirect: `curl -I` los 3 301 + landing 200 + sin loops.
- Bundle bloat i18n en islands: props, no hook. Verificar chunks sin `i18next`.
- Paridad visual: screenshot diff es/en móvil+desktop (ojo fonts hebreo/griego + `prefers-reduced-motion`).
- Precios estáticos: drift; link "ver detalles"→app `/pricing` (autoritativo) + comentario en código.
