import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { render } from '@react-email/render';
import { ShareEmail } from '../emails/templates/extractionShare/ShareEmail';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { APP_URL } from '../config/urls';

const SUPER_ADMIN_EMAIL = 'rdocerda@gmail.com';

const SAMPLE_MARKDOWN = `# La belleza del aspecto verbal en griego koiné

Esto es un párrafo de introducción para mostrar cómo se ve la tipografía base del email cuando un pastor comparte un recurso con su congregación. El line-height, los márgenes y el tamaño de fuente deberían leer cómodo en escritorio y móvil.

## Por qué importa el aspecto verbal

Aquí va más texto desarrollando el punto principal. Algunas palabras en **negrita** para resaltar conceptos clave, otras en *itálica* para citas o términos técnicos.

### Distinción entre aspecto progresivo y sumario

Una lista de ejemplo para mostrar el formato de bullets:

- **Aspecto progresivo:** acción en curso o continua. Imperativo presente.
- **Aspecto sumario:** acción como un todo, puntual. Aoristo subjuntivo.
- **Aspecto estativo:** estado resultante. Perfecto.

> "El griego koiné nos permite distinguir matices que las traducciones modernas necesariamente aplastan." — Daniel Wallace, *Greek Grammar Beyond the Basics*

## Cómo aplicarlo

Otro párrafo de cierre. Cuando lees una prohibición en imperativo presente (μή + presente), el autor está pidiendo que **ceses** una acción ya en curso. Ejemplo: "no temas más" (μὴ φοβοῦ).

Para más detalle, abre cualquier pasaje en [Preach](${APP_URL}) y pregúntale al tutor de griego.
`;

interface PreviewShareRequest {
    title?: string;
    senderName?: string;
    senderEmail?: string;
    senderNote?: string;
    markdown?: string;
}

/**
 * Renders the ShareEmail template (used when a pastor emails one of
 * their persisted Extractions to recipients) with sample inputs.
 * Mirrors `previewLeadMagnetNurture` for the share-by-email surface
 * so the super-admin can validate the pastor-as-sender layout +
 * markdown rendering before any real send happens.
 *
 * Auth: super-admin only.
 */
export const previewExtractionShareEmail = onCall<PreviewShareRequest>(
    { ...appCheckCallableOptions(), region: 'us-central1' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        if (request.auth.token.email !== SUPER_ADMIN_EMAIL) {
            throw new HttpsError('permission-denied', 'Super-admin only');
        }

        const { title, senderName, senderEmail, senderNote, markdown } = request.data ?? {};

        const resolvedTitle = (typeof title === 'string' && title.trim()) || 'La belleza del aspecto verbal en griego koiné';
        const resolvedSenderName = (typeof senderName === 'string' && senderName.trim()) || 'Pastor Ricardo Cerda';
        const resolvedSenderEmail = (typeof senderEmail === 'string' && senderEmail.trim()) || 'pastor@iglesia.com';
        const resolvedNote = (typeof senderNote === 'string' && senderNote.trim()) ? senderNote.trim() : 'Hermanos, les comparto este recurso que estuve estudiando esta semana. Espero que les sea de bendición.';
        const resolvedMarkdown = (typeof markdown === 'string' && markdown.trim()) || SAMPLE_MARKDOWN;

        const html = await render(ShareEmail({
            title: resolvedTitle,
            senderName: resolvedSenderName,
            senderEmail: resolvedSenderEmail,
            senderNote: resolvedNote,
            markdown: resolvedMarkdown,
        }));

        return {
            subject: resolvedTitle,
            html,
        };
    },
);
