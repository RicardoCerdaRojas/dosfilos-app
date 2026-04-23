import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { HEBREW_BOOKS_CATALOG } from '@dosfilos/infrastructure';
import type { HebrewBook } from '@dosfilos/domain';

interface ParsedRef {
  bookKey: string;
  bookName: string;
  nameHebrew: string;
  chapter: number;
  verse: number;
}

function parseRef(input: string, books: HebrewBook[]): ParsedRef[] {
  const cleaned = input.trim();
  if (cleaned.length < 2) return [];

  // Match: "book name" or "book name chapter" or "book name chapter:verse"
  const m = cleaned.match(/^(.*?)(?:\s+(\d+)(?:[:.,\s](\d+))?)?$/);
  if (!m) return [];

  const [, bookPart = '', chapStr, verseStr] = m;
  const chapter = chapStr ? parseInt(chapStr, 10) : undefined;
  const verse = verseStr ? parseInt(verseStr, 10) : undefined;
  const q = bookPart.trim().toLowerCase();

  if (!q) return [];

  return books
    .filter(
      (b) =>
        b.nameSpanish.toLowerCase().startsWith(q) ||
        b.nameEnglish.toLowerCase().startsWith(q) ||
        b.abbreviation.toLowerCase().startsWith(q) ||
        b.morphhbKey.toLowerCase().startsWith(q),
    )
    .slice(0, 6)
    .map((b) => {
      const ch = chapter && chapter >= 1 && chapter <= b.chapterCount ? chapter : 1;
      const v = verse && verse >= 1 ? verse : 1;
      return { bookKey: b.morphhbKey, bookName: b.nameSpanish, nameHebrew: b.nameHebrew, chapter: ch, verse: v };
    });
}

interface VerseSearchInputProps {
  onNavigate: (book: string, chapter: number, verse: number) => void;
  disabled?: boolean;
  placeholder?: string;
  inputClassName?: string;
}

export const VerseSearchInput: React.FC<VerseSearchInputProps> = ({
  onNavigate,
  disabled,
  placeholder = 'Ir a versículo…',
  inputClassName = '',
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => parseRef(query, HEBREW_BOOKS_CATALOG), [query]);

  useEffect(() => {
    setActiveIdx(0);
    setOpen(suggestions.length > 0 && query.length >= 2);
  }, [suggestions, query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (s: ParsedRef) => {
    setQuery('');
    setOpen(false);
    onNavigate(s.bookKey, s.chapter, s.verse);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = suggestions[activeIdx];
      if (selected) select(selected);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`pl-8 pr-7 py-1.5 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all disabled:opacity-40 placeholder:text-muted-foreground/60 ${inputClassName}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden w-72">
          {suggestions.map((s, i) => (
            <button
              key={`${s.bookKey}-${s.chapter}-${s.verse}`}
              type="button"
              onClick={() => select(s)}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors text-sm ${
                i === activeIdx ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
              }`}
            >
              <div>
                <span className="font-semibold">{s.bookName}</span>
                <span className="text-muted-foreground ml-1">
                  {s.chapter}:{s.verse}
                </span>
              </div>
              <span
                className="text-base font-hebrew text-muted-foreground/60 shrink-0"
                dir="rtl"
                lang="he"
              >
                {s.nameHebrew}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
