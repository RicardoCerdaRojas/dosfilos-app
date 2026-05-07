import React, { useState } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { SearchIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, RotateCcwIcon, LightbulbIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const WeakVerbDetective: React.FC<{ word: WordAnalysis }> = ({ word }) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [rootLength, setRootLength] = useState<number | null>(null);
  const [selectedVowel, setSelectedVowel] = useState<string | null>(null);

  const morphology = word.verbMorphology;
  if (!morphology || !word.hebrewText) return null;

  const actualType = morphology.verbType;
  // Fallback for strong/weak
  const isWeak = actualType && actualType !== 'STRONG';

  const reset = () => {
    setStep(1);
    setRootLength(null);
    setSelectedVowel(null);
  };

  const checkDeduction = (userVowel: string, predictedTypes: string[]) => {
    setSelectedVowel(userVowel);
    // Rough matching against the actual type from the backend.
    // Replace logic handles enums like "II_WAW_YOD", "III_HE", "I_NUN", "STRONG"
    setStep(3);
  };

  const isSuccess = () => {
    if (!selectedVowel || !actualType) return false;
    
    // Map of deductions
    if (rootLength === 3) {
      if (selectedVowel === 'pataj' && (morphology.binyan === 'HIFIL')) return true;
      if (selectedVowel === 'jireq' && (morphology.binyan === 'QAL' || morphology.binyan === 'NIFAL')) return true;
      if (selectedVowel === 'qamets-hatuf' && (morphology.binyan === 'HOFAL')) return true;
      if (selectedVowel === 'sheva' && (morphology.binyan === 'PIEL' || morphology.binyan === 'PUAL')) return true;
      
      // If none explicitly matched, but they picked 3 letters and it is actually strong
      if (actualType === 'STRONG' && selectedVowel) return true;
    } else {
      // 2 letters
      if (selectedVowel === 'qamets' && (actualType === 'II_WAW_YOD' || actualType === 'GEMINATE')) return true;
      if (selectedVowel === 'tsere' && (actualType === 'I_YOD_WAW' || actualType === 'III_HE')) return true;
      if (selectedVowel === 'jireq' && (actualType === 'III_HE' || actualType === 'I_NUN')) return true;
      if (selectedVowel === 'pataj' && (actualType === 'III_HE' || morphology.binyan === 'HIFIL')) return true;
      if (selectedVowel === 'jolem' && (actualType === 'I_YOD_WAW')) return true;
    }
    
    return false;
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mt-2 mb-4">
      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="text-center space-y-3 py-2">
          <div className="mx-auto w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-2">
            <SearchIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Modo Detective</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Pon a prueba la regla del profesor Farfán. ¿Puedes diagnosticar este verbo tú mismo observando sus vocales?
          </p>
          <Button size="sm" onClick={() => setStep(1)} className="mt-2 text-xs">
            Comenzar Investigación
          </Button>
        </div>
      )}

      {/* Step 1: Root length */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <span className="bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
            Inspección de Raíz
          </h4>
          <p className="text-xs text-muted-foreground">Mira atentamente el verbo original. ¿Cuántas consonantes de la raíz logras ver?</p>
          
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="justify-start text-xs font-normal h-auto py-2" onClick={() => { setRootLength(3); setStep(2); }}>
              Veo 3 consonantes (Raíz Completa)
            </Button>
            <Button variant="outline" className="justify-start text-xs font-normal h-auto py-2" onClick={() => { setRootLength(2); setStep(2); }}>
              ¡Falta una! Solo veo 2 consonantes
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Vowel */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <span className="bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
            Inspección Preformativa
          </h4>
          
          {rootLength === 3 ? (
            <p className="text-xs text-muted-foreground">
              Escenario A: Hay 3 letras. Fíjate en la <strong>vocal del preformativo</strong> para encontrar el Tema (Binyan):
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Escenario B: Falta una letra. Fíjate en la <strong>vocal del preformativo</strong> (que quedó en sílaba abierta):
            </p>
          )}
          
          <div className="grid grid-cols-1 gap-2">
            {rootLength === 3 ? (
              <>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('pataj', ['HIFIL'])}>
                  <span className="font-bold mr-2 text-primary">Pataj (ַ)</span> seguido de letra fuerte
                </Button>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('jireq', ['QAL', 'NIFAL'])}>
                  <span className="font-bold mr-2 text-primary">Jireq (ִ)</span>
                </Button>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('qamets-hatuf', ['HOFAL'])}>
                  <span className="font-bold mr-2 text-primary">Qamets-Hatuf (ָ)</span>
                </Button>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('sheva', ['PIEL', 'PUAL'])}>
                  <span className="font-bold mr-2 text-primary">Shevá (ְ)</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('qamets', ['II_WAW_YOD'])}>
                  <span className="font-bold mr-2 text-primary">Qamets (ָ)</span>
                </Button>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('tsere', ['I_YOD_WAW', 'III_HE'])}>
                  <span className="font-bold mr-2 text-primary">Tsere (ֵ)</span>
                </Button>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('jireq', ['III_HE'])}>
                  <span className="font-bold mr-2 text-primary">Jireq (ִ)</span>
                </Button>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('pataj', ['III_HE', 'HIFIL'])}>
                  <span className="font-bold mr-2 text-primary">Pataj (ַ)</span>
                </Button>
                <Button variant="outline" className="justify-start text-xs font-normal text-left h-auto py-2" onClick={() => checkDeduction('jolem', ['I_YOD_WAW'])}>
                  <span className="font-bold mr-2 text-primary">Jolem-vav (וֹ)</span>
                </Button>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[10px] w-full">Volver atrás</Button>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-400">
          {isSuccess() ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">¡Excelente Deducción!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-1">
                La lógica de Farfán coincide perfectamente con el resultado.
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-center">
              <XCircleIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-orange-800 dark:text-orange-300">Deducción Incorrecta</h4>
              <p className="text-xs text-orange-700 dark:text-orange-400/80 mt-1">
                La vocal elegida no refleja la categoría real de este verbo.
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-950 border rounded-lg p-3 text-center space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Veredicto del tutor</p>
            <p className="text-sm font-medium">Binyan: <span className="text-primary">{morphology.binyan}</span></p>
            <p className="text-sm font-medium">Tipo de Raíz: <span className="text-primary">{actualType ? actualType.replace(/_/g, ' ') : 'N/A'}</span></p>
          </div>

          <Button variant="outline" size="sm" onClick={reset} className="w-full text-xs flex items-center justify-center gap-2">
            <RotateCcwIcon className="w-3 h-3" />
            Volver a intentar
          </Button>
        </div>
      )}
    </div>
  );
};
