import { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useWizard, WizardProvider } from './WizardContext';
import { WizardHeader } from './WizardHeader';
import { StepPassage } from './StepPassage';
import { StepExegesis } from './StepExegesis';
import { StepHomiletics } from './StepHomiletics';
import { StepDraft } from './StepDraft';
import { SermonsInProgress } from './SermonInProgress';
import { sermonService, exegesisService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { SermonEntity, type Sermon } from '@dosfilos/domain';
import { migrateLegacyWizardProgress } from './migrateLegacyWizardProgress';
import { usePastoralFidelityGate } from '@/hooks/usePastoralFidelityGate';
import { PastoralSeedWizard } from './pastoralSeed/PastoralSeedWizard';
import { seedToExegesis } from './pastoralSeed/seedToExegesis';
import { pastoralSeedService } from '@dosfilos/application';
import { toast } from 'sonner';

function WizardContent() {
    const { step, setStep, passage, setPassage, setExegesis, setHomiletics, setDraft, sermonId, setSermonId, derivedContext, setDerivedContext, rules, setRules, reset } = useWizard();
    const { user } = useFirebase();
    const [searchParams] = useSearchParams();
    const [inProgressSermons, setInProgressSermons] = useState<SermonEntity[]>([]);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [loading, setLoading] = useState(true);
    const [autoPopulating, setAutoPopulating] = useState(false);
    const [mintingSermon, setMintingSermon] = useState(false);
    const [publishingSermonId, setPublishingSermonId] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const pastoralGate = usePastoralFidelityGate();

    // Check for in-progress sermons on mount or when location key changes (navigation)
    useEffect(() => {
        const checkForInProgress = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            // Check if we're resuming a specific sermon via URL param
            const sermonIdParam = searchParams.get('id');
            const newSermonParam = searchParams.get('new');
            // Debugging intentionally left in for URL routing diagnosis

            // If 'new=true', skip resume prompt and start fresh wizard
            // at Step 0 (passage entry). Default WizardContext step is 1
            // (legacy assumed passage was captured upstream); fresh sessions
            // need StepPassage first so the pastoral seed has a passage
            // to anchor on.
            if (newSermonParam === 'true') {
                reset();
                setStep(0);
                setLoading(false);
                setShowResumePrompt(false);
                return;
            }

            if (sermonIdParam) {
                try {
                    let sermon = await sermonService.getSermon(sermonIdParam);

                    if (sermon) {
                        // Paper-linked empty placeholder recovery
                        // (PR #216). If the sermon is empty + linked
                        // to a paper, fire `generateSermonFromPaper`
                        // against the existing sermonId so the
                        // wizard's resume path sees populated state.
                        const repopulated = await applyPaperAutoPopulationIfNeeded(sermon);
                        if (repopulated) sermon = repopulated;

                        // Runtime migration for legacy sermons (pre PRs
                        // #213/#214). When `sermon.content` exists but
                        // `wizardProgress.draft` is missing, synthesize
                        // wizardProgress on-the-fly so the wizard lands
                        // at Step 3 with the legacy content + a
                        // derivedContext banner (when paper/Faculty
                        // origin is known).
                        const progress = await applyLegacyMigrationIfNeeded(sermon);
                        if (progress) {
                            setSermonId(sermon.id);
                            setPassage(progress.passage || '');
                            if (progress.exegesis) setExegesis(progress.exegesis);
                            if (progress.homiletics) setHomiletics(progress.homiletics);
                            if (progress.draft) setDraft(progress.draft);
                            if (progress.derivedContext) setDerivedContext(progress.derivedContext);
                            if (progress.personalization || progress.audienceRigor) {
                                setRules({
                                    ...rules,
                                    ...(progress.personalization ? { personalization: progress.personalization } : {}),
                                    ...(progress.audienceRigor ? { audienceRigor: progress.audienceRigor } : {}),
                                });
                            }

                            // If no passage, go to step 0 (passage selection)
                            if (!progress.passage) {
                                setStep(0);
                            } else if (progress.currentStep !== undefined) {
                                // Validate step is in range 0-3
                                const validStep = Math.min(Math.max(progress.currentStep, 0), 3);
                                setStep(validStep);
                            } else if (progress.draft) {
                                setStep(3);
                            } else if (progress.homiletics) {
                                setStep(2);
                            } else {
                                setStep(1);
                            }

                            setLoading(false);
                            return;
                        } else {
                            console.warn('⚠️ SermonWizard: Sermon has neither wizardProgress nor migratable content');
                        }
                    } else {
                        console.warn('⚠️ SermonWizard: Sermon not found');
                    }
                } catch (error: any) {
                    console.error('❌ SermonWizard: Error loading sermon from URL param:', error);
                    console.error('❌ Error message:', error.message);
                    console.error('❌ Error code:', error.code);
                }
            }

            try {
                const sermons = await sermonService.getInProgressSermons(user.uid);
                if (sermons.length > 0) {
                    setInProgressSermons(sermons);
                    setShowResumePrompt(true);
                }
            } catch (error) {
                console.error('Error checking for in-progress sermons:', error);
            } finally {
                setLoading(false);
            }
        };

        checkForInProgress();
    }, [user, location.key, searchParams]);

    const handleContinue = async (sermon: SermonEntity) => {
        // Paper-linked empty placeholder recovery (PR #216) — same as
        // URL-param load so resumed sermons get the same auto-populate
        // behavior. Use the freshly-loaded sermon when generation
        // succeeded.
        const repopulated = await applyPaperAutoPopulationIfNeeded(sermon as Sermon);
        const effective = repopulated ?? sermon;

        // Apply legacy migration (same path as URL-param load) so the
        // "Sermones en progreso" list can also resume pre-convergence
        // sermons cleanly.
        const progress = await applyLegacyMigrationIfNeeded(effective as Sermon);
        if (!progress) {
            console.warn('[SermonWizard] Sermon has neither wizardProgress nor migratable content');
            return;
        }

        // Restore wizard state including sermonId
        setSermonId(sermon.id);
        setPassage(progress.passage);
        if (progress.exegesis) setExegesis(progress.exegesis);
        if (progress.homiletics) setHomiletics(progress.homiletics);
        if (progress.draft) setDraft(progress.draft);
        if (progress.derivedContext) setDerivedContext(progress.derivedContext);
        if (progress.personalization || progress.audienceRigor) {
            setRules({
                ...rules,
                ...(progress.personalization ? { personalization: progress.personalization } : {}),
                ...(progress.audienceRigor ? { audienceRigor: progress.audienceRigor } : {}),
            });
        }

        // Restore step if available, otherwise infer from content
        // IMPORTANT: Validate step is in range 0-3 (max step is 3 for draft)
        if (progress.currentStep !== undefined) {
            const validStep = Math.min(Math.max(progress.currentStep, 0), 3);
            setStep(validStep);
        } else if (progress.draft) {
            setStep(3);
        } else if (progress.homiletics) {
            setStep(2);
        }

        setShowResumePrompt(false);
    };

    /**
     * Returns the wizardProgress to use for a loaded sermon, running
     * the legacy-content migration when needed and persisting the
     * migrated state to Firestore so subsequent loads skip the work.
     *
     * Returns `null` only when the sermon has neither an existing
     * wizardProgress NOR migratable content — that's the truly-empty
     * sermon edge case the caller should warn about.
     */
    async function applyLegacyMigrationIfNeeded(
        sermon: Sermon,
    ): Promise<NonNullable<Sermon['wizardProgress']> | null> {
        const migration = migrateLegacyWizardProgress(sermon);
        if (migration?.migrated) {
            console.info('[SermonWizard] Migrating legacy sermon to wizardProgress', { sermonId: sermon.id });
            try {
                await sermonService.updateWizardProgress(sermon.id, migration.wizardProgress);
            } catch (err) {
                // Migration persistence is best-effort. UI continues
                // with the in-memory migrated progress so the user
                // sees the correct state immediately; the next save
                // (auto-save on any wizard mutation) will retry.
                console.warn('[SermonWizard] Failed to persist legacy migration; continuing in-memory', err);
            }
            return migration.wizardProgress;
        }
        if (migration) {
            return migration.wizardProgress;
        }
        return sermon.wizardProgress ?? null;
    }

    /**
     * Handles the "empty paper-linked placeholder" UX gap from PR #211:
     * `autoCreateSermonPlaceholders` (pre PR #216) inserted empty
     * sermons with `sourcePaperId` set, which made the planner show
     * "Abrir borrador" while the wizard opened blank. Detect that
     * state and auto-run `generateSermonFromPaper` against the
     * existing sermon (via the new `targetSermonId` parameter) so the
     * user lands in Step 3 with the paper-derived content instead of
     * a blank Step 0.
     *
     * Returns the freshly-loaded sermon when auto-population happened
     * (caller restores wizard state from it). Returns null when no
     * auto-population was needed.
     *
     * One-shot: PR #216 also fixed `autoCreateSermonPlaceholders` to
     * skip pericopes with linked papers, so future series won't
     * produce these placeholders. This handler exists to recover
     * sermons created before that fix landed.
     */
    async function applyPaperAutoPopulationIfNeeded(sermon: Sermon): Promise<Sermon | null> {
        const eligible =
            !sermon.content?.trim()
            && !sermon.wizardProgress?.draft
            && !sermon.wizardProgress?.derivedContext
            && Boolean(sermon.sourcePaperId)
            && Boolean(user?.uid);
        if (!eligible) return null;

        console.info('[SermonWizard] Auto-populating empty paper-linked placeholder', {
            sermonId: sermon.id,
            paperId: sermon.sourcePaperId,
        });
        setAutoPopulating(true);
        try {
            await exegesisService.generateSermonFromPaper.execute({
                paperId: sermon.sourcePaperId!,
                actorUserId: user!.uid,
                tone: 'pastoral',
                targetSermonId: sermon.id,
            });
            // Re-fetch the sermon so the caller restores wizardProgress
            // from the freshly-populated doc instead of the stale
            // in-memory copy.
            const refreshed = await sermonService.getSermon(sermon.id);
            return refreshed ?? null;
        } catch (err) {
            // Auto-populate is best-effort — if generation fails
            // (overload, no paper, etc.), fall back to the empty
            // wizard so the user can still work manually. Surface the
            // failure in the console for debugging.
            console.warn('[SermonWizard] Auto-populate from paper failed; continuing with empty wizard', err);
            return null;
        } finally {
            setAutoPopulating(false);
        }
    }

    const handleDiscard = async (sermon: SermonEntity) => {
        try {
            await sermonService.deleteSermon(sermon.id);
            setInProgressSermons(prev => prev.filter(s => s.id !== sermon.id));
            
            if (inProgressSermons.length === 1) {
                setShowResumePrompt(false);
            }
        } catch (error) {
            console.error('Error discarding sermon:', error);
        }
    };

    const handlePublish = async (sermon: SermonEntity) => {
        try {
            setPublishingSermonId(sermon.id);
            await sermonService.publishSermonAsCopy(sermon.id);
            // Refresh the list to show updated publish status
            const sermons = await sermonService.getInProgressSermons(user!.uid);
            setInProgressSermons(sermons);
        } catch (error) {
            console.error('Error publishing sermon:', error);
            // You can add a toast notification here if you have a toast library
        } finally {
            setPublishingSermonId(null);
        }
    };

    const handleDuplicate = async (sermon: SermonEntity) => {
        try {
            // Create a copy by using the wizard progress data
            if (!sermon.wizardProgress) return;
            
            const duplicatedSermon = await sermonService.createSermon({
                userId: user!.uid,
                title: `${sermon.title || sermon.wizardProgress.passage} (Copia)`,
                // passage: sermon.wizardProgress.passage, // Removed: Not in types
                content: '',
                status: 'draft',
                wizardProgress: {
                    ...sermon.wizardProgress,
                    publishedCopyId: undefined,
                    lastPublishedAt: undefined,
                    publishCount: undefined,
                    lastSaved: new Date(),
                },
            });
            
            // Add to the list
            setInProgressSermons(prev => [duplicatedSermon, ...prev]);
        } catch (error) {
            console.error('Error duplicating sermon:', error);
        }
    };

    const handleNewSermon = () => {
        reset();
        setShowResumePrompt(false);
    };

    /**
     * "Guardar y Salir": persist any pending state via the wizard's
     * autosaves (already done step-by-step) + navigate the pastor back
     * to the canonical sermons listing (`/dashboard/sermons`). Previously
     * this re-rendered an in-wizard "resume drafts" view that the
     * pastor mistook for a legacy listing — smoke 2026-05-29.
     */
    const handleExit = () => {
        reset();
        navigate('/dashboard/sermons');
    };

    // Pastoral Fidelity gate: when the flag is on we replace Step 1
    // (free-text exegesis) with the six-step spine + block Step 2 and
    // Step 3 until the seed completes. When the flag is off we stay on
    // the legacy flow untouched.
    //
    // IMPORTANT: this block of hooks MUST live above the early returns
    // below (loading / showResumePrompt). React tracks hook order and a
    // conditional skip would change the count between renders and crash
    // the component.
    const usePastoralFlow = pastoralGate.allowed;

    // Hard gate: when the flag is on, the pastor cannot reach Step 2
    // (homiletics) or Step 3 (draft) without a completed seed. We
    // check on every step change + redirect back with a toast so the
    // gate is visible (not silent).
    useEffect(() => {
        if (!usePastoralFlow) return;
        if (step < 2) return;
        if (!sermonId) {
            setStep(1);
            return;
        }
        let cancelled = false;
        pastoralSeedService
            .getBySermonId(sermonId)
            .then((seed) => {
                if (cancelled) return;
                if (!seed?.completed) {
                    toast.warning('Completa los 6 pasos de estudio antes de continuar al borrador.');
                    setStep(1);
                }
            })
            .catch((err) => console.error('[SermonWizard] gate check failed', err));
        return () => {
            cancelled = true;
        };
    }, [usePastoralFlow, step, sermonId, setStep]);

    // Mint the sermon doc eagerly when entering the seed wizard so the
    // seed has a `sermonId` to anchor to. Legacy flow defers creation
    // until exegesis runs; pastoral flow needs it earlier because the
    // seed persists from Reading (Paso 1) onward.
    useEffect(() => {
        const shouldMint =
            usePastoralFlow
            && step === 1
            && passage
            && !sermonId
            && user
            && !mintingSermon;
        if (!shouldMint) return;
        setMintingSermon(true);
        sermonService
            .createDraft({ userId: user!.uid, passage })
            .then((id) => setSermonId(id))
            .catch((err) => console.error('[SermonWizard] eager createDraft failed', err))
            .finally(() => setMintingSermon(false));
    }, [usePastoralFlow, step, passage, sermonId, user, mintingSermon, setSermonId]);

    // Build the pre-fill hint when a paper/Faculty origin is known.
    // Option B (decision 2026-05-25): pre-poblar como sugerencias
    // editables, no autocompletar. Pastor confirma o reescribe.
    const derivedSuggestions = useMemo(() => {
        if (!derivedContext) return undefined;
        if (derivedContext.kind === 'paper') {
            return {
                note: `El paper "${derivedContext.paperTitle}" alimentó este sermón. Sus secciones aparecen como sugerencias en los pasos, pero la idea central, observaciones, anécdota y aplicación doxológica del Paso 6 las escribes tú.`,
            };
        }
        return {
            note: `Esta semilla derivó de tu conversación con Faculty ("${derivedContext.sessionTitle}"). Revísala y reescríbela en tu voz — el sistema construye sobre tus palabras, no sobre las del asistente.`,
        };
    }, [derivedContext]);

    if (loading || autoPopulating) {
        // `autoPopulating` is the longer wait — we're running the
        // paper→sermon transformer (~30-45s) to fill a previously
        // empty placeholder. Surface that explicitly so the user
        // doesn't think the page is stuck on a generic spinner.
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center max-w-md px-6">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    {autoPopulating ? (
                        <>
                            <p className="text-foreground font-medium mb-1">
                                Generando sermón desde el paper…
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Estamos transformando tu paper exegético en un borrador de sermón. Esto puede tomar ~30 segundos.
                            </p>
                        </>
                    ) : (
                        <p className="text-muted-foreground">Cargando...</p>
                    )}
                </div>
            </div>
        );
    }

    if (showResumePrompt) {
        return (
            <div className="space-y-6">
                <SermonsInProgress
                    sermons={inProgressSermons}
                    onContinue={handleContinue}
                    onDiscard={handleDiscard}
                    onPublish={handlePublish}
                    onDuplicate={handleDuplicate}
                    onNewSermon={handleNewSermon}
                    publishingSermonId={publishingSermonId}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <WizardHeader currentStep={step} onExit={handleExit} />

            <div className="flex-1 overflow-y-auto px-4 py-2">
                {step === 0 && <StepPassage />}
                {step === 1 && usePastoralFlow && !passage && (
                    // Guard against entering the seed wizard without a
                    // passage (e.g. legacy resume that defaulted to
                    // step 1 with empty wizardProgress). Send the
                    // pastor back to passage entry first.
                    <StepPassage />
                )}
                {step === 1 && usePastoralFlow && passage && (
                    <PastoralSeedWizard
                        sermonId={sermonId}
                        userId={user?.uid ?? ''}
                        passage={passage}
                        onSeedCompleted={(seed) => {
                            // Synthesize ExegeticalStudy from the seed
                            // so the legacy homiletics + draft phases
                            // (which still consume `exegesis`) have a
                            // payload to work with. PRIMARY VOICE
                            // prompt block at draft time remains the
                            // authoritative pastor input; this synth
                            // payload only satisfies the homiletics
                            // contract.
                            setExegesis(seedToExegesis(seed));
                            setStep(2);
                        }}
                        derivedSuggestions={derivedSuggestions}
                    />
                )}
                {step === 1 && !usePastoralFlow && <StepExegesis />}
                {step === 2 && <StepHomiletics />}
                {step === 3 && <StepDraft />}
            </div>
        </div>
    );
}

export function SermonWizard() {
    return (
        <WizardProvider>
            <WizardContent />
        </WizardProvider>
    );
}
