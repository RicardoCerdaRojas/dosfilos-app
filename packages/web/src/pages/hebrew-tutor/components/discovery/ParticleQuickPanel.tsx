/**
 * ParticleQuickPanel
 *
 * Lightweight detective panel for non-verb, non-nominal words:
 * prepositions, conjunctions, articles, particles, adverbs, etc.
 *
 * Shows the Hebrew word with its category and root meaning,
 * then asks the student to type or select the contextual translation.
 * This ensures ALL words go through the detective flow, helping
 * memorization even for "simple" words.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WordAnalysis } from '@dosfilos/domain';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchIcon } from 'lucide-react';

interface ParticleQuickPanelProps {
  readonly word: WordAnalysis | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Called when the student completes the word with their translation */
  readonly onComplete: (translation: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  preposition: 'Preposición',
  conjunction: 'Conjunción',
  article: 'Artículo',
  particle: 'Partícula',
  adverb: 'Adverbio',
  interjection: 'Interjección',
  numeral: 'Numeral',
};

function getCategoryLabel(category?: string): string {
  if (!category) return 'Partícula';
  return CATEGORY_LABELS[category.toLowerCase()] ?? category;
}

export const ParticleQuickPanel: React.FC<ParticleQuickPanelProps> = ({
  word,
  isOpen,
  onClose,
  onComplete,
}) => {
  const { t } = useTranslation('hebrewTutor');
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!word) return null;

  const correctTranslation = word.translation;
  const isCorrect = submitted && userInput.trim().toLowerCase() === correctTranslation.trim().toLowerCase();

  const handleSubmit = () => {
    if (!userInput.trim()) return;
    setSubmitted(true);
  };

  const handleContinue = () => {
    onComplete(submitted && isCorrect ? userInput.trim() : correctTranslation);
    setUserInput('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 overflow-hidden"
        style={{ width: 440, maxWidth: '95vw', minWidth: 320 }}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <SheetDescription className="sr-only">
            {t('discovery.particle.srDescription', { defaultValue: 'Identificación rápida de partícula hebrea.' })}
          </SheetDescription>
          <div className="flex items-center gap-2 pr-8">
            <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center flex-shrink-0">
              <SearchIcon className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold leading-none">
                {t('discovery.particle.title', { defaultValue: 'Identificación Rápida' })}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getCategoryLabel(word.category)}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <ScrollArea className="flex-1 select-text">
          <div className="p-5 space-y-5">
            {/* Hebrew word display */}
            <div className="flex flex-col items-center gap-3 py-6 rounded-2xl bg-gradient-to-br from-teal-50/50 to-cyan-50/30 dark:from-teal-950/30 dark:to-cyan-950/20 border border-teal-200/30 dark:border-teal-800/30">
              <span
                dir="rtl"
                lang="he"
                className="text-4xl font-semibold text-foreground"
                style={{ fontFamily: "'SBL Hebrew', 'Ezra SIL', serif" }}
              >
                {word.hebrewText}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium">
                  {getCategoryLabel(word.category)}
                </span>
                {word.transliteration && (
                  <span className="text-xs text-muted-foreground italic">
                    {word.transliteration}
                  </span>
                )}
              </div>
            </div>

            {/* Clues */}
            <div className="space-y-2">
              {word.root && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground w-16 flex-shrink-0">
                    {t('discovery.particle.root', { defaultValue: 'Raíz:' })}
                  </span>
                  <span dir="rtl" lang="he" className="text-sm font-semibold text-foreground">
                    {word.root}
                  </span>
                  {word.rootMeaning && (
                    <span className="text-xs text-muted-foreground">— {word.rootMeaning}</span>
                  )}
                </div>
              )}

              {word.lemmaGloss && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground w-16 flex-shrink-0">
                    {t('discovery.particle.gloss', { defaultValue: 'Glosa:' })}
                  </span>
                  <span className="text-sm text-foreground">{word.lemmaGloss}</span>
                </div>
              )}

              {word.syntacticFunction && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground w-16 flex-shrink-0">
                    {t('discovery.particle.function', { defaultValue: 'Función:' })}
                  </span>
                  <span className="text-sm text-foreground">{word.syntacticFunction}</span>
                </div>
              )}
            </div>

            {/* Question */}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3">
              <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">
                {t('discovery.particle.question', {
                  defaultValue: '¿Cómo traducirías esta palabra en el contexto del versículo?',
                })}
              </p>
            </div>

            {/* Input / Feedback */}
            {!submitted ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={t('discovery.particle.placeholder', { defaultValue: 'Escribe tu traducción...' })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('discovery.particle.verify', { defaultValue: 'Verificar →' })}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {isCorrect ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-1">
                    <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                      ✅ {t('discovery.particle.correct', { defaultValue: '¡Correcto!' })}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {t('discovery.particle.correctDesc', {
                        defaultValue: 'Tu traducción coincide con la del experto.',
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-2">
                    <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                      {t('discovery.particle.notExact', { defaultValue: 'No exactamente. La traducción contextual es:' })}
                    </p>
                    <p className="text-base font-bold text-foreground">
                      &ldquo;{correctTranslation}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {t('discovery.particle.youSaid', { defaultValue: 'Tú dijiste:' })}
                      </span>
                      <span className="text-xs font-medium text-foreground">&ldquo;{userInput}&rdquo;</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContinue}
                  className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
                >
                  {t('discovery.particle.continue', { defaultValue: 'Continuar →' })}
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
