type Locale = 'es' | 'en';

interface Copy {
    title: string;
    subject: string;
    greeting: (name: string) => string;
    lead: string;
    body: string;
    options: string;
    optionContinue: string;
    optionCancel: string;
    cta: string;
    secondaryCta: string;
    closing: string;
    unsubscribe: string;
}

const COPY: Record<Locale, Copy> = {
    es: {
        title: 'Último aviso: tu trial termina mañana',
        subject: 'Mañana termina tu prueba 🕐',
        greeting: (n) => `Hola ${n},`,
        lead: 'Tu prueba de 30 días termina mañana. Este es el último recordatorio antes de que se haga el primer cobro.',
        body: 'Si tu método de pago está al día, no necesitas hacer nada — tu plan se renueva automáticamente y mantienes acceso completo.',
        options: 'Tienes dos opciones:',
        optionContinue: '<strong>Continuar:</strong> Asegúrate que tu tarjeta esté vigente — revisa Mi Suscripción.',
        optionCancel: '<strong>Cancelar:</strong> Hazlo antes de medianoche para evitar el cobro. Mantienes acceso hasta el día final.',
        cta: 'Revisar mi plan',
        secondaryCta: 'Cancelar suscripción',
        closing: 'Si tienes una duda específica, responde este correo. Lo leo personalmente.',
        unsubscribe: 'Darse de baja',
    },
    en: {
        title: 'Final reminder: your trial ends tomorrow',
        subject: 'Your trial ends tomorrow 🕐',
        greeting: (n) => `Hi ${n},`,
        lead: 'Your 30-day trial ends tomorrow. This is the final reminder before the first charge.',
        body: 'If your payment method is up to date, you don\'t need to do anything — your plan renews automatically and you keep full access.',
        options: 'You have two options:',
        optionContinue: '<strong>Continue:</strong> Make sure your card is current — check My Subscription.',
        optionCancel: '<strong>Cancel:</strong> Do it before midnight to avoid the charge. You keep access until the final day.',
        cta: 'Review my plan',
        secondaryCta: 'Cancel subscription',
        closing: 'If you have a specific question, reply to this email. I read every one personally.',
        unsubscribe: 'Unsubscribe',
    },
};

export const getTrialEnding1dSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getTrialEnding1dTemplate = (name: string, dashboardUrl: string, locale: Locale = 'es') => {
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
        .button-secondary { display: inline-block; padding: 10px 20px; color: #666; text-decoration: none; font-size: 13px; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        .options { background: #fef9c3; border-left: 4px solid #ca8a04; padding: 16px 20px; border-radius: 4px; margin: 20px 0; }
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

        <div class="options">
            <p style="margin: 0 0 12px 0;"><strong>${c.options}</strong></p>
            <p style="margin: 0 0 8px 0;">${c.optionContinue}</p>
            <p style="margin: 0;">${c.optionCancel}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}/subscription" class="button">${c.cta}</a>
            <br>
            <a href="${dashboardUrl}/subscription" class="button-secondary">${c.secondaryCta}</a>
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
