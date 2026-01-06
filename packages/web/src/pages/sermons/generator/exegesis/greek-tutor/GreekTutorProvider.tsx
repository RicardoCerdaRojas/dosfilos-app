
import React, { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    GenerateTrainingUnitsUseCase, 
    EvaluateUserResponseUseCase, 
    SaveInsightUseCase, 
    ExplainMorphologyUseCase,
    AskFreeQuestionUseCase
} from '@dosfilos/application';
// New insight management use cases
import { GetUserInsightsUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/GetUserInsightsUseCase';
import { UpdateInsightUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/UpdateInsightUseCase';
import { DeleteInsightUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/DeleteInsightUseCase';
// Phase 3A: Quiz use cases
import { GenerateQuizUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/GenerateQuizUseCase';
import { SubmitQuizAnswerUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/SubmitQuizAnswerUseCase';
// Phase 3B: Passage reader use cases
import { GetPassageTextUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/GetPassageTextUseCase';
import { IdentifyPassageWordUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/IdentifyPassageWordUseCase';
import { AddPassageWordToUnitsUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/AddPassageWordToUnitsUseCase';
// Phase 4A: Dashboard use cases
import { GetUserSessionsUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/GetUserSessionsUseCase';
import { DeleteSessionUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/DeleteSessionUseCase';
import { GeminiGreekTutorService, FirestoreGreekSessionRepository } from '@dosfilos/infrastructure';
import { IBibleVersionRepository } from '@dosfilos/domain';
import { AnalyzePassageSyntaxUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/AnalyzePassageSyntaxUseCase';
import { LocalBibleService } from '@/services/LocalBibleService';
// Word cache for reducing API costs
import { FirestoreWordCacheRepository } from '@dosfilos/infrastructure/src/greek-tutor/cache/FirestoreWordCacheRepository';
// Phase 3A: Quiz service
import { GeminiQuizService } from '@dosfilos/infrastructure/src/greek-tutor/gemini/GeminiQuizService';
import { getFirestore } from 'firebase/firestore';

interface GreekTutorContextType {
    generateTrainingUnits: GenerateTrainingUnitsUseCase;
    evaluateUserResponse: EvaluateUserResponseUseCase;
    saveInsight: SaveInsightUseCase;
    getUserInsights: GetUserInsightsUseCase;
    updateInsight: UpdateInsightUseCase;
    deleteInsight: DeleteInsightUseCase;
    explainMorphology: ExplainMorphologyUseCase;
    askFreeQuestion: AskFreeQuestionUseCase;
    // Phase 3A: Quiz use cases
    generateQuiz: GenerateQuizUseCase;
    submitQuizAnswer: SubmitQuizAnswerUseCase;
    // Phase 3B: Passage reader use cases
    getPassageText: GetPassageTextUseCase;
    identifyPassageWord: IdentifyPassageWordUseCase;
    addPassageWordToUnits: AddPassageWordToUnitsUseCase;
    analyzePassageSyntax: AnalyzePassageSyntaxUseCase;
    // Phase 4A: Dashboard use cases
    getUserSessions: GetUserSessionsUseCase;
    deleteSession: DeleteSessionUseCase;
    sessionRepository: FirestoreGreekSessionRepository; // Exposed for QuizSection
}

const GreekTutorContext = createContext<GreekTutorContextType | null>(null);

export const GreekTutorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Determine API Key from environment
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    
    // Instantiate Infrastructure
    const firestore = getFirestore();
    const wordCacheRepository = new FirestoreWordCacheRepository(firestore);
    const greekTutorService = new GeminiGreekTutorService(apiKey, wordCacheRepository);
    const sessionRepository = new FirestoreGreekSessionRepository();
    // Phase 3A: Quiz service (hybrid caching)
    const quizService = new GeminiQuizService(apiKey, sessionRepository);

    // Instantiate Application Use Cases
    const generateTrainingUnits = new GenerateTrainingUnitsUseCase(greekTutorService, sessionRepository);
    const evaluateUserResponse = new EvaluateUserResponseUseCase(greekTutorService, sessionRepository);
    const saveInsight = new SaveInsightUseCase(sessionRepository);
    const getUserInsights = new GetUserInsightsUseCase(sessionRepository);
    const updateInsight = new UpdateInsightUseCase(sessionRepository);
    const deleteInsight = new DeleteInsightUseCase(sessionRepository);
    const explainMorphology = new ExplainMorphologyUseCase(greekTutorService, sessionRepository); // Phase 3C: Added repository
    const askFreeQuestion = new AskFreeQuestionUseCase(greekTutorService);
    
    // Phase 3A: Quiz use cases
    const generateQuiz = new GenerateQuizUseCase(quizService);
    const submitQuizAnswer = new SubmitQuizAnswerUseCase(sessionRepository);
    
    // Phase 3B: Passage reader use cases
    // Phase 3B: Passage reader use cases
    const { i18n } = useTranslation();

    // Mapping for book names to ensure correct language text is fetched
    const BOOK_TRANSLATIONS: Record<string, { es: string, en: string }> = useMemo(() => ({
        'romans': { es: 'Romanos', en: 'Romans' }, 'romanos': { es: 'Romanos', en: 'Romans' },
        'john': { es: 'Juan', en: 'John' }, 'juan': { es: 'Juan', en: 'John' },
        'matthew': { es: 'Mateo', en: 'Matthew' }, 'mateo': { es: 'Mateo', en: 'Matthew' },
        'mark': { es: 'Marcos', en: 'Mark' }, 'marcos': { es: 'Marcos', en: 'Mark' },
        'luke': { es: 'Lucas', en: 'Luke' }, 'lucas': { es: 'Lucas', en: 'Luke' },
        'acts': { es: 'Hechos', en: 'Acts' }, 'hechos': { es: 'Hechos', en: 'Acts' },
        'genesis': { es: 'Génesis', en: 'Genesis' }, 'génesis': { es: 'Génesis', en: 'Genesis' },
        'exodus': { es: 'Éxodo', en: 'Exodus' }, 'éxodo': { es: 'Éxodo', en: 'Exodus' },
        // Add more common books as needed
    }), []);

    const translateReference = (reference: string, targetLang: string): string => {
        const lowerRef = reference.toLowerCase();
        const match = lowerRef.match(/^((?:\d\s)?[a-z\u00C0-\u00FF]+)\s+(.+)$/);
        
        if (!match) return reference;

        const bookName = match[1].trim(); 
        const rest = match[2];

        // Find translation
        const entry = BOOK_TRANSLATIONS[bookName] || Object.values(BOOK_TRANSLATIONS).find(e => e.en.toLowerCase() === bookName || e.es.toLowerCase() === bookName);

        if (entry) {
            const translatedBook = targetLang === 'es' ? entry.es : entry.en;
            // capitalize first letter
            const capitalizedBook = translatedBook.charAt(0).toUpperCase() + translatedBook.slice(1);
            return `${capitalizedBook} ${rest}`;
        }

        return reference;
    };

    const bibleAdapter: IBibleVersionRepository = useMemo(() => ({
        getVerses: (reference: string) => {
            // Translate reference to match current UI language
            // This ensures "Romans 12:1-2" fetches "Romanos 12:1-2" (RVR1960) when in Spanish mode
            const currentLang = i18n.language?.startsWith('es') ? 'es' : 'en';
            const localizedReference = translateReference(reference, currentLang);
            
            console.log(`[GreekTutorProvider] Fetching verses for: ${localizedReference} (Original: ${reference}, Lang: ${currentLang})`);
            
            return LocalBibleService.getVerses(localizedReference) || '';
        },
        // Implement missing properties to satisfy interface
        getVersionId: () => 'local-auto',
        getLanguage: () => i18n.language?.startsWith('es') ? 'es' : 'en',
        parseReference: (ref) => ({ book: ref, chapter: 1, verseStart: 1 }), // Dummy implementation
        isValidBook: () => true,
        getBooks: () => [],
        search: () => Promise.resolve([]),
        getVerseText: () => '',
        getChapterText: () => ''
    }), [i18n.language, BOOK_TRANSLATIONS]);

    // Re-create use cases when dependencies change (e.g. language adapter)
    const getPassageText = useMemo(() => new GetPassageTextUseCase(greekTutorService, sessionRepository, bibleAdapter), [bibleAdapter]);
    const identifyPassageWord = useMemo(() => new IdentifyPassageWordUseCase(greekTutorService), []);
    const addPassageWordToUnits = useMemo(() => new AddPassageWordToUnitsUseCase(greekTutorService), []);
    const analyzePassageSyntax = useMemo(() => new AnalyzePassageSyntaxUseCase(greekTutorService, sessionRepository), []);
    
    // Phase 4A: Dashboard use cases
    const getUserSessions = useMemo(() => new GetUserSessionsUseCase(sessionRepository), []);
    const deleteSessionUse = useMemo(() => new DeleteSessionUseCase(sessionRepository), []);

    return (
        <GreekTutorContext.Provider value={{ 
            generateTrainingUnits, 
            evaluateUserResponse, 
            saveInsight,
            getUserInsights,
            updateInsight,
            deleteInsight,
            explainMorphology,
            askFreeQuestion,
            generateQuiz,
            submitQuizAnswer,
            getPassageText,
            identifyPassageWord,
            addPassageWordToUnits,
            analyzePassageSyntax,
            getUserSessions,
            deleteSession: deleteSessionUse,
            sessionRepository
        }}>
            {children}
        </GreekTutorContext.Provider>
    );
};

export const useGreekTutor = () => {
    const context = useContext(GreekTutorContext);
    if (!context) {
        throw new Error('useGreekTutor must be used within a GreekTutorProvider');
    }
    return context;
};
