
import React, { createContext, useContext } from 'react';
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
    const bibleAdapter: IBibleVersionRepository = {
        getVerses: (reference: string) => {
            // Use current language context if available, otherwise default to auto-detect
            // Since we are in a hook/provider, we might not have direct access to i18n instance here easily without valid context, 
            // but LocalBibleService.getVerses handles auto-detect if language is not passed which is safer.
            // However, LocalBibleService.getVerses(ref, lang) is the signature.
            // We pass 'es' as default, but the service auto-detects English references regardless.
            return LocalBibleService.getVerses(reference, 'es') || '';
        }
    };
    const getPassageText = new GetPassageTextUseCase(greekTutorService, sessionRepository, bibleAdapter); // Phase 3D: Added repository for caching
    const identifyPassageWord = new IdentifyPassageWordUseCase(greekTutorService);
    const addPassageWordToUnits = new AddPassageWordToUnitsUseCase(greekTutorService);
    
    // Phase 4A: Dashboard use cases
    const getUserSessions = new GetUserSessionsUseCase(sessionRepository);
    const deleteSession = new DeleteSessionUseCase(sessionRepository);

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
            getUserSessions,
            deleteSession,
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
