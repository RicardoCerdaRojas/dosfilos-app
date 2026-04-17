import type { VerseAnalysis, WordAnalysis } from '@dosfilos/domain';

const mapMorphology = (morph: any): string => {
  if (!morph) return '';
  const parts = [];
  if (morph.binyan) parts.push(`Binyan: **${morph.binyan}**`);
  if (morph.verbForm) parts.push(`Forma: **${morph.verbForm}**`);
  if (morph.person) parts.push(`Persona: ${morph.person}`);
  if (morph.gender) parts.push(`Género: ${morph.gender}`);
  if (morph.number) parts.push(`Número: ${morph.number}`);
  if (morph.state) parts.push(`Estado: ${morph.state}`);
  return parts.join(' | ');
};

const formatWord = (word: WordAnalysis, index: number): string => {
  const morphStr = word.verbMorphology ? mapMorphology(word.verbMorphology) : (word.nominalMorphology ? mapMorphology(word.nominalMorphology) : '');
  
  let md = `### ${index + 1}. ${word.hebrewText} (${word.transliteration})\n`;
  if (word.lemmaGloss) {
    md += `- **Raíz/Lex**: ${word.lemmaGloss}\n`;
  }
  md += `- **Traducción**: ${word.translation}\n`;
  if (word.category) {
    md += `- **Categoría**: ${word.category}\n`;
  }
  if (morphStr) {
    md += `- **Morfología**: ${morphStr}\n`;
  }
  if (word.syntacticFunction) {
    md += `- **Sintaxis**: ${word.syntacticFunction}\n`;
  }
  
  if (word.morphemes && word.morphemes.length > 0) {
    md += `- **Desglose Morfológico**:\n`;
    word.morphemes.forEach(m => {
      md += `  - \`${m.text}\`: ${m.role} ${m.meaning ? `(${m.meaning})` : ''}\n`;
    });
  }

  return md;
};

export const generateVerseMarkdown = (analysis: VerseAnalysis): string => {
  let md = `# Análisis de Versículo: ${analysis.reference}\n\n`;
  
  md += `## Texto Hebreo\n`;
  md += `> <span dir="rtl">${analysis.words.map(w => w.hebrewText).join(' ')}</span>\n`;
  md += `> *${analysis.transliteration}*\n\n`;

  md += `## Traducciones\n`;
  md += `- **Literal**: ${analysis.literalTranslation}\n`;
  md += `- **Fluida**: ${analysis.fluidTranslation}\n\n`;

  md += `## Análisis por Palabra\n\n`;
  analysis.words.forEach((w, i) => {
    md += formatWord(w, i) + '\n';
  });

  if (analysis.exegeticalNotes && analysis.exegeticalNotes.length > 0) {
    md += `## Notas Exegéticas\n\n`;
    analysis.exegeticalNotes.forEach(note => {
      md += `- ${note}\n`;
    });
  }

  md += `\n---\n*Generado por Dos Filos - Entrenador de Hebreo*`;
  return md;
};
