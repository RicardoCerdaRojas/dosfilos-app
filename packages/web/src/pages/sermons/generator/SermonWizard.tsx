import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useWizard, WizardProvider } from './WizardContext';
import { WizardHeader } from './WizardHeader';
import { StepPassage } from './StepPassage';
import { StepExegesis } from './StepExegesis';
import { StepHomiletics } from './StepHomiletics';
import { StepDraft } from './StepDraft';
import { SermonsInProgress } from './SermonInProgress';
import { sermonService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { SermonEntity, type Sermon } from '@dosfilos/domain';
import { migrateLegacyWizardProgress } from './migrateLegacyWizardProgress';

function WizardContent() {
    const { step, setStep, setPassage, setExegesis, setHomiletics, setDraft, setSermonId, setDerivedContext, reset } = useWizard();
    const { user } = useFirebase();
    const [searchParams] = useSearchParams();
    const [inProgressSermons, setInProgressSermons] = useState<SermonEntity[]>([]);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [loading, setLoading] = useState(true);
    const [publishingSermonId, setPublishingSermonId] = useState<string | null>(null);
    const location = useLocation();

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
            if (newSermonParam === 'true') {
                console.log('[SermonWizard] New sermon requested, skipping resume');
                setLoading(false);
                setShowResumePrompt(false);
                return;
            }
            
            if (sermonIdParam) {
                console.log('[SermonWizard] Loading sermon from URL param:', sermonIdParam);
                try {
                    const sermon = await sermonService.getSermon(sermonIdParam);
                    console.log('[SermonWizard] ✅ Sermon loaded:', { id: sermon?.id, title: sermon?.title, hasProgress: !!sermon?.wizardProgress });

                    if (sermon) {
                        // Runtime migration for legacy sermons (pre PRs
                        // #213/#214). When `sermon.content` exists but
                        // `wizardProgress.draft` is missing, synthesize
                        // wizardProgress on-the-fly so the wizard lands
                        // at Step 3 with the legacy content + a
                        // derivedContext banner (when paper/Faculty
                        // origin is known).
                        const progress = await applyLegacyMigrationIfNeeded(sermon);
                        if (progress) {
                            console.log('[SermonWizard] Restoring wizard progress:', progress);
                            setSermonId(sermon.id);
                            setPassage(progress.passage || '');
                            if (progress.exegesis) setExegesis(progress.exegesis);
                            if (progress.homiletics) setHomiletics(progress.homiletics);
                            if (progress.draft) setDraft(progress.draft);
                            if (progress.derivedContext) setDerivedContext(progress.derivedContext);

                            // If no passage, go to step 0 (passage selection)
                            if (!progress.passage) {
                                setStep(0);
                            } else if (progress.currentStep !== undefined) {
                                // Validate step is in range 0-3
                                const validStep = Math.min(Math.max(progress.currentStep, 0), 3);
                                console.log('[SermonWizard] URL param - Setting step:', validStep, progress.currentStep !== validStep ? `(clamped from ${progress.currentStep})` : '');
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
        console.log('[SermonWizard] 🎯 handleContinue called for sermon:', { id: sermon.id, title: sermon.title || sermon.wizardProgress?.passage });

        // Apply legacy migration (same path as URL-param load) so the
        // "Sermones en progreso" list can also resume pre-convergence
        // sermons cleanly.
        const progress = await applyLegacyMigrationIfNeeded(sermon);
        if (!progress) {
            console.warn('[SermonWizard] ⚠️ Sermon has neither wizardProgress nor migratable content');
            return;
        }
        console.log('[SermonWizard] Restoring state:', { passage: progress.passage, currentStep: progress.currentStep });

        // Restore wizard state including sermonId
        setSermonId(sermon.id);
        setPassage(progress.passage);
        if (progress.exegesis) setExegesis(progress.exegesis);
        if (progress.homiletics) setHomiletics(progress.homiletics);
        if (progress.draft) setDraft(progress.draft);
        if (progress.derivedContext) setDerivedContext(progress.derivedContext);

        // Restore step if available, otherwise infer from content
        // IMPORTANT: Validate step is in range 0-3 (max step is 3 for draft)
        if (progress.currentStep !== undefined) {
            const validStep = Math.min(Math.max(progress.currentStep, 0), 3);
            console.log('[SermonWizard] Setting step:', validStep, progress.currentStep !== validStep ? `(clamped from ${progress.currentStep})` : '');
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

    const handleExit = async () => {
        setLoading(true);
        reset();
        if (user) {
            try {
                const sermons = await sermonService.getInProgressSermons(user.uid);
                setInProgressSermons(sermons);
                if (sermons.length > 0) {
                    setShowResumePrompt(true);
                }
            } catch (error) {
                console.error('Error refreshing sermons on exit:', error);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando...</p>
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
            {/* Compact Header */}
            <WizardHeader currentStep={step} onExit={handleExit} />

            {/* Step Content - Full height with fixed layout */}
            <div className="flex-1 overflow-hidden px-4 py-2">
                {step === 0 && <StepPassage />}
                {step === 1 && <StepExegesis />}
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
