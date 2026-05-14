import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';
import { emailTheme as t } from './theme';

interface EmailLayoutProps {
    /** Browser tab title + plain-text fallback shown by some clients. */
    title: string;
    /** Inbox preview line shown next to the subject before the user opens. */
    preview?: string;
    children: React.ReactNode;
    /**
     * Footer note shown below the standard "Compartido vía Preach"
     * line. Use for unsubscribe, audience-specific disclaimers, etc.
     */
    footerExtra?: React.ReactNode;
}

/**
 * Canonical email shell. Every email template in this codebase
 * wraps its content in EmailLayout to inherit:
 *   - Consistent typography scale (theme.ts).
 *   - Brand-correct masthead (small Preach logo + tagline).
 *   - Accessible structure (heading hierarchy, alt text, preview).
 *   - Email-client-safe rendering via @react-email/components
 *     (table-based layout, inline styles, escaped Unicode).
 *
 * Templates own ONLY the body Section between header and footer —
 * the chrome stays consistent across surfaces (lead magnet,
 * extraction share, transactional, etc.).
 */
export function EmailLayout({ title, preview, children, footerExtra }: EmailLayoutProps) {
    return (
        <Html lang="es">
            <Head>
                <title>{title}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
                {/*
                 * Lock to light-mode rendering across email clients.
                 * Outlook Mobile (and some Gmail variants) auto-invert
                 * light backgrounds in dark mode, mangling the amber
                 * tint used for quotes/sender card into a muddy olive.
                 * Declaring `light only` opts out of dark-mode
                 * remapping so the design we ship is what every
                 * recipient sees.
                 *
                 * Trade-off: dark-mode users see a light email, which
                 * looks brighter than other inbox content. Acceptable
                 * given the alternative (broken brand colors) and
                 * common across pastoral/devotional senders.
                 */}
                <meta name="color-scheme" content="light only" />
                <meta name="supported-color-schemes" content="light only" />
                <style>{`
                    /* Defensive overrides — some clients ignore the
                       meta tags above and still try to invert. These
                       force the brand surfaces to render as designed. */
                    :root { color-scheme: light only; supported-color-schemes: light only; }
                    [data-ogsc] body, [data-ogsb] body { background: ${t.palette.bgPage} !important; color: ${t.palette.textPrimary} !important; }
                `}</style>
            </Head>
            {preview && <Preview>{preview}</Preview>}
            <Body style={bodyStyle}>
                <Container style={containerStyle}>
                    {/* Masthead */}
                    <Section style={{ textAlign: 'center', paddingBottom: t.spacing.lg }}>
                        <Link href={t.assets.homeUrl}>
                            <Img
                                src={t.assets.logoUrl}
                                alt="Preach"
                                width="120"
                                height="32"
                                style={{ height: '32px', width: 'auto', display: 'inline-block' }}
                            />
                        </Link>
                    </Section>

                    <Hr style={hrStyle} />

                    {/* Body — owned by template */}
                    <Section style={{ paddingTop: t.spacing.lg, paddingBottom: t.spacing.xl }}>
                        {children}
                    </Section>

                    <Hr style={hrStyle} />

                    {/* Footer */}
                    <Section style={{ paddingTop: t.spacing.md }}>
                        <Text style={footerTextStyle}>
                            <Link href={t.assets.homeUrl} style={footerLinkStyle}>
                                Compartido vía Preach · DosFilos
                            </Link>
                        </Text>
                        {footerExtra && (
                            <Text style={footerTextStyle}>{footerExtra}</Text>
                        )}
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const bodyStyle: React.CSSProperties = {
    backgroundColor: t.palette.bgPage,
    fontFamily: t.fonts.body,
    margin: 0,
    padding: 0,
    color: t.palette.textPrimary,
};

const containerStyle: React.CSSProperties = {
    backgroundColor: t.palette.bgCard,
    maxWidth: t.sizes.containerMaxWidth,
    margin: '0 auto',
    padding: `${t.spacing.xl} ${t.spacing.lg}`,
};

const hrStyle: React.CSSProperties = {
    borderColor: t.palette.border,
    borderWidth: '1px 0 0 0',
    borderStyle: 'solid',
    margin: 0,
};

const footerTextStyle: React.CSSProperties = {
    fontSize: t.sizes.micro,
    color: t.palette.textMuted,
    textAlign: 'center',
    margin: `${t.spacing.xs} 0`,
    lineHeight: 1.5,
};

const footerLinkStyle: React.CSSProperties = {
    color: t.palette.textMuted,
    textDecoration: 'underline',
};
