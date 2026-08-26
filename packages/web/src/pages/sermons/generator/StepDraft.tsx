import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';
import { WizardLayout } from './WizardLayout';
import { DerivedContextBanner } from './DerivedContextBanner';
import { SermonPersonalizationPanel } from './SermonPersonalizationPanel';
import { DraftSkeletonPreview } from './DraftSkeletonPreview';
import { IllustrationDuplicateBanner } from './IllustrationDuplicateBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, FileText, Sparkles, Eye, Upload, BookOpen } from 'lucide-react';
import {
    sermonGeneratorService,
    sermonService,
    generatorChatService,
    exegesisService,
    facultyService,
    pastoralSeedService,
    pastoralWordAnalysisReadService,
    computeDeterministicDraftSignals,
    sermonDraftShadowService,
    JudgeSermonDraftUseCase,
    buildJudgeCorpus,
    type VerifySermonCitationsOutput,
} from '@dosfilos/application';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import {
    countReadySections,
    deriveSectionWalk,
    hasDecisions,
    type SermonContent,
    normalizeHomileticalApproach,
    GENRE_COMPLIANCE_GENRES,
    JUDGE_SHADOW_SAMPLE_1_IN,
    type LiteraryGenre,
} from '@dosfilos/domain';
import { createProxyLlmClient } from '@dosfilos/infrastructure';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';
import { ContentCanvas } from '@/components/canvas-chat/ContentCanvas';
import { ChatInterface } from '@/components/canvas-chat/ChatInterface';
import { ResizableChatPanel } from '@/components/canvas-chat/ResizableChatPanel';

import { useContentHistory } from '@/hooks/useContentHistory';
import { useGeneratorChat } from '@/hooks/useGeneratorChat';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { SermonPreview } from '@/components/sermons/SermonPreview';
import { SermonBibliographySection } from '@/components/sermons/SermonBibliographySection';
import { SermonCitationVerificationDialog } from '@/components/sermons/SermonCitationVerificationDialog';
import { ContraScanModal } from '@/components/sermons/ContraScanModal';
import { useSermonContraScan } from '@/hooks/useSermonContraScan';
import { WorkflowPhase, CoachingStyle, formatPassageReference, aggregateRagSourcesFlat, evaluatePastoralSeed, type GenerationRules, type Sermon } from '@dosfilos/domain';
import { BibleReaderPanel } from '@/components/bible/BibleReaderPanel';
import { useTranslation } from '@/i18n';
import { buildFullContent } from './draft/sermonContent';
import { buildSermonCitationManifest } from './draft/buildSermonCitationManifest';
import { CitationManifestContext } from '@/lib/citationMarkers';
import { useDraftRefinement } from './draft/useDraftRefinement';
import { useDraftVersions } from './draft/useDraftVersions';
import { SocraticWorkshop } from './draft/SocraticWorkshop';
import { HomileticsSavedIndicator } from './homiletics/HomileticsLoadingScreen';
import { WizardStepHeader } from './WizardStepHeader';
import { WizardStepShell } from './WizardStepShell';
import { RegenerateDraftAction } from './draft/RegenerateDraftAction';
import { WorkshopDraftActions } from './draft/WorkshopDraftActions';

export function StepDraft() {
    const { t, language } = useTranslation('generator');
    const activeLanguage = language === 'en' ? 'en' : 'es';
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { homiletics, rules, setDraft, draft, setStep, exegesis, config, passage, sermonId, derivedContext, sectionElements, setSectionElements, sectionProse, setSectionProse, reset, saving } = useWizard();
    const draftShadowGate = useFeatureFlag('sermon_draft_shadow');
    // ADR-037 — las decisiones viven en el contexto del wizard y se persisten
    // con el resto del progreso: el spike ya adjudicó que el modelo propone
    // bien, así que el esquema deja de ser provisional.
    const socraticGate = useFeatureFlag('socratic_drafting');
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    /**
     * Pestaña activa, CONTROLADA para poder llevarlo al borrador al armarlo.
     *
     * Sin esto, armar dejaba al pastor mirando el taller sin ninguna señal de
     * que algo había pasado: el botón cambiaba de etiqueta —porque ya no quedaba
     * nada pendiente— y ésa era toda la respuesta. Preguntó por qué, que es la
     * pregunta de alguien que no sabe si su acción funcionó.
     */
    const [activeTab, setActiveTab] = useState<'draft' | 'workshop'>('draft');
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
    // Phase 4 PR 1 (ADR-033) — contra-scan runs as the FIRST pre-publish gate
    // here too (the wizard publishes via the copy path). Once it clears, the
    // existing citation verifier runs. Flag off → onCleared fires immediately.
    const contraScan = useSermonContraScan({ onCleared: () => runCitationVerifier() });
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

    const contentHistory = useContentHistory('sermon', sermonId ?? undefined);
    // Sección cuyo historial hay que abrir al expandir. La ponen los dos
    // caminos de entrada —el aviso tras regenerar y el indicador de la tarjeta—
    // y se limpia al cerrar, para que volver a expandir no reabra el modal.
    const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null);
    const abrirHistorial = (sectionId: string) => {
        setOpenHistoryFor(sectionId);
        setExpandedSectionId(sectionId);
        setMessages([]);
    };

    /**
     * Guarda el borrador actual en el historial ANTES de reemplazarlo.
     *
     * Lo usan las DOS rutas que se llevan por delante el sermón anterior:
     * regenerar y armar desde el taller. Cuando vivía dentro de `handleGenerate`,
     * armar el borrador reemplazaba sin dejar rastro — y armar con secciones sin
     * redactar produce un esqueleto, así que el pastor podía perder un sermón
     * completo con un clic y sin aviso.
     *
     * Por sección, no como bloque: es como funciona el historial, y permite
     * rescatar sólo la introducción que le gustaba sin perder los puntos nuevos.
     */
    const archivarBorradorActual = async (etiqueta: string): Promise<boolean> => {
        if (!draft) return false;
        const { getSectionsForType } = await import('@/components/canvas-chat/section-configs');
        const { getValueByPath } = await import('@/utils/path-utils');
        let guardo = false;
        for (const section of getSectionsForType('sermon')) {
            const previo = getValueByPath(draft, section.path);
            if (previo === undefined || previo === null) continue;
            contentHistory.saveVersion(section.id, previo, etiqueta, undefined);
            guardo = true;
        }
        return guardo;
    };

    const getSectionVersions = (sectionId: string) => contentHistory.getVersions(sectionId);
    const getCurrentVersionId = (sectionId: string) => contentHistory.getCurrentVersion(sectionId)?.id;

    /**
     * Redacta un borrador nuevo desde la proposición y el bosquejo.
     *
     * `archivar` es DECISIÓN DEL PASTOR, no una política nuestra. Archivábamos
     * siempre, que es lo prudente por defecto pero le llenaba el historial de
     * versiones que él sabía que no quería guardar. El diálogo se lo pregunta;
     * acá sólo se obedece. Por defecto sí, porque quien entra sin pasar por el
     * diálogo (el estado vacío) no ha decidido nada.
     */
    const handleGenerate = async ({ archivar = true }: { archivar?: boolean } = {}) => {
        if (!homiletics) return;

        // Fail-closed: never redact a draft without the preacher's chosen FORM.
        // A null form must NOT silently degrade to the model picking one — that is
        // the fabrication this module exists to kill. Halt and mark "sin forma
        // elegida"; the preacher selects a form in the homiletics step first.
        // (normalize so a legacy value still counts as a real form.)
        const chosenForm = normalizeHomileticalApproach(homiletics.homileticalApproach).approach;
        if (!chosenForm) {
            toast.error(
                'Elige una forma de sermón antes de redactar. El borrador no elige la forma por ti.',
            );
            return;
        }

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

            // ADR-031 — build the citation manifest from the pastor's personal
            // library (priority) + CORE homiletics (fallback) via retrieveChunks,
            // so the sermon cites narratively with a verifiable anchor (chunk +
            // book + page). Best-effort: on failure the manifest is undefined and
            // generateSermonDraft falls back to its legacy personal-only build.
            const citationManifest = await buildSermonCitationManifest({
                query: homiletics.homileticalProposition,
                userId: user?.uid,
            });

            const { draft: result } = await sermonGeneratorService.generateSermonDraft(
                homiletics,
                rulesWithContext,
                draftConfig,
                user?.uid,
                activeLanguage,
                citationManifest,
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

            // ADR-035 R3/R7 — ¿el sermón citó los paralelos que marcaste? (warning,
            // no auto-regen). Cierra el dolor original: el sermón no debe salir
            // ciego a las alusiones del pastor.
            const missingParallels = draftMissingParallelRefs(result, rulesWithContext.pastoralSeed?.parallels);
            if (missingParallels.length > 0) {
                toast.warning(
                    `El borrador no cita ${missingParallels.length === 1 ? 'el paralelo' : 'los paralelos'} que marcaste: ${missingParallels.join('; ')}. Revisa o re-genera.`,
                    { duration: 8000 },
                );
            }

            // Fidelidad de citas EN LA REDACCIÓN (opción B) — verifica el borrador
            // Fidelidad de citas (opción B, v2): la limpieza corre en el SERVICIO de
            // generación (punto único, alineado con el gate de publicación). Aquí
            // solo avisamos cuántas citas sin respaldo se quitaron.
            const san = result.citationSanitization;
            if (san && san.removed > 0) {
                toast.warning(
                    `Quitamos ${san.removed} cita(s) sin respaldo en tus fuentes (probablemente inventadas). Revisa el borrador.`,
                    { duration: 9000 },
                );
            }

            // REGENERAR NO PUEDE SER DESTRUCTIVO.
            //
            // `handleGenerate` reemplazaba el borrador con `setDraft` sin pasar
            // por el historial: el sermón anterior desaparecía sin quedar en
            // ningún lado. El historial sólo se alimentaba al refinar o editar
            // una sección, así que el pastor podía deshacer un ajuste menor pero
            // no una regeneración completa — justo la acción que más se lleva
            // por delante.
            //
            // Se guarda POR SECCIÓN, no como bloque único, porque es como el
            // historial ya funciona y porque permite rescatar sólo la
            // introducción que le gustaba sin perder los puntos nuevos.
            const guardoVersiones = archivar
                ? await archivarBorradorActual(t('drafting.versions.beforeRegenerate'))
                : false;

            setDraft(result);
            // EL AVISO OFRECE EL SEGURO EN EL MOMENTO EN QUE HACE FALTA.
            // Justo después de regenerar es cuando el pastor quiere comparar o
            // volver — y es justo cuando está mirando el canvas, no una sección
            // expandida. Anunciar el historial acá lo pone donde se necesita.
            if (guardoVersiones) {
                toast.success(t('drafting.success.generated'), {
                    duration: 10000,
                    action: {
                        label: t('drafting.versions.seePrevious'),
                        onClick: () => abrirHistorial('introduction'),
                    },
                });
            } else {
                toast.success(t('drafting.success.generated'));
            }

            // Redacción v2 — sombra del draft (colector DETERMINISTA), gated +
            // fire-and-forget. Aislado del juez LLM (otro colector). NON-BLOCKING:
            // cualquier fallo se traga, nunca afecta la generación.
            if (draftShadowGate.enabled && sermonId) {
                try {
                    const signals = computeDeterministicDraftSignals(result, result.citationManifest);
                    void sermonDraftShadowService.record({
                        sermonId,
                        passage,
                        approachType: homiletics?.homileticalApproach ?? '',
                        principlePresent: Boolean(rulesWithContext.pastoralSeed?.timelessPrinciple?.trim()),
                        collector: 'deterministic',
                        signals,
                    });
                } catch (shadowErr) {
                    console.warn('[StepDraft] draft shadow (deterministic) failed — non-blocking', shadowErr);
                }
            }

            // Redacción v2 §8.5 — sombra del JUEZ (colector LLM). Mismo flag y
            // mismo recorder que el determinista, pero COLECTOR APARTE: aquel es
            // gratis y corre siempre; este es una llamada LLM extra sobre el
            // sermón completo, así que va muestreado y su caída jamás puede
            // arrastrar al otro.
            //
            // NO SE ESPERA (`void`, sin await): el pastor ya esperó la
            // generación. Sumarle la latencia de un juicio que él ni siquiera
            // ve todavía sería cobrarle el precio de una medición nuestra.
            const judged = normalizeHomileticalApproach(homiletics?.homileticalApproach);
            if (draftShadowGate.enabled && sermonId && judged.approach && shouldJudgeSample(sermonId)) {
                // El género se estrecha contra el catálogo en vez de castearse:
                // un valor viejo o desconocido deja la vara SIN piso de género,
                // que es correcto, en vez de fingir uno.
                const seedGenre = rulesWithContext.pastoralSeed?.genre;
                const genre = seedGenre && (GENRE_COMPLIANCE_GENRES as readonly string[]).includes(seedGenre)
                    ? (seedGenre as LiteraryGenre)
                    : undefined;
                void new JudgeSermonDraftUseCase(
                    createProxyLlmClient('sermon.judgeCompliance'),
                    sermonDraftShadowService,
                )
                    .execute({
                        sermonId,
                        passage,
                        approach: judged.approach,
                        ...(genre ? { genre } : {}),
                        draftText: buildJudgeCorpus(result),
                    })
                    .catch((judgeErr) => {
                        console.warn('[StepDraft] draft shadow (judged) failed — non-blocking', judgeErr);
                    });
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('drafting.errors.generating'));
        } finally {
            setLoading(false);
        }
    };

    const getFullContent = () => buildFullContent(draft, t);

    const handleSaveAndExit = async () => {
        // Persist the rendered draft into the sermon's top-level `content` so it
        // is viewable on the detail page — the autosave only stores
        // `wizardProgress.draft`, which the detail view doesn't read. Without
        // this a saved draft opens with an empty body.
        try {
            if (sermonId && draft && exegesis) {
                await sermonService.updateSermon(sermonId, {
                    title: draft.title,
                    content: getFullContent(),
                    bibleReferences: [exegesis.passage],
                    tags: exegesis.keyWords.map((kw) => kw.original),
                });
            }
        } catch (err) {
            console.error('[StepDraft] save-and-exit content persist failed', err);
        }
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
        // Contra-scan (P3, ADR-033) first. Flag off → calls onCleared
        // (runCitationVerifier) directly, so the flow is unchanged. Central idea
        // is the pastor's own seed thesis (AI-forbidden); fall back to title.
        const centralIdea = draft.pastoralSeed?.centralIdea?.trim() || draft.title;
        await contraScan.attempt(sermonId, centralIdea);
    };

    /** Pre-publish citation verifier (PR #218) — runs after contra-scan clears. */
    const runCitationVerifier = async () => {
        if (!draft || !user || !exegesis || !sermonId) return;
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

    /* TODOS LOS HOOKS VAN ANTES DE LOS RETORNOS TEMPRANOS. Este `useMemo`
       estaba DEBAJO del `if (loading) return …`: al pulsar regenerar, el paso
       renderizaba un hook menos y React abortaba con "Rendered fewer hooks
       than expected". No se veía hasta usar la única acción que enciende
       `loading` con el borrador ya en pantalla. Cualquier hook nuevo va acá
       arriba, no junto al código que lo usa. */
    /**
     * ADR-037 — el taller socrático. Alcanzable en LAS DOS ramas del paso.
     *
     * Montarlo sólo antes de generar lo dejaba invisible para todo sermón que
     * ya tiene borrador, que es justamente el caso donde el pastor tiene
     * proposición y puntos — el material que hace útil la propuesta. Sobre el
     * borrador va PLEGADO: el canvas ya ocupa la altura completa y un panel
     * abierto encima empujaría el texto fuera de la vista.
     */
    /**
     * ADR-037 — el taller socrático, con el recorrido derivado de SU bosquejo.
     *
     * El mapa y el taller viven juntos: elegir una sección en el mapa cambia el
     * taller. Separarlos obligaría a recordar en cuál se estaba trabajando, que
     * es exactamente lo que el mapa existe para evitar.
     */
    const socraticWalk = useMemo(
        () =>
            homiletics
                ? deriveSectionWalk({
                      points: (homiletics.outline?.mainPoints ?? []) as any[],
                      sermonPassage: passage,
                      proposition: homiletics.homileticalProposition,
                      // Material del estudio de ocho pasos que antes no llegaba
                      // a la redacción por ningún camino.
                      openingIllustration: rules.pastoralSeed?.pastoralAnecdote,
                      keyWords: homiletics.exegeticalStudy?.keyWords,
                  })
                : [],
        [homiletics, passage, rules.pastoralSeed?.pastoralAnecdote],
    );

    if (!homiletics) {
        return <div>{t('drafting.errors.noHomiletics')}</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">{t('drafting.loading')}</p>
                    <p className="text-sm text-muted-foreground">{t('drafting.loadingSub')}</p>
                </div>
            </div>
        );
    }


    // La sección activa por defecto es la PRIMERA PENDIENTE, no la primera del
    // recorrido: abrir en una que ya es suya le haría creer que hay algo que
    // decidir ahí.
    const activeSection =
        socraticWalk.find((s) => s.id === activeSectionId) ??
        socraticWalk.find((s) => s.status === 'pendiente') ??
        socraticWalk[0];

    // Armar el borrador: lo dispara la banda del paso.
    const armarBorrador = async (armado: SermonContent) => {
        const guardo = await archivarBorradorActual(t('drafting.versions.beforeAssemble'));
        setDraft(armado);
        // Llevarlo a ver lo que acaba de armar. El resultado de esta acción ES
        // el borrador: dejarlo en el taller lo obliga a buscarlo para saber si
        // funcionó.
        setActiveTab('draft');
        toast.success(
            guardo ? t('drafting.versions.assembledWithBackup') : t('drafting.versions.assembled'),
        );
    };

    const socraticPanel = socraticGate.enabled && homiletics && activeSection ? (
        <SocraticWorkshop
            walk={socraticWalk}
            activeSection={activeSection}
            elements={sectionElements}
            onSelectSection={setActiveSectionId}
            onChangeElements={setSectionElements}
            prose={sectionProse}
            onChangeProse={setSectionProse}
            audienceRigor={rules.audienceRigor}
            passage={passage}
            proposition={homiletics.homileticalProposition}
            points={(homiletics.outline?.mainPoints ?? []).map((p: any) => p.title)}
        />
    ) : null;

    const hayDecisiones = Object.values(sectionElements).some(hasDecisions);

    // ARMAR EL BORRADOR ES ACCIÓN DEL PASO, NO DEL PANEL. Vivía dentro del
    // taller, que es la razón por la que se perdía al cambiar de pestaña.
    const workshopActions = homiletics ? (
        <WorkshopDraftActions
            walk={socraticWalk}
            elements={sectionElements}
            prose={sectionProse}
            points={(homiletics.outline?.mainPoints ?? []) as any[]}
            proposition={homiletics.homileticalProposition}
            audienceRigor={rules.audienceRigor}
            onProseChange={setSectionProse}
            onAssemble={armarBorrador}
            hasDraft={!!draft}
            homiletics={homiletics}
        />
    ) : null;

    // LA BANDA DEL PASO ES UNA SOLA Y LAS PESTAÑAS VAN DENTRO. Vivía adentro de
    // `draftBody`, o sea dentro de la pestaña Borrador: al pasar al Taller
    // desaparecían el título y TODOS los botones del paso —publicar incluido—
    // y no quedaba forma de publicar sin volver a la otra pestaña.
    const stepHeader = draft ? (
            <WizardStepHeader
                leading={
                    socraticPanel ? (
                        /* EL TALLER VA PRIMERO: se lee de izquierda a derecha
                           en el orden del trabajo —decidir y después armar—, el
                           mismo que el asistente ya usa arriba. El borrador es
                           el resultado, no el punto de partida.
                           ABRE EN BORRADOR de todos modos, porque estas
                           pestañas sólo existen cuando YA hay uno: sin borrador
                           el taller es lo único que se muestra, así que el
                           primer trabajo empieza ahí por sí solo. Volver a
                           entrar y aterrizar en el taller lo obligaría a buscar
                           su sermón cada vez. */
                        <TabsList>
                            <TabsTrigger value="workshop">{t('drafting.tabs.workshop')}</TabsTrigger>
                            <TabsTrigger value="draft">{t('drafting.tabs.draft')}</TabsTrigger>
                        </TabsList>
                    ) : undefined
                }
                title={draft.title}
                meta={
                    activeTab === 'workshop'
                        ? t('drafting.sections.pendingCount', {
                              done: countReadySections(socraticWalk, sectionElements),
                              total: socraticWalk.length,
                          })
                        : undefined
                }
                documentActions={
                    /* LA ACCIÓN PROPIA DE LA PESTAÑA VIAJA EN LA MISMA BANDA.
                       En el taller la acción es armar el borrador; en el
                       borrador son el pasaje y regenerar. Lo que NO cambia con
                       la pestaña —publicar, guardar, volver— queda del otro
                       lado del separador, porque son del sermón y no del modo
                       en que se esté trabajando. */
                    activeTab === 'workshop' ? (
                        workshopActions
                    ) : (
                        <>

                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 bg-background border-primary/20 text-primary hover:text-primary hover:bg-primary/5"
                                onClick={() => setRightPanelMode((prev) => (prev === 'bible' ? 'chat' : 'bible'))}
                            >
                                <BookOpen className="h-4 w-4" />
                                <span className="text-xs font-medium">{passage}</span>
                            </Button>
        
                            {/* REHACER DESDE CERO ES LA SALIDA DE EMERGENCIA,
                                no una herramienta de la barra. Estaba acá con
                                el mismo peso que el pasaje, siendo la acción
                                que se salta el taller entero. */}
                            <RegenerateDraftAction
                                loading={loading}
                                workshopHasDecisions={Boolean(socraticPanel) && hayDecisiones}
                                onGoToWorkshop={() => setActiveTab('workshop')}
                                onRegenerate={(opciones) => void handleGenerate(opciones)}
                            />
                        </>
                    )
                }
                navigationActions={<>
                <Button onClick={() => setStep(2)} variant="outline" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('drafting.backToHomiletics')}
                </Button>
        
                <Button onClick={() => setShowPreview(true)} variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    {t('drafting.preview')}
                </Button>
        
                <Button onClick={handleSaveAndExit} variant="outline" size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    {t('drafting.saveAndExit')}
                </Button>
        
                <Button onClick={handlePublish} disabled={publishing || contraScan.scanning || !sermonId} size="sm">
                    {/* EL BOTÓN DICE LO QUE ESTÁ PASANDO, NO LO QUE SE PIDIÓ.
                        Antes mostraba "Publicando…" también durante el
                        contra-scan, que es la etapa LENTA (un callable de 1 GB
                        que recorre la biblioteca: ~11 s en el caso real). El
                        pastor leía "Publicando", esperaba, no veía nada, y
                        concluía que se había roto — cuando sólo estaba
                        trabajando. Le costó un intento entero. */}
                    {contraScan.scanning ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('drafting.scanningLibrary')}
                        </>
                    ) : publishing ? (
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
                </>}
            />
    ) : null;

    // Se define acá arriba para poder envolverlo en pestañas sin re-indentar
    // 180 líneas. El ternario estrecha `draft`: dentro de la rama verdadera ya
    // no es null, igual que en la rama original del render.
    const draftBody = draft ? (
        <>
            <IllustrationDuplicateBanner draft={draft} />
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
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
                                setOpenHistoryFor(null);
                                setMessages([]);
                            }}
                            onSectionUndo={handleUndo}
                            onSectionRedo={handleRedo}
                            canRedo={(sectionId) => contentHistory.canRedo(sectionId)}
                            getSectionVersions={getSectionVersions}
                            getCurrentVersionId={getCurrentVersionId}
                            onRestoreVersion={handleRestoreVersion}
                            modifiedSections={modifiedSections}
                            openHistoryFor={openHistoryFor}
                            onSectionOpenHistory={abrirHistorial}
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
                                                // El resto del sermón ya se
                                                // generó CON la voz del
                                                // predicador, el nivel de rigor
                                                // y el bosquejo. Un punto
                                                // regenerado sin eso desentona
                                                // con los demás.
                                                ...(rules.personalization ? { personalization: rules.personalization } : {}),
                                                ...(rules.audienceRigor ? { audienceRigor: rules.audienceRigor } : {}),
                                                homileticsResult: homiletics,
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
        </>
    ) : null;

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

            {socraticPanel}

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
                    <Button onClick={() => void handleGenerate()} disabled={loading} size="lg" className="w-full max-w-md mx-auto">
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t('drafting.generateBtn')}
                    </Button>
                </div>
            </Card>
        </div>
    ) : (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-4">
            {/* PESTAÑAS Y NO UN PANEL ENCIMA. Con el taller abierto sobre el
                borrador los dos competían por la misma altura y ninguno se leía
                entero. Son dos modos de trabajo —decidir ideas versus revisar
                prosa— y ninguno necesita ver al otro a la vez. El borrador queda
                de primero: es donde el pastor ya estaba.
                Los botones del paso quedan FUERA de las pestañas: navegar y
                publicar no dependen del modo en que se esté trabajando. */}
            {socraticPanel ? (
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as 'draft' | 'workshop')}
                    className="flex-1 min-h-0 flex flex-col gap-4"
                >
                    {/* La banda va DENTRO de `Tabs` porque lleva el `TabsList`:
                        las pestañas necesitan el contexto de Radix. */}
                    {stepHeader}
                    {/* NINGUNA CLASE DE `display` EN `TabsContent`.
                        Radix oculta el panel inactivo con el atributo `hidden`,
                        que la hoja del navegador implementa como `display:none`
                        — y cualquier clase de autor (`flex`, `block`) la pisa.
                        Con `flex` acá, el panel oculto seguía ocupando su
                        `flex-1` y los dos se repartían la altura: el taller
                        quedaba empujado al fondo con un hueco enorme arriba.
                        El layout va en un div INTERIOR. */}
                    <TabsContent value="draft" className="flex-1 min-h-0">
                        <div className="h-full flex flex-col gap-4">{draftBody}</div>
                    </TabsContent>
                    <TabsContent value="workshop" className="flex-1 min-h-0">
                        <div className="h-full overflow-y-auto">{socraticPanel}</div>
                    </TabsContent>
                </Tabs>
            ) : (
                <>
                    {stepHeader}
                    {draftBody}
                </>
            )}

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
                {/* Este panel usaba las claves de HOMILÉTICA
                    (`homiletics.afterGenerate*`), así que en Redacción prometía
                    cosas del paso anterior y ya hechas: elegir enfoque, refinar
                    la proposición, mejorar el bosquejo, agregar ilustraciones
                    —que el pastor acababa de escribir en el panel de al lado—.
                    Ninguna de las cuatro ocurre después de generar el borrador.
                    Reusar la clave de otro paso ahorró cuatro líneas y le mintió
                    al pastor sobre dónde está parado. Cada paso describe lo
                    suyo. */}
                {/* La FORMA antes que la lista: el esqueleto se arma con el
                    bosquejo del pastor, así que anticipa la estructura y le
                    confirma que su trabajo llegó hasta acá. */}
                <div className="pt-4 border-t text-left">
                    <h4 className="font-medium text-sm mb-2">{t('drafting.skeleton.title')}</h4>
                    <DraftSkeletonPreview homiletics={homiletics} />
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">{t('drafting.afterGenerateTitle')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                        {(t('drafting.afterGenerateList', { returnObjects: true }) as string[]).map((item, i) => (
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

            <WizardStepShell banner={<DerivedContextBanner stepHintKey="draftHint" />}>
                {/* ADR-031 — provide the citation manifest so [N] anchors in the
                    editor render as verifiable popovers (chunk + book + page). */}
                <CitationManifestContext.Provider value={draft?.citationManifest}>
                    {draft ? leftPanel : <WizardLayout leftPanel={leftPanel} rightPanel={rightPanel} />}
                </CitationManifestContext.Provider>
            </WizardStepShell>

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

            {/* Pre-publish contra-scan confrontation gate (Phase 4 PR 1, ADR-033) */}
            <ContraScanModal
                open={contraScan.modalOpen}
                onOpenChange={contraScan.setModalOpen}
                centralIdea={contraScan.centralIdea}
                dissentingChunks={contraScan.dissentingChunks}
                publishing={contraScan.persisting}
                onProceed={contraScan.confirmProceed}
                onConsider={contraScan.confirmConsideration}
                onOverride={contraScan.confirmOverride}
            />

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
/**
 * Le adjunta a cada estudio de palabra SU ANÁLISIS LÉXICO, si existe.
 *
 * POR QUÉ HACÍA FALTA: el seed guarda `wordAnalysisId` desde la Fase 1.5 y el
 * análisis cacheado (`pastoralWordAnalyses/`) trae rango semántico, uso en el
 * versículo y peso teológico — exactamente lo que el pastor espera ver en las
 * palabras clave del sermón. Nunca llegaba: el mapeo pasaba sólo su
 * descubrimiento, y el borrador lo imprimía como si fuera la glosa.
 *
 * BEST-EFFORT A PROPÓSITO. Un análisis que no está —estudio escrito a mano, o
 * caché expirada por versión curada nueva— no puede impedir que el sermón se
 * genere. Se cae al comportamiento anterior: sólo el descubrimiento del pastor,
 * pero ahora rotulado como suyo.
 */
async function hydrateWordStudies(
    studies: readonly { word: string; reference: string; pastorDiscovery: string; wordAnalysisId?: string }[],
): Promise<NonNullable<GenerationRules['pastoralSeed']>['wordStudies']> {
    return Promise.all(
        studies.map(async (w) => {
            const base = { word: w.word, reference: w.reference, discovery: w.pastorDiscovery };
            if (!w.wordAnalysisId) return base;
            try {
                const doc = await pastoralWordAnalysisReadService.findById(w.wordAnalysisId);
                if (!doc) return base;
                const a = doc.analysis;
                return {
                    ...base,
                    ...(a.gloss?.semanticRange?.length ? { semanticRange: a.gloss.semanticRange } : {}),
                    ...(a.grammaticalFunctionInVerse ? { useInVerse: a.grammaticalFunctionInVerse } : {}),
                    ...(a.theologicalWeight ? { theologicalWeight: a.theologicalWeight } : {}),
                    ...(a.lexiconSource ? { lexiconSource: String(a.lexiconSource) } : {}),
                };
            } catch (error) {
                console.warn('[StepDraft] No se pudo leer el análisis de', w.word, error);
                return base;
            }
        }),
    );
}

async function augmentRulesWithPastoralSeed(
    rules: GenerationRules,
    sermonId: string | null,
): Promise<GenerationRules> {
    if (!sermonId) return rules;
    try {
        const seed = await pastoralSeedService.getBySermonId(sermonId);
        // Fuente única de verdad: validadores, no el flag almacenado.
        if (!seed || !evaluatePastoralSeed(seed).completed) return rules;
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
                wordStudies: await hydrateWordStudies(seed.wordStudies.studies),
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
/**
 * ADR-035 R3/R7 — referencias de paralelos del pastor que NO aparecen en el
 * borrador. El prompt los marca PRIMARIOS; si el modelo igual los dejó fuera,
 * surfaceamos cuáles (warning, no auto-regen — P2).
 */
function draftMissingParallelRefs(draft: any, parallels: { reference: string }[] | undefined): string[] {
    if (!Array.isArray(parallels) || parallels.length === 0) return [];
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const haystack = [
        draft?.title ?? '',
        draft?.introduction ?? '',
        draft?.conclusion ?? '',
        draft?.callToAction ?? '',
        ...(Array.isArray(draft?.body)
            ? draft.body.flatMap((b: any) => [b?.content ?? '', ...(Array.isArray(b?.scriptureReferences) ? b.scriptureReferences : [])])
            : []),
    ]
        .map(normalize)
        .join(' \n ');
    return parallels
        .map((p) => p.reference?.trim())
        .filter((ref): ref is string => Boolean(ref) && !haystack.includes(normalize(ref)));
}

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

/**
 * Muestreo determinista por `sermonId` — mismo molde que el del spine socrático.
 * Determinista para que un mismo sermón caiga siempre del mismo lado y los
 * conteos no dependan de cuántas veces se regeneró.
 */
function shouldJudgeSample(sermonId: string): boolean {
    if (JUDGE_SHADOW_SAMPLE_1_IN <= 1) return true;
    let h = 0;
    for (let i = 0; i < sermonId.length; i++) h = (h * 31 + sermonId.charCodeAt(i)) | 0;
    return Math.abs(h) % JUDGE_SHADOW_SAMPLE_1_IN === 0;
}
