type Locale = 'es' | 'en';

interface Copy {
    title: string;
    subject: string;
    greeting: (name: string) => string;
    lead: string;
    body: string;
    whatHappens: string;
    whatHappensBody: string;
    cta: string;
    closing: string;
    helpHint: string;
    unsubscribe: string;
}

const COPY: Record<Locale, Copy> = {
    es: {
        title: 'No pudimos procesar tu pago',
        subject: 'No pudimos procesar tu pago — actualiza tu método',
        greeting: (n) => `Hola ${n},`,
        lead: 'Intentamos cobrar tu suscripción de DosFilos.Preach pero el pago fue rechazado.',
        body: 'Esto suele pasar por una tarjeta vencida, fondos insuficientes, o porque el banco bloqueó el cargo automático. Es fácil de resolver — actualiza tu método de pago y reintentaremos automáticamente.',
        whatHappens: '¿Qué pasa si no actualizo?',
        whatHappensBody: 'Reintentaremos el cobro durante los próximos días. Si después de 3 intentos sigue fallando, tu suscripción se cancela y pierdes acceso a tu biblioteca, tutores y sermones. <strong>Mejor evitarlo</strong>.',
        cta: 'Actualizar método de pago',
        closing: 'Si crees que esto es un error o necesitas ayuda, responde este correo.',
        helpHint: 'Toma menos de 30 segundos.',
        unsubscribe: 'Darse de baja',
    },
    en: {
        title: 'We couldn\'t process your payment',
        subject: 'Payment failed — update your payment method',
        greeting: (n) => `Hi ${n},`,
        lead: 'We tried to charge your DosFilos.Preach subscription but the payment was declined.',
        body: 'This usually happens because of an expired card, insufficient funds, or the bank blocking the recurring charge. It\'s easy to fix — update your payment method and we\'ll retry automatically.',
        whatHappens: 'What happens if I don\'t update?',
        whatHappensBody: 'We\'ll retry the charge over the next few days. If after 3 attempts it still fails, your subscription is cancelled and you lose access to your library, tutors, and sermons. <strong>Better to avoid that</strong>.',
        cta: 'Update payment method',
        closing: 'If you think this is a mistake or need help, reply to this email.',
        helpHint: 'Takes less than 30 seconds.',
        unsubscribe: 'Unsubscribe',
    },
};

export const getPaymentFailedSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getPaymentFailedTemplate = (name: string, dashboardUrl: string, locale: Locale = 'es') => {
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
        .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; border-radius: 4px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .help-hint { font-size: 12px; color: #888; text-align: center; margin-top: 8px; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DosFilos.Preach</h1>
        </div>

        <h2>${c.greeting(name)}</h2>

        <div class="alert">
            <p style="margin: 0;"><strong>${c.lead}</strong></p>
        </div>

        <p>${c.body}</p>

        <h3>${c.whatHappens}</h3>
        <p>${c.whatHappensBody}</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}/subscription" class="button">${c.cta}</a>
            <div class="help-hint">${c.helpHint}</div>
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
