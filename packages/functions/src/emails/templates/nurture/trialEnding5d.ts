type Locale = 'es' | 'en';

interface Copy {
    title: string;
    subject: string;
    greeting: (name: string) => string;
    lead: string;
    body: string;
    bulletsTitle: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    cta: string;
    closing: string;
    reassurance: string;
    unsubscribe: string;
}

const COPY: Record<Locale, Copy> = {
    es: {
        title: 'Tu trial termina en 5 días',
        subject: 'Quedan 5 días en tu prueba — confirma tu plan',
        greeting: (n) => `Hola ${n},`,
        lead: 'Tu prueba de 30 días termina en 5 días. Querías recordártelo antes de que pase desapercibido.',
        body: 'Si quieres seguir usando DosFilos.Preach, no necesitas hacer nada — tu plan se renovará automáticamente con el método de pago que registraste. Si prefieres no continuar, puedes cancelar desde tu cuenta sin cargo.',
        bulletsTitle: 'Antes de decidir, considera lo que has construido:',
        bullet1: '📚 <strong>Tu biblioteca personal</strong> — los recursos que subiste, indexados con búsqueda semántica.',
        bullet2: '✍️ <strong>Tus sermones</strong> — borradores y publicados, con tu propia metodología.',
        bullet3: '🎓 <strong>Tutores Griego/Hebreo</strong> — sesiones que pasaste estudiando con citas trazables.',
        cta: 'Confirmar mi plan',
        closing: 'Si tienes alguna duda sobre el plan o la facturación, contesta este correo y te ayudamos.',
        reassurance: 'Sin compromiso · Cancela cuando quieras desde Mi Suscripción',
        unsubscribe: 'Darse de baja',
    },
    en: {
        title: 'Your trial ends in 5 days',
        subject: '5 days left on your trial — confirm your plan',
        greeting: (n) => `Hi ${n},`,
        lead: 'Your 30-day trial ends in 5 days. We wanted to remind you before it slips by unnoticed.',
        body: 'If you want to keep using DosFilos.Preach, you don\'t need to do anything — your plan will renew automatically with the payment method on file. If you prefer not to continue, you can cancel from your account at no cost.',
        bulletsTitle: 'Before you decide, consider what you\'ve built:',
        bullet1: '📚 <strong>Your personal library</strong> — the resources you uploaded, indexed with semantic search.',
        bullet2: '✍️ <strong>Your sermons</strong> — drafts and published ones, with your own methodology.',
        bullet3: '🎓 <strong>Greek/Hebrew tutors</strong> — sessions you spent studying with traceable citations.',
        cta: 'Confirm my plan',
        closing: 'If you have any questions about the plan or billing, reply to this email and we\'ll help.',
        reassurance: 'No commitment · Cancel anytime from My Subscription',
        unsubscribe: 'Unsubscribe',
    },
};

export const getTrialEnding5dSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getTrialEnding5dTemplate = (name: string, dashboardUrl: string, locale: Locale = 'es') => {
    const c = COPY[locale];
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${c.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        .reassurance { font-size: 12px; color: #888; text-align: center; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DosFilos.Preach</h1>
        </div>

        <h2>${c.greeting(name)}</h2>

        <p>${c.lead}</p>
        <p>${c.body}</p>

        <h3>${c.bulletsTitle}</h3>
        <ul>
            <li>${c.bullet1}</li>
            <li>${c.bullet2}</li>
            <li>${c.bullet3}</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}/subscription" class="button">${c.cta}</a>
            <div class="reassurance">${c.reassurance}</div>
        </div>

        <p>${c.closing}</p>

        <div class="footer">
            <p>© ${new Date().getFullYear()} DosFilos.Preach</p>
            <p><a href="${dashboardUrl}/settings">${c.unsubscribe}</a></p>
        </div>
    </div>
</body>
</html>
`;
};
