import { useCallback, useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import {
    FivePassesDiagram,
    HeritageDiagram,
    OriginalTextDiagram,
    PropositionsDiagram,
    ProblemBridgeDiagram,
    ThreeLevelsDiagram,
} from './methodology-svgs';

const STORAGE_KEY = 'expositoryMethodologyShown_v1';

/**
 * 6-step methodology presentation for the expository wizard. Renders
 * inside a dialog with an Embla carousel that gives a smooth slide
 * transition between steps. Each step is a SVG diagram + title +
 * paragraph + (optional) link.
 *
 * Open behaviour:
 *   - First visit ever: opens automatically on mount of the wizard
 *     page (handled by the parent — this component only obeys its
 *     `open` prop). Closing it persists `expositoryMethodologyShown_v1`
 *     in localStorage so the next visit doesn't auto-open.
 *   - Always available via the "Metodología" button in the wizard
 *     header (manual open).
 */
export function MethodologyPresentation({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useTranslation('series');
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        loop: false,
        skipSnaps: false,
        containScroll: 'trimSnaps',
    });
    const [selectedIndex, setSelectedIndex] = useState(0);

    const steps = useMemo<Step[]>(
        () => [
            { key: 'problem', diagram: <ProblemBridgeDiagram /> },
            { key: 'levels', diagram: <ThreeLevelsDiagram /> },
            { key: 'pipeline', diagram: <FivePassesDiagram /> },
            { key: 'output', diagram: <PropositionsDiagram /> },
            { key: 'original', diagram: <OriginalTextDiagram /> },
            { key: 'heritage', diagram: <HeritageDiagram />, hasCreditsLink: true },
        ],
        [],
    );

    // Wire Embla's selected-snap event into our local index state so
    // the dot navigation and prev/next buttons stay accurate when the
    // user swipes manually.
    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
        emblaApi.on('select', onSelect);
        onSelect();
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi]);

    // Reset to the first slide whenever the modal re-opens. Without
    // this, the second visit would land mid-presentation.
    useEffect(() => {
        if (open && emblaApi) {
            emblaApi.scrollTo(0, true);
            setSelectedIndex(0);
        }
    }, [open, emblaApi]);

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
    const scrollTo = useCallback(
        (idx: number) => emblaApi?.scrollTo(idx),
        [emblaApi],
    );

    const handleOpenChange = (next: boolean) => {
        if (!next && typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(STORAGE_KEY, 'true');
            } catch {
                // Quota / private mode — non-fatal; the presentation
                // will just auto-open again on the next visit, which
                // is acceptable degradation.
            }
        }
        onOpenChange(next);
    };

    const isLast = selectedIndex === steps.length - 1;
    const isFirst = selectedIndex === 0;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-3xl p-0 overflow-hidden gap-0"
            >
                {/* Visually-hidden title for screen readers — the
                    dialog primitive requires one for a11y. The visual
                    title lives inside each step. */}
                <DialogTitle className="sr-only">
                    {t('expository.methodology.dialogTitle')}
                </DialogTitle>

                {/* Header: progress indicator + close */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-zinc-800">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                        {t('expository.methodology.step')} {selectedIndex + 1} / {steps.length}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label={t('expository.methodology.close') as string}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Carousel */}
                <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex">
                        {steps.map((step) => (
                            <div
                                key={step.key}
                                className="min-w-0 flex-[0_0_100%] px-8 py-6"
                            >
                                <StepView step={step} t={t} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer: dots + prev/next */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-1.5">
                        {steps.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => scrollTo(i)}
                                aria-label={`${t('expository.methodology.goToStep')} ${i + 1}`}
                                aria-current={i === selectedIndex}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === selectedIndex
                                        ? 'w-6 bg-emerald-500'
                                        : 'w-1.5 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400 dark:hover:bg-zinc-600'
                                }`}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={scrollPrev}
                            disabled={isFirst}
                            className="text-slate-600 dark:text-slate-300"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            {t('expository.methodology.prev')}
                        </Button>
                        {isLast ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => handleOpenChange(false)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                            >
                                {t('expository.methodology.start')}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={scrollNext}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                            >
                                {t('expository.methodology.next')}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface Step {
    key: string;
    diagram: React.ReactNode;
    hasCreditsLink?: boolean;
}

interface StepContent {
    title: string;
    intro?: string;
    items?: Array<{ label: string; desc: string }>;
    outro?: string;
    creditsLink?: string;
}

function StepView({
    step,
    t,
}: {
    step: Step;
    t: (key: string, options?: Record<string, unknown>) => unknown;
}) {
    const content = t(`expository.methodology.steps.${step.key}`, {
        returnObjects: true,
    }) as StepContent;

    return (
        <div className="flex flex-col items-center gap-5 min-h-[420px]">
            <div className="w-full max-w-md">{step.diagram}</div>
            <div className="space-y-3 max-w-xl w-full text-left">
                <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100">
                    {content.title}
                </h3>
                {content.intro && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {content.intro}
                    </p>
                )}
                {content.items && content.items.length > 0 && (
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                        {content.items.map((item) => (
                            <li key={item.label} className="flex gap-2 leading-relaxed">
                                <span className="text-emerald-600 dark:text-emerald-400 mt-1 select-none text-xs">
                                    ◆
                                </span>
                                <span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {item.label}:
                                    </span>{' '}
                                    {item.desc}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {content.outro && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {content.outro}
                    </p>
                )}
                {step.hasCreditsLink && content.creditsLink && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                        <Link
                            to="/credits"
                            className="text-emerald-700 dark:text-emerald-300 hover:underline"
                        >
                            {content.creditsLink}
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Returns true if the methodology presentation has been shown to the
 * pastor at least once on this device. The wizard checks this on
 * mount and auto-opens the modal on first-visit.
 */
export function hasMethodologyBeenShown(): boolean {
    if (typeof window === 'undefined') return true; // SSR: don't auto-open
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return true; // private mode / quota — don't pester the user
    }
}
