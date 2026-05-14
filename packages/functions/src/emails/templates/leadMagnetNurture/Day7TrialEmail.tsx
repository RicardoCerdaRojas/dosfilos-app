import { EmailLayout } from '../../components/EmailLayout';
import { CtaButton, H2, P } from '../../components/EmailPrimitives';
import { TRIAL_URL } from './constants';

type Locale = 'es' | 'en';

interface Day7TrialEmailProps {
    name: string;
    locale: Locale;
}

const COPY = {
    es: {
        subject: '¿Probamos juntos? (último email de la serie)',
        preview: 'Una semana, tres emails. Si algo te sirvió, pruébalo con tu próximo sermón.',
        greeting: (n: string) => `Hola ${n},`,
        recap: 'Una semana atrás descargaste el manual. Desde entonces te mandé tres correos más:',
        recapItems: [
            'El error estructural más común al predicar expositivo.',
            'Cómo elegir el próximo libro a predicar.',
            'Mi flujo de 90 minutos para preparar un sermón.',
        ],
        offer: <>Si algo de eso te sirvió, considera probar <strong>Preach</strong> con tu próximo sermón. Es la herramienta que hace todo eso real.</>,
        trialIncludesTitle: 'Qué incluye la prueba gratis (7 días)',
        trialItems: [
            'Acceso a los 8+ tutores teológicos (griego, hebreo, exégesis, homilética, consejería).',
            'Módulo de exégesis con generación de papers.',
            'Generador de bosquejos, devocionales, guías de estudio.',
            'Series expositivas con división sintáctica del libro.',
        ],
        noCard: 'No pido tarjeta para activar la prueba. Si al final de los 7 días no te convence, cancelas con un click y se acaba. Sin trampas.',
        lastEmail: 'Este es el último email de la secuencia. Si quieres seguir conversando, respóndeme directo — me llegan a mi inbox personal.',
        cta: 'Empezar mi prueba gratis',
        blessing: 'Pase lo que pase, gracias por descargar el manual y leerme. Que Dios te dé sabiduría en el púlpito esta semana.',
    },
    en: {
        subject: 'Want to try together? (last email of the series)',
        preview: 'A week, three emails. If any of it resonated, try it with your next sermon.',
        greeting: (n: string) => `Hi ${n},`,
        recap: 'A week ago you downloaded the manual. Since then I\'ve sent you three more emails:',
        recapItems: [
            'The most common structural mistake in expository preaching.',
            'How to pick your next book to preach.',
            'My 90-minute sermon prep flow.',
        ],
        offer: <>If any of that resonated, consider trying <strong>Preach</strong> with your next sermon. It\'s the tool that makes all of it real.</>,
        trialIncludesTitle: 'What the free trial includes (7 days)',
        trialItems: [
            'Access to 8+ theological tutors (Greek, Hebrew, exegesis, homiletics, counseling).',
            'Exegesis module with paper generation.',
            'Sermon outline, devotional, study guide generators.',
            'Expository series with syntactic book division.',
        ],
        noCard: 'No card required to start the trial. If by day 7 it\'s not for you, cancel with one click and we\'re done. No gotchas.',
        lastEmail: 'This is the last email of the sequence. If you want to keep talking, reply directly — it lands in my personal inbox.',
        cta: 'Start my free trial',
        blessing: 'Either way, thanks for downloading the manual and reading. May God give you wisdom in the pulpit this week.',
    },
} as const;

export function Day7TrialEmail({ name, locale }: Day7TrialEmailProps) {
    const c = COPY[locale];
    return (
        <EmailLayout title={c.subject} preview={c.preview}>
            <P>{c.greeting(name)}</P>
            <P>{c.recap}</P>
            <ul style={{ paddingLeft: '22px', margin: '12px 0' }}>
                {c.recapItems.map((item, i) => (
                    <li key={i} style={{ margin: '8px 0', fontSize: '16px', lineHeight: 1.7 }}>{item}</li>
                ))}
            </ul>
            <P>{c.offer}</P>
            <H2>{c.trialIncludesTitle}</H2>
            <ul style={{ paddingLeft: '22px', margin: '12px 0' }}>
                {c.trialItems.map((item, i) => (
                    <li key={i} style={{ margin: '8px 0', fontSize: '16px', lineHeight: 1.7 }}>{item}</li>
                ))}
            </ul>
            <P>{c.noCard}</P>
            <P muted>{c.lastEmail}</P>
            <CtaButton href={TRIAL_URL}>{c.cta}</CtaButton>
            <P muted>{c.blessing}</P>
        </EmailLayout>
    );
}

export const getDay7TrialSubject = (locale: Locale = 'es') => COPY[locale].subject;
