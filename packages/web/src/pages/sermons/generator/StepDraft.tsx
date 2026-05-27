import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';
import { WizardLayout } from './WizardLayout';
import { DerivedContextBanner } from './DerivedContextBanner';
import { SermonPersonalizationPanel } from './SermonPersonalizationPanel';
import { IllustrationDuplicateBanner } from './IllustrationDuplicateBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, FileText, Sparkles, Eye, Upload, BookOpen, RefreshCw } from 'lucide-react';
import {
    sermonGeneratorService,
    sermonService,
    generatorChatService,
    exegesisService,
    facultyService,
    pastoralSeedService,
    type VerifySermonCitationsOutput,
} from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';
import { ContentCanvas } from '@/components/canvas-chat/ContentCanvas';
import { ChatInterface } from '@/components/canvas-chat/ChatInterface';
import { ResizableChatPanel } from '@/components/canvas-chat/ResizableChatPanel';

import { useContentHistory } from '@/hooks/useContentHistory';
import { useGeneratorChat } from '@/hooks/useGeneratorChat';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { SermonPreview } from '@/components/sermons/SermonPreview';
import { SermonBibliographySection } from '@/components/sermons/SermonBibliographySection';
import { SermonCitationVerificationDialog } from '@/components/sermons/SermonCitationVerificationDialog';
import { WorkflowPhase, CoachingStyle, formatPassageReference, aggregateRagSourcesFlat, type GenerationRules, type Sermon } from '@dosfilos/domain';
import { BibleReaderPanel } from '@/components/bible/BibleReaderPanel';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@/i18n';
import { buildFullContent } from './draft/sermonContent';
import { useDraftRefinement } from './draft/useDraftRefinement';
import { useDraftVersions } from './draft/useDraftVersions';
import { HomileticsSavedIndicator } from './homiletics/HomileticsLoadingScreen';

export function StepDraft() {
    const { t, language } = useTranslation('generator');
    const activeLanguage = language === 'en' ? 'en' : 'es';
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { homiletics, rules, setDraft, draft, setStep, exegesis, config, passage, sermonId, derivedContext, reset, saving } = useWizard();
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    // Pre-publish citation verification state (PR #218).
    // - `verificationDialogOpen` shows the gate dialog with verdicts
    //   before allowing publish to proceed.
    // - `verifying` is true while the deterministic verifier runs
    //   (<50 ms typical) — the user sees the loading variant of the
    //   dialog instead of a silent delay.
    // - `verificationResult` carries the verdicts; consumed by the
    //   dialog to render verified/fuzzy-low/not-found citations.
    const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<VerifySermonCitationsOutput | null>(null);
    const {
        messages,
        setMessages,
        isLoading: isChatLoading,
        activeContext,
        refreshContext: handleRefreshContext,
        handleSendMessage: sendGeneralMessage,
    } = useGeneratorChat({
        phase: 'sermon',
        content: draft,
        config,
        user,
        sermonId,
    });

    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
    const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
    const [showPreview, setShowPreview] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<CoachingStyle | 'auto'>('auto');
    const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'bible'>('chat');

    const contentHistory = useContentHistory('sermon', config?.id);

    const getSectionVersions = (sectionId: string) => contentHistory.getVersions(sectionId);
    const getCurrentVersionId = (sectionId: string) => contentHistory.getCurrentVersion(sectionId)?.id;

    const handleGenerate = async () => {
        if (!homiletics) return;

        setLoading(true);
        try {
            const baseConfig = config ? config[WorkflowPhase.DRAFTING] : undefined;
            const draftConfig = baseConfig
                ? {
                      ...baseConfig,
                      aiModel: config?.advanced?.aiModel,
                      temperature:
                          config?.[WorkflowPhase.DRAFTING]?.temperature || config?.advanced?.globalTemperature,
                  }
                : undefined;

            // T3 #16 Fase 1+2 — preserve provenance context across
            // regenerations. Paper context (full assembledMarkdown) for
            // paper-derived sermons; Faculty outline for Faculty-derived;
            // project contextNote for any sermon belonging to a project.
            // Blocks stack: a paper-derived sermon inside a project gets
            // both context blocks prepended. Best-effort: any failure
            // falls back to the un-augmented rules.
            const withPaper = await augmentRulesWithPaperContext(rules, derivedContext, user?.uid);
            const withFaculty = augmentRulesWithFacultyContext(withPaper, derivedContext);
            const withProject = await augmentRulesWithProjectContext(withFaculty, sermonId, user?.uid);
            // Pastoral Fidelity Phase 1 — when the sermon was seeded
            // through the six-step spine, the seed becomes PRIMARY VOICE
            // of the prompt. Seed has higher priority than paper/Faculty
            // context (those merely fed pre-fill suggestions; the seed
            // is the pastor's confirmed output).
            const rulesWithContext = await augmentRulesWithPastoralSeed(withProject, sermonId);

            const { draft: result } = await sermonGeneratorService.generateSermonDraft(
                homiletics,
                rulesWithContext,
                draftConfig,
                user?.uid,
                activeLanguage,
            );

            // Post-generation verbatim check: the prompt instructs the
            // LLM to include the pastor's centralIdea verbatim. If it
            // didn't, surface a warning so the pastor can decide whether
            // to re-generate or edit by hand. NO auto-regen (violates P2).
            const centralIdea = rulesWithContext.pastoralSeed?.centralIdea?.trim();
            if (centralIdea && !draftIncludesCentralIdea(result, centralIdea)) {
                toast.warning(
                    'El borrador NO incluye tu idea central palabra-por-palabra. Revisa, re-genera o edítalo a mano.',
                    { duration: 8000 },
                );
            }

            setDraft(result);
            toast.success(t('drafting.success.generated'));
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('drafting.errors.generating'));
        } finally {
            setLoading(false);
        }
    };

    const getFullContent = () => buildFullContent(draft, t);

    const handleSaveAndExit = async () => {
        toast.success(t('drafting.success.saved'));
        navigate('/dashboard');
    };

    /**
     * Pre-publish gate (PR #218 — sermon audit Tier 2).
     *
     * Runs the citation verifier against the current draft + sermon
     * source corpus (paper or Faculty conversation). Three outcomes:
     *   - All quotes verified → dialog shows "todo verificado", user
     *     confirms "Publicar ahora" → calls performPublish().
     *   - Has not-found / fuzzy-low → dialog lists offending citations,
     *     user chooses "Editar sermón" (cancel) or "Publicar de todos
     *     modos" (proceed with explicit consent).
     *   - Source unavailable (no paper, no Faculty origin) → dialog
     *     shows "unavailable" notice; user can publish or cancel.
     *
     * Verification is fast (<50 ms — deterministic substring + Jaccard,
     * no LLM call per citation), so the UX overhead is negligible vs
     * the credibility risk of unflagged fabricated quotes reaching the
     * pulpit.
     */
    const handlePublish = async () => {
        if (!draft || !user || !exegesis || !sermonId) {
            toast.error(t('drafting.errors.noDraft'));
            return;
        }
        setVerificationDialogOpen(true);
        setVerifying(true);
        setVerificationResult(null);
        try {
            const result = await exegesisService.verifySermonCitations.execute({
                ownerId: user.uid,
                sermonId,
            });
            setVerificationResult(result);
        } catch (error: any) {
            console.error('[StepDraft] citation verification failed', error);
            // On verifier failure, allow the user to publish anyway —
            // verification is a safety net, not a hard gate. We show
            // the dialog in its empty/unavailable state so the user
            // sees the warning + confirms.
            setVerificationResult({
                sourceKind: null,
                sourceCorpusLength: 0,
                citations: [],
            });
        } finally {
            setVerifying(false);
        }
    };

    const performPublish = async () => {
        if (!draft || !user || !exegesis || !sermonId) return;
        setVerificationDialogOpen(false);
        setPublishing(true);
        try {
            const content = getFullContent();
            await sermonService.updateSermon(sermonId, {
                title: draft.title,
                content,
                bibleReferences: [exegesis.passage],
                tags: exegesis.keyWords.map((kw) => kw.original),
            });

            const publishedSermon = await sermonService.publishSermonAsCopy(sermonId);

            toast.success(t('drafting.success.published'));
            reset();
            navigate(`/dashboard/sermons/${publishedSermon.id}`);
        } catch (error: any) {
            console.error(error);
            toast.error(t('drafting.errors.publishing'));
        } finally {
            setPublishing(false);
        }
    };

    const { isAiProcessing, handleSendMessage } = useDraftRefinement({
        draft,
        setDraft,
        expandedSectionId,
        setMessages,
        setModifiedSections,
        sendGeneralMessage,
        contentHistory,
        config,
        rules,
        homiletics,
        exegesis,
        passage,
    });

    const isTotalAiLoading = isAiProcessing || isChatLoading;

    const { handleUndo, handleRedo, handleRestoreVersion, handleSectionUpdate } = useDraftVersions({
        draft,
        setDraft,
        contentHistory,
        setModifiedSections,
    });

    const handleApplyChange = (messageId: string, newContent: any) => {
        setDraft(newContent);
        setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, appliedChange: true } : msg)));
    };

    const handleContentUpdate = (newContent: any) => {
        setDraft(newContent);
    };

    if (!homiletics) {
        return <div>{t('drafting.errors.noHomiletics')}</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">{t('drafting.loading')}</p>
                    <p className="text-sm text-muted-foreground">{t('drafting.loadingSub')}</p>
                </div>
            </div>
        );
    }

    const leftPanel = !draft ? (
        // overflow-y-auto so the "Generar Borrador" CTA stays reachable
        // when SermonPersonalizationPanel is expanded — without scroll
        // the panel's accordion body pushes the button below the
        // viewport with no way to reach it short of collapsing the panel.
        <div className="h-full flex flex-col overflow-y-auto">
            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">{t('drafting.title')}</h2>
                </div>
                <p className="text-muted-foreground">{t('drafting.subtitle')}</p>
            </div>

            <Card className="p-6 space-y-4 bg-muted/50 mb-6">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    {t('drafting.homileticalProposition')}
                </h3>
                <div className="text-lg font-medium italic">
                    <MarkdownRenderer content={homiletics.homileticalProposition} />
                </div>

                {homiletics.outline?.mainPoints && homiletics.outline.mainPoints.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                            {t('drafting.outlinePoints')}
                        </h4>
                        <ul className="space-y-1.5 text-sm">
                            {homiletics.outline.mainPoints.map((point: any, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">▪</span>
                                    <span className="text-foreground/90">{point.title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Card>

            <div className="mb-6">
                <SermonPersonalizationPanel />
            </div>

            <Card className="p-6 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('drafting.readyToGenerate')}</h3>
                        <p className="text-sm text-muted-foreground">{t('drafting.readyDesc')}</p>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} size="lg" className="w-full max-w-md mx-auto">
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t('drafting.generateBtn')}
                    </Button>
                </div>
            </Card>
        </div>
    ) : (
        <div className="flex flex-col gap-4 overflow-hidden p-4" style={{ height: 'calc(100vh - 130px)' }}>
            <IllustrationDuplicateBanner draft={draft} />
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    <div className="mb-4 flex-shrink-0 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">{draft.title}</h3>
                            <p className="text-sm text-muted-foreground">
                                {expandedSectionId ? t('drafting.refiningStatus') : t('drafting.defaultStatus')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 bg-background border-primary/20 text-primary hover:text-primary hover:bg-primary/5"
                                onClick={() => setRightPanelMode((prev) => (prev === 'bible' ? 'chat' : 'bible'))}
                            >
                                <BookOpen className="h-4 w-4" />
                                <span className="text-xs font-medium">{passage}</span>
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t('drafting.regeneratingBtn')}
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                {t('drafting.regenerateBtn')}
                                            </>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('drafting.regenerateConfirm.title')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('drafting.regenerateConfirm.description')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('drafting.regenerateConfirm.cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleGenerate}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {t('drafting.regenerateConfirm.confirm')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ContentCanvas
                            content={draft}
                            contentType="sermon"
                            expandedSectionId={expandedSectionId}
                            onSectionExpand={(sectionId) => {
                                setExpandedSectionId(sectionId);
                                setMessages([]);
                            }}
                            onSectionClose={() => {
                                setExpandedSectionId(null);
                                setMessages([]);
                            }}
                            onSectionUndo={handleUndo}
                            onSectionRedo={handleRedo}
                            canRedo={(sectionId) => contentHistory.canRedo(sectionId)}
                            getSectionVersions={getSectionVersions}
                            getCurrentVersionId={getCurrentVersionId}
                            onRestoreVersion={handleRestoreVersion}
                            modifiedSections={modifiedSections}
                            onSectionUpdate={handleSectionUpdate}
                            onRegenerate={async (sectionId, itemIndex) => {
                                if (sectionId === 'body' && typeof itemIndex === 'number' && draft.body[itemIndex]) {
                                    const pointToRegenerate = draft.body[itemIndex];
                                    const toastId = toast.loading(t('drafting.loadingRegeneratePoint'));
                                    try {
                                        const result = await generatorChatService.regenerateSermonPoint(
                                            pointToRegenerate,
                                            {
                                                sermonTitle: draft.title,
                                                homileticalProposition: homiletics.homileticalProposition,
                                                tone: rules.tone,
                                                customInstructions: rules.customInstructions,
                                                libraryResources: [],
                                                aiModel: config?.advanced?.aiModel,
                                                temperature:
                                                    config?.[WorkflowPhase.DRAFTING]?.temperature ||
                                                    config?.advanced?.globalTemperature,
                                            },
                                        );

                                        const newBody = [...draft.body];
                                        newBody[itemIndex] = result.point;
                                        await handleSectionUpdate('body', newBody);

                                        if (result.sources && result.sources.length > 0) {
                                            toast.success(
                                                t('drafting.success.generatedWithSources', { count: result.sources.length }),
                                                { id: toastId, duration: 4000 },
                                            );
                                        } else {
                                            toast.success(t('drafting.success.regeneratedPoint'), { id: toastId });
                                        }
                                    } catch (error) {
                                        console.error('Failed to regenerate point:', error);
                                        toast.error(t('drafting.errors.regeneratingPoint'), { id: toastId });
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <ResizableChatPanel storageKey="draftChatWidth">
                    {rightPanelMode === 'bible' && exegesis ? (
                        <BibleReaderPanel passage={exegesis.passage} onClose={() => setRightPanelMode('chat')} />
                    ) : (
                        <ChatInterface
                            messages={messages}
                            contentType="sermon"
                            content={draft}
                            selectedText=""
                            onSendMessage={handleSendMessage}
                            onApplyChange={handleApplyChange}
                            onContentUpdate={handleContentUpdate}
                            focusedSection={expandedSectionId}
                            disableDefaultAI={true}
                            externalIsLoading={isTotalAiLoading}
                            showStyleSelector={true}
                            selectedStyle={selectedStyle}
                            onStyleChange={(style) => {
                                setSelectedStyle(style);
                                generatorChatService.setCoachingStyle(style);
                            }}
                            activeContext={activeContext}
                            onRefreshContext={handleRefreshContext}
                            onSyncDocuments={() => Promise.resolve()}
                            isSyncingDocuments={false}
                        />
                    )}
                </ResizableChatPanel>
            </div>

            <div className="flex-shrink-0 flex gap-2">
                <Button onClick={() => setStep(2)} variant="outline" size="lg" className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('drafting.backToHomiletics')}
                </Button>

                <Button onClick={() => setShowPreview(true)} variant="outline" size="lg" className="flex-1">
                    <Eye className="mr-2 h-4 w-4" />
                    {t('drafting.preview')}
                </Button>

                <Button onClick={handleSaveAndExit} variant="secondary" size="lg" className="flex-1">
                    <Save className="mr-2 h-4 w-4" />
                    {t('drafting.saveAndExit')}
                </Button>

                <Button onClick={handlePublish} disabled={publishing || !sermonId} size="lg" className="flex-1">
                    {publishing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('drafting.publishing')}
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            {t('drafting.publishSermon')}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );

    const rightPanel = !draft ? (
        <Card className="p-6 h-full flex flex-col justify-start">
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold mb-2">{t('drafting.finalDraftTitle')}</h3>
                    <p className="text-sm text-muted-foreground">{t('drafting.finalDraftDesc')}</p>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">{t('homiletics.afterGenerateTitle')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                        {(t('homiletics.afterGenerateList', { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i}>• {item}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    ) : null;

    return (
        <>
            <HomileticsSavedIndicator visible={saving} />

            <div className="px-2 pt-2">
                <DerivedContextBanner stepHintKey="draftHint" />
            </div>

            {draft ? leftPanel : <WizardLayout leftPanel={leftPanel} rightPanel={rightPanel} />}

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="!max-w-[95vw] !w-full sm:!w-[1200px] lg:!w-[1600px] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <VisuallyHidden>
                        <DialogTitle>{t('drafting.previewDialogTitle')}</DialogTitle>
                    </VisuallyHidden>
                    <div className="flex-1 overflow-y-auto">
                        {draft && exegesis && (
                            <>
                                <SermonPreview
                                    title={draft.title}
                                    content={getFullContent()}
                                    authorName={user?.displayName || t('drafting.authorDefault')}
                                    date={new Date()}
                                    bibleReferences={[exegesis.passage]}
                                    tags={exegesis.keyWords.map((kw) => kw.original)}
                                    status="draft"
                                    citationManifest={draft.citationManifest}
                                />
                                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                                    <SermonBibliographySection
                                        bibliography={aggregateRagSourcesFlat({
                                            exegesisSources: exegesis?.ragSources,
                                            homileticsSources: homiletics?.ragSources,
                                            draftSources: draft.ragSources,
                                        })}
                                        manifest={draft.citationManifest}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="p-4 border-t bg-background flex justify-end">
                        <Button onClick={() => setShowPreview(false)}>{t('drafting.closePreview')}</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pre-publish citation verification gate (PR #218) */}
            <SermonCitationVerificationDialog
                open={verificationDialogOpen}
                onOpenChange={setVerificationDialogOpen}
                result={verificationResult}
                loading={verifying}
                onProceedAnyway={performPublish}
                onEditSermon={() => setVerificationDialogOpen(false)}
            />
        </>
    );
}

type DerivedContext = NonNullable<NonNullable<Sermon['wizardProgress']>['derivedContext']>;

/**
 * T3 #16 Fase 1 — attach paper.assembledMarkdown to GenerationRules
 * when the sermon was pre-populated from a paper. Lets the draft prompt
 * see the full source paper on every (re)generation instead of
 * collapsing to homiletics+rules alone.
 *
 * Best-effort: any failure (paper deleted, network error, no
 * assembledMarkdown) falls back to the un-augmented rules so the
 * generation still succeeds — just without the bonus context.
 */
async function augmentRulesWithPaperContext(
    rules: GenerationRules,
    derivedContext: DerivedContext | null,
    userId: string | undefined,
): Promise<GenerationRules> {
    if (derivedContext?.kind !== 'paper' || !userId) return rules;
    try {
        const paper = await exegesisService.getPaper.execute(userId, derivedContext.paperId);
        if (!paper?.assembledMarkdown) return rules;
        const passageLabel = typeof paper.passage === 'string'
            ? paper.passage
            : formatPassageReference(paper.passage, (paper as any).displayLanguage ?? 'es');
        return {
            ...rules,
            paperContext: {
                passage: passageLabel,
                title: paper.title ?? derivedContext.paperTitle,
                assembledMarkdown: paper.assembledMarkdown,
                assignmentBrief: paper.assignmentBrief ?? undefined,
            },
        };
    } catch (error) {
        console.warn('[StepDraft] Could not fetch paper context — generating without it', error);
        return rules;
    }
}

/**
 * T3 #16 Fase 2 — attach the Faculty-approved outline to rules when
 * the sermon was pre-populated from a Faculty session. derivedContext
 * already carries the outline (`SermonOutlinePreviewModal` persisted
 * it on creation) so no fetch is needed — pure formatter.
 *
 * Faculty's full chat transcript is intentionally NOT included; the
 * outline + personalization (handled separately via
 * `formatSermonPersonalizationBlock`) capture the actionable content,
 * and 10k+ tokens of conversation noise would degrade the prompt.
 */
function augmentRulesWithFacultyContext(
    rules: GenerationRules,
    derivedContext: DerivedContext | null,
): GenerationRules {
    if (derivedContext?.kind !== 'faculty') return rules;
    return {
        ...rules,
        facultyContext: {
            sessionTitle: derivedContext.sessionTitle,
            outline: derivedContext.outline,
        },
    };
}

/**
 * T3 #16 Fase 2 — when the sermon belongs to a project, attach the
 * project's name + contextNote. Stacks independently of paper/faculty
 * context (a paper-derived sermon can also belong to a project).
 *
 * Fetch path: sermonId → sermon.projectId → list user projects →
 * find by id. `FacultyService` doesn't expose a single-project getter
 * today; the list call is cheap and rare (one per regenerate).
 */
async function augmentRulesWithProjectContext(
    rules: GenerationRules,
    sermonId: string | null,
    userId: string | undefined,
): Promise<GenerationRules> {
    if (!sermonId || !userId) return rules;
    try {
        const sermon = await sermonService.getSermon(sermonId);
        if (!sermon?.projectId) return rules;
        const projects = await facultyService.getProjects.execute(userId);
        const project = projects.find((p) => p.id === sermon.projectId);
        if (!project?.contextNote?.trim()) return rules;
        return {
            ...rules,
            projectContext: {
                name: project.name,
                contextNote: project.contextNote,
            },
        };
    } catch (error) {
        console.warn('[StepDraft] Could not fetch project context — generating without it', error);
        return rules;
    }
}

/**
 * Pastoral Fidelity Phase 1 — fetches the `PastoralSeed` for the
 * current sermon and attaches it to `rules.pastoralSeed` so the prompt
 * builder can prepend the PRIMARY VOICE block. Best-effort: a missing
 * seed (legacy / flag-off sermon) just leaves rules untouched.
 */
async function augmentRulesWithPastoralSeed(
    rules: GenerationRules,
    sermonId: string | null,
): Promise<GenerationRules> {
    if (!sermonId) return rules;
    try {
        const seed = await pastoralSeedService.getBySermonId(sermonId);
        if (!seed?.completed) return rules;
        return {
            ...rules,
            pastoralSeed: {
                centralIdea: seed.insight.centralIdea,
                observations: seed.insight.observations,
                openQuestion: seed.insight.openQuestion,
                pastoralAnecdote: seed.insight.pastoralAnecdote,
                doxologicalApplication: seed.insight.doxologicalApplication,
                mainClauseReference: seed.structuralAnalysis.mainClause.reference,
                mainClauseNote: seed.structuralAnalysis.mainClause.pastorNote,
                wordStudies: seed.wordStudies.studies.map((w) => ({
                    word: w.word,
                    reference: w.reference,
                    discovery: w.pastorDiscovery,
                })),
                parallels: seed.recognition.parallels.map((p) => ({
                    reference: p.reference,
                    relevance: p.relevanceNote,
                })),
                originalAudienceFunction: seed.function.originalAudienceFunction,
                genre: seed.contextGenre.genre || undefined,
                genreImplication: seed.contextGenre.genreImplication || undefined,
                bookLocationNote: seed.contextGenre.bookLocationNote || undefined,
                timelessPrinciple: seed.timelessPrinciple.principle || undefined,
            },
        };
    } catch (error) {
        console.warn('[StepDraft] Could not fetch pastoral seed — generating without PRIMARY VOICE block', error);
        return rules;
    }
}

/**
 * Verbatim check: does the generated draft contain the pastor's
 * centralIdea as a substring? Whitespace is normalised so trivial
 * differences (multiple spaces, line breaks) don't trigger a false
 * negative. Case-insensitive because the LLM may capitalise the first
 * letter when wrapping it into a sentence.
 */
function draftIncludesCentralIdea(draft: any, centralIdea: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const target = normalize(centralIdea);
    if (!target) return true;
    const haystack = [
        draft?.title ?? '',
        draft?.introduction ?? '',
        draft?.conclusion ?? '',
        draft?.callToAction ?? '',
        ...(Array.isArray(draft?.body) ? draft.body.map((b: any) => b?.content ?? '') : []),
    ]
        .map(normalize)
        .join(' \n ');
    return haystack.includes(target);
}
