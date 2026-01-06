
import { SermonSeriesEntity, Citation } from '../index';

export interface PlanGenerationRequest {
    type: 'thematic' | 'expository';
    topicOrBook: string;
    subtopicsOrRange?: string; // "Holiness, Sin" or "Chapters 1-3"
    numberOfSermons?: number;
    startDate: Date;
    endDate?: Date;
    frequency?: 'weekly' | 'biweekly' | 'monthly';
    contextResources: any[]; // Resources to use for RAG/Context
    plannerNotes?: string; // Additional context/notes from chat conversation
}

export interface GeneratedPlan {
    series: Partial<SermonSeriesEntity>;
    sermons: { title: string; description: string; passage?: string; week: number }[];
    structureJustification?: string;
    citations?: Citation[]; // Verified citations from library or general knowledge
}

export interface SeriesObjective {
    title: string;
    description: string;
    objective: string;
    pastoralAdvice?: string;
    suggestedSermonCount?: number;
}

export interface IPlanGenerator {
    generateSeriesObjective(request: PlanGenerationRequest): Promise<SeriesObjective>;
    generateSeriesStructure(request: PlanGenerationRequest, objective: SeriesObjective): Promise<GeneratedPlan>;
    generatePlan(request: PlanGenerationRequest): Promise<GeneratedPlan>;
}
