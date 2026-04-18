import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { WordAnalysis } from '@dosfilos/domain';
import { MorphemeSpan, getMorphemeCategory } from './MorphemeSpan';
import { WeakVerbDetective } from './WeakVerbDetective';
import { BookOpenIcon, InfoIcon, AlertCircleIcon, ShieldCheckIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WordTutorSheetProps {
  word: WordAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_EXPLANATIONS: Record<string, { label: string; desc: string }> = {
  prefix: { label: 'Prefijo (Azul)', desc: 'Elementos añadidos al principio, como artículos definidos, conjunciones (Waw) y preposiciones.' },
  root: { label: 'Raíz (Gris/Texto)', desc: 'Las 3 letras consonantes que cargan el significado léxico fundamental (Raíz Trilitera).' },
  vowelMark: { label: 'Vocal Temática (Ámbar)', desc: 'Vocales que determinan el binyan, forma o conjugación particular del verbo.' },
  dagesh: { label: 'Dagesh (Rojo)', desc: 'Punto que duplica la consonante, crucial para reconocer binyanim como el Piel/Pual.' },
  suffix: { label: 'Sufijo (Violeta)', desc: 'Terminaciones de género, número o sufijos pronominales.' },
  neutral: { label: 'Neutro', desc: 'Elementos no clasificables o que no afectan directamente las reglas principales.' }
};

export const WordTutorSheet: React.FC<WordTutorSheetProps> = ({ word, isOpen, onClose }) => {
  const [width, setWidth] = React.useState(540);
  const isResizing = React.useRef(false);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // Calculate new width: window innerWidth minus mouse X position
      // Ensure it doesn't go below minimum (e.g. 400) or above maximum (e.g. 900)
      const newWidth = Math.max(400, Math.min(window.innerWidth - e.clientX, 900));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen]);

  if (!word) return null;

  // Extract unique categories present in this word's morphemes
  const presentCategories = new Set<string>();
  if (word.morphemes) {
    word.morphemes.forEach(m => {
      const cat = getMorphemeCategory(m.role);
      if (cat !== 'neutral') presentCategories.add(cat);
    });
  }

  const isVerb = !!word.verbMorphology;
  const verbType = word.verbMorphology?.verbType;
  const isWeak = verbType && verbType !== 'STRONG';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-none overflow-y-auto"
        style={{ maxWidth: `${width}px` }}
      >
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 hover:w-3 border-r border-transparent transition-all z-50 flex items-center justify-center -translate-x-1"
          onMouseDown={(e) => {
            e.preventDefault();
            isResizing.current = true;
            document.body.style.cursor = 'col-resize';
          }}
        >
          <div className="h-10 w-0.5 bg-border/50 rounded-full" />
        </div>
        
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-primary">
            <BookOpenIcon className="w-5 h-5" />
            Tutor Interactivo
          </SheetTitle>
          <SheetDescription>
            Análisis profundo de la morfología y sintaxis
          </SheetDescription>
        </SheetHeader>

        <div className="pb-6 pt-3 px-1">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full justify-start mb-6 bg-muted/50 p-1">
              <TabsTrigger value="summary" className="flex-1">Resumen</TabsTrigger>
              <TabsTrigger value="diagnostic" className="flex-1">Diagnóstico</TabsTrigger>
              <TabsTrigger value="context" className="flex-1">Contexto</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6 mt-0">
              {/* Header principal de la palabra */}
              <div className="text-center space-y-2">
                <div dir="rtl" className="text-[4.5rem] font-hebrew text-foreground leading-tight pb-2">
                  {word.morphemes && word.morphemes.length > 0 ? (
                    <MorphemeSpan segments={word.morphemes} variant="text" />
                  ) : (
                    <span>{word.hebrewText}</span>
                  )}
                </div>
                <p className="text-lg italic text-muted-foreground">{word.transliteration}</p>
                <p className="text-xl font-medium text-foreground">{word.translation}</p>
                {word.syntacticFunction && (
                  <div className="pt-2">
                    <span className="inline-flex items-center justify-center px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
                      {word.syntacticFunction}
                    </span>
                  </div>
                )}
              </div>

              {/* Código de colores dinámico */}
              {presentCategories.size > 0 && (
                <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <InfoIcon className="w-5 h-5 text-primary" />
                    Guía de Colores en esta Palabra
                  </h3>
                  <div className="space-y-4">
                    {Array.from(presentCategories).map(cat => {
                      const info = CATEGORY_EXPLANATIONS[cat];
                      if (!info) return null;
                      
                      // Agrupamos los morfemas por categoría
                      const matchingMorphemes = word.morphemes?.filter(m => getMorphemeCategory(m.role) === cat) || [];
                      
                      return (
                        <div key={cat} className="flex flex-col gap-1">
                          <p className="text-sm font-semibold text-foreground">{info.label}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{info.desc}</p>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {matchingMorphemes.map((m, i) => (
                              <div key={i} className="text-xs bg-muted/50 border border-border/80 px-3 py-1.5 rounded-lg inline-flex items-center gap-2.5 shadow-sm">
                                <span dir="rtl" className="font-hebrew text-lg"><MorphemeSpan segments={[m]} variant="text"/></span>
                                <span className="text-foreground font-medium">{m.label || m.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="diagnostic" className="space-y-6 mt-0">
              {/* Alerta de Verbo Fuerte/Débil */}
              {isVerb && word.verbMorphology ? (
                <div className={`rounded-xl p-5 border shadow-sm ${isWeak ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                  <h3 className={`text-base font-semibold mb-2 flex items-center gap-2 ${isWeak ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {isWeak ? <AlertCircleIcon className="w-5 h-5" /> : <ShieldCheckIcon className="w-5 h-5" />}
                    {isWeak ? 'Reglas de Verbo Débil' : 'Verbo Fuerte Regular'}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/80 mb-3">
                    Esta palabra es clasificada funcionalmente como <strong>{verbType?.replace(/_/g, ' ')}</strong> en el sistema de raíces de Farfán.
                  </p>
                  
                  <WeakVerbDetective word={word} />

                  {word.verbMorphology.recognitionClues && word.verbMorphology.recognitionClues.length > 0 && (
                    <div className="space-y-2 mt-4 bg-background/50 rounded-xl p-4 border border-border/50">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pistas de Reconocimiento del Sistema:</p>
                      <ul className="list-disc pl-5 text-sm text-foreground/80 space-y-1.5">
                        {word.verbMorphology.recognitionClues.map((clue, idx) => (
                          <li key={idx}>{clue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
                  El modo detective actualmente está enfocado en el diagnóstico de verbos.
                </div>
              )}
            </TabsContent>

            <TabsContent value="context" className="space-y-6 mt-0">
              {/* Explicación Pedagógica del Backend */}
              {word.explanation ? (
                <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary border-b pb-2">
                    <BookOpenIcon className="w-5 h-5" />
                    Explicación Pedagógica
                  </h3>
                  <div className="text-sm leading-relaxed text-foreground/90 max-w-none whitespace-pre-wrap">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-primary mt-6 mb-3" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-primary/90 mt-5 mb-2 border-b border-border/50 pb-1" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-semibold text-foreground mt-4 mb-2" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 mb-4 marker:text-primary/70" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-2 mb-4 marker:text-primary/70 font-medium" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1 text-foreground/80" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-foreground bg-primary/5 px-1.5 py-0.5 rounded-md" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-foreground/80" {...props} />,
                        blockquote: ({node, ...props}) => (
                          <blockquote className="border-l-4 border-primary/40 pl-4 py-2 my-4 bg-primary/5 italic text-foreground/80 rounded-r-lg" {...props} />
                        )
                      }}
                    >
                      {word.explanation}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl bg-muted/20 flex flex-col items-center justify-center">
                  <InfoIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                  <span>No hay explicación pedagógica detallada disponible para esta palabra.</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
