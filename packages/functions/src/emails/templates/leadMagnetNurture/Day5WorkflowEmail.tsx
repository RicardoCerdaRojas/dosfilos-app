import * as React from 'react';
import { EmailLayout } from '../../components/EmailLayout';
import { CtaButton, H2, H3, P } from '../../components/EmailPrimitives';
import { TRIAL_URL } from './constants';

type Locale = 'es' | 'en';

interface Day5WorkflowEmailProps {
    name: string;
    locale: Locale;
}

const COPY = {
    es: {
        subject: 'Cómo preparo un sermón en 90 minutos (sin perder profundidad)',
        preview: 'El flujo concreto que reduce 6 horas a 90 minutos.',
        greeting: (n: string) => `Hola ${n},`,
        promise: 'Te prometí esto el martes. Aquí va el flujo concreto.',
        assumption: 'Asumamos que ya elegiste el pasaje (paso 0). El resto:',
        steps: [
            { title: '1. Exégesis acelerada (30 min)', body: <>Abro Preach, voy al módulo <strong>Exégesis</strong>, ingreso el pasaje. El sistema arma un paper con análisis sintáctico, contexto histórico, intertextualidad. Lo leo críticamente — corrijo lo que no me convence, agrego notas pastorales.</> },
            { title: '2. Conversación con tutores (20 min)', body: <>Tengo dudas específicas: ¿este verbo es perfectivo o aorístico? ¿Esta variante textual cambia algo? Abro <strong>Facultad Teológica</strong>, pregunto al tutor de griego. Las respuestas vienen con fuentes citadas de la biblioteca curada.</> },
            { title: '3. Bosquejo (15 min)', body: <>Le pido al tutor <em>"genera bosquejo de sermón"</em>. Devuelve estructura expositiva: idea principal arriba, 3 puntos que la desarrollan, aplicación pastoral. Lo edito a mi voz.</> },
            { title: '4. Cierre y aplicación (25 min)', body: <>Aquí trabajo solo. La IA hace el grunt work del análisis — el corazón pastoral, la ilustración local, el llamado a la respuesta: eso lo pones tú.</> },
        ],
        total: 'Total: 90 minutos para un sermón listo a refinar. Lo que antes me tomaba 6 horas.',
        cta: 'Probar el flujo completo',
        closing: 'Si te interesa, el plan Pro incluye exégesis ilimitada + acceso a todos los tutores. La prueba gratis te da 7 días para validar todo el flujo.',
    },
    en: {
        subject: 'How I prep a sermon in 90 minutes (without losing depth)',
        preview: 'The concrete flow that cuts 6 hours to 90 minutes.',
        greeting: (n: string) => `Hi ${n},`,
        promise: 'I promised this on Tuesday. Here\'s the concrete flow.',
        assumption: 'Assuming you already picked the passage (step 0). The rest:',
        steps: [
            { title: '1. Accelerated exegesis (30 min)', body: <>Open Preach, go to <strong>Exegesis</strong>, enter the passage. The system builds a paper with syntactic analysis, historical context, intertextuality. I read it critically — correct what doesn\'t convince me, add pastoral notes.</> },
            { title: '2. Tutor conversation (20 min)', body: <>I have specific questions: is this verb perfective or aoristic? Does this textual variant change anything? I open <strong>Theological Faculty</strong>, ask the Greek tutor. Answers come with citations from a curated library.</> },
            { title: '3. Sermon outline (15 min)', body: <>I ask the tutor: <em>"generate sermon outline"</em>. It returns expository structure: main idea on top, 3 points developing it, pastoral application. I edit to my voice.</> },
            { title: '4. Close and application (25 min)', body: <>This part I work alone. The AI does the grunt work of analysis — the pastoral heart, the local illustration, the call to response: that\'s on you.</> },
        ],
        total: 'Total: 90 minutes for a sermon ready to refine. What used to take me 6 hours.',
        cta: 'Try the full flow',
        closing: 'If you\'re interested, the Pro plan includes unlimited exegesis + access to all tutors. The free trial gives you 7 days to validate the whole flow.',
    },
} as const;

export function Day5WorkflowEmail({ name, locale }: Day5WorkflowEmailProps) {
    const c = COPY[locale];
    return (
        <EmailLayout title={c.subject} preview={c.preview}>
            <P>{c.greeting(name)}</P>
            <P>{c.promise}</P>
            <P>{c.assumption}</P>
            {c.steps.map((step, i) => (
                <React.Fragment key={i}>
                    <H3>{step.title}</H3>
                    <P>{step.body}</P>
                </React.Fragment>
            ))}
            <H2>{c.total}</H2>
            <CtaButton href={TRIAL_URL}>{c.cta}</CtaButton>
            <P muted>{c.closing}</P>
        </EmailLayout>
    );
}

export const getDay5WorkflowSubject = (locale: Locale = 'es') => COPY[locale].subject;
