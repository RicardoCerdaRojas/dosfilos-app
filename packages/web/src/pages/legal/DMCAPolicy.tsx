import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

/** DRAFT — pending review by legal counsel before production launch. */
export function DMCAPolicyPage() {
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

            <h1 className="text-3xl font-bold tracking-tight mb-2">Política DMCA / Derechos de Autor</h1>
            <p className="text-sm text-muted-foreground mb-8">Última actualización: (pendiente)</p>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <h2>1. Compromiso con los Derechos de Autor</h2>
                <p>
                    Dos Filos respeta los derechos de propiedad intelectual y espera que los usuarios
                    del Servicio hagan lo mismo. Cumplimos con las disposiciones del Digital Millennium
                    Copyright Act (DMCA) y con la legislación aplicable de propiedad intelectual en
                    las jurisdicciones donde operamos.
                </p>

                <h2>2. Naturaleza del Servicio</h2>
                <p>
                    Dos Filos provee una plataforma donde los usuarios suben contenido de su propiedad
                    o que tienen licencia para usar, con el propósito de procesamiento personal
                    mediante herramientas de IA. Dos Filos <strong>no almacena ni publica</strong>
                    contenido fuera de las bibliotecas personales aisladas de cada usuario.
                </p>

                <h2>3. Cómo Notificar una Infracción</h2>
                <p>
                    Si usted es titular de derechos de autor (o agente autorizado) y cree de buena fe
                    que contenido accesible a través del Servicio infringe sus derechos, puede enviar
                    una notificación que incluya:
                </p>
                <ol>
                    <li>Su firma física o electrónica.</li>
                    <li>Identificación de la obra con derechos de autor reclamada como infringida.</li>
                    <li>Identificación del material infractor (URL o descripción suficiente para localizarlo).</li>
                    <li>Su información de contacto completa (nombre, dirección, teléfono, correo).</li>
                    <li>
                        Declaración de buena fe de que el uso del material no está autorizado por el
                        titular de los derechos, su agente o la ley.
                    </li>
                    <li>
                        Declaración de que la información en la notificación es exacta y, bajo pena
                        de perjurio, que usted está autorizado a actuar en nombre del titular.
                    </li>
                </ol>

                <h2>4. Agente Designado</h2>
                <p>
                    Envíe notificaciones DMCA a:
                </p>
                <div className="not-prose rounded-md border bg-muted/30 p-4 text-sm">
                    <strong>Agente DMCA de Dos Filos</strong><br />
                    Correo: <a href="mailto:dmca@dosfilos.app" className="text-indigo-600 hover:underline">dmca@dosfilos.app</a><br />
                    <span className="text-muted-foreground">(Dirección postal — a definir con abogado)</span>
                </div>

                <h2>5. Proceso de Respuesta</h2>
                <p>
                    Al recibir una notificación válida:
                </p>
                <ol>
                    <li>Removeremos o deshabilitaremos el acceso al material identificado.</li>
                    <li>Notificaremos al usuario que subió el material sobre la acción tomada.</li>
                    <li>En caso de infracciones repetidas, suspenderemos la cuenta del usuario.</li>
                </ol>

                <h2>6. Contra-Notificación</h2>
                <p>
                    Si usted es el usuario cuyo contenido fue removido y cree que fue removido por
                    error o identificación equivocada, puede enviar una contra-notificación al mismo
                    correo. La contra-notificación debe incluir declaración bajo pena de perjurio
                    afirmando su buena fe. Si recibimos una contra-notificación válida, podremos
                    restaurar el material removido.
                </p>

                <h2>7. Notificaciones Falsas</h2>
                <p>
                    Las notificaciones falsas o de mala fe pueden dar lugar a responsabilidad civil.
                    Por favor, asegúrese de tener motivos legítimos antes de presentar una notificación.
                </p>
            </div>
        </div>
    );
}
