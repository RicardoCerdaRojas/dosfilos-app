import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

/** DRAFT — pending review by legal counsel before production launch. */
export function PrivacyPolicyPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-12">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="h-4 w-4" />
                Volver
            </Link>

            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Borrador — pendiente de revisión legal.</strong>
                </div>
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-2">Política de Privacidad</h1>
            <p className="text-sm text-muted-foreground mb-8">Última actualización: (pendiente)</p>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <h2>1. Información que Recopilamos</h2>
                <ul>
                    <li><strong>Cuenta:</strong> nombre, correo electrónico, datos de suscripción.</li>
                    <li><strong>Contenido subido:</strong> documentos que usted sube a su biblioteca personal.</li>
                    <li><strong>Consultas:</strong> preguntas que hace a los tutores IA y respuestas generadas.</li>
                    <li><strong>Uso:</strong> métricas de uso (páginas procesadas, consultas por mes) para aplicar límites de plan.</li>
                    <li><strong>Datos técnicos:</strong> dirección IP, navegador, logs mínimos necesarios para operación y seguridad.</li>
                </ul>

                <h2>2. Cómo Usamos su Información</h2>
                <ul>
                    <li>Proveer el servicio (procesamiento de documentos, generación de respuestas).</li>
                    <li>Facturación y soporte al cliente.</li>
                    <li>Mejorar la calidad del servicio (métricas agregadas, no contenido individual).</li>
                    <li>Cumplimiento legal cuando sea requerido por ley.</li>
                </ul>

                <h2>3. Aislamiento del Contenido</h2>
                <p>
                    Su biblioteca personal es <strong>privada y aislada</strong>. Técnicamente:
                </p>
                <ul>
                    <li>Todo contenido está etiquetado con su <code>userId</code> y todas las consultas filtran por este identificador.</li>
                    <li>Otros usuarios de la Plataforma no pueden ver, buscar ni acceder a su biblioteca.</li>
                    <li>El equipo de Dos Filos no accede al contenido de los usuarios excepto cuando sea estrictamente necesario para soporte técnico que usted solicite explícitamente.</li>
                </ul>

                <h2>4. Entrenamiento de Modelos de IA</h2>
                <p>
                    <strong>Dos Filos NO entrena modelos de inteligencia artificial con el contenido
                    de los usuarios.</strong> Los modelos utilizados (Google Gemini) son pre-entrenados
                    por sus respectivos proveedores; Dos Filos los consume vía API y no les envía
                    datos de usuario para entrenamiento.
                </p>

                <h2>5. Proveedores Terceros</h2>
                <p>
                    Dos Filos utiliza los siguientes proveedores de servicios:
                </p>
                <ul>
                    <li><strong>Google Cloud / Firebase:</strong> almacenamiento, autenticación, funciones serverless.</li>
                    <li><strong>Google Gemini API:</strong> procesamiento de lenguaje natural. Google se compromete por API a no retener ni entrenar con inputs de clientes de pago.</li>
                    <li><strong>LlamaParse (LlamaIndex):</strong> extracción estructurada de PDFs.</li>
                    <li><strong>Stripe:</strong> procesamiento de pagos. No almacenamos datos de tarjetas de crédito.</li>
                </ul>
                <p>
                    Cada proveedor tiene sus propias políticas de privacidad. Al usar el Servicio
                    usted acepta también el procesamiento de datos por estos proveedores dentro del
                    alcance necesario.
                </p>

                <h2>6. Retención y Eliminación</h2>
                <p>
                    Su contenido permanece almacenado mientras su cuenta esté activa. Al eliminar
                    un documento individual, éste se borra permanentemente junto con sus embeddings
                    y chunks asociados. Al cancelar su cuenta, todo su contenido se elimina dentro
                    de los 30 días siguientes, salvo requisitos legales específicos de retención.
                </p>

                <h2>7. Derechos del Usuario</h2>
                <p>
                    Usted tiene derecho a:
                </p>
                <ul>
                    <li>Acceder a los datos que tenemos sobre usted.</li>
                    <li>Rectificar datos inexactos.</li>
                    <li>Solicitar la eliminación de su cuenta y todo su contenido.</li>
                    <li>Exportar su contenido en un formato estándar.</li>
                    <li>Presentar una queja ante la autoridad de protección de datos aplicable.</li>
                </ul>

                <h2>8. Cookies</h2>
                <p>
                    Usamos cookies esenciales para mantener la sesión del usuario y cookies
                    analíticas agregadas (sin identificar individuos) para mejorar el servicio.
                </p>

                <h2>9. Contacto</h2>
                <p>
                    Para consultas sobre privacidad: <a href="mailto:privacy@dosfilos.app">privacy@dosfilos.app</a>
                </p>
            </div>
        </div>
    );
}
