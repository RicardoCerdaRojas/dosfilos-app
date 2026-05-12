import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { useTrackActivity } from '@/hooks/useTrackActivity';
import { usePlans } from '@/hooks/usePlans';

import { LANDING_STYLES } from './landing/shared/landingStyles';
import { Nav } from './landing/sections/Nav';
import { Hero } from './landing/sections/Hero';
import { TrustStrip } from './landing/sections/TrustStrip';
import { Problem } from './landing/sections/Problem';
import { Philosophy } from './landing/sections/Philosophy';
import { PillarBiblioteca, PillarLenguas, PillarTutores, PillarProduccion } from './landing/sections/Pillars';
import { HowItWorks } from './landing/sections/HowItWorks';
import { StatsBand } from './landing/sections/StatsBand';
import { ForWhom } from './landing/sections/ForWhom';
import { Pricing } from './landing/sections/Pricing';
import { FAQ } from './landing/sections/FAQ';
import { FinalCTA } from './landing/sections/FinalCTA';
import { Footer } from './landing/sections/Footer';

/**
 * Landing — premium, monochromatic, product-forward.
 *
 * Composer page. Each major section lives in `pages/landing/sections/`,
 * decorative product mockups in `pages/landing/mocks/`, and the reveal
 * animation helper in `pages/landing/shared/`.
 *
 * ── Design language note (documented exception) ──────────────────────────
 * The landing page uses an intentional monochromatic slate palette + single
 * indigo accent — distinct from the app's semantic theme tokens. This is
 * editorial design choice for the public-facing marketing surface, NOT a
 * theming violation. The slate-N classes here are equivalent to the
 * `colorMap` exception in the library `ResourceCard`: a centralised, named
 * design palette for a specific surface, not ad-hoc literals scattered
 * across the app.
 *
 * Design principles:
 *   1. Product is the hero — realistic UI mockups appear throughout, not just text.
 *   2. Monochromatic base (slate scale) + single accent (indigo-600) used sparingly.
 *   3. No emojis, no gradient-text tricks, no colored words inside headlines.
 *   4. Editorial typography — serif for display/quotes, sans for UI chrome, small caps
 *      for eyebrows, generous whitespace + deliberate rhythm.
 *   5. Alternating split-screen pillar sections (Linear/Vercel pattern) with faithful
 *      recreations of actual product UI on one side.
 *   6. Dark sections used strategically for contrast (hero, stats, pillar 2/4, final CTA).
 *
 * Marketing-copy i18n migration (using existing `landing.json` keys) is
 * tracked as a follow-up sub-task in the architecture compliance roadmap.
 */
export function Landing() {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { trackLandingVisit } = useTrackActivity();
    const { plans, loading: plansLoading } = usePlans();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!user) trackLandingVisit();
    }, [user, trackLandingVisit]);

    const handlePlanSelect = (planId: string) => {
        if (!user) navigate(`/register?plan=${planId}`);
        else navigate('/dashboard/subscription');
    };

    return (
        <div className="bg-white text-slate-900 antialiased overflow-x-hidden" style={{ colorScheme: 'light' }}>
            <style>{LANDING_STYLES}</style>

            <Nav mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
            <Hero />
            <TrustStrip />
            {/* Problem agitation BEFORE the capability tour. The
                visitor needs to feel the pain in order for the four
                pillars to read as relief instead of as a feature list. */}
            <Problem />
            <PillarBiblioteca />
            <PillarLenguas />
            <PillarTutores />
            <PillarProduccion />
            <HowItWorks />
            <StatsBand />
            <ForWhom />
            {/* Principios (antes "Filosofía") sale después de que el
                visitante entendió qué hace el producto + para quién es.
                El orden narrativo importa: hablar de responsabilidad
                pastoral DESPUÉS de mostrar capacidades evita sonar
                defensivo desde el inicio. */}
            <Philosophy />
            <Pricing plans={plans} loading={plansLoading} onPlanSelect={handlePlanSelect} />
            <FAQ />
            <FinalCTA />
            <Footer />
        </div>
    );
}
