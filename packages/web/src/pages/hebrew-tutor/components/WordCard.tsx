/**
 * WordCard
 *
 * Renders a single Hebrew word analysis card from a VerseAnalysis.
 * Displays:
 *  - Hebrew word with morpheme color coding
 *  - Transliteration and lexical form
 *  - Grammatical category + morphological breakdown (binyan, form, etc.)
 *  - Syntactic function in the clause
 *  - OSHB validation badge
 *  - Collapsible morpheme-by-morpheme breakdown
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WordAnalysis } from '@dosfilos/domain';
import { MorphemeSpan, MORPHEME_BADGE_STYLES, getMorphemeCategory } from './MorphemeSpan';
import { OshbValidationBadge } from './OshbValidationBadge';

interface WordCardProps {
  word: WordAnalysis;
  index: number;
  onFocus?: () => void;
  /** Launches the Verb Detective investigation panel for this word */
  onInvestigate?: (word: WordAnalysis) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  verb:              'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  noun:              'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  pronoun:           'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  preposition:       'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  conjunction:       'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  article:           'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  particle:          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  adverb:            'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  interjection:      'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  proper_noun:       'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  numeral:           'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
};

const getCategoryStyle = (cat?: string | null) => {
  if (!cat) return CATEGORY_STYLES.particle;
  return CATEGORY_STYLES[cat.toLowerCase()] ?? CATEGORY_STYLES.particle;
};

export const WordCard: React.FC<WordCardProps> = ({ word, index, onFocus, onInvestigate }) => {
  const { t } = useTranslation('hebrewTutor');
  const [expanded, setExpanded] = useState(false);

  const isVerb = word.category?.toUpperCase() === 'VERB';

  const morphology = word.verbMorphology || word.nominalMorphology;
  const hasMorphologyData = !!morphology;
  const hasMorphemes = word.morphemes && word.morphemes.length > 0;
  
  // Detective Logic: Marco-Syntactic Marker Detection (Wayhí)
  const isNarrativeMarker =
    word.category === 'VERB' &&
    morphology &&
    'verbForm' in morphology &&
    morphology.verbForm?.toUpperCase() === 'WAYYIQTOL' &&
    (word.root === 'היה' || word.root === 'הָיָה' || word.hebrewText?.includes('וַיְהִי') || word.lemmaGloss?.toLowerCase().includes('ser') || word.transliteration?.toLowerCase().includes('wayhi') || word.transliteration?.toLowerCase().includes('wayhî'));

  return (
    <div
      id={`word-card-${index}`}
      onClick={onFocus}
      className={`relative bg-card border border-border rounded-xl p-4 transition-colors shadow-sm print:break-inside-avoid print:shadow-none print:mb-4 ${onFocus ? 'cursor-pointer hover:border-primary/50' : 'hover:border-primary/30'}`}
    >
      {/* Header row: Hebrew word + transliteration + category badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1">
          {/* Hebrew word (with morpheme colors or plain) */}
          <div dir="rtl" className="text-2xl font-serif text-foreground leading-tight">
            {hasMorphemes ? (
              <MorphemeSpan segments={word.morphemes!} variant="text" />
            ) : (
              <span>{word.hebrewText}</span>
            )}
          </div>
          {/* Transliteration */}
          <span className="text-xs text-muted-foreground italic">{word.transliteration}</span>
          {/* Lexical form */}
          {word.lemmaGloss && (
            <span className="text-[11px] text-muted-foreground/70">
              lex: <span className="font-serif">{word.lemmaGloss}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex flex-col items-end gap-1">
            {/* Category badge */}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getCategoryStyle(word.category)}`}>
              {word.category ? t(`verseAnalyzer.categories.${word.category}`, { defaultValue: word.category }) : 'PARTICLE'}
            </span>
            {/* Narrative Marker */}
            {isNarrativeMarker && (
              <span 
                title="Marcador Macro-sintáctico de apertura narrativa"
                className="text-[9px] font-bold px-1.5 py-0.5 mt-0.5 rounded-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 uppercase tracking-widest shadow-sm flex items-center justify-center gap-1 cursor-help"
              >
                <span>📖</span> Apertura
              </span>
            )}
          </div>
          {/* OSHB validation badge */}
          {word.oshbReference && <OshbValidationBadge oshb={word.oshbReference} />}
        </div>
      </div>

      {/* Translation */}
      <p className="text-sm text-foreground mb-3 border-l-2 border-primary/30 pl-3">
        {word.translation}
      </p>

      {/* Morphology table */}
      {hasMorphologyData && morphology && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
          {'binyan' in morphology && morphology.binyan && (
            <MorphCell label="Binyan" value={`${morphology.binyan}`} />
          )}
          {'verbForm' in morphology && morphology.verbForm && (
            <MorphCell
              label="Forma"
              value={t(`verseAnalyzer.verbForms.${morphology.verbForm}`, { defaultValue: morphology.verbForm })}
            />
          )}
          {'verbType' in morphology && morphology.verbType && (
            <MorphCell
              label="Tipo Raíz"
              value={t(`verseAnalyzer.verbTypes.${morphology.verbType}`, { defaultValue: morphology.verbType })}
            />
          )}
          {'person' in morphology && morphology.person && (
            <MorphCell label="Persona" value={`${morphology.person}`} />
          )}
          {'gender' in morphology && morphology.gender && (
            <MorphCell label="Género" value={t(`verseAnalyzer.morphology.gender.${morphology.gender}`, { defaultValue: `${morphology.gender}` })} />
          )}
          {'number' in morphology && morphology.number && (
            <MorphCell label="Número" value={t(`verseAnalyzer.morphology.number.${morphology.number}`, { defaultValue: `${morphology.number}` })} />
          )}
          {'state' in morphology && morphology.state && (
            <MorphCell label="Estado" value={t(`verseAnalyzer.morphology.state.${morphology.state}`, { defaultValue: `${morphology.state}` })} />
          )}
        </div>
      )}

      {/* Syntactic function */}
      {word.syntacticFunction && (
        <p className="text-xs text-muted-foreground mb-2">
          <span className="font-medium text-foreground/70">
            {t('verseAnalyzer.analysis.syntacticFunction')}:{' '}
          </span>
          {word.syntacticFunction}
        </p>
      )}

      {/* Deep Analysis (Collapsible Clues + Morphemes) */}
      {(hasMorphemes || word.explanation || (morphology && 'recognitionClues' in morphology && morphology.recognitionClues?.length)) && (
        <div className="mt-2 border-t border-border pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <span>{expanded ? '▾' : '▸'}</span>
            {t('verseAnalyzer.analysis.deepAnalysis', { defaultValue: 'Análisis Profundo' })}
          </button>

          {expanded && (
            <div className="mt-3 flex flex-col gap-3">
              {/* Detective / Pedagogical Clues from AI */}
              {(word.explanation || (morphology && 'recognitionClues' in morphology && morphology.recognitionClues?.length)) && (
                <div className="bg-yellow-50/80 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-700/30 rounded-md p-2">
                  <h4 className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>🔍</span> {t('verseAnalyzer.analysis.pedagogicalClues', { defaultValue: 'Pistas y Diagnóstico' })}
                  </h4>
                  
                  {word.explanation && (
                    <p className="text-xs text-yellow-900/80 dark:text-yellow-200/80 leading-relaxed mb-1.5">
                      {word.explanation}
                    </p>
                  )}

                  {morphology && 'recognitionClues' in morphology && morphology.recognitionClues && morphology.recognitionClues.length > 0 && (
                    <ul className="list-disc pl-3 mt-1 space-y-0.5">
                      {morphology.recognitionClues.map((clue, idx) => (
                        <li key={idx} className="text-[11px] text-yellow-800 dark:text-yellow-300/90 leading-tight">
                          {clue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Morphemes */}
              {hasMorphemes && (
                <div className="flex flex-wrap gap-1.5">
                  {word.morphemes!.map((seg, i) => {
                    const cat = getMorphemeCategory(seg.role);
                    return (
                    <div
                      key={i}
                      className={`text-xs rounded px-1.5 py-1 border flex flex-col items-center gap-0.5 min-w-[40px] ${MORPHEME_BADGE_STYLES[cat] ?? MORPHEME_BADGE_STYLES.neutral}`}
                    >
                      <span dir="rtl" className="font-serif text-base">
                        <MorphemeSpan segments={[seg]} />
                      </span>
                      <span className="text-[10px] text-muted-foreground text-center">
                        {t(`verseAnalyzer.morphemeRoles.${seg.role}`, { defaultValue: seg.role })}
                      </span>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detective mode button — only shown for verbs */}
      {isVerb && onInvestigate && (
        <div className="mt-3 pt-3 border-t border-dashed border-border">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInvestigate(word);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold
              text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30
              border border-indigo-200 dark:border-indigo-800
              hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors print:hidden"
          >
            🔍 {t('detective.launchButton', { defaultValue: 'Investigar verbo' })}
          </button>
        </div>
      )}
    </div>
  );
};

const MorphCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-muted/30 rounded-lg px-2.5 py-1.5">
    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
    <div className="text-xs font-semibold text-foreground truncate">{value}</div>
  </div>
);
