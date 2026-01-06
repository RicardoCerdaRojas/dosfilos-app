import { TrainingUnit } from '@dosfilos/domain';
import { BoardContent } from '../hooks/useGreekTutorBoard';

/**
 * Format current session content for export
 */
export const formatSessionExport = (
    content: BoardContent | null,
    unit: TrainingUnit,
    passage: string
): string => {
    if (!content) {
        return `# Sesión de Estudio Griego - ${passage}\n\n*No hay contenido para exportar*`;
    }

    const header = `# Sesión de Estudio Griego
**Pasaje:** ${passage}
**Palabra:** ${unit.greekForm.text} (${unit.greekForm.transliteration})
**Glosa:** ${unit.greekForm.gloss}
**Identificación:** ${unit.identification}

---

`;

    const contentSection = `## ${content.title}

${content.content}

---

*Exportado el ${new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}*
`;

    return header + contentSection;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
    }
};

/**
 * Download text as markdown file
 */
export const downloadAsMarkdown = (text: string, filename: string = 'sesion-griego.md') => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
