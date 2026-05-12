import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { useTrackActivity } from '@/hooks/useTrackActivity';
import { usePlans } from '@/hooks/usePlans';

import { LANDING_STYLES } from './landing-v0/shared/landingStyles';
import { Nav } from './landing-v0/sections/Nav';
import { Hero } from './landing-v0/sections/Hero';
import { TrustStrip } from './landing-v0/sections/TrustStrip';
import { Philosophy } from './landing-v0/sections/Philosophy';
import { PillarBiblioteca, PillarLenguas, PillarTutores, PillarProduccion } from './landing-v0/sections/Pillars';
import { HowItWorks } from './landing-v0/sections/HowItWorks';
import { StatsBand } from './landing-v0/sections/StatsBand';
import { ForWhom } from './landing-v0/sections/ForWhom';
import { Pricing } from './landing-v0/sections/Pricing';
import { FAQ } from './landing-v0/sections/FAQ';
import { FinalCTA } from './landing-v0/sections/FinalCTA';
import { Footer } from './landing-v0/sections/Footer';

/**
 * LandingV0 — frozen snapshot of the production landing page taken
 * 2026-05-12, before the conversion-optimization rewrite that ships
 * on `feat/landing-conversion-optimization`. Reachable at `/landing-v0`
 * for visual side-by-side comparison while we iterate on the new
 * version at `/`.
 *
 * This file MIRRORS `pages/Landing.tsx` exactly except its imports
 * point to `pages/landing-v0/` (the snapshot folder) instead of
 * `pages/landing/` (the live folder under active development).
 *
 * The snapshot is intentionally a real fork — separate files, separate
 * folder — not a copy via `git show`, so the route renders the
 * baseline regardless of how far the live version diverges.
 *
 * Schedule for removal: when the conversion-optimization roadmap
 * lands and the team is confident the new landing is the way forward
 * (probably after PR 4 of that roadmap), delete `pages/landing-v0/`
 * + this composer + the route registration in one cleanup commit.
 * Until then, keeping it in the bundle costs ~150 KB of unminified
 * source — meaningless for a route that's lazy-loaded only by people
 * who explicitly visit `/landing-v0`.
 */
export function LandingV0() {
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

            {/* Frozen-snapshot banner so it's obvious which version is loaded.
                Sits above Nav, doesn't interact with the layout below.
                Removed when the v0 fork is deleted (see file-level docs). */}
            <div
                className="bg-amber-500 text-amber-950 text-center text-[12px] font-medium py-1.5 px-4"
                role="status"
            >
                Snapshot v0 · landing congelado al 2026-05-12 · vuelve a{' '}
                <a href="/" className="underline underline-offset-2 hover:text-amber-900">
                    landing actual
                </a>
            </div>

            <Nav mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
            <Hero />
            <TrustStrip />
            <Philosophy />
            <PillarBiblioteca />
            <PillarLenguas />
            <PillarTutores />
            <PillarProduccion />
            <HowItWorks />
            <StatsBand />
            <ForWhom />
            <Pricing plans={plans} loading={plansLoading} onPlanSelect={handlePlanSelect} />
            <FAQ />
            <FinalCTA />
            <Footer />
        </div>
    );
}
