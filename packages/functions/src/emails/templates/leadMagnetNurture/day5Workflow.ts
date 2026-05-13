import { Locale, renderNurtureShell, TRIAL_URL, UNSUBSCRIBE_URL, unsubscribeLabel } from './shell';

/**
 * Day 5: concrete sermon-prep workflow with Preach. This is the
 * email that shows ROI. Pastoral problem → product solution. The
 * 90-minute promise from day 3 gets cashed here.
 */

interface Day5Copy {
    subject: string;
    greeting: (name: string) => string;
    bodyHtml: string;
    cta: string;
    closing: string;
}

const COPY: Record<Locale, Day5Copy> = {
    es: {
        subject: 'Cómo preparo un sermón en 90 minutos (sin perder profundidad)',
        greeting: (n) => `Hola ${n},`,
        bodyHtml: `
            <p>Te prometí esto el martes. Aquí va el flujo concreto.</p>
            <p>Asumamos que ya elegiste el pasaje (paso 0). El resto:</p>
            <h3>1. Exégesis acelerada (30 min)</h3>
            <p>Abro Preach, voy al módulo <strong>Exégesis</strong>, ingreso el pasaje. El sistema arma un paper con análisis sintáctico, contexto histórico, intertextualidad. Lo leo críticamente — corrijo lo que no me convence, agrego notas pastorales.</p>
            <h3>2. Conversación con tutores (20 min)</h3>
            <p>Tengo dudas específicas: ¿este verbo es perfectivo o aorístico? ¿Esta variante textual cambia algo? Abro <strong>Facultad Teológica</strong>, pregunto al tutor de griego (o hebreo, o teología sistemática). Las respuestas vienen con fuentes citadas de la biblioteca curada.</p>
            <h3>3. Bosquejo (15 min)</h3>
            <p>Le pido al tutor <em>"genera bosquejo de sermón"</em>. Devuelve estructura expositiva: idea principal arriba, 3 puntos que la desarrollan, aplicación pastoral. Lo edito a mi voz.</p>
            <h3>4. Cierre y aplicación (25 min)</h3>
            <p>Aquí trabajo solo. La IA hace el grunt work del análisis — el corazón pastoral, la ilustración local, el llamado a la respuesta: eso lo pones tú.</p>
            <p>Total: 90 minutos para un sermón listo a refinar. Lo que antes me tomaba 6 horas.</p>
        `,
        cta: 'Probar el flujo completo',
        closing: 'Si te interesa, el plan Pro incluye exégesis ilimitada + acceso a todos los tutores. La prueba gratis te da 7 días para validar todo el flujo.',
    },
    en: {
        subject: 'How I prep a sermon in 90 minutes (without losing depth)',
        greeting: (n) => `Hi ${n},`,
        bodyHtml: `
            <p>I promised this on Tuesday. Here\'s the concrete flow.</p>
            <p>Assuming you already picked the passage (step 0). The rest:</p>
            <h3>1. Accelerated exegesis (30 min)</h3>
            <p>Open Preach, go to <strong>Exegesis</strong>, enter the passage. The system builds a paper with syntactic analysis, historical context, intertextuality. I read it critically — correct what doesn\'t convince me, add pastoral notes.</p>
            <h3>2. Tutor conversation (20 min)</h3>
            <p>I have specific questions: is this verb perfective or aoristic? Does this textual variant change anything? I open <strong>Theological Faculty</strong>, ask the Greek tutor (or Hebrew, or systematic theology). Answers come with citations from a curated library.</p>
            <h3>3. Sermon outline (15 min)</h3>
            <p>I ask the tutor: <em>"generate sermon outline"</em>. It returns expository structure: main idea on top, 3 points developing it, pastoral application. I edit to my voice.</p>
            <h3>4. Close and application (25 min)</h3>
            <p>This part I work alone. The AI does the grunt work of analysis — the pastoral heart, the local illustration, the call to response: that\'s on you.</p>
            <p>Total: 90 minutes for a sermon ready to refine. What used to take me 6 hours.</p>
        `,
        cta: 'Try the full flow',
        closing: 'If you\'re interested, the Pro plan includes unlimited exegesis + access to all tutors. The free trial gives you 7 days to validate the whole flow.',
    },
};

export const getDay5WorkflowSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getDay5WorkflowTemplate = (name: string, locale: Locale = 'es'): string => {
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
