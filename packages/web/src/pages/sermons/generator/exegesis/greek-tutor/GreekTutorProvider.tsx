
import React, { createContext, useContext } from 'react';
import { 
    GenerateTrainingUnitsUseCase, 
    EvaluateUserResponseUseCase, 
    SaveInsightUseCase, 
    ExplainMorphologyUseCase,
    AskFreeQuestionUseCase
} from '@dosfilos/application';
import { GeminiGreekTutorService, FirestoreGreekSessionRepository } from '@dosfilos/infrastructure';

interface GreekTutorContextType {
    generateTrainingUnits: GenerateTrainingUnitsUseCase;
    evaluateUserResponse: EvaluateUserResponseUseCase;
    saveInsight: SaveInsightUseCase;
    explainMorphology: ExplainMorphologyUseCase;
    askFreeQuestion: AskFreeQuestionUseCase;
}

const GreekTutorContext = createContext<GreekTutorContextType | null>(null);

export const GreekTutorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Determine API Key from environment
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    
    // Instantiate Infrastructure
    const greekTutorService = new GeminiGreekTutorService(apiKey);
    const sessionRepository = new FirestoreGreekSessionRepository();

    // Instantiate Application Use Cases
    const generateTrainingUnits = new GenerateTrainingUnitsUseCase(greekTutorService, sessionRepository);
    const evaluateUserResponse = new EvaluateUserResponseUseCase(greekTutorService, sessionRepository);
    const saveInsight = new SaveInsightUseCase(sessionRepository);
    const explainMorphology = new ExplainMorphologyUseCase(greekTutorService);
    const askFreeQuestion = new AskFreeQuestionUseCase(greekTutorService);

    return (
        <GreekTutorContext.Provider value={{ 
            generateTrainingUnits, 
            evaluateUserResponse, 
            saveInsight, 
            explainMorphology,
            askFreeQuestion
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
