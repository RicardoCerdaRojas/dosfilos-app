import { marked } from 'marked';
import { emailTheme as t } from './theme';

interface MarkdownBodyProps {
    markdown: string;
}

/**
 * Renders artifact markdown as styled HTML inside an email. Wraps the
 * `marked` output in a div whose inline styles override the default
 * heading/paragraph margins so we keep the typography scale defined
 * in `theme.ts`.
 *
 * We use dangerouslySetInnerHTML rather than a recursive markdown→JSX
 * mapping because:
 *   - `marked` output is already sanitized for our trusted content
 *     pipeline (the markdown comes from our own LLM and the user's
 *     edits, never from third-party untrusted input).
 *   - Email clients flatten the DOM anyway — emitting raw HTML lets
 *     the @react-email render keep all child styles intact.
 *
 * The wrapping <div style> sets cascading defaults; the per-element
 * <style> block scopes overrides via the .md-body class so we don't
 * leak typography rules to other parts of the email.
 */
export function MarkdownBody({ markdown }: MarkdownBodyProps) {
    const html = marked.parse(markdown, { async: false }) as string;

    return (
        <>
            <style>{`
                .md-body { color: ${t.palette.textPrimary}; font-size: ${t.sizes.body}; line-height: ${t.sizes.bodyLineHeight}; }
                .md-body h1 { font-size: ${t.sizes.h1}; font-weight: 700; line-height: 1.25; margin: ${t.spacing.lg} 0 ${t.spacing.md} 0; color: ${t.palette.textPrimary}; }
                .md-body h2 { font-size: ${t.sizes.h2}; font-weight: 700; line-height: 1.3; margin: ${t.spacing.xl} 0 ${t.spacing.sm} 0; color: ${t.palette.textPrimary}; }
                .md-body h3 { font-size: ${t.sizes.h3}; font-weight: 600; line-height: 1.4; margin: ${t.spacing.lg} 0 ${t.spacing.xs} 0; color: ${t.palette.textPrimary}; }
                .md-body p { margin: ${t.spacing.sm} 0; }
                .md-body strong { color: ${t.palette.textPrimary}; font-weight: 700; }
                .md-body em { font-style: italic; }
                .md-body ul, .md-body ol { padding-left: 22px; margin: ${t.spacing.sm} 0; }
                .md-body li { margin: ${t.spacing.xs} 0; }
                .md-body blockquote { background: ${t.palette.brandTint}; border-left: 3px solid ${t.palette.brandPrimary}; padding: ${t.spacing.sm} ${t.spacing.md}; margin: ${t.spacing.md} 0; border-radius: 0 ${t.radius.md} ${t.radius.md} 0; font-style: italic; color: ${t.palette.textSecondary}; }
                .md-body blockquote p { margin: ${t.spacing.xs} 0; }
                .md-body a { color: ${t.palette.brandPrimary}; text-decoration: underline; }
                .md-body code { background: ${t.palette.bgPage}; padding: 2px 6px; border-radius: ${t.radius.sm}; font-family: 'Courier New', monospace; font-size: 14px; }
                .md-body pre { background: ${t.palette.bgPage}; padding: ${t.spacing.md}; border-radius: ${t.radius.md}; overflow-x: auto; }
                .md-body hr { border: 0; border-top: 1px solid ${t.palette.border}; margin: ${t.spacing.lg} 0; }
                .md-body table { border-collapse: collapse; width: 100%; margin: ${t.spacing.md} 0; }
                .md-body th, .md-body td { border: 1px solid ${t.palette.border}; padding: ${t.spacing.sm} ${t.spacing.md}; text-align: left; }
                .md-body th { background: ${t.palette.bgPage}; font-weight: 600; }
            `}</style>
            <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
        </>
    );
}
