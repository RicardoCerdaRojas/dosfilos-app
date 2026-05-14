import { EmailLayout } from '../../components/EmailLayout';
import { SenderCard, H1 } from '../../components/EmailPrimitives';
import { MarkdownBody } from '../../components/MarkdownBody';

interface ShareEmailProps {
    title: string;
    senderName: string;
    senderEmail: string | null;
    senderNote: string | null;
    markdown: string;
}

/**
 * Email a pastor sends to their audience with one of their persisted
 * Extractions inside. Uses canonical layout + sender card so the
 * recipient gets the "this is from my pastor" context up front, then
 * the artifact body in reading-friendly typography.
 */
export function ShareEmail({ title, senderName, senderEmail, senderNote, markdown }: ShareEmailProps) {
    return (
        <EmailLayout
            title={title}
            preview={senderNote ?? `${senderName} te comparte un recurso.`}
            footerExtra={
                <>
                    Para no recibir más correos de este remitente, responde a {senderEmail ?? 'este correo'} con la palabra "baja".
                </>
            }
        >
            <SenderCard
                senderName={senderName}
                note={senderNote}
            />

            <H1>{title}</H1>

            <MarkdownBody markdown={markdown} />
        </EmailLayout>
    );
}
