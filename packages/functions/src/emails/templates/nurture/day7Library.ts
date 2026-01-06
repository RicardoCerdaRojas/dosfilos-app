export const getDay7LibraryTemplate = (name: string, dashboardUrl: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Organiza tu Predicación</title>
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
        
        <h2>Hola ${name},</h2>
        
        <p>Un buen predicador no solo tiene buenos mensajes, sino que sabe organizarlos.</p>
        
        <p>Con nuestra <strong>Biblioteca Digital</strong>, puedes mantener todas tus series y sermones en orden, accesibles desde cualquier lugar.</p>
        
        <div class="tip-box">
            <h4>💡 Tip Pro:</h4>
            <p>Agrupa tus sermones por "Series". Esto te ayuda a mantener un hilo conductor en tus predicaciones dominicales y facilita la planificación anual.</p>
        </div>

        <h3>Beneficios de la Biblioteca:</h3>
        <ul>
            <li>🗂️ <strong>Todo en un lugar:</strong> Olvídate de archivos perdidos en tu computadora.</li>
            <li>☁️ <strong>Cloud Sync:</strong> Empieza en tu laptop, revisa en tu tablet.</li>
            <li>🔍 <strong>Búsqueda Rápida:</strong> Encuentra esa ilustración que usaste hace meses.</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}/library" class="button">Organizar mi Biblioteca</a>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} DosFilos.Preach</p>
            <p><a href="${dashboardUrl}/settings">Darse de baja</a></p>
        </div>
    </div>
</body>
</html>
`;
