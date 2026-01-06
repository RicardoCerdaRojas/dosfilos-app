import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onCreateNew: () => void;
  onQuickStart?: (passage: string) => void;
}

const suggestedPassages = [
  { reference: 'Juan 1:1-5', description: 'El Verbo se hizo carne' },
  { reference: 'Juan 3:16', description: 'Porque de tal manera amó Dios...' },
  { reference: 'Romanos 8:1-4', description: 'Ninguna condenación' },
  { reference: '1 Corintios 13:1-3', description: 'El amor es...' },
  { reference: 'Filipenses 2:5-11', description: 'El himno de Cristo' },
  { reference: 'Hebreos 1:1-4', description: 'Dios habla por su Hijo' }
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateNew, onQuickStart }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon and Title */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-100 rounded-full blur-2xl opacity-30" />
        <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg">
          <BookOpen className="w-16 h-16 text-white" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Comienza tu estudio del griego
      </h2>
      <p className="text-gray-600 text-center max-w-md mb-8">
        No tienes sesiones de estudio activas. Elige un pasaje del Nuevo Testamento 
        para comenzar a explorar el texto griego con guías pedagógicas.
      </p>

      {/* Primary Action */}
      <Button 
        onClick={onCreateNew}
        size="lg"
        className="mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
      >
        <Plus className="w-5 h-5 mr-2" />
        Nueva Sesión
      </Button>

      {/* Suggested Passages */}
      {onQuickStart && (
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-700">
              Pasajes sugeridos
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedPassages.map((passage) => (
              <button
                key={passage.reference}
                onClick={() => onQuickStart(passage.reference)}
                className="group relative overflow-hidden bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                <div className="relative">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {passage.reference}
                    </span>
                    <BookOpen className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
                  </div>
                  <p className="text-sm text-gray-600">
                    {passage.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-12 max-w-lg">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Consejo
          </h4>
          <p className="text-sm text-blue-800">
            Cada sesión incluye análisis morfológico, contexto teológico, y ejercicios 
            de reconocimiento para ayudarte a profundizar en el texto original.
          </p>
        </div>
      </div>
    </div>
  );
};
