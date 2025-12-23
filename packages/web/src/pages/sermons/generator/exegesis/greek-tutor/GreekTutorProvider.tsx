
import React, { createContext, useContext } from 'react';
import { 
    GenerateTrainingUnitsUseCase, 
    EvaluateUserResponseUseCase, 
    SaveInsightUseCase, 
    ExplainMorphologyUseCase,
    AskFreeQuestionUseCase
} from '@dosfilos/application';
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
// Phase 3A: Quiz service
import { GeminiQuizService } from '@dosfilos/infrastructure/src/greek-tutor/gemini/GeminiQuizService';

interface GreekTutorContextType {
    generateTrainingUnits: GenerateTrainingUnitsUseCase;
    evaluateUserResponse: EvaluateUserResponseUseCase;
    saveInsight: SaveInsightUseCase;
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
    const greekTutorService = new GeminiGreekTutorService(apiKey);
    const sessionRepository = new FirestoreGreekSessionRepository();
    // Phase 3A: Quiz service (hybrid caching)
    const quizService = new GeminiQuizService(apiKey, sessionRepository);

    // Instantiate Application Use Cases
    const generateTrainingUnits = new GenerateTrainingUnitsUseCase(greekTutorService, sessionRepository);
    const evaluateUserResponse = new EvaluateUserResponseUseCase(greekTutorService, sessionRepository);
    const saveInsight = new SaveInsightUseCase(sessionRepository);
    const explainMorphology = new ExplainMorphologyUseCase(greekTutorService, sessionRepository); // Phase 3C: Added repository
    const askFreeQuestion = new AskFreeQuestionUseCase(greekTutorService);
    
    // Phase 3A: Quiz use cases
    const generateQuiz = new GenerateQuizUseCase(quizService);
    const submitQuizAnswer = new SubmitQuizAnswerUseCase(sessionRepository);
    
    // Phase 3B: Passage reader use cases
    const getPassageText = new GetPassageTextUseCase(greekTutorService, sessionRepository); // Phase 3D: Added repository for caching
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
