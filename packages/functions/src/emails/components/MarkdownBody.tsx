import { Marked } from 'marked';
import { emailTheme as t } from './theme';

interface MarkdownBodyProps {
    markdown: string;
}

/**
 * Renders artifact markdown as styled HTML inside an email. EVERY
 * style is inlined on each element via a custom marked renderer
 * because Outlook Desktop strips/scopes <style> blocks — meaning
 * blockquotes, headings, etc. fall back to default browser styling
 * and lose all brand surfaces.
 *
 * The previous approach used a <style>.md-body { ... }</style>
 * block. It worked in the admin preview iframe and on mobile, but
 * Outlook Desktop showed quotes as plain indented text without the
 * amber tint or left border. Inline-only is the only reliable path
 * for cross-client email rendering.
 */
export function MarkdownBody({ markdown }: MarkdownBodyProps) {
    const html = renderMarkdownInline(markdown);
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderMarkdownInline(md: string): string {
    const m = new Marked();
    m.use({
        renderer: {
            // marked v18: each renderer method receives the token object;
            // `this.parser.parseInline()` and `this.parser.parse()` walk
            // child tokens. Bound at call-time so `this` resolves to the
            // active parser context.
            heading(this: any, { tokens, depth }: any) {
                const text = this.parser.parseInline(tokens);
                if (depth === 1) {
                    return `<h1 style="font-size:${t.sizes.h1};font-weight:700;line-height:1.25;margin:${t.spacing.lg} 0 ${t.spacing.md} 0;color:${t.palette.textPrimary};">${text}</h1>`;
                }
                if (depth === 2) {
                    return `<h2 style="font-size:${t.sizes.h2};font-weight:700;line-height:1.3;margin:${t.spacing.xl} 0 ${t.spacing.sm} 0;color:${t.palette.textPrimary};">${text}</h2>`;
                }
                if (depth === 3) {
                    return `<h3 style="font-size:${t.sizes.h3};font-weight:600;line-height:1.4;margin:${t.spacing.lg} 0 ${t.spacing.xs} 0;color:${t.palette.textPrimary};">${text}</h3>`;
                }
                return `<h${depth} style="font-weight:600;color:${t.palette.textPrimary};">${text}</h${depth}>`;
            },
            paragraph(this: any, { tokens }: any) {
                const text = this.parser.parseInline(tokens);
                return `<p style="font-size:${t.sizes.body};line-height:${t.sizes.bodyLineHeight};color:${t.palette.textPrimary};margin:${t.spacing.sm} 0;">${text}</p>`;
            },
            blockquote(this: any, { tokens }: any) {
                const inner = this.parser.parse(tokens);
                // Strip default <p> margins inside the quote so the
                // tinted box hugs the text instead of leaving big
                // gaps top/bottom.
                const stripped = inner.replace(/<p style="font-size:[^"]*">/g, `<p style="margin:0 0 8px 0;font-size:${t.sizes.body};line-height:${t.sizes.bodyLineHeight};color:${t.palette.textSecondary};font-style:italic;">`);
                return `<blockquote style="background:${t.palette.brandTint};border-left:3px solid ${t.palette.brandPrimary};padding:${t.spacing.md} ${t.spacing.lg};margin:${t.spacing.md} 0;border-radius:0 ${t.radius.md} ${t.radius.md} 0;">${stripped}</blockquote>`;
            },
            list(this: any, { items, ordered }: any) {
                const tag = ordered ? 'ol' : 'ul';
                const itemsHtml = items.map((item: any) => {
                    const inner = this.parser.parse(item.tokens);
                    // Strip enclosing <p> tags so the bullet renders
                    // tight; the li's own font-size + color carry over.
                    const stripped = inner.replace(/<p style="[^"]*">/g, '').replace(/<\/p>/g, '');
                    return `<li style="margin:${t.spacing.xs} 0;font-size:${t.sizes.body};line-height:${t.sizes.bodyLineHeight};color:${t.palette.textPrimary};">${stripped}</li>`;
                }).join('');
                return `<${tag} style="padding-left:22px;margin:${t.spacing.sm} 0;">${itemsHtml}</${tag}>`;
            },
            strong(this: any, { tokens }: any) {
                const text = this.parser.parseInline(tokens);
                return `<strong style="font-weight:700;color:${t.palette.textPrimary};">${text}</strong>`;
            },
            em(this: any, { tokens }: any) {
                const text = this.parser.parseInline(tokens);
                return `<em style="font-style:italic;">${text}</em>`;
            },
            link(this: any, { href, tokens }: any) {
                const text = this.parser.parseInline(tokens);
                return `<a href="${href}" style="color:${t.palette.brandPrimary};text-decoration:underline;">${text}</a>`;
            },
            code({ text }: any) {
                return `<pre style="background:${t.palette.bgPage};padding:${t.spacing.md};border-radius:${t.radius.md};overflow-x:auto;font-family:'Courier New',monospace;font-size:14px;"><code>${escapeHtml(text)}</code></pre>`;
            },
            codespan({ text }: any) {
                return `<code style="background:${t.palette.bgPage};padding:2px 6px;border-radius:${t.radius.sm};font-family:'Courier New',monospace;font-size:14px;">${escapeHtml(text)}</code>`;
            },
            hr() {
                return `<hr style="border:0;border-top:1px solid ${t.palette.border};margin:${t.spacing.lg} 0;" />`;
            },
            table(this: any, { header, rows }: any) {
                const headerHtml = header.map((cell: any) => {
                    const text = this.parser.parseInline(cell.tokens);
                    return `<th style="border:1px solid ${t.palette.border};padding:${t.spacing.sm} ${t.spacing.md};text-align:left;background:${t.palette.bgPage};font-weight:600;">${text}</th>`;
                }).join('');
                const rowsHtml = rows.map((row: any[]) => {
                    const cells = row.map((cell: any) => {
                        const text = this.parser.parseInline(cell.tokens);
                        return `<td style="border:1px solid ${t.palette.border};padding:${t.spacing.sm} ${t.spacing.md};text-align:left;">${text}</td>`;
                    }).join('');
                    return `<tr>${cells}</tr>`;
                }).join('');
                return `<table style="border-collapse:collapse;width:100%;margin:${t.spacing.md} 0;"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
            },
        },
    });
    return m.parse(md, { async: false }) as string;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
