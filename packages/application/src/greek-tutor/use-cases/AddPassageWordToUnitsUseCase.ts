import { TrainingUnit, PassageWord, UnitPreview, IGreekTutorService } from '@dosfilos/domain';

/**
 * Use case: Add a passage word to training units
 * 
 * After user confirms they want to study a word from the passage,
 * this use case creates a full training unit.
 */
export class AddPassageWordToUnitsUseCase {
    constructor(
        private greekTutorService: IGreekTutorService
    ) { }

    /**
     * Executes the use case
     * @param sessionId Current study session ID
     * @param unitPreview Preview of the unit to create
     * @param word The passage word being added
     * @param fullPassage Complete passage text for context
     * @param fileSearchStoreId Optional Exegesis Library store ID
     * @param language Output language (default: Spanish)
     * @returns Newly created TrainingUnit
     */
    async execute(
        sessionId: string,
        unitPreview: UnitPreview,
        word: PassageWord,
        fullPassage: string,
        fileSearchStoreId?: string,
        language: string = 'Spanish'
    ): Promise<TrainingUnit> {
        console.log('[AddPassageWordToUnitsUseCase] Creating unit for word:', word.greek);

        try {
            // Create training unit directly using the Greek word
            const unit = await this.greekTutorService.createTrainingUnit(
                word.greek,
                fullPassage,
                fileSearchStoreId,
                undefined, // config
                language
            );

            // Update sessionId to match the current session
            unit.sessionId = sessionId;

            console.log('[AddPassageWordToUnitsUseCase] Successfully created unit:', unit.id);

            return unit;
        } catch (error) {
            console.error('[AddPassageWordToUnitsUseCase] Error creating unit:', error);
            throw new Error(`Failed to add word ${word.greek} to units: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
