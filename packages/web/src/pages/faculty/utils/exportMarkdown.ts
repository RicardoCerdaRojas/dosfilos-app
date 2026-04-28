import { ProjectOutput } from '@dosfilos/domain';

/**
 * Export a project output as a Markdown file with YAML frontmatter.
 * Triggers a browser download via a transient blob URL.
 *
 * Pure utility — no UI dependencies, no i18n needed (filename is normalised
 * from the user-provided title; metadata is structural).
 */
export function exportOutputMarkdown(output: ProjectOutput): void {
    const header =
        `---\n` +
        `title: ${output.title}\n` +
        `kind: ${output.kind}\n` +
        `created: ${new Date(output.createdAt).toISOString()}\n` +
        `updated: ${new Date(output.updatedAt).toISOString()}\n` +
        `---\n\n`;
    const body = `# ${output.title}\n\n${output.content}`;
    const markdown = header + body;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${output.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
