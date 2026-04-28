type Locale = 'es' | 'en';

interface WelcomeCopy {
    greeting: (firstName: string) => string;
    intro: string;
    featureGreek: string;
    featureFaculty: string;
    featureLibrary: string;
    featureSermons: string;
    passwordHeading: string;
    passwordLead: string;
    passwordButton: string;
    cta: string;
    footerRights: string;
    footerSupport: string;
    fallbackName: string;
    subject: string;
}

const COPY: Record<Locale, WelcomeCopy> = {
    es: {
        greeting: (n) => `Bienvenido, ${n}`,
        intro: 'Gracias por unirte a DosFilos.Preach. Tu prueba de 30 días ya está activa — durante este tiempo tienes acceso completo a la plataforma sin cargos.',
        featureGreek: '<strong>Tutor Griego &amp; Hebreo</strong> — Estudia el texto original con asistencia experta.',
        featureFaculty: '<strong>Facultad Teológica</strong> — Conversaciones con especialistas IA citando fuentes reales.',
        featureLibrary: '<strong>Biblioteca personal</strong> — Sube tus recursos y úsalos en todas tus consultas.',
        featureSermons: '<strong>Producción de sermones</strong> — Organiza, escribe y predica con todo tu estudio conectado.',
        passwordHeading: 'Establece tu contraseña',
        passwordLead: 'Para iniciar sesión la próxima vez, crea una contraseña segura:',
        passwordButton: 'Establecer contraseña',
        cta: 'Ir al dashboard',
        footerRights: 'Todos los derechos reservados.',
        footerSupport: 'Si tienes alguna duda, responde a este correo.',
        fallbackName: 'Predicador',
        subject: 'Bienvenido a DosFilos.Preach',
    },
    en: {
        greeting: (n) => `Welcome, ${n}`,
        intro: 'Thanks for joining DosFilos.Preach. Your 30-day trial is now active — full platform access, no charges during this period.',
        featureGreek: '<strong>Greek &amp; Hebrew Tutor</strong> — Study the original text with expert assistance.',
        featureFaculty: '<strong>Theological Faculty</strong> — Conversations with AI specialists citing real sources.',
        featureLibrary: '<strong>Personal library</strong> — Upload your resources and use them across every query.',
        featureSermons: '<strong>Sermon production</strong> — Organize, write, and preach with your entire study connected.',
        passwordHeading: 'Set your password',
        passwordLead: 'To sign in next time, create a secure password:',
        passwordButton: 'Set password',
        cta: 'Open dashboard',
        footerRights: 'All rights reserved.',
        footerSupport: 'If you have any questions, just reply to this email.',
        fallbackName: 'Preacher',
        subject: 'Welcome to DosFilos.Preach',
    },
};

export function getWelcomeEmailSubject(locale: Locale = 'es'): string {
    return COPY[locale].subject;
}

export function getWelcomeEmailTemplate(
    name: string,
    actionUrl: string,
    setPasswordUrl?: string,
    locale: Locale = 'es',
): string {
    const copy = COPY[locale];
    const firstName = name.split(' ')[0] || copy.fallbackName;

    // Set-password block is shown only for brand-new accounts (payment-first flow).
    const passwordBlock = setPasswordUrl
        ? `
      <div class="password-block">
        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px;">${copy.passwordHeading}</h3>
        <p style="margin: 0 0 16px 0; color: #475569;">
          ${copy.passwordLead}
        </p>
        <a href="${setPasswordUrl}" class="button-secondary">${copy.passwordButton}</a>
      </div>
    `
        : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; background: white; }
    .header { padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
    .brand { color: #0f172a; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .content { padding: 32px 0; }
    h2 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
    .features { background: #f8fafc; padding: 20px 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; }
    .feature-item { margin-bottom: 12px; color: #334155; }
    .feature-item:last-child { margin-bottom: 0; }
    .button { display: inline-block; background: #0f172a; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .button-secondary { display: inline-block; background: #4f46e5; color: white !important; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; }
    .password-block { margin: 24px 0; padding: 20px 24px; background: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="brand">DosFilos.Preach</h1>
    </div>

    <div class="content">
      <h2>${copy.greeting(firstName)}</h2>
      <p>${copy.intro}</p>

      <div class="features">
        <div class="feature-item">${copy.featureGreek}</div>
        <div class="feature-item">${copy.featureFaculty}</div>
        <div class="feature-item">${copy.featureLibrary}</div>
        <div class="feature-item">${copy.featureSermons}</div>
      </div>

      ${passwordBlock}

      <p style="margin-top: 24px;">
        <a href="${actionUrl}" class="button">${copy.cta}</a>
      </p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} DosFilos.Preach. ${copy.footerRights}</p>
      <p>${copy.footerSupport}</p>
    </div>
  </div>
</body>
</html>
  `;
}
