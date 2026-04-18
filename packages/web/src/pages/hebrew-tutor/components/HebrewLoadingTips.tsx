/**
 * HebrewLoadingTips
 *
 * Premium loading screen displayed while Gemini processes the verse analysis.
 *
 * Visual elements:
 *  1. Animated Hebrew phrase (כֹּה אָמַר יְהוָה) with a "typewriter + glow" effect
 *  2. Cycling progress messages with fade transitions
 *  3. A curated Farfán grammar tip with structured layout
 */

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpenIcon, SparklesIcon, RefreshCwIcon } from 'lucide-react';
import { FARFAN_CHUNKS } from '@dosfilos/infrastructure';

// ── Hebrew phrase typewriter ──────────────────────────────────────────────────

/** Characters of כֹּה אָמַר יְהוָה (revealed RTL, character by character) */
const HEBREW_PHRASE = 'כֹּה אָמַר יְהוָה';
const HEBREW_PHRASE_TRANSLATION = '«Así dice Jehová»';

function useTypewriter(text: string, intervalMs = 90): { displayed: string; done: boolean } {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const timer = setInterval(() => {
      setIndex((prev) => {
        if (prev >= text.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [text, intervalMs]);

  return { displayed: text.slice(0, index), done: index >= text.length };
}

// ── Pulsing orbit ring ────────────────────────────────────────────────────────

const OrbitRing: React.FC<{ delay?: string; size?: string }> = ({
  delay = '0s',
  size = 'w-16 h-16',
}) => (
  <div
    className={`absolute rounded-full border border-primary/30 ${size}`}
    style={{
      animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      animationDelay: delay,
    }}
  />
);

// ── Loading messages ──────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Consultando la gramática de Farfán...',
  'Analizando morfología trilitera...',
  'Identificando binyanim y prefijos...',
  'Desglosando construcciones sintácticas...',
  'Preparando el análisis exegético...',
  'Verificando formas verbales débiles...',
];

// ── Component ─────────────────────────────────────────────────────────────────

export const HebrewLoadingTips: React.FC = () => {
  const [tipToDisplay, setTipToDisplay] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [messageVisible, setMessageVisible] = useState(true);
  const stepRef = useRef(0);

  const { displayed, done } = useTypewriter(HEBREW_PHRASE, 85);

  const loadRandomTip = () => {
    if (FARFAN_CHUNKS && FARFAN_CHUNKS.length > 0) {
      const randomChunk = FARFAN_CHUNKS[Math.floor(Math.random() * FARFAN_CHUNKS.length)];
      setTipToDisplay(randomChunk.content);
    }
  };

  // Pick a random Farfán chunk once on mount
  useEffect(() => {
    loadRandomTip();
  }, []);

  // Cycle messages with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageVisible(false);
      setTimeout(() => {
        stepRef.current = (stepRef.current + 1) % LOADING_MESSAGES.length;
        setLoadingStep(stepRef.current);
        setMessageVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-5">

      {/* ── Animated loader card ────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/8"
        style={{ boxShadow: '0 0 40px -10px hsl(var(--primary) / 0.15)' }}
      >
        {/* Ambient glow blobs */}
        <div
          className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          style={{ animation: 'pulse 4s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl"
          style={{ animation: 'pulse 5s ease-in-out infinite', animationDelay: '1.5s' }}
        />

        <div className="relative flex flex-col items-center justify-center py-10 px-6 text-center gap-5">

          {/* Orbit rings + central Hebrew badge */}
          <div className="relative flex items-center justify-center w-20 h-20">
            <OrbitRing size="w-20 h-20" delay="0s" />
            <OrbitRing size="w-28 h-28" delay="0.8s" />

            {/* Spinning outer ring */}
            <div
              className="absolute w-16 h-16 rounded-full border-t-2 border-r-2 border-primary/60"
              style={{ animation: 'spin 2s linear infinite' }}
            />
            <div
              className="absolute w-12 h-12 rounded-full border-b-2 border-l-2 border-violet-400/40"
              style={{ animation: 'spin 3s linear infinite reverse' }}
            />

            {/* Central badge */}
            <div className="relative z-10 w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
              <SparklesIcon className="w-4 h-4 text-primary animate-pulse" />
            </div>
          </div>

          {/* Hebrew typewriter phrase */}
          <div className="space-y-1">
            <div
              className="font-hebrew text-3xl leading-relaxed tracking-wide min-h-[2.5rem]"
              dir="rtl"
              style={{
                color: done ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.8)',
                textShadow: done
                  ? '0 0 24px hsl(var(--primary) / 0.5), 0 0 8px hsl(var(--primary) / 0.3)'
                  : 'none',
                transition: 'text-shadow 0.8s ease, color 0.4s ease',
                letterSpacing: '0.05em',
              }}
            >
              {displayed}
              {/* Blinking cursor while typing */}
              {!done && (
                <span
                  className="inline-block w-0.5 h-7 bg-primary/70 ml-0.5 align-middle"
                  style={{ animation: 'blink 1s step-end infinite' }}
                />
              )}
            </div>

            {/* Translation — appears once typing is done */}
            <p
              className="text-sm italic font-medium tracking-wide bg-gradient-to-r from-muted-foreground via-primary to-muted-foreground bg-[length:200%_auto] text-transparent bg-clip-text"
              style={{
                opacity: done ? 1 : 0,
                animation: done ? 'shimmer 3s linear infinite' : 'none',
                transition: 'opacity 0.8s ease 0.3s',
              }}
            >
              {HEBREW_PHRASE_TRANSLATION}
            </p>
          </div>

          {/* Divider */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Cycling progress message */}
          <div className="space-y-1 min-h-[2.5rem]">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/60">
              Procesando Versículo
            </p>
            <p
              className="text-sm text-primary font-medium"
              style={{
                opacity: messageVisible ? 1 : 0,
                transform: messageVisible ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              {LOADING_MESSAGES[loadingStep]}
            </p>
          </div>

        </div>
      </div>

      {/* ── Farfán knowledge tip ────────────────────────────────────────── */}
      {tipToDisplay && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-amber-500/3">
          {/* Corner glow */}
          <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl -mr-8 -mt-8" />

          {/* Header */}
          <div className="relative flex items-center gap-3 px-5 pt-5 pb-3 border-b border-amber-500/15">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/12 border border-amber-500/20 shrink-0">
              <BookOpenIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 leading-tight">
                Lección de Gramática Hebrea
              </h3>
              <p className="text-[11px] text-amber-600/60 dark:text-amber-400/60">
                Farfán — mientras el análisis se procesa
              </p>
            </div>

            {/* Actions & Animated dots */}
            <div className="ml-auto flex items-center gap-3">
              <button 
                onClick={loadRandomTip}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-medium transition-colors"
                title="Mostrar otra lección"
              >
                <RefreshCwIcon className="w-3 h-3" />
                Otro consejo
              </button>
              <div className="flex gap-1 hidden sm:flex">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-amber-400/60"
                    style={{
                      animation: 'bounce 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative px-5 py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-sm prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-strong:font-semibold prose-code:text-primary prose-code:bg-primary/8 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:font-mono">
              <ReactMarkdown>{tipToDisplay}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Keyframes injected inline for portability (no Tailwind custom config needed) */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
};
