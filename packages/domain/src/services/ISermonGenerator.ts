import { ExegeticalStudy, HomileticalAnalysis, GenerationRules, SermonContent } from '../entities/SermonGenerator';
import { ChatMessage, WorkflowPhase } from '../entities/SermonWorkflow';

import { PhaseConfiguration } from '../entities/WorkflowConfiguration';

export interface ISermonGenerator {
    // ========== EXISTING METHODS ==========
    generateExegesis(passage: string, rules: GenerationRules, config?: PhaseConfiguration): Promise<ExegeticalStudy>;

    /**
     * @deprecated Use generateHomileticsPreview + developSelectedApproach instead
     * This method generates complete approaches including proposition and outline,
     * which is wasteful since only one approach will be selected.
     * 
     * Kept for backward compatibility during migration.
     */
    generateHomiletics(exegesis: ExegeticalStudy, rules: GenerationRules, config?: PhaseConfiguration): Promise<HomileticalAnalysis>;

    generateSermonDraft(analysis: HomileticalAnalysis, rules: GenerationRules, config?: PhaseConfiguration): Promise<SermonContent>;
    regenerateSermonPoint(point: any, rules: GenerationRules, context: any): Promise<any>;

    chat(phase: WorkflowPhase, history: ChatMessage[], context: any): Promise<string>;
    refineContent(content: string, instruction: string, context?: any): Promise<string>;

    // ========== NEW: TWO-PHASE HOMILETICS GENERATION ==========

    /**
     * Phase 1: Generate multiple homiletical approach previews
     * 
     * Returns 4-5 lightweight approach options without full
     * proposition or outline. This allows the preacher to quickly
     * review options and make an informed choice.
     * 
     * @pattern Two-Phase Generation
     * @solid SRP - Single Responsibility (only generates previews)
     * @solid OCP - Open/Closed (extends without modifying existing methods)
     * 
     * @param exegesis - The exegetical study to base approaches on
     * @param rules - Generation rules and preferences
     * @param config - Optional phase configuration
     * @returns List of 4-5 approach previews
     */
    generateHomileticsPreview(
        exegesis: ExegeticalStudy,
        rules: GenerationRules,
        config?: PhaseConfiguration
    ): Promise<import('../entities/HomileticalApproach').HomileticalApproachPreview[]>;

    /**
     * Phase 2: Develop a selected approach into full detail
     * 
     * Takes a chosen approach preview and generates the complete
     * homiletical proposition and detailed outline specifically
     * tuned to the approach's tone and direction.
     * 
     * @pattern Two-Phase Generation
     * @solid SRP - Single Responsibility (only develops one approach)
     * @solid LSP - Liskov Substitution (can replace deprecated method)
     * 
     * @param exegesis - The original exegetical study
     * @param selectedPreview - The approach preview chosen by the preacher
     * @param rules - Generation rules and preferences
     * @param config - Optional phase configuration
     * @returns Complete approach with proposition and outline
     */
    developSelectedApproach(
        exegesis: ExegeticalStudy,
        selectedPreview: import('../entities/HomileticalApproach').HomileticalApproachPreview,
        rules: GenerationRules,
        config?: PhaseConfiguration
    ): Promise<import('../entities/HomileticalApproach').HomileticalApproach>;
}
