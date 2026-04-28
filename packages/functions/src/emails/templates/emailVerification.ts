type Locale = 'es' | 'en';

interface Copy {
    title: string;
    subject: string;
    greeting: (name: string) => string;
    lead: string;
    body: string;
    cta: string;
    expiry: string;
    closing: string;
    fallbackHint: string;
    signature: string;
    footerNote: string;
    unsubscribe: string;
}

const COPY: Record<Locale, Copy> = {
    es: {
        title: 'Confirma tu email',
        subject: 'Confirma tu email — DosFilos.Preach',
        greeting: (n) => `Hola ${n},`,
        lead: 'Bienvenido a DosFilos.Preach. Para activar tu cuenta y empezar a estudiar las Escrituras con nuestras herramientas, necesitamos confirmar que este email es tuyo.',
        body: 'El proceso toma menos de 30 segundos. Solo haz click en el botón abajo.',
        cta: 'Confirmar mi email',
        expiry: 'Este enlace es válido por 1 hora. Si expira, puedes pedir uno nuevo desde la página de verificación.',
        closing: 'Si no creaste una cuenta en DosFilos.Preach, puedes ignorar este correo.',
        fallbackHint: 'Si el botón no funciona, copia este enlace en tu navegador:',
        signature: 'El equipo de DosFilos.Preach',
        footerNote: 'Estudio profundo. Exposición fiel. Aplicación clara.',
        unsubscribe: 'Darse de baja',
    },
    en: {
        title: 'Confirm your email',
        subject: 'Confirm your email — DosFilos.Preach',
        greeting: (n) => `Hi ${n},`,
        lead: 'Welcome to DosFilos.Preach. To activate your account and start studying Scripture with our tools, we need to confirm this email is yours.',
        body: 'It takes less than 30 seconds. Just click the button below.',
        cta: 'Confirm my email',
        expiry: 'This link is valid for 1 hour. If it expires, you can request a new one from the verification page.',
        closing: 'If you didn\'t create an account at DosFilos.Preach, you can ignore this email.',
        fallbackHint: 'If the button doesn\'t work, copy this link into your browser:',
        signature: 'The DosFilos.Preach team',
        footerNote: 'Deep study. Faithful exposition. Clear application.',
        unsubscribe: 'Unsubscribe',
    },
};

export const getEmailVerificationSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getEmailVerificationTemplate = (
    name: string,
    verificationLink: string,
    dashboardUrl: string,
    locale: Locale = 'es',
) => {
    const c = COPY[locale];
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${c.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 0; }
        .wrapper { background: #f8fafc; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); }
        .header { padding: 32px 40px 16px; border-bottom: 1px solid #f1f5f9; }
        .brand { font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
        .brand-mark { color: #4f46e5; }
        .content { padding: 32px 40px; }
        h2 { font-size: 22px; line-height: 1.3; color: #0f172a; margin: 0 0 20px 0; font-weight: 700; letter-spacing: -0.01em; }
        p { color: #475569; font-size: 15px; margin: 0 0 16px 0; }
        .button-wrap { text-align: center; margin: 32px 0; }
        .button { display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14.5px; box-shadow: 0 1px 2px rgba(79, 70, 229, 0.2); }
        .expiry { font-size: 12.5px; color: #94a3b8; text-align: center; margin-top: 8px; }
        .fallback { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 24px 0; font-size: 12.5px; color: #64748b; word-break: break-all; }
        .fallback-hint { font-size: 12.5px; color: #94a3b8; margin-bottom: 6px; }
        .closing { color: #64748b; font-size: 13.5px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
        .signature { color: #475569; font-size: 14px; margin-top: 24px; }
        .footer { text-align: center; padding: 24px 40px 32px; color: #94a3b8; font-size: 12px; }
        .footer-tagline { font-style: italic; margin-bottom: 8px; color: #64748b; }
        .footer a { color: #94a3b8; text-decoration: none; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="brand">DosFilos<span class="brand-mark">.Preach</span></div>
            </div>

            <div class="content">
                <h2>${c.greeting(name)}</h2>
                <p>${c.lead}</p>
                <p>${c.body}</p>

                <div class="button-wrap">
                    <a href="${verificationLink}" class="button">${c.cta}</a>
                    <div class="expiry">${c.expiry}</div>
                </div>

                <div class="fallback">
                    <div class="fallback-hint">${c.fallbackHint}</div>
                    <a href="${verificationLink}" style="color: #4f46e5;">${verificationLink}</a>
                </div>

                <p class="closing">${c.closing}</p>

                <p class="signature">— ${c.signature}</p>
            </div>

            <div class="footer">
                <div class="footer-tagline">${c.footerNote}</div>
                <div>© ${new Date().getFullYear()} DosFilos.Preach</div>
                <div style="margin-top: 8px;"><a href="${dashboardUrl}/settings">${c.unsubscribe}</a></div>
            </div>
        </div>
    </div>
</body>
</html>
`;
};
