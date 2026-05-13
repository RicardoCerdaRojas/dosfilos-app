import { Locale, renderNurtureShell, TRIAL_URL, UNSUBSCRIBE_URL, unsubscribeLabel } from './shell';

/**
 * Day 7: final email of the lead-magnet sequence. Direct invitation
 * to start the trial. Mentions the previous 3 emails as a recap so
 * the lead remembers the value already delivered. Honest framing —
 * "if Preach isn't for you, no hard feelings; this is the last email."
 */

interface Day7Copy {
    subject: string;
    greeting: (name: string) => string;
    bodyHtml: string;
    cta: string;
    closing: string;
}

const COPY: Record<Locale, Day7Copy> = {
    es: {
        subject: '¿Probamos juntos? (último email de la serie)',
        greeting: (n) => `Hola ${n},`,
        bodyHtml: `
            <p>Una semana atrás descargaste el manual. Desde entonces te mandé tres correos más:</p>
            <ul>
                <li>El error estructural más común al predicar expositivo.</li>
                <li>Cómo elegir el próximo libro a predicar.</li>
                <li>Mi flujo de 90 minutos para preparar un sermón.</li>
            </ul>
            <p>Si algo de eso te sirvió, considera probar <strong>Preach</strong> con tu próximo sermón. Es la herramienta que hace todo eso real.</p>
            <h3>Qué incluye la prueba gratis (7 días)</h3>
            <ul>
                <li>Acceso a los 8+ tutores teológicos (griego, hebreo, exégesis, homilética, consejería).</li>
                <li>Módulo de exégesis con generación de papers.</li>
                <li>Generador de bosquejos, devocionales, guías de estudio.</li>
                <li>Series expositivas con división sintáctica del libro.</li>
            </ul>
            <p>No pido tarjeta para activar la prueba. Si al final de los 7 días no te convence, cancelas con un click y se acaba. Sin trampas.</p>
            <p>Este es el último email de la secuencia. Si quieres seguir conversando, respóndeme directo — me llegan a mi inbox personal.</p>
        `,
        cta: 'Empezar mi prueba gratis',
        closing: 'Pase lo que pase, gracias por descargar el manual y leerme. Que Dios te dé sabiduría en el púlpito esta semana.',
    },
    en: {
        subject: 'Want to try together? (last email of the series)',
        greeting: (n) => `Hi ${n},`,
        bodyHtml: `
            <p>A week ago you downloaded the manual. Since then I\'ve sent you three more emails:</p>
            <ul>
                <li>The most common structural mistake in expository preaching.</li>
                <li>How to pick your next book to preach.</li>
                <li>My 90-minute sermon prep flow.</li>
            </ul>
            <p>If any of that resonated, consider trying <strong>Preach</strong> with your next sermon. It\'s the tool that makes all of it real.</p>
            <h3>What the free trial includes (7 days)</h3>
            <ul>
                <li>Access to 8+ theological tutors (Greek, Hebrew, exegesis, homiletics, counseling).</li>
                <li>Exegesis module with paper generation.</li>
                <li>Sermon outline, devotional, study guide generators.</li>
                <li>Expository series with syntactic book division.</li>
            </ul>
            <p>No card required to start the trial. If by day 7 it\'s not for you, cancel with one click and we\'re done. No gotchas.</p>
            <p>This is the last email of the sequence. If you want to keep talking, reply directly — it lands in my personal inbox.</p>
        `,
        cta: 'Start my free trial',
        closing: 'Either way, thanks for downloading the manual and reading. May God give you wisdom in the pulpit this week.',
    },
};

export const getDay7TrialSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getDay7TrialTemplate = (name: string, locale: Locale = 'es'): string => {
    const c = COPY[locale];
    return renderNurtureShell({
        title: c.subject,
        greeting: c.greeting(name),
        bodyHtml: c.bodyHtml,
        ctaLabel: c.cta,
        ctaHref: TRIAL_URL,
        closing: c.closing,
        unsubscribeLabel: unsubscribeLabel(locale),
        unsubscribeHref: UNSUBSCRIBE_URL,
    });
};
