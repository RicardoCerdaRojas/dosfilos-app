/**
 * Particiona el markdown de un sermón en secciones por headers de nivel 2.
 *
 * ESPEJO de `extractSections`/`slugifyHeader` de
 * packages/web/src/pages/sermons/preach.tsx — los slugs DEBEN coincidir con
 * los de la web: en F2 las anotaciones se anclan por (sectionSlug, offset)
 * compartido entre plataformas (M-05). Si esto diverge, la tinta del sábado
 * no aparece el domingo.
 */

export interface SermonSection {
    title: string;
    slug: string;
    /** Cuerpo markdown de la sección (sin el header). */
    body: string;
}

export function slugifyHeader(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 80);
}

const HEADER_RE = /^##\s+(.+?)\s*$/;

/**
 * Secciones con cuerpo. El texto antes del primer `##` (si existe) entra como
 * sección sin título con slug 'preambulo'.
 */
export function extractSectionsWithBody(markdown: string): SermonSection[] {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const sections: SermonSection[] = [];
    const seenSlugs = new Set<string>();
    let current: SermonSection | null = null;
    let preamble: string[] = [];

    const pushCurrent = () => {
        if (current) {
            current.body = current.body.trim();
            sections.push(current);
        }
    };

    for (const line of lines) {
        const match = line.match(HEADER_RE);
        if (!match) {
            if (current) current.body += line + '\n';
            else preamble.push(line);
            continue;
        }
        const title = match[1].trim();
        if (!title) continue;
        const slug = slugifyHeader(title);
        if (!slug) continue;
        let suffix = 1;
        let candidate = slug;
        while (seenSlugs.has(candidate)) {
            candidate = `${slug}-${++suffix}`;
        }
        seenSlugs.add(candidate);
        pushCurrent();
        current = { title, slug: candidate, body: '' };
    }
    pushCurrent();

    const pre = preamble.join('\n').trim();
    if (pre) {
        sections.unshift({ title: '', slug: 'preambulo', body: pre });
    }
    return sections;
}

export interface PlainBlock {
    kind: 'subheading' | 'paragraph';
    text: string;
}

/** Trozo de un párrafo: prosa o un marcador de cita `[N]` (o `[1, 3]`). */
export type InlineToken =
    | { kind: 'text'; text: string }
    | { kind: 'citation'; text: string; ordinals: number[] };

// MISMA regla que packages/web/src/lib/citationMarkers.tsx: el primer
// carácter dentro del corchete debe ser dígito, para no chocar con las
// referencias bíblicas ni con corchetes de prosa.
const CITATION_MARKER_RE = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g;

/** Parte un párrafo en prosa + marcadores de cita, preservando el orden. */
export function tokenizeCitations(paragraph: string): InlineToken[] {
    const tokens: InlineToken[] = [];
    let last = 0;
    for (const match of paragraph.matchAll(CITATION_MARKER_RE)) {
        const start = match.index ?? 0;
        if (start > last) tokens.push({ kind: 'text', text: paragraph.slice(last, start) });
        tokens.push({
            kind: 'citation',
            text: match[0],
            ordinals: match[1]
                .split(',')
                .map((s) => Number(s.trim()))
                .filter((n) => Number.isInteger(n) && n > 0),
        });
        last = start + match[0].length;
    }
    if (last < paragraph.length) tokens.push({ kind: 'text', text: paragraph.slice(last) });
    return tokens;
}

/**
 * Normaliza un cuerpo markdown a bloques renderizables en texto plano (F1; el
 * render rico llega con el modo púlpito):
 *   - `###`+ → subheading (los `##` ya son el corte de sección).
 *   - `<br/>` → salto; `---` fuera; énfasis sin marcar.
 *   - Links internos de biblia `[texto](#ancla)` → texto, y anclas `{#…}`
 *     fuera (la web los vuelve interactivos; aquí serán el panel de Biblia
 *     del modo púlpito).
 *   - Los marcadores [N] del manifest se conservan.
 */
export function toPlainBlocks(body: string): PlainBlock[] {
    const cleaned = body
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/^---\s*$/gm, '')
        .replace(/\{#[^}]+\}/g, '')
        .replace(/\[([^\]]+)\]\(#[^)]*\)/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1');

    const blocks: PlainBlock[] = [];
    for (const raw of cleaned.split(/\n{2,}/)) {
        const chunk = raw.trim();
        if (!chunk) continue;
        const heading = chunk.match(/^#{3,}\s+(.+?)\s*$/);
        if (heading) {
            blocks.push({ kind: 'subheading', text: heading[1] });
            continue;
        }
        // un chunk puede traer heading pegado a texto en la misma pasada
        const lines = chunk.split('\n');
        let para: string[] = [];
        const flush = () => {
            if (para.length) {
                blocks.push({ kind: 'paragraph', text: para.join(' ').trim() });
                para = [];
            }
        };
        for (const line of lines) {
            const h = line.match(/^#{3,}\s+(.+?)\s*$/);
            if (h) {
                flush();
                blocks.push({ kind: 'subheading', text: h[1] });
            } else {
                para.push(line.trim());
            }
        }
        flush();
    }
    return blocks;
}
