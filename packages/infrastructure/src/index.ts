export * from './config/firebase';
export * from './firebase/FirebaseConfigRepository';
export * from './firebase/FirebaseStorageService';
export * from './firebase/FirebaseAuthRepository';
export * from './firebase/FirebaseSermonRepository';
export * from './firebase/FirebaseSeriesRepository';
export * from './firebase/FirebaseLibraryRepository';
export * from './firebase/FirebaseLibraryCategoryRepository';
export * from './firebase/FirebaseChunkRepository';
export * from './firebase/FirestoreVectorRepository';
export * from './firebase/FirebaseUserProfileRepository';
export * from './firebase/FirebasePlanRepository';
export * from './firebase/FirebaseAnalyticsRepository'; // 📊 Analytics Repository
export * from './firebase/FirebaseUserRepository'; // 📊 Admin User Repository
export * from './firebase/FirebaseUserActivityRepository'; // 📊 User Activity Repository
export * from './firebase/FirestoreAIChatRepository'; // 🎓 Multi-Agent Chat Repository
export * from './firebase/FirestoreAIProjectRepository'; // 🎓 Multi-Agent Project Repository
export * from './firebase/FirestoreExegeticalPaperRepository'; // ✍️ Exegesis Module — paper repo
export * from './gemini/GeminiAIService';
export * from './gemini/GeminiSermonGenerator';
export * from './gemini/GeminiPlanGenerator';
export * from './gemini/GeminiEmbeddingService';
export * from './gemini/GeminiFileSearchService';
export * from './gemini/GeminiMultiAgentService'; // 🎓 Multi-Agent AI Service
export * from './firebase/MockAIAgentRepository'; // 🎓 Catalog of AI faculty agents
export * from './firebase/FirestoreAIAgentRepository'; // 🎓 Live DB of AI faculty agents
export * from './greek-tutor/gemini/GeminiGreekTutorService'; // 🏛️ Greek Tutor Service
export * from './greek-tutor/repositories/FirestoreGreekSessionRepository';
export * from './services/DocumentProcessingService';
export * from './services/AnalyticsService'; // 📊 Analytics Tracking Service
export * from './cache/MemoryCacheService';
export * from './export/PdfExportService';
export * from './strategies';
export * from './firebase/FirebaseGeoEventRepository'; // 📊 Geographic Event Repository
export * from './services/GeolocationService'; // 📊 IP Geolocation Service
export * from './bible'; // 📖 Bible Multi-version Repositories

// Hebrew Tutor
export * from './hebrew-tutor/index.js';
