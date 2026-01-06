export const getDay3GreekTemplate = (name: string, dashboardUrl: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Descubre el Poder del Griego</title>
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
        
        <h2>Hola ${name},</h2>
        
        <p>¿Sabías que puedes analizar el texto original bíblico sin ser un experto en griego?</p>
        
        <p>Muchos pastores se sienten intimidados por los idiomas originales, pero con nuestro <strong>Tutor Griego IA</strong>, es como tener a un erudito a tu lado.</p>
        
        <div class="quote">
            "La Palabra de Dios es viva y eficaz, y más cortante que toda espada de dos filos..." - Hebreos 4:12
        </div>

        <h3>Lo que puedes hacer hoy:</h3>
        <ul>
            <li>🔍 <strong>Análisis Morfológico:</strong> Entiende cada palabra del versículo.</li>
            <li>💡 <strong>Significado Teológico:</strong> Descubre matices que las traducciones pierden.</li>
            <li>❓ <strong>Pregúntale al Texto:</strong> Resuelve dudas específicas al instante.</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" class="button">Probar el Tutor Griego</a>
        </div>
        
        <p>No dejes que el idioma sea una barrera para profundizar en las Escrituras.</p>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} DosFilos.Preach</p>
            <p><a href="${dashboardUrl}/settings">Darse de baja</a></p>
        </div>
    </div>
</body>
</html>
`;
