import { formatPassageReference } from '../../bible/canon/passage-reference';
import type { ExegeticalPaper } from './ExegeticalPaper';
import type { ExegeticalStep } from './ExegeticalStep';

/**
 * Renders an `ExegeticalPaper` to a self-contained Markdown string
 * suitable for download.
 *
 * Source-of-truth precedence:
 *   1. `paper.assembledMarkdown` (the canonical post-assembly output,
 *      possibly with the user's manual edits) — used verbatim.
 *   2. Otherwise, fall back to concatenating accepted-step markdown in
 *      canonical paper order: introduction → verses (in passage order)
 *      → conclusion. Steps without an `accepted` version are skipped
 *      (a partial export is more useful than nothing while the paper is
 *      still in progress).
 *
 * The wrapper adds a small front-matter header with title, passage,
 * and export timestamp. Section headings (Introducción / Versículo
 * N / Conclusión) are localized off `paper.displayLanguage`, NOT the
 * UI language — the export should match the language the body was
 * generated in.
 *
 * Pure function. No DOM / Blob / download — those live in the web
 * layer where the browser APIs are.
 */
export function exportPaperToMarkdown(
    paper: ExegeticalPaper,
    options: { exportedAt?: Date } = {},
): string {
    const labels = paper.displayLanguage === 'en' ? LABELS_EN : LABELS_ES;
    const exportedAt = options.exportedAt ?? new Date();
    const passageDisplay = formatPassageReference(paper.passage, paper.displayLanguage);
    const titleDisplay = paper.title?.trim() || passageDisplay;

    const body = paper.assembledMarkdown
        ? paper.assembledMarkdown
        : assembleFromAcceptedSteps(paper.steps, labels);

    const header = [
        `# ${titleDisplay}`,
        '',
        `**${labels.passage}:** ${passageDisplay}`,
        `**${labels.exportedOn}:** ${exportedAt.toISOString().slice(0, 10)}`,
        paper.assignmentBrief?.trim()
            ? `\n> ${paper.assignmentBrief.trim().replace(/\n/g, '\n> ')}`
            : null,
        '',
        '---',
        '',
    ].filter((line): line is string => line !== null).join('\n');

    return body.trim().length > 0
        ? `${header}\n${body.trim()}\n`
        : `${header}\n_${labels.emptyBody}_\n`;
}

interface SectionLabels {
    passage: string;
    exportedOn: string;
    introduction: string;
    conclusion: string;
    verse: string;
    emptyBody: string;
}

const LABELS_ES: SectionLabels = {
    passage: 'Pasaje',
    exportedOn: 'Exportado',
    introduction: 'Introducción',
    conclusion: 'Conclusión',
    verse: 'Versículo',
    emptyBody: 'Sin contenido aceptado todavía. Genera y acepta los pasos antes de exportar para obtener el trabajo completo.',
};

const LABELS_EN: SectionLabels = {
    passage: 'Passage',
    exportedOn: 'Exported',
    introduction: 'Introduction',
    conclusion: 'Conclusion',
    verse: 'Verse',
    emptyBody: 'No accepted content yet. Generate and accept steps before exporting to get the full paper.',
};

function assembleFromAcceptedSteps(steps: ReadonlyArray<ExegeticalStep>, labels: SectionLabels): string {
    const intro = steps.find(s => s.kind === 'introduction')?.accepted?.markdown?.trim();
    const verses = steps
        .filter(s => s.kind === 'verse' && s.accepted?.markdown?.trim())
        .sort((a, b) => a.order - b.order);
    const conclusion = steps.find(s => s.kind === 'conclusion')?.accepted?.markdown?.trim();

    const parts: string[] = [];
    if (intro) parts.push(`## ${labels.introduction}\n\n${intro}`);
    for (const v of verses) {
        const verseNumber = v.verseRef?.verseStart ?? v.order;
        parts.push(`## ${labels.verse} ${verseNumber}\n\n${v.accepted!.markdown.trim()}`);
    }
    if (conclusion) parts.push(`## ${labels.conclusion}\n\n${conclusion}`);
    return parts.join('\n\n');
}
