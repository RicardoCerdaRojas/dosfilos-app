import { Locale, renderNurtureShell, TRIAL_URL, UNSUBSCRIBE_URL, unsubscribeLabel } from './shell';

/**
 * Day 1 of the lead-magnet nurture. Premise: the manual they
 * downloaded is full of "what to do" but missing the most common
 * "what NOT to do". This email closes that gap with a single
 * teaching point — proves the manual writer is a real pastor with
 * real opinions, not a content farm.
 */

interface Day1Copy {
    subject: string;
    greeting: (name: string) => string;
    leadHtml: string;
    bodyHtml: string;
    quote: string;
    cta: string;
    closing: string;
}

const COPY: Record<Locale, Day1Copy> = {
    es: {
        subject: 'El error más común al predicar expositivo (y cómo evitarlo)',
        greeting: (n) => `Hola ${n},`,
        leadHtml: '<p>Ayer descargaste el <strong>Manual para Predicadores Expositivos</strong>. Espero que ya lo hayas hojeado.</p>',
        bodyHtml: `
            <p>Quiero ahorrarte tiempo y compartirte algo que el manual no dice tan directo: el error más común al predicar expositivo no es exegético — es <strong>estructural</strong>.</p>
            <p>Suena así: el predicador estudia un pasaje, encuentra 5–6 verdades hermosas, y las predica todas. El sermón se siente "completo" pero la congregación sale sin nada que recordar el martes.</p>
            <p>La regla que aprendí (y que cambió todo):</p>
            <div class="quote">Un sermón = una idea principal. Si no puedes resumir el sermón en una sola oración antes de subir al púlpito, todavía no está listo.</div>
            <p>El texto te da la idea. Los puntos del bosquejo la desarrollan. La aplicación la aterriza. Pero la <strong>idea</strong> es una sola.</p>
            <p>Si quieres ver cómo lo aplico, abre cualquier pasaje en <strong>Preach</strong> y pide al tutor un "bosquejo de sermón". Te devuelve una propuesta con la idea principal arriba — exactamente la disciplina que la mayoría de pastores aprenden tarde.</p>
        `,
        quote: '',
        cta: 'Probar Preach gratis',
        closing: 'Mañana te mando otra: cómo elegir el próximo libro a predicar sin caer en la trampa del "quiero predicar Apocalipsis".',
    },
    en: {
        subject: 'The most common expository preaching mistake (and how to avoid it)',
        greeting: (n) => `Hi ${n},`,
        leadHtml: '<p>Yesterday you downloaded the <strong>Manual for Expository Preachers</strong>. Hope you got a chance to skim it.</p>',
        bodyHtml: `
            <p>Let me save you some time and share something the manual doesn\'t say head-on: the most common expository preaching mistake isn\'t exegetical — it\'s <strong>structural</strong>.</p>
            <p>It looks like this: the preacher studies a passage, finds 5–6 beautiful truths, and preaches them all. The sermon feels "complete" but the congregation leaves with nothing they\'ll remember Tuesday.</p>
            <p>The rule I learned the hard way (and that changed everything):</p>
            <div class="quote">One sermon = one main idea. If you can\'t summarize the sermon in a single sentence before going up to the pulpit, it\'s not ready yet.</div>
            <p>The text gives you the idea. The outline points develop it. The application lands it. But the <strong>idea</strong> is one.</p>
            <p>If you want to see how I apply this, open any passage in <strong>Preach</strong> and ask the tutor for a "sermon outline". You\'ll get back a proposal with the main idea at the top — exactly the discipline most pastors learn late.</p>
        `,
        quote: '',
        cta: 'Try Preach free',
        closing: 'Tomorrow I\'ll send another one: how to pick your next book to preach without falling into the "I want to preach Revelation" trap.',
    },
};

export const getDay1ErrorSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getDay1ErrorTemplate = (name: string, locale: Locale = 'es'): string => {
    const c = COPY[locale];
    return renderNurtureShell({
        title: c.subject,
        greeting: c.greeting(name),
        bodyHtml: c.leadHtml + c.bodyHtml,
        ctaLabel: c.cta,
        ctaHref: TRIAL_URL,
        closing: c.closing,
        unsubscribeLabel: unsubscribeLabel(locale),
        unsubscribeHref: UNSUBSCRIBE_URL,
    });
};
