// Entities
export * from './entities/User';
export * from './entities/Feature';
export * from './entities/Subscription';
export * from './entities/PlanDefinition';
export * from './entities/Organization';
export * from './entities/Sermon';
export * from './entities/SermonSeries';
export * from './entities/LibraryResource';
export * from './entities/LibraryCategory';
export * from './entities/SermonGenerator';
export * from './entities/HomileticalApproach';  // 🎯 NEW
export * from './entities/DocumentChunk';
export * from './entities/FileSearchStoreEntity'; // 🎯 File Search Stores
export * from './entities/UserActivity'; // 📊 Analytics: User Activity
export * from './entities/UserActivitySummary'; // 📊 Analytics: User Activity Summary
export * from './entities/DailyMetrics'; // 📊 Analytics: Daily Metrics
export * from './entities/GeoEvent'; // 📊 Geographic Analytics: Events
export * from './greek-tutor/entities/entities'; // 🏛️ Greek Tutor Entities
export * from './greek-tutor/syntax-analysis'; // 🏛️ Greek Syntax Analysis
export * from './models/Plan'; // 🎯 Plan models (refactored system)



// Repositories
export * from './repositories/ISermonRepository';
export * from './repositories/ISeriesRepository';
export * from './repositories/IUserProfileRepository';
export * from './repositories/IPlanRepository';
export * from './repositories/IOrganizationRepository';
export * from './repositories/IAnalyticsRepository'; // 📊 Analytics Repository
export * from './repositories/IUserRepository'; // 📊 Admin User Repository
export * from './repositories/IUserActivityRepository'; // 📊 User Activity Repository
export * from './repositories/IGeoEventRepository'; // 📊 Geographic Event Repository


// Config
export * from './config/planMetadata';

// Services
export * from './services/IAIService';
export * from './services/IStorageService';
export * from './services/IExportService';
export * from './services/ISermonGenerator';
export * from './services/IPlanGenerator';
export * from './services/IEmbeddingService';
export * from './services/ITextExtractor';
export * from './services/ICacheService';
export * from './services/PlanService'; // 🎯 Plan Service (refactored system)
export * from './ports/IFileSearchService'; // 🎯 File Search ports
export * from './greek-tutor/ports/IGreekTutorService'; // 🏛️ Greek Tutor Ports
export * from './greek-tutor/ports/IWordCacheRepository'; // 🏛️ Greek Tutor Word Cache
export * from './greek-tutor/ports/IQuizService'; // 🎯 Phase 3A: Quiz Service
export * from './bible'; // 📖 Bible Domain (Multi-version support)


// Workflow
export * from './entities/SermonWorkflow';
export * from './entities/WorkflowConfiguration';
export * from './repositories/IWorkflowRepository';
export * from './repositories/IConfigRepository';
export * from './types/content-types';

// Strategies
export * from './strategies';
