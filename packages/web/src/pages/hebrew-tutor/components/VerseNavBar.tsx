/**
 * VerseNavBar
 *
 * Persistent horizontal navigation bar for the verse analyzer.
 * Replaces the Sheet-based VerseSelector on desktop (md+).
 *
 * Layout:
 *   [ Book ▾ ]  [ Ch. N ▾ ]  [ v. N ▾ ]  |  [◀] [▶]  |  [✦ Analizar]
 */

import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HEBREW_BOOKS_CATALOG } from '@dosfilos/infrastructure';
import type { BookIndex } from '@dosfilos/domain';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  SparklesIcon,
  LoaderIcon,
} from 'lucide-react';
import { VerseSearchInput } from './VerseSearchInput';

interface VerseNavBarProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVerse: number;
  bookIndex: BookIndex | null;
  isLoadingIndex: boolean;
  isAnalyzing: boolean;
  onBookChange: (key: string) => void;
  onChapterChange: (chapter: number) => void;
  onVerseChange: (verse: number) => void;
  onNavigate: (book: string, chapter: number, verse: number) => void;
  onAnalyze: () => void;
  onNext: () => void;
  onPrev: () => void;
}

// ── Generic dropdown ────────────────────────────────────────────────────────

interface DropdownProps {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const NavDropdown: React.FC<DropdownProps> = ({ label, children, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
          border border-border/60 bg-background
          hover:border-primary/40 hover:bg-primary/5
          transition-all disabled:opacity-40 disabled:cursor-not-allowed
          ${open ? 'border-primary/50 bg-primary/5 text-primary' : 'text-foreground'}
        `}
      >
        {label}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
          style={{ minWidth: '200px' }}
        >
          {React.cloneElement(children as React.ReactElement, {
            onClose: () => setOpen(false),
          })}
        </div>
      )}
    </div>
  );
};

// ── Book picker ─────────────────────────────────────────────────────────────

interface BookPickerProps {
  selectedBook: string;
  onChange: (key: string) => void;
  onClose?: () => void;
}

const BookPicker: React.FC<BookPickerProps> = ({ selectedBook, onChange, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const books = HEBREW_BOOKS_CATALOG;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = query
    ? books.filter(
        (b) =>
          b.nameSpanish.toLowerCase().includes(query.toLowerCase()) ||
          b.morphhbKey.toLowerCase().includes(query.toLowerCase()),
      )
    : books;

  return (
    <div className="flex flex-col" style={{ width: '240px', maxHeight: '320px' }}>
      <div className="p-2 border-b border-border">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar libro..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {filtered.map((b) => (
          <button
            type="button"
            key={b.morphhbKey}
            onClick={() => {
              onChange(b.morphhbKey);
              onClose?.();
            }}
            className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center transition-colors ${
              selectedBook === b.morphhbKey
                ? 'bg-primary/10 text-primary font-semibold'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <span>{b.nameSpanish}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{b.morphhbKey}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">Sin resultados</p>
        )}
      </div>
    </div>
  );
};

// ── Number grid picker (chapters / verses) ──────────────────────────────────

interface NumberPickerProps {
  total: number;
  selected: number;
  onChange: (n: number) => void;
  onClose?: () => void;
}

const NumberPicker: React.FC<NumberPickerProps> = ({ total, selected, onChange, onClose }) => {
  const cols = total > 50 ? 8 : total > 20 ? 6 : 5;
  const width = cols * 40 + 16; // 40px per cell + padding

  return (
    <div className="p-2 overflow-y-auto" style={{ maxHeight: '260px', width: `${width}px` }}>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => {
              onChange(n);
              onClose?.();
            }}
            className={`aspect-square rounded-md text-xs font-semibold flex items-center justify-center transition-all ${
              selected === n
                ? 'bg-primary text-primary-foreground shadow scale-105'
                : 'bg-muted/50 hover:bg-muted text-foreground'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Main bar ────────────────────────────────────────────────────────────────

export const VerseNavBar: React.FC<VerseNavBarProps> = ({
  selectedBook,
  selectedChapter,
  selectedVerse,
  bookIndex,
  isLoadingIndex,
  isAnalyzing,
  onBookChange,
  onChapterChange,
  onVerseChange,
  onNavigate,
  onAnalyze,
  onNext,
  onPrev,
}) => {
  const { t } = useTranslation('hebrewTutor');

  const currentBookName =
    HEBREW_BOOKS_CATALOG.find((b) => b.morphhbKey === selectedBook)?.nameSpanish || 'Seleccionar Libro';

  const chapterCount = bookIndex?.versesPerChapter?.length ?? 1;
  const versesInChapter = bookIndex?.versesPerChapter?.[selectedChapter - 1] ?? 1;

  const isFirst = selectedChapter === 1 && selectedVerse === 1;
  const isLast =
    bookIndex &&
    selectedChapter === chapterCount &&
    selectedVerse === versesInChapter;

  return (
    <div className="flex items-center gap-2 flex-wrap print:hidden">
      {/* ── Quick search ── */}
      <VerseSearchInput
        onNavigate={onNavigate}
        disabled={isAnalyzing}
        placeholder="Ir a versículo…"
        inputClassName="w-44"
      />

      <div className="h-5 w-px bg-border/60 mx-1" />

      {/* ── Book ── */}
      <NavDropdown label={currentBookName} disabled={isAnalyzing}>
        <BookPicker
          selectedBook={selectedBook}
          onChange={(key) => {
            onNavigate(key, 1, 1);
          }}
        />
      </NavDropdown>

      <span className="text-muted-foreground/40 text-sm select-none">›</span>

      {/* ── Chapter ── */}
      <NavDropdown
        label={`Cap. ${selectedChapter}`}
        disabled={isAnalyzing || isLoadingIndex || !bookIndex}
      >
        <NumberPicker
          total={chapterCount}
          selected={selectedChapter}
          onChange={(ch) => {
            onNavigate(selectedBook, ch, 1);
          }}
        />
      </NavDropdown>

      <span className="text-muted-foreground/40 text-sm select-none">›</span>

      {/* ── Verse ── */}
      <NavDropdown
        label={`v. ${selectedVerse}`}
        disabled={isAnalyzing || isLoadingIndex || !bookIndex}
      >
        <NumberPicker
          total={versesInChapter}
          selected={selectedVerse}
          onChange={(v) => {
            onNavigate(selectedBook, selectedChapter, v);
          }}
        />
      </NavDropdown>

      {/* ── Divider ── */}
      <div className="h-5 w-px bg-border/60 mx-1" />

      {/* ── Prev / Next ── */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst || isAnalyzing || isLoadingIndex || !bookIndex}
          title="Versículo anterior"
          className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!!isLast || isAnalyzing || isLoadingIndex || !bookIndex}
          title="Versículo siguiente"
          className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* ── Divider ── */}
      <div className="h-5 w-px bg-border/60 mx-1" />

      {/* ── Analyze ── */}
      <button
        type="button"
        id="ht-analyze-btn"
        onClick={onAnalyze}
        disabled={isAnalyzing || isLoadingIndex || !selectedBook}
        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? (
          <>
            <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
            {t('verseAnalyzer.analyzing', { defaultValue: 'Analizando...' })}
          </>
        ) : isLoadingIndex ? (
          <>
            <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
            Cargando...
          </>
        ) : selectedBook ? (
          <>
            <SparklesIcon className="w-3.5 h-3.5" />
            {currentBookName} {selectedChapter}:{selectedVerse}
          </>
        ) : (
          <>
            <SparklesIcon className="w-3.5 h-3.5" />
            {t('verseAnalyzer.analyze', { defaultValue: 'Analizar' })}
          </>
        )}
      </button>
    </div>
  );
};
