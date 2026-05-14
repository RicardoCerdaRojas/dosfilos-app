/**
 * Injects inline CSS into the rendered prose HTML so it survives a
 * paste into Word, Google Docs, or Notion. Those editors strip
 * `class` attributes but preserve inline `style="..."`, so tables
 * would otherwise render as borderless grids. We walk the parsed
 * fragment with the browser's DOMParser, tag the structural
 * elements we care about, and serialize back. Non-table content
 * (headings, paragraphs, lists) keeps its semantics — Word and
 * Docs handle those out of the box, so we add only enough styling
 * to look intentional.
 */
export function injectInlineStylesForCopy(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

    const tableStyle = 'border-collapse: collapse; width: 100%; margin: 12px 0; font-family: inherit;';
    const headerCellStyle = 'border: 1px solid #999; padding: 8px 10px; background: #f3f3f3; text-align: left; vertical-align: top; font-weight: 600;';
    const bodyCellStyle = 'border: 1px solid #999; padding: 8px 10px; vertical-align: top;';
    const blockquoteStyle = 'margin: 12px 0; padding: 8px 14px; border-left: 4px solid #94a3b8; background: #f8fafc; color: #334155;';

    doc.querySelectorAll('table').forEach((el) => el.setAttribute('style', tableStyle));
    doc.querySelectorAll('th').forEach((el) => el.setAttribute('style', headerCellStyle));
    doc.querySelectorAll('td').forEach((el) => el.setAttribute('style', bodyCellStyle));
    doc.querySelectorAll('blockquote').forEach((el) => el.setAttribute('style', blockquoteStyle));

    return doc.body.firstElementChild?.innerHTML ?? html;
}
