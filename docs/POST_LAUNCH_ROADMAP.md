# Post-launch roadmap — Meta campaign + funnel optimization

Last updated: 2026-05-12

This is the prioritized execution plan after PRs #147 (landing + funnel) and #148 (rubric chooser + extractors) shipped. Goal: get the Meta launch campaign live in ~2 weeks with infrastructure that supports learning and iteration.

## Status legend

- ✅ Done
- 🟢 In progress
- ⏳ Pending (ready to start)
- 🔒 Blocked (external dependency)
- 🗓️ Trigger-based (wait for signal)

---

## TIER 1 — This week (blocks campaign launch)

These three items are gates. Without them, ad spend is wasted or vulnerable.

### 1.1 Validate Meta Pixel + CAPI in Test Events ⏳

**Why**: Without confirming events fire from production, every ad dollar wastes optimization signal.

**Operator runbook**:
1. Open Meta Events Manager → Pixel `860436937085301` → tab **Test Events**
2. Paste production URL: `https://dosfilosapp.web.app/recursos/manual-para-predicadores`
3. Open the URL in a new browser tab
4. Confirm in Test Events tab within 30 seconds:
   - `PageView` event arrives (browser pixel)
   - `Lead` event arrives (custom + Meta standard) — should have `match_quality: HIGH` from server-side CAPI with hashed email
5. Submit the form with a test email
6. Confirm a second `Lead` event arrives with `event_source: server`
7. Open Chrome Pixel Helper extension on the same page → should show both Pixel and CAPI firing

**Effort**: 15 min · **Owner**: Ricardo

---

### 1.2 Create Meta retargeting audiences ⏳

**Why**: Without custom audiences, every ad dollar lands on cold traffic. MOFU/BOFU campaigns cannot exist.

**Operator runbook** — Create the following 5 audiences in Ads Manager → Audiences → Create → Custom Audience → Website:

#### Audience A: Visitantes 30 días (TOFU re-engagement)
- Source: Pixel `860436937085301`
- Rule: `URL contains "dosfilosapp.web.app"` AND `Event = PageView`
- Retention: 30 days
- Name: `Preach · Visitantes 30d`

#### Audience B: Engaged scroll 50%+ (MOFU seed)
- Source: same Pixel
- Rule: `Event = scroll_depth` AND `milestone >= 50`
- Retention: 30 days
- Name: `Preach · Engaged 50% scroll`

#### Audience C: Lead magnet downloaded (warm MOFU)
- Source: same Pixel
- Rule: `Event = Lead` (will capture both browser + CAPI fires)
- Retention: 60 days
- Name: `Preach · Lead magnet captured`

#### Audience D: Registered free (BOFU)
- Source: same Pixel
- Rule: `Event = CompleteRegistration`
- Retention: 90 days
- Name: `Preach · Registered free`

#### Audience E: Lookalike from paid users
- Source: Pixel
- Type: Lookalike
- Seed audience: visitors with `Event = Purchase` (or build a manual customer list once you have ≥100 paid users)
- Country: Spanish-speaking markets (Chile / México / Colombia / Argentina / España / Perú first)
- Size: 1% (tightest match)
- Name: `Preach · Lookalike 1% Spanish paid`

**Recommended campaign structure once audiences exist**:
- TOFU campaign: video creative → cold audience or Lookalike E
- MOFU campaign: lead magnet creative → Audience A + B (visitors not yet captured)
- BOFU campaign: trial-gratis creative → Audience C (lead captured but not registered) + D (registered but not paid)

**Effort**: 30 min · **Owner**: Ricardo

---

### 1.3 Rate-limit `captureLead` 🟢

**Why**: Once the magnet URL is public, abuse vector is trivial. Need protection before driving traffic.

**Implementation** (engineering):
- Honeypot field on the form (hidden via CSS) — bots fill, humans don't
- Server-side: reject submissions where honeypot is non-empty
- Server-side: IP-based rate limit (5 submissions per IP per hour) using Firestore counter
- Existing email-based dedup as third line of defense

**Effort**: 1h · **Owner**: Engineering

---

## TIER 2 — Before first paid campaign (conversion levers)

These multiply CPL/CAC. Without them, ~50% of ad spend leaks.

### 2.1 Video demo 🔒

**Why**: Biggest single conversion lever for SaaS B2C. Cold traffic doesn't sign up without seeing the product.

**Spec**:
- 60-90 seconds
- Screen recording of real product flow: pick passage → ask tutor → review traceable sources → produce outline
- Voiceover OR captions (Meta auto-plays muted)
- 9:16 vertical variant for Instagram Reels + Stories
- 16:9 horizontal variant for Facebook feed

**Outputs**:
- `apps/web/public/demo.mp4` (the file)
- New section `Demo.tsx` in landing composer
- Hero secondary CTA swaps from `#como-funciona` to `#demo`

**Effort**: 1-2 days recording + 4h engineering integration · **Owner**: Ricardo records, Engineering wires

---

### 2.2 Nurture email sequence (D3/D7/D14/D30) ⏳

**Why**: 80% of leads don't convert on first touch. 4 nurture emails recover 15-25% of warm leads.

**Implementation**:
- Cloud Function scheduled hourly: iterates `lead_magnet_submissions/` where `nurtureStage < 4` and `createdAt + nurtureStageDelay(N) <= now`
- 4 email templates (HTML + plain text) in `packages/functions/src/leads/nurtureTemplates/`
- Stage advances after successful send; failed send increments retry counter, drops after 3 retries
- Operator can pause a lead via admin dashboard (`nurtureStage = -1`)

**Content outline** (drafts — refine with copywriter input):
- **D3** — "¿Cómo va con el manual?" + sample chapter highlight + soft CTA to dashboard tour
- **D7** — Mini case study: "Pastor de iglesia evangélica en CDMX preparando serie de Romanos" + dashboard tour CTA
- **D14** — Pain point email: "Lo más difícil del estudio expositivo no es lo que crees" + trial CTA with 30-day discount
- **D30** — Final ask: "Última semana de descuento" + last-chance trial CTA

**Effort**: 1 day engineering + 4h copy drafting · **Owner**: Engineering + Ricardo (final copy edit)

---

### 2.3 Performance — code-split bundle ⏳

**Why**: 23MB single chunk = mobile LCP ~4-6s on 3G. Meta penalizes slow landings with lower quality score = higher CPM.

**Implementation**:
- Convert `/dashboard/*` routes to `React.lazy()` so landing chunk is <500KB
- Convert `/admin/*` routes to lazy
- Inspect bundle with `vite-bundle-visualizer`; large vendor deps (mermaid, katex, cytoscape) should be route-split
- Target: landing chunk <500KB gzipped, LCP <2.5s on 4G

**Effort**: half day · **Owner**: Engineering

---

## TIER 3 — First month (compound improvements)

These pay back in month 2+. Lower priority than Tier 1-2 but high-leverage.

### 3.1 Real testimonials 🔒
Collect 3-5 from beta users (name, role, ciudad, 2-3 line quote). Swap into UseCases composer slot.

**Effort**: ongoing user outreach · **Owner**: Ricardo

### 3.2 A/B testing framework ⏳
Firestore `experiments/` collection + deterministic assignment by sessionId. First experiments: 2 hero title variants, 2 CTA copy variants.

**Effort**: half day · **Owner**: Engineering

### 3.3 SEO meta tags + structured data ⏳
OpenGraph rich, schema.org Organization, FAQPage structured data. Every organic visitor saved is one ad dollar not spent.

**Effort**: 1h · **Owner**: Engineering

### 3.4 Mobile UX audit ⏳
70%+ Meta traffic is mobile. Audit tap targets, scroll fatigue, form friction. Microsoft Clarity recordings give free input after ~1 week of live traffic.

**Effort**: 2h after week 1 of data · **Owner**: Engineering

---

## TIER 4 — Defer (low ROI now)

Engineering tech debt with zero user impact. Touch only when forced by adjacent work.

- Phase 2C purge `rubric.structuralExpectations` — dual-write transparent, wait for convergence
- Promote `ExegeticalStrategy` to entity — ~15 touchpoints, wait for forcing function
- UX move structural editor — depends on Strategy entity
- >50MB PDF chunking — wait for first user complaint
- LlamaParse mode selector — niche power-user feature
- v1.5 corpus excerpts diferidos — polish on shipped feature
- Architecture compliance long tail — Boy Scout cleanup

---

## TIER 5 — Trigger-based 🗓️

Wait for signal before starting.

- **Hito 7 pricing metrics** — activate when ≥50 users OR 30 days post-launch
- **Phase 2C purge** — activate after 2-4 weeks of production dual-write

---

## Sprint plan (next 2 weeks)

### Sprint 1 — Campaign prep (week 1)

| Day | Task | Owner | Effort |
|---|---|---|---|
| 1 | 1.1 Test Events validation | Ricardo | 15 min |
| 1 | 1.2 Create 5 Meta audiences | Ricardo | 30 min |
| 2-3 | 1.3 Rate-limit `captureLead` (Turnstile-free version) | Engineering | 1h |
| 4-7 | 2.1 Record demo video | Ricardo | 1-2 days |
| 4-7 | 2.2 Draft 4 nurture email templates | Ricardo | 4h |

### Sprint 2 — Launch prep (week 2)

| Day | Task | Owner | Effort |
|---|---|---|---|
| 1-2 | 2.3 Performance — code-split bundle | Engineering | half day |
| 3-4 | 2.2 Nurture scheduler + templates wired | Engineering | 1 day |
| 4 | 2.1 Wire demo section into landing composer | Engineering | 4h |
| 5 | 3.3 SEO meta + structured data | Engineering | 1h |
| 6-7 | Soft launch: 100-200 person audience, monitor Clarity recordings + Test Events | Ricardo + Engineering | ongoing |

**Day 14**: Launch broader campaign with confidence.

---

## How to update this doc

When a task is done: change ⏳ or 🟢 to ✅ in the relevant tier section. Add a line under the task: `Done YYYY-MM-DD · PR #N · Notes`. Don't delete the entry — historic context is useful for postmortem.
