export { CreateExegeticalPaperUseCase } from './CreateExegeticalPaperUseCase';
export { ListExegeticalPapersUseCase } from './ListExegeticalPapersUseCase';
export { GetExegeticalPaperUseCase } from './GetExegeticalPaperUseCase';
export { ArchiveExegeticalPaperUseCase } from './ArchiveExegeticalPaperUseCase';
export { UpdatePaperBriefUseCase } from './UpdatePaperBriefUseCase';
export { UpdateStepPlanUseCase } from './UpdateStepPlanUseCase';
export { UpdateRubricUseCase } from './UpdateRubricUseCase';
export { ResetRubricUseCase } from './ResetRubricUseCase';
export { ExtractRubricFromTextUseCase } from './ExtractRubricFromTextUseCase';
export { ExtractStyleGuideManifestUseCase } from './ExtractStyleGuideManifestUseCase';

// User-level rubric templates
export { ListUserRubricsUseCase } from './ListUserRubricsUseCase';
export { CreateUserRubricUseCase } from './CreateUserRubricUseCase';
export { UpdateUserRubricUseCase } from './UpdateUserRubricUseCase';
export { DeleteUserRubricUseCase } from './DeleteUserRubricUseCase';
export { SetDefaultUserRubricUseCase } from './SetDefaultUserRubricUseCase';
export { ApplyRubricTemplateToPaperUseCase } from './ApplyRubricTemplateToPaperUseCase';
export { SaveCurrentRubricAsTemplateUseCase } from './SaveCurrentRubricAsTemplateUseCase';
export { CreateUserRubricFromTextUseCase } from './CreateUserRubricFromTextUseCase';

// User style guides
export { ListUserStyleGuidesUseCase } from './ListUserStyleGuidesUseCase';
export { GetActiveStyleGuideUseCase } from './GetActiveStyleGuideUseCase';
export { CreateUserStyleGuideUseCase } from './CreateUserStyleGuideUseCase';
export { SetActiveStyleGuideUseCase } from './SetActiveStyleGuideUseCase';
export { UpdateUserStyleGuideUseCase } from './UpdateUserStyleGuideUseCase';
export { DeleteUserStyleGuideUseCase } from './DeleteUserStyleGuideUseCase';

// Project sources
export { AddProjectSourceUseCase } from './AddProjectSourceUseCase';
export { UpdateProjectSourceUseCase } from './UpdateProjectSourceUseCase';
export { RemoveProjectSourceUseCase } from './RemoveProjectSourceUseCase';
export {
    ExtractExcerptsForPaperUseCase,
    type ExtractExcerptsForPaperInput,
    type ExtractExcerptsForPaperOutput,
    type ExtractExcerptsSelection,
} from './ExtractExcerptsForPaperUseCase';
export {
    RankLibraryResourcesForPaperUseCase,
    type RankLibraryResourcesForPaperInput,
    type RankLibraryResourcesForPaperOutput,
} from './RankLibraryResourcesForPaperUseCase';

// Steps (D.1: state machine + placeholder generation; Gemini lands in D.2)
export { SeedStepsForPassageUseCase } from './SeedStepsForPassageUseCase';
export { GenerateStepUseCase } from './GenerateStepUseCase';
export { AcceptStepUseCase } from './AcceptStepUseCase';
export { SaveStepEditUseCase } from './SaveStepEditUseCase';

// Bridge: paper → sermon (Phase 2 of the sermon-series pipeline)
export {
    GenerateSermonFromPaperUseCase,
    type GenerateSermonFromPaperInput,
    type GenerateSermonFromPaperOutput,
} from './GenerateSermonFromPaperUseCase';

// Pericope assistant (Phase 3 of the sermon-series pipeline)
export {
    DetectPericopesUseCase,
    type DetectPericopesInput,
} from './DetectPericopesUseCase';

// Expository assistant pipeline (v1.5)
export { loadBookVerses, type LoadBookVersesInput, type LoadBookVersesResult } from './expository/loadBookVerses';
export {
    RunExpositoryPassesUseCase,
    type PanoramaCallInput,
    type MacroCallInput,
    type MicroCallInput,
    type PreachableCallInput,
    type FidelityCallInput,
} from './expository/RunExpositoryPassesUseCase';
