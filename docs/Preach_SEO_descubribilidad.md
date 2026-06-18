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
| 1 | B2 — JSON-LD (Org + SoftwareApp + FAQ) | 🔴 alto | bajo | ☐ |
| 2 | B3 — robots.txt + sitemap.xml | 🟠 alto | trivial | ☐ |
| 3 | §1 — 301 `dosfilosapp.web.app` → `preach.dosfilos.com` | 🟠 alto | bajo | ☐ |
| 4 | I1 — Headings semánticos (h3 pilares/FAQ) | 🟡 medio | bajo | ☐ |
| 5 | **Bloque prerender** — B1 prerender landing+rutas públicas **+ B4 i18n por URL (`/es/` `/en/`) + hreflang + B5 canonical + B6 head por-ruta/idioma** (acoplados → una sola pasada) | 🔴 máx | alto | ☐ |
| 6 | I2 — Imágenes WebP + lazy + carousel diferido | 🟡 medio | medio | ☐ |

**Quick wins (esta semana):** items 1-4. Bajo esfuerzo, mueven aguja sin tocar arquitectura.
**El grande:** item 5 (bloque prerender). Sin esto las IAs siguen ciegas — es la pelea principal. i18n-por-URL, hreflang, canonical y head dinámico se hacen **junto** con el prerender (todos tocan el HTML emitido por ruta/idioma; separarlos = repetir la pasada).
**Diferido:** migrar landing a Astro (post-prerender). **Otra tanda:** blog en `dosfilos.com` raíz (Astro, SSR/SSG).

---

## 6. Decisiones cerradas (fundador, 18-jun-2026)

1. ✅ **Host oficial del producto:** `preach.dosfilos.com`. 301 desde `dosfilosapp.web.app` (item 3 del plan).
2. ✅ **Prerender ahora** sobre el Vite actual (primera versión indexable sin reescribir). **Migrar landing a Astro = diferido** (estratégico, post-prerender).
3. ✅ **i18n por URL ahora**, acoplado al bloque de prerender (item 5).
4. ✅ **Blog raíz = otra tanda.** Primero descubribilidad del producto. Será paquete nuevo del monorepo en Astro.

Pendiente operativo: ninguna decisión bloquea los quick wins. Para el item 3 (301) hace falta acceso a DNS/hosting del dominio cuando se ejecute.

---

## 7. Cómo medir

- **Indexación:** Google Search Console (cobertura, páginas indexadas, hreflang errors). Dar de alta el/los dominios.
- **Visibilidad IA:** consultas de control en Perplexity/ChatGPT/Claude sobre "asistente exégesis/predicación" antes y después de B1+B2.
- **Orgánico:** GA4 canal Organic Search, antes/después.
- **Técnico:** Lighthouse SEO + Core Web Vitals antes/después de B1 e I2.
