import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { LightbulbIcon } from 'lucide-react';
import { FARFAN_CHUNKS } from '@dosfilos/infrastructure';

export const HebrewLoadingTips: React.FC = () => {
  const [tipToDisplay, setTipToDisplay] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "Consultando la gramática de Farfán...",
    "Analizando morfología trilitera...",
    "Identificando binyanim y prefijos...",
    "Desglosando construcciones sintácticas...",
    "Preparando el escrutinio del Tutor Interactivo...",
  ];

  useEffect(() => {
    if (FARFAN_CHUNKS && FARFAN_CHUNKS.length > 0) {
      const randomChunk = FARFAN_CHUNKS[Math.floor(Math.random() * FARFAN_CHUNKS.length)];
      setTipToDisplay(randomChunk.content);
    }
  }, []);

  useEffect(() => {
    // Cycle through loading messages every 2.5 seconds
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div className="space-y-6">
      {/* Animated Loading Status */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-8 relative overflow-hidden">
        {/* Subtle animated background pulse */}
        <div className="absolute inset-0 bg-primary/5 animate-pulse" style={{ animationDuration: '3s' }} />
        
        <div className="relative flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-serif text-primary opacity-80" dir="rtl">אבג</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase opacity-80">
              Procesando Versículo
            </h3>
            <p className="text-sm text-primary font-medium h-5 transition-all duration-500">
              {loadingMessages[loadingStep]}
            </p>
          </div>
        </div>
      </div>

      {/* Farfan Interactive Tip */}
      {tipToDisplay && (
        <div className="relative overflow-hidden rounded-2xl bg-secondary/50 p-6 border border-border/50">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 rounded-full bg-amber-500/10 p-8 w-32 h-32 blur-2xl pointer-events-none" />
          
          <div className="relative flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <LightbulbIcon className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="font-semibold text-amber-600 dark:text-amber-400">
              Mientras esperas... ¿Sabías qué?
            </h3>
          </div>
          
          <div className="prose prose-sm dark:prose-invert prose-headings:text-base prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            <ReactMarkdown>{tipToDisplay}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
