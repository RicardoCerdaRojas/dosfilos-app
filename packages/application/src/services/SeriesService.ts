import { FirebaseSeriesRepository, GeminiPlanGenerator } from '@dosfilos/infrastructure';
import { SermonSeriesEntity } from '@dosfilos/domain';
import { LibraryService } from './LibraryService';

export class SeriesService {
    private seriesRepository: FirebaseSeriesRepository;
    private libraryService: LibraryService;

    constructor() {
        this.seriesRepository = new FirebaseSeriesRepository();
        this.libraryService = new LibraryService();
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
            sermons: { title: string; description: string; passage?: string; week: number }[];
            frequency?: 'weekly' | 'biweekly' | 'monthly' | 'flexible';
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
                    scheduledDate: scheduledDate
                    // draftId is omitted until user starts developing
                };
            });

            // 1. Create Series Entity with planned sermons in metadata
            const series = SermonSeriesEntity.create({
                userId,
                title: plan.series.title!,
                description: plan.series.description!,
                startDate: startDate,
                type: plan.series.type!,
                metadata: {
                    ...plan.series.metadata,
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
