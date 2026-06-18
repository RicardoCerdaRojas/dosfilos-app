import { useTranslation } from '@/i18n';
import { LibraryMock } from '../mocks/LibraryMock';
import { LanguageMockCarousel } from '../mocks/LanguageMockCarousel';
import { TutorsMock } from '../mocks/TutorsMock';
import { SermonMock } from '../mocks/SermonMock';
import { PillarSection } from './PillarSection';

/**
 * Four-pillar narrative — the 4 main product capabilities of DosFilos:
 *  01 · Library (your theological corpus, organised + searchable)
 *  02 · Original languages (Hebrew + Greek)
 *  03 · Tutors (specialised AI experts per domain)
 *  04 · Production (sermons, plans, notes)
 *
 * Each pillar is an alternating split-screen section (Linear/Vercel pattern).
 * Pillars 02 and 04 use the dark variant for rhythmic contrast.
 */

export function PillarBiblioteca() {
    const { t } = useTranslation('landing');
    return (
        <PillarSection
            id="pilar-1"
            number="01"
            eyebrow={t('pillars.biblioteca.eyebrow')}
            title={t('pillars.biblioteca.title')}
            description={t('pillars.biblioteca.description')}
            bullets={t('pillars.biblioteca.bullets', { returnObjects: true }) as string[]}
            mockup={<LibraryMock />}
        />
    );
}

export function PillarLenguas() {
    const { t } = useTranslation('landing');
    return (
        <PillarSection
            id="pilar-2"
            number="02"
            eyebrow={t('pillars.lenguas.eyebrow')}
            title={t('pillars.lenguas.title')}
            description={t('pillars.lenguas.description')}
            bullets={t('pillars.lenguas.bullets', { returnObjects: true }) as string[]}
            mockup={<LanguageMockCarousel />}
            reversed
            dark
        />
    );
}

export function PillarTutores() {
    const { t } = useTranslation('landing');
    return (
        <PillarSection
            id="pilar-3"
            number="03"
            eyebrow={t('pillars.tutores.eyebrow')}
            title={t('pillars.tutores.title')}
            description={t('pillars.tutores.description')}
            bullets={t('pillars.tutores.bullets', { returnObjects: true }) as string[]}
            mockup={<TutorsMock />}
        />
    );
}

export function PillarProduccion() {
    const { t } = useTranslation('landing');
    return (
        <PillarSection
            id="pilar-4"
            number="04"
            eyebrow={t('pillars.produccion.eyebrow')}
            title={t('pillars.produccion.title')}
            description={t('pillars.produccion.description')}
            bullets={t('pillars.produccion.bullets', { returnObjects: true }) as string[]}
            mockup={<SermonMock />}
            reversed
            dark
        />
    );
}
