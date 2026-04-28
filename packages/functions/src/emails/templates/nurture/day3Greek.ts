type Locale = 'es' | 'en';

interface Day3Copy {
    title: string;
    subject: string;
    greeting: (name: string) => string;
    lead: string;
    body: string;
    quote: string;
    bulletsTitle: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    cta: string;
    closing: string;
    unsubscribe: string;
}

const COPY: Record<Locale, Day3Copy> = {
    es: {
        title: 'Descubre el Poder del Griego',
        subject: 'Descubre el Poder del Griego 🏛️',
        greeting: (n) => `Hola ${n},`,
        lead: '¿Sabías que puedes analizar el texto original bíblico sin ser un experto en griego?',
        body: 'Muchos pastores se sienten intimidados por los idiomas originales, pero con nuestro <strong>Tutor Griego IA</strong>, es como tener a un erudito a tu lado.',
        quote: '"La Palabra de Dios es viva y eficaz, y más cortante que toda espada de dos filos..." - Hebreos 4:12',
        bulletsTitle: 'Lo que puedes hacer hoy:',
        bullet1: '🔍 <strong>Análisis Morfológico:</strong> Entiende cada palabra del versículo.',
        bullet2: '💡 <strong>Significado Teológico:</strong> Descubre matices que las traducciones pierden.',
        bullet3: '❓ <strong>Pregúntale al Texto:</strong> Resuelve dudas específicas al instante.',
        cta: 'Probar el Tutor Griego',
        closing: 'No dejes que el idioma sea una barrera para profundizar en las Escrituras.',
        unsubscribe: 'Darse de baja',
    },
    en: {
        title: 'Discover the Power of Greek',
        subject: 'Discover the Power of Greek 🏛️',
        greeting: (n) => `Hi ${n},`,
        lead: 'Did you know you can analyze the original biblical text without being a Greek expert?',
        body: 'Many pastors feel intimidated by the original languages, but with our <strong>Greek Tutor AI</strong>, it’s like having a scholar at your side.',
        quote: '"For the word of God is living and active, sharper than any two-edged sword..." - Hebrews 4:12',
        bulletsTitle: 'What you can do today:',
        bullet1: '🔍 <strong>Morphological Analysis:</strong> Understand every word of the verse.',
        bullet2: '💡 <strong>Theological Meaning:</strong> Discover nuances that translations miss.',
        bullet3: '❓ <strong>Ask the Text:</strong> Resolve specific questions instantly.',
        cta: 'Try the Greek Tutor',
        closing: 'Don’t let language be a barrier to deepening your study of Scripture.',
        unsubscribe: 'Unsubscribe',
    },
};

export const getDay3GreekSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getDay3GreekTemplate = (name: string, dashboardUrl: string, locale: Locale = 'es') => {
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
        .button { display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        .quote { font-style: italic; border-left: 4px solid #2563EB; padding-left: 15px; color: #555; margin: 20px 0; }
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

        <div class="quote">${c.quote}</div>

        <h3>${c.bulletsTitle}</h3>
        <ul>
            <li>${c.bullet1}</li>
            <li>${c.bullet2}</li>
            <li>${c.bullet3}</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" class="button">${c.cta}</a>
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
