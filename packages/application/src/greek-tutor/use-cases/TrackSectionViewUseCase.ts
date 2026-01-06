import { ISessionRepository, UnitProgress } from '@dosfilos/domain';

/**
 * Use case for tracking when user views a section of a training unit.
 * Simple progress tracking without quiz interaction.
 * 
 * Phase 3A: Updates viewed sections and ensures minimum mastery level of 1.
 */
export class TrackSectionViewUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    /**
     * Records that user viewed a specific section of a training unit.
     * Updates mastery level to minimum of 1 (viewed).
     * 
     * @param sessionId Current study session ID
     * @param unitId Training unit ID
     * @param section Section identifier (e.g., 'morphology', 'recognition')
     * @param currentProgress Current progress state
     */
    async execute(
        sessionId: string,
        unitId: string,
        section: string,
        currentProgress: UnitProgress
    ): Promise<void> {
        // Add section to viewed set (avoid duplicates)
        const viewedSectionsSet = new Set(currentProgress.viewedSections || []);
        viewedSectionsSet.add(section);

        const updatedProgress: UnitProgress = {
            ...currentProgress,
            viewedSections: Array.from(viewedSectionsSet),
            lastViewedAt: new Date(),
            // Ensure minimum mastery level of 1 (viewed)
            masteryLevel: Math.max(currentProgress.masteryLevel || 0, 1) as 0 | 1 | 2 | 3
        };

        try {
            await this.sessionRepository.updateUnitProgress(
                sessionId,
                unitId,
                updatedProgress
            );
        } catch (error) {
            console.error('[TrackSectionViewUseCase] Error updating progress:', error);
            // Non-critical - continue execution
        }
    }
}
