// Entities
export * from './entities/User';
export * from './entities/citationRights';
export * from './entities/Confession';
export * from './entities/CreditPack';
export * from './entities/ExegesisOperationCatalog';
export * from './services/computeExegesisQuotaState';
export * from './services/aggregateRagSources';
export * from './services/validateCitations';
export * from './services/buildCitationManifest';
export * from './services/aggregateRequiredAttributions';
export * from './services/detectIllustrationDuplicates';
export * from './entities/LlamaParseAccount';
export * from './entities/Feature';
export * from './entities/Subscription';
export * from './entities/PlanDefinition';
export * from './entities/UsageCounter';
export * from './entities/Organization';
export * from './entities/Sermon';
export * from './entities/SermonSeries';
export * from './entities/LibraryResource';
export * from './entities/LibraryCategory';
export * from './entities/extractionEstimate';
export * from './entities/SermonGenerator';
export * from './entities/PastoralSeed'; // 🌱 Pastoral Fidelity Phase 1 — six-step spine seed
export * from './repositories/IPastoralSeedRepository';
export * from './entities/PastoralWordAnalysis'; // 🌱 Pastoral Fidelity Phase 1.5 — Pastoral Word Study types
export * from './bible/inferLanguageFromBook'; // 🌱 Phase 1.5 — book → original language heuristic
export * from './services/IPastoralWordStudyService'; // 🌱 Phase 1.5 — service port
export * from './entities/HomileticalApproach';  // 🎯 NEW
export * from './entities/DocumentChunk';
export * from './entities/FileSearchStoreEntity'; // 🎯 File Search Stores
export * from './entities/UserActivity'; // 📊 Analytics: User Activity
export * from './entities/UserActivitySummary'; // 📊 Analytics: User Activity Summary
export * from './entities/DailyMetrics'; // 📊 Analytics: Daily Metrics
export * from './entities/GeoEvent'; // 📊 Geographic Analytics: Events
export type { GreekForm, TrainingUnit, ChatMessage as GreekTutorChatMessage, UserResponse, StudySession, ExegeticalInsight, MorphemeComponent, MorphologyBreakdown, QuizQuestion, QuizAttempt, UnitProgress, SessionProgress, BiblicalPassage, PassageWord, UnitPreview } from './greek-tutor/entities/entities'; // 🏛️ Greek Tutor Entities
export * from './greek-tutor/syntax-analysis'; // 🏛️ Greek Syntax Analysis
export * from './models/Plan'; // 🎯 Plan models (refactored system)


// Multi-Agent Faculty Entities
export * from './entities/AIAgent';
export * from './entities/AIChatSession';
export * from './entities/AIProject';
export * from './entities/Extraction';
export * from './entities/WordpressIntegration';
export * from './entities/SermonPersonalization';
export * from './services/sermonPersonalizationFormatter';

// Repositories
export * from './repositories/ISermonRepository';
export * from './repositories/ISermonWizardChatRepository';
export * from './repositories/ISeriesRepository';
export * from './repositories/IUserProfileRepository';
export * from './repositories/IPlanRepository';
export * from './repositories/IOrganizationRepository';
export * from './repositories/IAnalyticsRepository'; // 📊 Analytics Repository
export * from './repositories/IUserRepository'; // 📊 Admin User Repository
export * from './repositories/IUserActivityRepository'; // 📊 User Activity Repository
export * from './repositories/IGeoEventRepository'; // 📊 Geographic Event Repository
export * from './repositories/IAIAgentRepository'; // 🎓 Multi-Agent Agent Repository
export * from './repositories/IAIChatRepository'; // 🎓 Multi-Agent Chat Repository
export * from './repositories/IAIProjectRepository'; // 🎓 Multi-Agent Project Repository
export * from './repositories/IExtractionRepository'; // 🎓 Multi-Agent Persisted Extractions
export * from './repositories/IUserIntegrationsRepository'; // 🎓 Per-user 3rd-party integration creds
export * from './repositories/IAuthRepository';
export * from './repositories/IVectorRepository';
export * from './repositories/IConfessionRepository';
export * from './repositories/ICrossReferenceRepository';
export * from './bible/cross-references/CrossReference';

// Config
export * from './config/planMetadata';
export * from './config/planIds';

// Services
export * from './services/IAIService';
export * from './services/IStorageService';
export * from './services/IExportService';
export * from './services/ISermonGenerator';
export * from './services/ISermonRepurposer';
export * from './services/IPlanGenerator';
export * from './services/IEmbeddingService';
export * from './services/ITextExtractor';
export * from './services/ICacheService';
export * from './services/PlanService'; // 🎯 Plan Service (refactored system)
export * from './services/IAIGeneratorService'; // 🎓 Multi-Agent Generator Service
export * from './ports/IFileSearchService'; // 🎯 File Search ports
export * from './greek-tutor/ports/IGreekTutorService'; // 🏛️ Greek Tutor Ports
export * from './greek-tutor/ports/IWordCacheRepository'; // 🏛️ Greek Tutor Word Cache
export * from './greek-tutor/ports/IQuizService'; // 🎯 Phase 3A: Quiz Service
export * from './bible'; // 📖 Bible Domain (Multi-version support)
export * from './exegesis'; // ✍️ Exegesis Module (paper-writing wizard)
export * from './library'; // 📚 Library helpers (smart-match book inference)


// Workflow
export { WorkflowPhase } from './entities/SermonWorkflow';
export type { ChatMessage as SermonWorkflowChatMessage, PhaseResult, SermonWorkflow, CreateWorkflowDTO } from './entities/SermonWorkflow';
export * from './entities/WorkflowConfiguration';
export * from './repositories/IWorkflowRepository';
export * from './repositories/IConfigRepository';
export type { ContentType, WorkflowPhase as ContentWorkflowPhase, QuickAction, CanvasChatMessage, ContentAdapter, CanvasChatProps } from './types/content-types';
export * from './types/i18n';

// Strategies
export * from './strategies';

// Hebrew Tutor
export * from './hebrew-tutor/index.js';
