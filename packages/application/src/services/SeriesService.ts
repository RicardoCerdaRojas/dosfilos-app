import {
    FirebaseSeriesRepository,
    FirestoreExpositoryAssistantCacheRepository,
    GeminiExpositoryAssistant,
    GeminiPericopeDetector,
    GeminiPlanGenerator,
    EXPOSITORY_PIPELINE_VERSION,
    MorphhbOriginalLanguageProvider,
    RVR1960Repository,
    ASVRepository,
    SBLGNTBibleProvider,
} from '@dosfilos/infrastructure';
import {
    SermonSeriesEntity,
    getBookById,
    type BibleBookId,
    type IBibleVersionRepository,
    type IOriginalLanguageBibleProvider,
    type PlannedSermonExpositoryEnrichment,
    type PlannedSermonStatus,
    type SyntacticUnit,
} from '@dosfilos/domain';
import { DetectPericopesUseCase } from '../use-cases/exegesis/DetectPericopesUseCase';
import {
    loadBookVerses,
    type LoadBookVersesResult,
} from '../use-cases/exegesis/expository/loadBookVerses';
import { RunExpositoryPassesUseCase } from '../use-cases/exegesis/expository/RunExpositoryPassesUseCase';
import { CachedExpositoryAssistant } from './expository/CachedExpositoryAssistant';
import { LibraryService } from './LibraryService';

export class SeriesService {
    private seriesRepository: FirebaseSeriesRepository;
    private libraryService: LibraryService;
    public detectPericopes: DetectPericopesUseCase;
    public detectPericopesEn: DetectPericopesUseCase;
    /** v1.5 expository assistant pipeline orchestrator. */
    public expositoryPasses: RunExpositoryPassesUseCase;
    private bibleRepoEs: IBibleVersionRepository;
    private bibleRepoEn: IBibleVersionRepository;
    private greekProvider: IOriginalLanguageBibleProvider;
    private hebrewProvider: IOriginalLanguageBibleProvider;

    constructor() {
        this.seriesRepository = new FirebaseSeriesRepository();
        this.libraryService = new LibraryService();

        // Pericope assistant — composition root. We wire one use case per
        // bible source so the caller picks language at the call site
        // (the wizard exposes both via a single `detect({ ..., displayLanguage })`
        // entry point that routes to the right instance). v1.5 will fold
        // both into a single use case once the bible repository abstracts
        // language selection internally.
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        const exegesisModelId =
            (import.meta as any).env?.VITE_GEMINI_VISION_MODEL_ID || 'gemini-2.5-pro';
        const detector = new GeminiPericopeDetector(apiKey || '', exegesisModelId);
        this.bibleRepoEs = new RVR1960Repository();
        this.bibleRepoEn = new ASVRepository();
        this.detectPericopes = new DetectPericopesUseCase(this.bibleRepoEs, detector);
        this.detectPericopesEn = new DetectPericopesUseCase(this.bibleRepoEn, detector);

        // v1.6 original-language sources for the expository assistant.
        // Single-instance per provider — internal in-memory cache lives
        // at the instance, so sharing maximizes hit rate within a
        // session.
        this.greekProvider = new SBLGNTBibleProvider();
        this.hebrewProvider = new MorphhbOriginalLanguageProvider();

        // v1.5 expository assistant — single GeminiExpositoryAssistant
        // instance shared across all 5 passes. The wizard loads verses
        // once via `loadBookVersesForExpository` and threads them into
        // each pass call.
        //
        // v1.6: wrap with CachedExpositoryAssistant so Pases 1-3
        // (panorama / macro / micro) hit a Firestore cache keyed by
        // (book, language, pipelineVersion). Two pastors studying the
        // same book in the same language only pay the LLM cost once
        // for the canonical structural analysis. Pases 4-5 pass
        // through unchanged (per-pastor homiletical decisions).
        const geminiExpositoryAssistant = new GeminiExpositoryAssistant(apiKey || '', exegesisModelId);
        const expositoryCacheRepo = new FirestoreExpositoryAssistantCacheRepository();
        const cachedExpositoryAssistant = new CachedExpositoryAssistant(
            geminiExpositoryAssistant,
            expositoryCacheRepo,
            EXPOSITORY_PIPELINE_VERSION,
        );
        this.expositoryPasses = new RunExpositoryPassesUseCase(cachedExpositoryAssistant);
    }

    /**
     * Loads the verse-by-verse text for the v1.5 expository pipeline.
     * Selects the bible repository by display language so callers
     * don't need to know which translation backs each language.
     */
    async loadBookVersesForExpository(input: {
        bookId: BibleBookId;
        displayLanguage: 'es' | 'en';
    }): Promise<LoadBookVersesResult> {
        // Dispatch original-language source by testament. NT goes
        // to SBLGNT (Greek), OT goes to morphhb/WLC (Hebrew). Books
        // that don't fit either ('mixed' edge cases) get translation
        // only via the loadBookVerses fallback path.
        const book = getBookById(input.bookId);
        const originalProvider =
            book?.testament === 'NT'
                ? this.greekProvider
                : book?.testament === 'OT'
                  ? this.hebrewProvider
                  : undefined;

        return loadBookVerses({
            bookId: input.bookId,
            displayLanguage: input.displayLanguage,
            bibleRepository: input.displayLanguage === 'en' ? this.bibleRepoEn : this.bibleRepoEs,
            ...(originalProvider ? { originalLanguageProvider: originalProvider } : {}),
        });
    }

    /**
     * Dispatches to the right `DetectPericopesUseCase` based on the
     * caller's display language so the wizard reads the verses from the
     * matching translation (RVR for ES, ASV for EN).
     */
    async runPericopeAssistant(input: {
        bookId: import('@dosfilos/domain').BibleBookId;
        displayLanguage: 'es' | 'en';
        targetPericopeCount?: number;
    }) {
        const useCase = input.displayLanguage === 'en' ? this.detectPericopesEn : this.detectPericopes;
        return useCase.execute(input);
    }

    private async retry<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            // Retry on network errors or specific firebase offline errors
            if (retries > 0 && (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('network'))) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retry(operation, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    async createSeries(data: {
        userId: string;
        title: string;
        description: string;
        startDate?: Date;
        endDate?: Date;
        coverUrl?: string;
    }): Promise<SermonSeriesEntity> {
        try {
            const series = SermonSeriesEntity.create({
                userId: data.userId,
                title: data.title,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                coverUrl: data.coverUrl,
                type: 'manual',
                resourceIds: [],
                sermonIds: [],
                draftIds: []
            });
            return await this.retry(() => this.seriesRepository.create(series));
        } catch (error: any) {
            throw new Error(error.message || 'Error al crear la serie');
        }
    }

    async updateSeries(
        id: string,
        data: Partial<{
            title: string;
            description: string;
            startDate?: Date;
            endDate?: Date;
            coverUrl: string;
            sermonIds: string[];
        }>
    ): Promise<SermonSeriesEntity> {
        try {
            const series = await this.retry(() => this.seriesRepository.findById(id));
            if (!series) {
                throw new Error('Serie no encontrada');
            }
            const updatedSeries = series.update(data);
            return await this.retry(() => this.seriesRepository.update(updatedSeries));
        } catch (error: any) {
            throw new Error(error.message || 'Error al actualizar la serie');
        }
    }

    async deleteSeries(id: string): Promise<void> {
        try {
            await this.retry(() => this.seriesRepository.delete(id));
        } catch (error: any) {
            throw new Error(error.message || 'Error al eliminar la serie');
        }
    }

    async getSeries(id: string): Promise<SermonSeriesEntity | null> {
        try {
            return await this.retry(() => this.seriesRepository.findById(id));
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener la serie');
        }
    }

    async getUserSeries(userId: string): Promise<SermonSeriesEntity[]> {
        try {
            return await this.retry(() => this.seriesRepository.findByUserId(userId));
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener las series');
        }
    }

    async addSermonToSeries(seriesId: string, sermonId: string): Promise<void> {
        try {
            const series = await this.retry(() => this.seriesRepository.findById(seriesId));
            if (!series) {
                throw new Error('Serie no encontrada');
            }
            const updatedSeries = series.addSermon(sermonId);
            await this.retry(() => this.seriesRepository.update(updatedSeries));
        } catch (error: any) {
            throw new Error(error.message || 'Error al agregar sermón a la serie');
        }
    }

    async removeSermonFromSeries(seriesId: string, sermonId: string): Promise<void> {
        try {
            const series = await this.retry(() => this.seriesRepository.findById(seriesId));
            if (!series) {
                throw new Error('Serie no encontrada');
            }
            const updatedSeries = series.removeSermon(sermonId);
            await this.retry(() => this.seriesRepository.update(updatedSeries));
        } catch (error: any) {
            throw new Error(error.message || 'Error al remover sermón de la serie');
        }
    }
    async generateSeriesObjective(
        userId: string,
        request: {
            type: 'thematic' | 'expository';
            topicOrBook: string;
            subtopicsOrRange?: string;
            startDate?: Date;
            endDate?: Date;
            frequency?: 'weekly' | 'biweekly' | 'monthly';
            contextResourceIds: string[];
            plannerNotes?: string; // Additional context/notes from chat conversation
            language?: string;
        }
    ) {
        try {
            // Fetch User Resources
            const userResources = await this.retry(() => this.libraryService.getUserResources(userId));
            const selectedUserResources = userResources.filter(r => request.contextResourceIds.includes(r.id));

            // Fetch Core Resources (Always included)
            const coreResources = await this.retry(() => this.libraryService.getCoreResources());

            // Merge resources (Core first, then User)
            const allResources = [...coreResources, ...selectedUserResources];

            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('Gemini API Key not found');

            const generator = new GeminiPlanGenerator(apiKey);
            return await generator.generateSeriesObjective({
                ...request,
                subtopicsOrRange: request.subtopicsOrRange,
                plannerNotes: request.plannerNotes,
                numberOfSermons: 0, // Not needed for objective
                startDate: request.startDate, // Not needed for objective but passed if exists
                contextResources: allResources,
                language: request.language
            });
        } catch (error: any) {
            throw new Error(error.message || 'Error al generar objetivo');
        }
    }

    async generateSeriesStructure(
        userId: string,
        request: {
            type: 'thematic' | 'expository';
            topicOrBook: string;
            subtopicsOrRange?: string;
            numberOfSermons?: number;
            startDate?: Date;
            endDate?: Date;
            frequency?: 'weekly' | 'biweekly' | 'monthly';
            contextResourceIds: string[];
            language?: string;
        },
        objective: { title: string; description: string; objective: string }
    ) {
        try {
            // Fetch User Resources
            const userResources = await this.retry(() => this.libraryService.getUserResources(userId));
            const selectedUserResources = userResources.filter(r => request.contextResourceIds.includes(r.id));

            // Fetch Core Resources (Always included)
            const coreResources = await this.retry(() => this.libraryService.getCoreResources());

            // Merge resources (Core first, then User)
            const allResources = [...coreResources, ...selectedUserResources];

            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('Gemini API Key not found');

            const generator = new GeminiPlanGenerator(apiKey);
            return await generator.generateSeriesStructure({
                ...request,
                contextResources: allResources,
                language: request.language
            }, objective);
        } catch (error: any) {
            throw new Error(error.message || 'Error al generar estructura');
        }
    }

    async createSeriesFromPlan(
        userId: string,
        plan: {
            series: Partial<SermonSeriesEntity>;
            sermons: {
                title: string;
                description: string;
                passage?: string;
                week: number;
                // Pericope-assistant-driven fields (Phase 3). All optional —
                // legacy callers (manual SeriesForm, thematic planner) keep
                // working unchanged.
                paperId?: string;
                syntacticUnit?: SyntacticUnit;
                status?: PlannedSermonStatus;
                /**
                 * v1.5 expository pipeline output. Captured per
                 * preachable unit and persisted on the planned sermon
                 * so SeriesDetail / paper / Faculty contexts can
                 * surface the propositions and pastoral aim without
                 * re-querying the assistant.
                 */
                expositoryEnrichment?: PlannedSermonExpositoryEnrichment;
            }[];
            frequency?: 'weekly' | 'biweekly' | 'monthly' | 'flexible';
            expositoryAssistant?: {
                version?: string;
                status?: 'pending' | 'running' | 'reviewed';
            };
        }
    ): Promise<SermonSeriesEntity> {
        try {
            const startDate = plan.series.startDate ? new Date(plan.series.startDate) : undefined;
            const frequency = plan.frequency || 'weekly';

            // Create planned sermons with calculated dates (stored as metadata, NOT actual sermons)
            const plannedSermons = plan.sermons.map((sermonData) => {
                let scheduledDate: Date | undefined;

                if (startDate && frequency !== 'flexible') {
                    scheduledDate = new Date(startDate);
                    const weekOffset = sermonData.week - 1;

                    if (frequency === 'weekly') {
                        scheduledDate.setDate(scheduledDate.getDate() + (weekOffset * 7));
                    } else if (frequency === 'biweekly') {
                        scheduledDate.setDate(scheduledDate.getDate() + (weekOffset * 14));
                    } else if (frequency === 'monthly') {
                        scheduledDate.setMonth(scheduledDate.getMonth() + weekOffset);
                    }
                }

                return {
                    id: crypto.randomUUID(),
                    week: sermonData.week,
                    title: sermonData.title,
                    description: sermonData.description,
                    passage: sermonData.passage || '', // Ensure passage exists
                    scheduledDate: scheduledDate,
                    paperId: sermonData.paperId,
                    syntacticUnit: sermonData.syntacticUnit,
                    status: sermonData.status,
                    expositoryEnrichment: sermonData.expositoryEnrichment,
                    // draftId is omitted until user starts developing
                };
            });

            // Merge pericope-assistant metadata into expository without
            // clobbering pre-existing fields (book, chapterRange) the
            // caller may have set.
            const incomingMetadata = plan.series.metadata ?? {};
            const expository = plan.expositoryAssistant
                ? {
                      ...incomingMetadata.expository,
                      pericopeAssistantVersion: plan.expositoryAssistant.version,
                      pericopeAssistantStatus: plan.expositoryAssistant.status,
                  }
                : incomingMetadata.expository;

            // 1. Create Series Entity with planned sermons in metadata
            const series = SermonSeriesEntity.create({
                userId,
                title: plan.series.title!,
                description: plan.series.description!,
                startDate: startDate,
                type: plan.series.type!,
                metadata: {
                    ...incomingMetadata,
                    expository,
                    plannedSermons: plannedSermons
                },
                resourceIds: plan.series.resourceIds || [],
                sermonIds: [],
                draftIds: []  // Empty - drafts will be created on-demand
            });

            // 2. Save Series (no sermons created!)
            return await this.retry(() => this.seriesRepository.create(series));
        } catch (error: any) {
            throw new Error(error.message || 'Error al guardar el plan');
        }
    }

    // Legacy method kept for compatibility or full-auto mode if needed
    async generatePlan(
        userId: string,
        request: {
            type: 'thematic' | 'expository';
            topicOrBook: string;
            subtopicsOrRange?: string;
            numberOfSermons: number;
            startDate: Date;
            contextResourceIds: string[];
        }
    ): Promise<SermonSeriesEntity> {
        try {
            // 1. Fetch context resources
            const userResources = await this.retry(() => this.libraryService.getUserResources(userId));
            const contextResources = userResources.filter(r => request.contextResourceIds.includes(r.id));

            // 2. Generate Plan Structure
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('Gemini API Key not found');

            const generator = new GeminiPlanGenerator(apiKey);
            const plan = await generator.generatePlan({
                ...request,
                contextResources
            });

            return this.createSeriesFromPlan(userId, {
                series: {
                    ...plan.series,
                    resourceIds: request.contextResourceIds
                },
                sermons: plan.sermons
            });
        } catch (error: any) {
            throw new Error(error.message || 'Error al generar el plan de predicación');
        }
    }
}

export const seriesService = new SeriesService();
