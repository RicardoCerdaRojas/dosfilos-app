import React from 'react';
import { useTranslation } from '@/i18n';
import { BookOpen, Sparkles, ArrowRight, Star } from 'lucide-react';

interface EmptyStateProps {
    onCreateNew: () => void;
    onQuickStart?: (passage: string) => void;
}

interface PassagePreview {
    reference: string;
    description: string;
    /** First clause of the passage in Greek (SBLGNT). Surfaces the actual
     *  texture of what the user will study — premium move vs generic
     *  description-only cards. */
    greek: string;
}

const FEATURED: PassagePreview = {
    reference: 'Juan 3:16',
    description: 'Porque de tal manera amó Dios...',
    greek: 'Οὕτως γὰρ ἠγάπησεν ὁ θεὸς τὸν κόσμον',
};

const SECONDARY_PASSAGES: PassagePreview[] = [
    { reference: 'Juan 1:1-5', description: 'El Verbo se hizo carne', greek: 'ἐν ἀρχῇ ἦν ὁ λόγος' },
    { reference: 'Romanos 8:1-4', description: 'Ninguna condenación', greek: 'οὐδὲν ἄρα νῦν κατάκριμα' },
    { reference: '1 Corintios 13:1-3', description: 'El amor es...', greek: 'ἐὰν ταῖς γλώσσαις τῶν ἀνθρώπων λαλῶ' },
    { reference: 'Filipenses 2:5-11', description: 'El himno de Cristo', greek: 'τοῦτο φρονεῖτε ἐν ὑμῖν' },
    { reference: 'Hebreos 1:1-4', description: 'Dios habla por su Hijo', greek: 'πολυμερῶς καὶ πολυτρόπως' },
];

const METHODOLOGY_STEPS = [
    'Lectura',
    'Sintaxis',
    'Morfología',
    'Reconocimiento',
    'Función',
    'Insight',
];

/**
 * Premium empty state for the Greek Tutor sessions dashboard.
 *
 * Asymmetric editorial layout (left = brand narrative + methodology;
 * right = passage menu with featured + secondary). Uses real Greek
 * text snippets per passage so the user sees the texture of what
 * they're about to study. Decorative Α (alpha) at low opacity
 * anchors the page identity without coming from a noisy gradient.
 *
 * Brand-aligned: primary token throughout, serif typography for
 * editorial moments, no hardcoded blue/purple/indigo.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateNew: _onCreateNew, onQuickStart }) => {
    const { t } = useTranslation('greekTutor');

    return (
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 py-8">
            {/* ── LEFT — editorial brand composition ─────────────────── */}
            <div className="lg:col-span-5 relative">
                {/* Decorative Greek alpha — anchors page identity at
                    very low contrast so it reads as texture, not chrome. */}
                <span
                    aria-hidden
                    className="absolute -top-6 -left-3 font-serif text-[180px] leading-none text-primary/[0.08] select-none pointer-events-none"
                >
                    Α
                </span>

                <div className="relative">
                    <div className="inline-flex items-center gap-2 mb-5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary">
                        <span className="w-6 h-px bg-primary/60" />
                        {t('emptyState.eyebrow')}
                    </div>

                    <h2 className="font-serif text-[34px] md:text-[40px] leading-[1.05] tracking-[-0.02em] text-foreground mb-5">
                        {t('emptyState.title')}
                    </h2>

                    <p className="text-[15px] leading-relaxed text-muted-foreground mb-6 max-w-md">
                        {t('emptyState.body')}
                    </p>

                    <div className="space-y-2 max-w-md">
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            {t('emptyState.methodologyLabel')}
                        </p>
                        <p className="text-[13px] text-foreground/80 leading-relaxed">
                            {METHODOLOGY_STEPS.map((step, i) => (
                                <React.Fragment key={step}>
                                    <span className="font-medium text-foreground">{step}</span>
                                    {i < METHODOLOGY_STEPS.length - 1 && (
                                        <span className="text-muted-foreground/60 mx-1.5" aria-hidden>
                                            →
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── RIGHT — passage menu ───────────────────────────────── */}
            <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        {t('emptyState.suggestedPassages')}
                    </h3>
                    <Sparkles className="w-3.5 h-3.5 text-primary/60" aria-hidden />
                </div>

                {onQuickStart && (
                    <>
                        {/* Featured card — visual hierarchy: largest, with
                            subtle primary tint + Greek text inline. */}
                        <button
                            onClick={() => onQuickStart(FEATURED.reference)}
                            className="group w-full text-left rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent hover:border-primary/50 hover:shadow-md transition-all p-5 md:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                                    <Star className="w-3 h-3 fill-current" />
                                    {t('emptyState.featuredBadge')}
                                </span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                            </div>
                            <h4 className="font-serif text-2xl md:text-[26px] font-bold text-foreground mb-1 leading-tight">
                                {FEATURED.reference}
                            </h4>
                            <p className="text-sm text-muted-foreground italic mb-4">
                                "{FEATURED.description}"
                            </p>
                            <p
                                className="font-serif text-base md:text-lg text-primary/85 leading-relaxed"
                                lang="grc"
                            >
                                {FEATURED.greek}
                            </p>
                        </button>

                        {/* Secondary grid — compact, with greek inline.
                            Each card a 1-click session start. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {SECONDARY_PASSAGES.map((p) => (
                                <button
                                    key={p.reference}
                                    onClick={() => onQuickStart(p.reference)}
                                    className="group p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                        <span className="font-serif font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                            {p.reference}
                                        </span>
                                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground italic mb-1 truncate">
                                        {p.description}
                                    </p>
                                    <p
                                        className="font-serif text-[13px] text-primary/75 leading-tight truncate"
                                        lang="grc"
                                    >
                                        {p.greek}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Tip — minimal, footer-style note. No box, just an
                    italic line so it reads as commentary not a banner. */}
                <p className="text-[11.5px] text-muted-foreground italic flex items-start gap-2 pt-3 border-t border-border">
                    <Sparkles className="w-3 h-3 text-warning shrink-0 mt-0.5" aria-hidden />
                    {t('emptyState.tipBody')}
                </p>
            </div>
        </div>
    );
};
