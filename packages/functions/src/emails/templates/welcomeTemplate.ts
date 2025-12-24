export function getWelcomeEmailTemplate(name: string, actionUrl: string): string {
  const firstName = name.split(' ')[0] || 'Predicador';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
    .content { padding: 30px 0; }
    .button { display: inline-block; background: linear-gradient(to right, #2563eb, #7c3aed); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .features { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature-item { margin-bottom: 10px; display: flex; align-items: start; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #0f172a; margin: 0;">DosFilos.Preach</h1>
    </div>
    
    <div class="content">
      <h2>¡Bienvenido, ${firstName}! 👋</h2>
      <p>Gracias por unirte a DosFilos.Preach. Estamos emocionados de ser parte de tu proceso de preparación homilética.</p>
      
      <p>Nuestra plataforma está diseñada para ayudarte a profundizar en la Palabra y estructurar mensajes impactantes en menos tiempo.</p>

      <div class="features">
        <h3>🚀 Lo que puedes hacer ahora:</h3>
        <div class="feature-item">📚 <strong>Tutor Griego: </strong> Estudia el texto original con la ayuda experta.</div>
        <div class="feature-item">✨ <strong>Tutor Homilético: </strong> Prepara tus sermones sin perder tu trabajo exegético.</div>
        <div class="feature-item">🗂️ <strong>Predica la Palabra:</strong> Organiza y predica tus sermones.</div>
      </div>

      <p style="text-align: center;">
        <a href="${actionUrl}" class="button">Crear mi primer sermón</a>
      </p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} DosFilos.Preach. Todos los derechos reservados.</p>
      <p>Si tienes alguna duda, responde a este correo.</p>
    </div>
  </div>
</body>
</html>
  `;
}
