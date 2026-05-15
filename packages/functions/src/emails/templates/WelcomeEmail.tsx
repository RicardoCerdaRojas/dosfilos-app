import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { CtaButton, H2, H3, P } from '../components/EmailPrimitives';

type Locale = 'es' | 'en';

interface WelcomeEmailProps {
    name: string;
    locale: Locale;
    /** Free flow: verification link that unlocks the dashboard. */
    verifyEmailUrl?: string;
    /** Paid flow: one-time link to create the account password. */
    setPasswordUrl?: string;
    /** Paid flow only — shown when no verification gate is needed. */
    dashboardUrl?: string;
}

interface FeatureCopy {
    title: string;
    desc: string;
}

interface WelcomeCopy {
    subject: string;
    preview: string;
    greeting: (name: string) => string;
    intro: string;
    featuresHeading: string;
    features: FeatureCopy[];
    verifyHeading: string;
    verifyLead: string;
    verifyCta: string;
    passwordHeading: string;
    passwordLead: string;
    passwordCta: string;
    dashboardCta: string;
    fallbackName: string;
}

const COPY: Record<Locale, WelcomeCopy> = {
    es: {
        subject: 'Bienvenido a DosFilos.Preach',
        preview: 'Tu prueba de 30 días ya está activa.',
        greeting: (n) => `Bienvenido, ${n}`,
        intro:
            'Gracias por unirte a DosFilos.Preach. Tu prueba de 30 días ya está activa — durante este tiempo tienes acceso completo a la plataforma sin cargos.',
        featuresHeading: 'Qué puedes hacer ahora',
        features: [
            { title: 'Tutor Griego & Hebreo', desc: 'Estudia el texto original con asistencia experta.' },
            { title: 'Facultad Teológica', desc: 'Conversaciones con especialistas IA citando fuentes reales.' },
            { title: 'Biblioteca personal', desc: 'Sube tus recursos y úsalos en todas tus consultas.' },
            { title: 'Producción de sermones', desc: 'Organiza, escribe y predica con todo tu estudio conectado.' },
        ],
        verifyHeading: 'Confirma tu email',
        verifyLead:
            'Necesitamos confirmar tu correo para activar tu cuenta. Es un solo click y desbloqueas todo el taller:',
        verifyCta: 'Verificar email',
        passwordHeading: 'Establece tu contraseña',
        passwordLead: 'Para iniciar sesión la próxima vez, crea una contraseña segura:',
        passwordCta: 'Establecer contraseña',
        dashboardCta: 'Ir al dashboard',
        fallbackName: 'Predicador',
    },
    en: {
        subject: 'Welcome to DosFilos.Preach',
        preview: 'Your 30-day trial is now active.',
        greeting: (n) => `Welcome, ${n}`,
        intro:
            'Thanks for joining DosFilos.Preach. Your 30-day trial is now active — full platform access, no charges during this period.',
        featuresHeading: 'What you can do now',
        features: [
            { title: 'Greek & Hebrew Tutor', desc: 'Study the original text with expert assistance.' },
            { title: 'Theological Faculty', desc: 'Conversations with AI specialists citing real sources.' },
            { title: 'Personal library', desc: 'Upload your resources and use them across every query.' },
            { title: 'Sermon production', desc: 'Organize, write, and preach with your entire study connected.' },
        ],
        verifyHeading: 'Confirm your email',
        verifyLead:
            "We need to confirm your email to activate your account. One click unlocks the full workshop:",
        verifyCta: 'Verify email',
        passwordHeading: 'Set your password',
        passwordLead: 'To sign in next time, create a secure password:',
        passwordCta: 'Set password',
        dashboardCta: 'Open dashboard',
        fallbackName: 'Preacher',
    },
};

export function WelcomeEmail({
    name,
    locale,
    verifyEmailUrl,
    setPasswordUrl,
    dashboardUrl,
}: WelcomeEmailProps) {
    const c = COPY[locale];
    const firstName = name.split(' ')[0] || c.fallbackName;

    return (
        <EmailLayout title={c.subject} preview={c.preview}>
            <H2>{c.greeting(firstName)}</H2>
            <P>{c.intro}</P>

            <H3>{c.featuresHeading}</H3>
            {c.features.map((f) => (
                <P key={f.title}>
                    <strong>{f.title}</strong> — {f.desc}
                </P>
            ))}

            {verifyEmailUrl && (
                <>
                    <H3>{c.verifyHeading}</H3>
                    <P>{c.verifyLead}</P>
                    <CtaButton href={verifyEmailUrl}>{c.verifyCta}</CtaButton>
                </>
            )}

            {setPasswordUrl && (
                <>
                    <H3>{c.passwordHeading}</H3>
                    <P>{c.passwordLead}</P>
                    <CtaButton href={setPasswordUrl}>{c.passwordCta}</CtaButton>
                </>
            )}

            {!verifyEmailUrl && !setPasswordUrl && dashboardUrl && (
                <CtaButton href={dashboardUrl}>{c.dashboardCta}</CtaButton>
            )}
        </EmailLayout>
    );
}

export const getWelcomeEmailSubject = (locale: Locale = 'es') => COPY[locale].subject;
