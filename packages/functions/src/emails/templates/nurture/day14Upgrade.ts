type Locale = 'es' | 'en';

interface Day14Copy {
    title: string;
    subject: string;
    greeting: (name: string) => string;
    lead: string;
    pitch: string;
    highlightTitle: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    closing: string;
    cta: string;
    unsubscribe: string;
}

const COPY: Record<Locale, Day14Copy> = {
    es: {
        title: 'Lleva tu Ministerio al Siguiente Nivel',
        subject: 'Lleva tu Ministerio al Siguiente Nivel 🚀',
        greeting: (n) => `Hola ${n},`,
        lead: 'Llevas dos semanas con nosotros y esperamos que DosFilos sea de gran bendición para tu preparación.',
        pitch: 'Si sientes que estás listo para más, el plan <strong>PRO</strong> está diseñado para predicadores que buscan excelencia y profundidad constante.',
        highlightTitle: '🌟 ¿Por qué pasar a PRO?',
        bullet1: '✅ <strong>Generaciones Ilimitadas:</strong> Crea todos los bosquejos que necesites.',
        bullet2: '✅ <strong>Tutor Griego Avanzado:</strong> Análisis exegético profundo sin límites.',
        bullet3: '✅ <strong>Soporte Prioritario:</strong> Estamos aquí para ayudarte.',
        closing: 'Invierte en tu herramienta de trabajo principal. Tu tiempo y la calidad de tu mensaje lo valen.',
        cta: 'Ver Planes PRO',
        unsubscribe: 'Darse de baja',
    },
    en: {
        title: 'Take Your Ministry to the Next Level',
        subject: 'Take Your Ministry to the Next Level 🚀',
        greeting: (n) => `Hi ${n},`,
        lead: 'You’ve been with us for two weeks and we hope DosFilos has been a blessing for your preparation.',
        pitch: 'If you feel ready for more, the <strong>PRO</strong> plan is designed for preachers who pursue excellence and consistent depth.',
        highlightTitle: '🌟 Why upgrade to PRO?',
        bullet1: '✅ <strong>Unlimited Generations:</strong> Create as many outlines as you need.',
        bullet2: '✅ <strong>Advanced Greek Tutor:</strong> Deep exegetical analysis without limits.',
        bullet3: '✅ <strong>Priority Support:</strong> We’re here to help.',
        closing: 'Invest in your primary work tool. Your time and the quality of your message are worth it.',
        cta: 'See PRO Plans',
        unsubscribe: 'Unsubscribe',
    },
};

export const getDay14UpgradeSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getDay14UpgradeTemplate = (name: string, dashboardUrl: string, locale: Locale = 'es') => {
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
        .button { display: inline-block; padding: 12px 24px; background-color: #7C3AED; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        .highlight { background-color: #F3E8FF; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DosFilos.Preach</h1>
        </div>

        <h2>${c.greeting(name)}</h2>

        <p>${c.lead}</p>

        <p>${c.pitch}</p>

        <div class="highlight">
            <h3>${c.highlightTitle}</h3>
            <ul style="list-style: none; padding-left: 0;">
                <li>${c.bullet1}</li>
                <li>${c.bullet2}</li>
                <li>${c.bullet3}</li>
            </ul>
        </div>

        <p>${c.closing}</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}/settings/billing" class="button">${c.cta}</a>
        </div>

        <div class="footer">
            <p>© ${new Date().getFullYear()} DosFilos.Preach</p>
            <p><a href="${dashboardUrl}/settings">${c.unsubscribe}</a></p>
        </div>
    </div>
</body>
</html>
`;
};
