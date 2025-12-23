import React from 'react';
import { BookOpen } from 'lucide-react';
import type { StudySession } from '@dosfilos/domain/greek-tutor/entities/entities';

interface WordListPreviewProps {
  session: StudySession;
}

export const WordListPreview: React.FC<WordListPreviewProps> = ({ session }) => {
  // Extract unique words from units
  const studiedWords = React.useMemo(() => {
    if (!session.units || session.units.length === 0) {
      return [];
    }

    const wordsMap = new Map<string, { greek: string; morphology?: string }>();
    
    session.units.forEach((unit) => {
      const greekForm = unit.greekForm;
      if (greekForm && !wordsMap.has(greekForm.text)) {
        wordsMap.set(greekForm.text, {
          greek: greekForm.text,
          morphology: greekForm.morphology
        });
      }
    });

    return Array.from(wordsMap.values()).slice(0, 10); // Limit to 10 words
  }, [session.units]);

  if (studiedWords.length === 0) {
    return (
      <div className="p-3 text-sm text-gray-500 text-center">
        No hay palabras estudiadas aún
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
        <BookOpen className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-semibold text-gray-700">
          Palabras estudiadas ({studiedWords.length})
        </span>
      </div>
      
      <div className="space-y-1">
        {studiedWords.map((word, index) => (
          <div
            key={`${word.greek}-${index}`}
            className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 transition-colors"
          >
            <span className="text-lg font-serif text-indigo-900 flex-shrink-0">
              {word.greek}
            </span>
            {word.morphology && (
              <span className="text-xs text-gray-600 mt-1">
                {word.morphology}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
