import { IGreekTutorService, PassageWord, UnitPreview } from '@dosfilos/domain';

/**
 * Use case: Identify a word from the passage and generate unit preview
 * 
 * When user clicks on a Greek word in the passage reader, this use case
 * identifies the word and generates a preview of what the training unit
 * would look like before adding it.
 */
export class IdentifyPassageWordUseCase {
    constructor(private greekTutorService: IGreekTutorService) { }

    /**
     * Executes the use case
     * @param word The passage word selected by user
     * @param fullContext The complete passage text for context
     * @param fileSearchStoreId Optional Exegesis Library store ID
     * @param language Output language (default: Spanish)
     * @returns UnitPreview with Greek form and identification
     */
    async execute(
        word: PassageWord,
        fullContext: string,
        fileSearchStoreId?: string,
        language: string = 'Spanish'
    ): Promise<UnitPreview> {
        console.log('[IdentifyPassageWordUseCase] Identifying word:', word.greek);

        try {
            const preview = await this.greekTutorService.identifyWordForUnit(
                word,
                fullContext,
                fileSearchStoreId,
                language
            );

            console.log('[IdentifyPassageWordUseCase] Successfully identified:', preview.greekForm.lemma);
            return preview;
        } catch (error) {
            console.error('[IdentifyPassageWordUseCase] Error identifying word:', error);
            throw new Error(`Failed to identify word ${word.greek}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
