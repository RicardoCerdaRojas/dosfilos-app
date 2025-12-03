import { ExegeticalStudy, HomileticalAnalysis, GenerationRules, SermonContent } from '../entities/SermonGenerator';
import { ChatMessage, WorkflowPhase } from '../entities/SermonWorkflow';

import { PhaseConfiguration } from '../entities/WorkflowConfiguration';

export interface ISermonGenerator {
    generateExegesis(passage: string, rules: GenerationRules, config?: PhaseConfiguration): Promise<ExegeticalStudy>;
    generateHomiletics(exegesis: ExegeticalStudy, rules: GenerationRules, config?: PhaseConfiguration): Promise<HomileticalAnalysis>;
    generateSermonDraft(analysis: HomileticalAnalysis, rules: GenerationRules, config?: PhaseConfiguration): Promise<SermonContent>;

    chat(phase: WorkflowPhase, history: ChatMessage[], context: any): Promise<string>;
}
