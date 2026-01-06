import { useState, useEffect } from 'react';
import { useFirebase } from '@/context/firebase-context';

interface OnboardingState {
    shouldShowWelcome: boolean;
    shouldShowBanner: boolean;
    shouldShowCelebration: boolean;
    sermonsCreated: number;
}

export function useOnboardingState(): OnboardingState {
    const { user } = useFirebase();
    const [state, setState] = useState<OnboardingState>({
        shouldShowWelcome: false,
        shouldShowBanner: false,
        shouldShowCelebration: false,
        sermonsCreated: 0,
    });

    useEffect(() => {
        if (!user) {
            setState({
                shouldShowWelcome: false,
                shouldShowBanner: false,
                shouldShowCelebration: false,
                sermonsCreated: 0,
            });
            return;
        }

        // Get actual sermon count from Firestore
        const loadSermonCount = async () => {
            try {
                const { sermonService } = await import('@dosfilos/application');
                const sermons = await sermonService.getUserSermons(user.uid);
                const sermonsCreated = sermons.length;

                // Check if welcome was already completed (scoped to user)
                const welcomeKey = `onboarding_welcome_completed_${user.uid}`;
                const welcomeCompleted = localStorage.getItem(welcomeKey) === 'true';

                // Check if we just created first sermon (celebration trigger)
                const lastSermonKey = `last_sermon_count_${user.uid}`;
                const lastSermonCount = parseInt(localStorage.getItem(lastSermonKey) || '0');
                const justCreatedFirstSermon = sermonsCreated === 1 && lastSermonCount === 0;

                // Update last sermon count
                localStorage.setItem(lastSermonKey, sermonsCreated.toString());

                setState({
                    shouldShowWelcome: sermonsCreated === 0 && !welcomeCompleted,
                    shouldShowBanner: sermonsCreated === 0,
                    shouldShowCelebration: justCreatedFirstSermon,
                    sermonsCreated,
                });
            } catch (error) {
                console.error('Error loading sermon count for onboarding:', error);
            }
        };

        loadSermonCount();
    }, [user]);

    return state;
}

/**
 * Mark welcome modal as completed
 */
export function markWelcomeCompleted(userId: string) {
    if (!userId) return;
    localStorage.setItem(`onboarding_welcome_completed_${userId}`, 'true');
    // Force a storage event or re-render might be needed, but the parent component usually re-renders or updates state
}

/**
 * Reset onboarding state (for testing)
 */
export function resetOnboardingState() {
    localStorage.removeItem('onboarding_welcome_completed');
    localStorage.removeItem('last_sermon_count');
}
