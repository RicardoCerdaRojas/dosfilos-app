import * as React from 'react';
import { EmailLayout } from '../../components/EmailLayout';
import { CtaButton, H2, P, Quote } from '../../components/EmailPrimitives';
import { TRIAL_URL } from './constants';

type Locale = 'es' | 'en';

interface Day1ErrorEmailProps {
    name: string;
    locale: Locale;
}

const COPY: Record<Locale, {
    subject: string;
    preview: string;
    greeting: (name: string) => string;
    leadHtml: React.ReactNode;
    bodyHtml: React.ReactNode;
    quote: string;
    h2Closing: string;
    closingHtml: React.ReactNode;
    cta: string;
    nextDayTease: string;
}> = {
    es: {
        subject: 'El error más común al predicar expositivo (y cómo evitarlo)',
        preview: 'Lo que el manual no dice tan directo: el error no es exegético, es estructural.',
        greeting: (n) => `Hola ${n},`,
        leadHtml: <>Ayer descargaste el <strong>Manual para Predicadores Expositivos</strong>. Espero que ya lo hayas hojeado.</>,
        bodyHtml: <>Quiero ahorrarte tiempo y compartirte algo que el manual no dice tan directo: el error más común al predicar expositivo no es exegético — es <strong>estructural</strong>.</>,
        quote: 'Un sermón = una idea principal. Si no puedes resumir el sermón en una sola oración antes de subir al púlpito, todavía no está listo.',
        h2Closing: 'Cómo aplicarlo',
        closingHtml: <>El texto te da la idea. Los puntos del bosquejo la desarrollan. La aplicación la aterriza. Pero la <strong>idea</strong> es una sola. Si quieres ver cómo lo aplico, abre cualquier pasaje en <strong>Preach</strong> y pide al tutor un "bosquejo de sermón".</>,
        cta: 'Probar Preach gratis',
        nextDayTease: 'Mañana te mando otra: cómo elegir el próximo libro a predicar sin caer en la trampa del "quiero predicar Apocalipsis".',
    },
    en: {
        subject: 'The most common expository preaching mistake (and how to avoid it)',
        preview: 'What the manual doesn\'t say head-on: the mistake isn\'t exegetical, it\'s structural.',
        greeting: (n) => `Hi ${n},`,
        leadHtml: <>Yesterday you downloaded the <strong>Manual for Expository Preachers</strong>. Hope you got a chance to skim it.</>,
        bodyHtml: <>Let me save you some time and share something the manual doesn\'t say head-on: the most common expository preaching mistake isn\'t exegetical — it\'s <strong>structural</strong>.</>,
        quote: 'One sermon = one main idea. If you can\'t summarize the sermon in a single sentence before going up to the pulpit, it\'s not ready yet.',
        h2Closing: 'How to apply it',
        closingHtml: <>The text gives you the idea. The outline points develop it. The application lands it. But the <strong>idea</strong> is one. If you want to see how I apply this, open any passage in <strong>Preach</strong> and ask the tutor for a "sermon outline".</>,
        cta: 'Try Preach free',
        nextDayTease: 'Tomorrow I\'ll send another: how to pick your next book to preach without falling into the "I want to preach Revelation" trap.',
    },
};

export function Day1ErrorEmail({ name, locale }: Day1ErrorEmailProps) {
    const c = COPY[locale];
    return (
        <EmailLayout title={c.subject} preview={c.preview}>
            <P>{c.greeting(name)}</P>
            <P>{c.leadHtml}</P>
            <P>{c.bodyHtml}</P>
            <Quote>{c.quote}</Quote>
            <H2>{c.h2Closing}</H2>
            <P>{c.closingHtml}</P>
            <CtaButton href={TRIAL_URL}>{c.cta}</CtaButton>
            <P muted>{c.nextDayTease}</P>
        </EmailLayout>
    );
}

export const getDay1ErrorSubject = (locale: Locale = 'es') => COPY[locale].subject;
