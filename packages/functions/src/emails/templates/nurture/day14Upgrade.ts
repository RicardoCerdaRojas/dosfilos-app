export const getDay14UpgradeTemplate = (name: string, dashboardUrl: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Lleva tu Ministerio al Siguiente Nivel</title>
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
        
        <h2>Hola ${name},</h2>
        
        <p>Llevas dos semanas con nosotros y esperamos que DosFilos sea de gran bendición para tu preparación.</p>
        
        <p>Si sientes que estás listo para más, el plan <strong>PRO</strong> está diseñado para predicadores que buscan excelencia y profundidad constante.</p>
        
        <div class="highlight">
            <h3>🌟 ¿Por qué pasar a PRO?</h3>
            <ul style="list-style: none; padding-left: 0;">
                <li>✅ <strong>Generaciones Ilimitadas:</strong> Crea todos los bosquejos que necesites.</li>
                <li>✅ <strong>Tutor Griego Avanzado:</strong> Análisis exegético profundo sin límites.</li>
                <li>✅ <strong>Soporte Prioritario:</strong> Estamos aquí para ayudarte.</li>
            </ul>
        </div>
        
        <p>Invierte en tu herramienta de trabajo principal. Tu tiempo y la calidad de tu mensaje lo valen.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}/settings/billing" class="button">Ver Planes PRO</a>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} DosFilos.Preach</p>
            <p><a href="${dashboardUrl}/settings">Darse de baja</a></p>
        </div>
    </div>
</body>
</html>
`;
