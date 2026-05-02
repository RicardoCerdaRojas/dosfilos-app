// Exegesis module — domain layer barrel.
//
// New types/contracts grouped here so consumers (application, infrastructure,
// web) can import everything from `@dosfilos/domain` without knowing the
// internal folder structure.

export * from './entities/ExegeticalPaper';
export * from './entities/ExegeticalStep';
export * from './entities/PaperRubric';
export * from './entities/ProjectSource';
export * from './entities/SourceType';
export * from './entities/StepSourcePlan';
export * from './entities/StyleGuideManifest';
export * from './entities/UserRubric';
export * from './entities/UserStyleGuide';

export * from './repositories/IExegeticalPaperRepository';
export * from './repositories/IUserRubricRepository';
export * from './repositories/IUserStyleGuideRepository';

export * from './use-cases/dtos';

export * from './ports/IExcerptExtractor';
export * from './ports/IExegesisOrchestrator';
export * from './ports/IExpositoryAssistant';
export * from './ports/IPaperRubricExtractor';
export * from './ports/IPaperToSermonTransformer';
export * from './ports/IPericopeDetector';
export * from './ports/IResourceContentReader';
export * from './ports/IStyleFormatter';
export * from './ports/IStyleGuideManifestExtractor';

// Expository assistant pipeline (v1.5) — 5-pass methodology for
// dividing a biblical book into preachable units while preserving
// the distinction between exegetical division and preachable division.
export * from './expository/BookPanorama';
export * from './expository/cache';
export * from './expository/ExegeticalUnit';
export * from './expository/ExpositoryAssistantRun';
export * from './expository/FidelityReview';
export * from './expository/MacroSection';
export * from './expository/PreachableUnit';
