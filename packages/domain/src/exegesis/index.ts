// Exegesis module — domain layer barrel.
//
// New types/contracts grouped here so consumers (application, infrastructure,
// web) can import everything from `@dosfilos/domain` without knowing the
// internal folder structure.

export * from './entities/ExegeticalPaper';
export * from './entities/ExegeticalStep';
export * from './entities/ProjectSource';
export * from './entities/UserStyleGuide';

export * from './repositories/IExegeticalPaperRepository';
export * from './repositories/IUserStyleGuideRepository';

export * from './use-cases/dtos';
