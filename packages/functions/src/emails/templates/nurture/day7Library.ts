type Locale = 'es' | 'en';

interface Day7Copy {
    title: string;
    subject: string;
    greeting: (name: string) => string;
    lead: string;
    body: string;
    tipHeader: string;
    tipBody: string;
    bulletsTitle: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    cta: string;
    unsubscribe: string;
}

const COPY: Record<Locale, Day7Copy> = {
    es: {
        title: 'Organiza tu Predicación',
        subject: 'Organiza tu Predicación 📚',
        greeting: (n) => `Hola ${n},`,
        lead: 'Un buen predicador no solo tiene buenos mensajes, sino que sabe organizarlos.',
        body: 'Con nuestra <strong>Biblioteca Digital</strong>, puedes mantener todas tus series y sermones en orden, accesibles desde cualquier lugar.',
        tipHeader: '💡 Tip Pro:',
        tipBody: 'Agrupa tus sermones por "Series". Esto te ayuda a mantener un hilo conductor en tus predicaciones dominicales y facilita la planificación anual.',
        bulletsTitle: 'Beneficios de la Biblioteca:',
        bullet1: '🗂️ <strong>Todo en un lugar:</strong> Olvídate de archivos perdidos en tu computadora.',
        bullet2: '☁️ <strong>Cloud Sync:</strong> Empieza en tu laptop, revisa en tu tablet.',
        bullet3: '🔍 <strong>Búsqueda Rápida:</strong> Encuentra esa ilustración que usaste hace meses.',
        cta: 'Organizar mi Biblioteca',
        unsubscribe: 'Darse de baja',
    },
    en: {
        title: 'Organize Your Preaching',
        subject: 'Organize Your Preaching 📚',
        greeting: (n) => `Hi ${n},`,
        lead: 'A good preacher doesn’t just have good messages — they keep them organized.',
        body: 'With our <strong>Digital Library</strong>, you can keep all your series and sermons in order, accessible from anywhere.',
        tipHeader: '💡 Pro Tip:',
        tipBody: 'Group your sermons by "Series". This helps you maintain a thread across your Sunday preaching and makes annual planning easier.',
        bulletsTitle: 'Library Benefits:',
        bullet1: '🗂️ <strong>Everything in one place:</strong> No more files lost on your computer.',
        bullet2: '☁️ <strong>Cloud Sync:</strong> Start on your laptop, review on your tablet.',
        bullet3: '🔍 <strong>Quick Search:</strong> Find that illustration you used months ago.',
        cta: 'Organize my Library',
        unsubscribe: 'Unsubscribe',
    },
};

export const getDay7LibrarySubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getDay7LibraryTemplate = (name: string, dashboardUrl: string, locale: Locale = 'es') => {
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
        .tip-box { background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; margin: 20px 0; }
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

        <div class="tip-box">
            <h4>${c.tipHeader}</h4>
            <p>${c.tipBody}</p>
        </div>

        <h3>${c.bulletsTitle}</h3>
        <ul>
            <li>${c.bullet1}</li>
            <li>${c.bullet2}</li>
            <li>${c.bullet3}</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}/library" class="button">${c.cta}</a>
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
