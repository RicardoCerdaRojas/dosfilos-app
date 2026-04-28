import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

/**
 * DRAFT — pending review by legal counsel before production launch.
 * Serves as placeholder so the consent modal's "Términos de Uso" link
 * has a destination. Replace with attorney-reviewed text before public
 * launch of the personal library feature.
 */
export function TermsOfServicePage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-12">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="h-4 w-4" />
                Volver
            </Link>

            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Borrador — pendiente de revisión legal.</strong> Este texto sirve como
                    referencia y debe ser revisado y aprobado por un abogado antes del lanzamiento
                    público del servicio.
                </div>
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-2">Términos de Uso</h1>
            <p className="text-sm text-muted-foreground mb-8">Última actualización: (pendiente)</p>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <h2>1. Aceptación de los Términos</h2>
                <p>
                    Al acceder o utilizar Dos Filos ("la Plataforma", "el Servicio"), usted acepta
                    estar legalmente vinculado por estos Términos de Uso. Si no está de acuerdo con
                    estos términos, no utilice el Servicio.
                </p>

                <h2>2. Naturaleza del Servicio</h2>
                <p>
                    Dos Filos es una <strong>plataforma de herramientas de procesamiento</strong> que
                    permite a los usuarios analizar documentos que ellos mismos suben y recibir
                    respuestas asistidas por inteligencia artificial sobre su contenido. Dos Filos
                    no actúa como distribuidor, editor ni proveedor del contenido subido por los
                    usuarios.
                </p>

                <h2>3. Biblioteca Personal del Usuario</h2>
                <p>
                    Al subir documentos a su biblioteca personal, usted:
                </p>
                <ul>
                    <li>
                        <strong>Declara y garantiza</strong> que posee los derechos legales necesarios
                        sobre dicho material (propiedad, licencia válida, o que el material está en
                        dominio público).
                    </li>
                    <li>
                        <strong>Confirma</strong> que utilizará el material exclusivamente para su
                        uso personal (estudio, investigación, preparación de sermones propios).
                    </li>
                    <li>
                        <strong>Acepta</strong> no redistribuir, publicar ni compartir el contenido
                        subido con terceros a través de la Plataforma.
                    </li>
                    <li>
                        <strong>Retiene</strong> todos los derechos sobre el contenido subido. Dos
                        Filos no reclama propiedad intelectual sobre su material.
                    </li>
                </ul>

                <h2>4. Responsabilidad del Usuario</h2>
                <p>
                    Usted es el único responsable del contenido que sube a su biblioteca personal.
                    Dos Filos no revisa, aprueba ni monitorea el contenido subido por los usuarios,
                    y no será responsable por infracciones de derechos de autor, marcas registradas
                    u otros derechos de propiedad intelectual resultantes del material subido por
                    los usuarios.
                </p>

                <h2>5. Uso del Contenido por la Plataforma</h2>
                <p>
                    Dos Filos procesa el contenido subido por los usuarios exclusivamente para:
                </p>
                <ul>
                    <li>Extraer texto y estructura para habilitar consultas asistidas por IA</li>
                    <li>Generar embeddings vectoriales para búsqueda semántica</li>
                    <li>Responder consultas del mismo usuario que subió el contenido</li>
                </ul>
                <p>
                    <strong>Dos Filos NO:</strong>
                </p>
                <ul>
                    <li>Entrena modelos de inteligencia artificial con el contenido de los usuarios</li>
                    <li>Comparte el contenido de un usuario con otros usuarios de la Plataforma</li>
                    <li>Vende o cede el contenido de los usuarios a terceros</li>
                </ul>

                <h2>6. Biblioteca Core (Especializada)</h2>
                <p>
                    La Plataforma incluye una biblioteca especializada por el equipo de Dos Filos con
                    material de dominio público o licenciado. Las citas provenientes de esta
                    biblioteca pueden estar sujetas a restricciones según el estado de licencia
                    de cada obra.
                </p>

                <h2>7. Suscripción y Facturación</h2>
                <p>
                    Los planes de suscripción determinan los límites de uso (páginas procesadas,
                    consultas mensuales, almacenamiento). La facturación se procesa a través de
                    Stripe. Puede cancelar su suscripción en cualquier momento; los cambios entran
                    en vigor al final del período de facturación actual.
                </p>

                <h2>8. Limitación de Responsabilidad</h2>
                <p>
                    El Servicio se provee "tal cual". Dos Filos no garantiza la exactitud absoluta
                    de las respuestas generadas por IA y no será responsable por decisiones tomadas
                    basadas únicamente en dichas respuestas. El usuario debe verificar la información
                    importante con fuentes primarias.
                </p>

                <h2>9. Terminación</h2>
                <p>
                    Dos Filos se reserva el derecho de suspender o terminar cuentas que violen
                    estos términos, incluyendo el uso de la Plataforma para distribución no
                    autorizada de material con derechos de autor.
                </p>

                <h2>10. Modificaciones</h2>
                <p>
                    Estos términos pueden actualizarse. Los cambios materiales serán notificados
                    con razonable anticipación a través del correo electrónico registrado.
                </p>

                <h2>11. Ley Aplicable y Jurisdicción</h2>
                <p>
                    Estos términos se rigen por las leyes de [jurisdicción — a definir con abogado].
                    Cualquier disputa se resolverá ante los tribunales competentes de dicha
                    jurisdicción.
                </p>

                <h2>12. Contacto</h2>
                <p>
                    Para consultas sobre estos términos: <a href="mailto:legal@dosfilos.app">legal@dosfilos.app</a>
                </p>
            </div>
        </div>
    );
}
