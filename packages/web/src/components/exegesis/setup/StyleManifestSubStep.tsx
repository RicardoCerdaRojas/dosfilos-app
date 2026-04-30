import { useMemo } from 'react';
import {
    BookOpen,
    CheckCircle2,
    FileWarning,
    Loader2,
    Quote,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
    ExegeticalPaper,
    StyleGuideManifest,
    UserStyleGuide,
} from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useUserStyleGuides } from '@/hooks/exegesis/useUserStyleGuides';

/**
 * Style guide manifest viewer + extractor trigger.
 *
 * Three states:
 *   1. **No active guide** — surfaces a hint pointing the student to
 *      upload a guide from their profile / library. Nothing to
 *      extract until there's a corpus.
 *   2. **Guide present, manifest absent** — empty-state card with
 *      "Extract rules now" CTA. Single click runs the Gemini
 *      manifest extractor; the resulting structured rules persist
 *      on the guide.
 *   3. **Guide + manifest present** — read-only viewer organized
 *      into footnotes / bibliography / quotations / transliteration
 *      / additional rules / extractor notes. Re-extract button
 *      with confirmation lets the student refresh if they tweaked
 *      the underlying guide or want a different language.
 *
 * Editing individual manifest fields is deferred to a follow-up
 * (most students will accept the extracted rules verbatim; editing
 * is the long-tail).
 */
interface StyleManifestSubStepProps {
    paper: ExegeticalPaper;
}

export function StyleManifestSubStep({ paper }: StyleManifestSubStepProps) {
    const { t } = useTranslation('exegesis');
    const { guides, activeGuide } = useUserStyleGuides();

    // The paper may pin a specific guide via `paper.styleGuideId`. If
    // it does, prefer that one; otherwise fall back to the user's
    // currently-active guide. Same resolution the orchestrator uses.
    const guide = useMemo<UserStyleGuide | null>(() => {
        if (paper.styleGuideId) {
            return guides.find(g => g.id === paper.styleGuideId) ?? null;
        }
        return activeGuide;
    }, [paper.styleGuideId, guides, activeGuide]);

    return (
        <div className="space-y-4">
            <header className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {t('paperSetup.subSteps.manifest.heading')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('paperSetup.subSteps.manifest.description')}
                    </p>
                </div>
            </header>

            {!guide && <NoGuideState />}
            {guide && !guide.manifest && <NoManifestState guide={guide} paper={paper} />}
            {guide && guide.manifest && <ManifestViewer guide={guide} paper={paper} />}
        </div>
    );
}

// ── States ─────────────────────────────────────────────────────────────

function NoGuideState() {
    const { t } = useTranslation('exegesis');
    return (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
            <FileWarning className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
                {t('paperSetup.subSteps.manifest.noGuide')}
            </p>
        </div>
    );
}

function NoManifestState({ guide, paper }: { guide: UserStyleGuide; paper: ExegeticalPaper }) {
    const { t } = useTranslation('exegesis');
    const { extractManifest } = useUserStyleGuides();

    const handleExtract = async () => {
        try {
            await extractManifest.mutateAsync({
                guideId: guide.id,
                language: paper.displayLanguage,
            });
            toast.success(t('paperSetup.subSteps.manifest.noManifest.extracted'));
        } catch (err: any) {
            console.error('[exegesis] extract manifest failed:', err);
            const isOverload = err?.isExegesisOverload === true;
            const corpusEmpty = typeof err?.message === 'string' && err.message.includes('no extracted text');
            toast.error(
                isOverload
                    ? t('paperSetup.subSteps.manifest.noManifest.overloaded')
                    : corpusEmpty
                        ? t('paperSetup.subSteps.manifest.noManifest.corpusNotReady')
                        : t('paperSetup.subSteps.manifest.noManifest.failed'),
            );
        }
    };

    return (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10 p-4 space-y-3">
            <header className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                    <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                        {t('paperSetup.subSteps.manifest.noManifest.title')}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                        {t('paperSetup.subSteps.manifest.noManifest.body')}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-2">
                        <strong>{guide.displayName}</strong>{guide.version ? ` · v${guide.version}` : ''}
                    </p>
                </div>
            </header>
            <div className="flex justify-end">
                <Button
                    type="button"
                    onClick={handleExtract}
                    disabled={extractManifest.isPending}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs"
                >
                    {extractManifest.isPending ? (
                        <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            {t('paperSetup.subSteps.manifest.noManifest.extracting')}
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            {t('paperSetup.subSteps.manifest.noManifest.extractCta')}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

// ── Manifest viewer ────────────────────────────────────────────────────

function ManifestViewer({ guide, paper }: { guide: UserStyleGuide; paper: ExegeticalPaper }) {
    const { t } = useTranslation('exegesis');
    const { extractManifest } = useUserStyleGuides();
    const manifest = guide.manifest!;

    const handleReExtract = async () => {
        if (!window.confirm(t('paperSetup.subSteps.manifest.card.reExtractConfirm'))) return;
        try {
            await extractManifest.mutateAsync({
                guideId: guide.id,
                language: paper.displayLanguage,
            });
            toast.success(t('paperSetup.subSteps.manifest.noManifest.extracted'));
        } catch (err: any) {
            console.error('[exegesis] re-extract manifest failed:', err);
            const isOverload = err?.isExegesisOverload === true;
            toast.error(
                isOverload
                    ? t('paperSetup.subSteps.manifest.noManifest.overloaded')
                    : t('paperSetup.subSteps.manifest.noManifest.failed'),
            );
        }
    };

    return (
        <div className="space-y-4">
            <ManifestHeaderCard
                guide={guide}
                manifest={manifest}
                onReExtract={handleReExtract}
                reExtracting={extractManifest.isPending}
            />
            <FootnotesSection manifest={manifest} />
            <BibliographySection manifest={manifest} />
            <QuotationsSection manifest={manifest} />
            <TransliterationSection manifest={manifest} />
            <AdditionalRulesSection manifest={manifest} />
            {manifest.extractionNotes.length > 0 && <ExtractionNotesSection manifest={manifest} />}
        </div>
    );
}

function ManifestHeaderCard({
    guide,
    manifest,
    onReExtract,
    reExtracting,
}: {
    guide: UserStyleGuide;
    manifest: StyleGuideManifest;
    onReExtract: () => void;
    reExtracting: boolean;
}) {
    const { t } = useTranslation('exegesis');
    const confidenceLabel = t(`paperSetup.subSteps.manifest.card.confidence.${manifest.confidence}`);
    const confidenceTone = manifest.confidence === 'high'
        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
        : manifest.confidence === 'medium'
            ? 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30'
            : 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30';

    return (
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
                    {t('paperSetup.subSteps.manifest.card.citationStyleLabel')}
                </p>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                    {manifest.citationStyleLabel}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <strong>{guide.displayName}</strong>{guide.version ? ` · v${guide.version}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                        {t('paperSetup.subSteps.manifest.card.extractedAt')}:{' '}
                        <strong>{formatDate(manifest.extractedAt)}</strong>
                    </span>
                    {manifest.extractorModelId && (
                        <span>
                            {t('paperSetup.subSteps.manifest.card.model')}: <strong>{manifest.extractorModelId}</strong>
                        </span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${confidenceTone}`}>
                        {t('paperSetup.subSteps.manifest.card.confidence.label')}: {confidenceLabel}
                    </span>
                </div>
            </div>
            <Button
                type="button"
                variant="ghost"
                onClick={onReExtract}
                disabled={reExtracting}
                className="text-xs"
            >
                {reExtracting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                )}
                {t('paperSetup.subSteps.manifest.card.reExtract')}
            </Button>
        </div>
    );
}

function FootnotesSection({ manifest }: { manifest: StyleGuideManifest }) {
    const { t } = useTranslation('exegesis');
    return (
        <section className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2">
                <Quote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t('paperSetup.subSteps.manifest.footnotes.title')}
            </h3>
            <FieldRow label={t('paperSetup.subSteps.manifest.footnotes.firstMention')} value={<code className="text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{manifest.footnotes.firstMentionTemplate}</code>} />
            <FieldRow label={t('paperSetup.subSteps.manifest.footnotes.subsequentMention')} value={<code className="text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{manifest.footnotes.subsequentMentionTemplate}</code>} />
            <div className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                {manifest.footnotes.ibid.enabled ? (
                    <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>
                            {t('paperSetup.subSteps.manifest.footnotes.ibidEnabled')} ({manifest.footnotes.ibid.label})
                        </span>
                    </>
                ) : (
                    <>
                        <FileWarning className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{t('paperSetup.subSteps.manifest.footnotes.ibidDisabled')}</span>
                    </>
                )}
            </div>
            {manifest.footnotes.ibid.enabled && manifest.footnotes.ibid.allowPageOverride && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    {t('paperSetup.subSteps.manifest.footnotes.ibidPageOverride')}
                </p>
            )}

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
                    {t('paperSetup.subSteps.manifest.footnotes.examplesTitle')}
                </p>
                {manifest.footnotes.examples.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                        {t('paperSetup.subSteps.manifest.footnotes.exampleEmpty')}
                    </p>
                ) : (
                    <ul className="space-y-1.5">
                        {manifest.footnotes.examples.map((ex, i) => (
                            <li key={i} className="text-xs">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">{ex.label}:</span>{' '}
                                <span className="font-serif text-slate-800 dark:text-slate-100">{ex.rendered}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

function BibliographySection({ manifest }: { manifest: StyleGuideManifest }) {
    const { t } = useTranslation('exegesis');
    return (
        <section className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('paperSetup.subSteps.manifest.bibliography.title')}
            </h3>
            <FieldRow
                label={t('paperSetup.subSteps.manifest.bibliography.entryTemplate')}
                value={<code className="text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{manifest.bibliography.entryTemplate}</code>}
            />
            <FieldRow
                label={t('paperSetup.subSteps.manifest.bibliography.sortByLabel')}
                value={<span>{t(`paperSetup.subSteps.manifest.bibliography.sortBy.${manifest.bibliography.sortBy}`)}</span>}
            />
            <p className="text-xs text-slate-600 dark:text-slate-300">
                {manifest.bibliography.useDashForRepeatedAuthors
                    ? t('paperSetup.subSteps.manifest.bibliography.useDashTrue')
                    : t('paperSetup.subSteps.manifest.bibliography.useDashFalse')}
            </p>
        </section>
    );
}

function QuotationsSection({ manifest }: { manifest: StyleGuideManifest }) {
    const { t } = useTranslation('exegesis');
    return (
        <section className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('paperSetup.subSteps.manifest.quotations.title')}
            </h3>
            <FieldRow
                label={t('paperSetup.subSteps.manifest.quotations.blockThreshold')}
                value={<span>{t('paperSetup.subSteps.manifest.quotations.blockThresholdValue', { count: manifest.quotations.blockQuoteThresholdWords })}</span>}
            />
            <FieldRow
                label={t('paperSetup.subSteps.manifest.quotations.primaryQuoteMark')}
                value={<code className="text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{manifest.quotations.primaryQuoteMark}</code>}
            />
            <FieldRow
                label={t('paperSetup.subSteps.manifest.quotations.secondaryQuoteMark')}
                value={<code className="text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{manifest.quotations.secondaryQuoteMark}</code>}
            />
            <FieldRow
                label={t('paperSetup.subSteps.manifest.quotations.ellipsis')}
                value={<code className="text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{manifest.quotations.ellipsis}</code>}
            />
            <FieldRow
                label={t('paperSetup.subSteps.manifest.quotations.interpolationBrackets')}
                value={<code className="text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{manifest.quotations.interpolationBrackets}</code>}
            />
        </section>
    );
}

function TransliterationSection({ manifest }: { manifest: StyleGuideManifest }) {
    const { t } = useTranslation('exegesis');
    if (!manifest.transliteration) {
        return (
            <section className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t('paperSetup.subSteps.manifest.transliteration.title')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {t('paperSetup.subSteps.manifest.transliteration.none')}
                </p>
            </section>
        );
    }
    const tr = manifest.transliteration;
    return (
        <section className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('paperSetup.subSteps.manifest.transliteration.title')}
            </h3>
            <FieldRow
                label={t('paperSetup.subSteps.manifest.transliteration.scheme')}
                value={<span>{tr.scheme}</span>}
            />
            <p className="text-xs text-slate-600 dark:text-slate-300">
                {tr.useDiacritics
                    ? t('paperSetup.subSteps.manifest.transliteration.useDiacriticsTrue')
                    : t('paperSetup.subSteps.manifest.transliteration.useDiacriticsFalse')}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
                {tr.bodyRequiresTransliteration
                    ? t('paperSetup.subSteps.manifest.transliteration.bodyRequired')
                    : t('paperSetup.subSteps.manifest.transliteration.bodyOptional')}
            </p>
        </section>
    );
}

function AdditionalRulesSection({ manifest }: { manifest: StyleGuideManifest }) {
    const { t } = useTranslation('exegesis');
    return (
        <section className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('paperSetup.subSteps.manifest.additionalRules.title')}
            </h3>
            {manifest.additionalRules.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {t('paperSetup.subSteps.manifest.additionalRules.empty')}
                </p>
            ) : (
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {manifest.additionalRules.map((rule, i) => (
                        <li key={i}>{rule}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function ExtractionNotesSection({ manifest }: { manifest: StyleGuideManifest }) {
    const { t } = useTranslation('exegesis');
    return (
        <section className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                {t('paperSetup.subSteps.manifest.extractionNotes.title')} ({manifest.extractionNotes.length})
            </h3>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800 dark:text-amber-200">
                {manifest.extractionNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                ))}
            </ul>
        </section>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 min-w-[110px]">{label}:</span>
            <div className="flex-1 min-w-0 text-slate-800 dark:text-slate-100">{value}</div>
        </div>
    );
}

function formatDate(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}
