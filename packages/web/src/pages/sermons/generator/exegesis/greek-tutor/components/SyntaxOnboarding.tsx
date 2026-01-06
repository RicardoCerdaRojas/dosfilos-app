import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTranslation } from '@/i18n';

interface SyntaxOnboardingProps {
    /** Whether to run the tour */
    run: boolean;
    /** Callback when tour completes or is skipped */
    onComplete: () => void;
}

const STORAGE_KEY = 'greek-tutor-syntax-onboarding-seen';

/**
 * SyntaxOnboarding - Interactive tour for first-time users
 * 
 * Uses react-joyride to guide users through the key features
 * of the syntax analysis interface.
 * 
 * Features:
 * - Highlights key UI elements
 * - Step-by-step explanations
 * - Skippable
 * - Only shows once (uses localStorage)
 */
export function SyntaxOnboarding({ run, onComplete }: SyntaxOnboardingProps) {
    const { t } = useTranslation('greekTutor');
    const [runTour, setRunTour] = useState(false);

    useEffect(() => {
        if (run) {
            setRunTour(true);
        }
    }, [run]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            onComplete();
        }
    };

    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="space-y-2 text-left">
                    <h2 className="text-lg font-bold text-gray-900">
                        👋 {t('syntax.onboarding.welcome')}
                    </h2>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.intro')}
                    </p>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.steps')}
                    </p>
                    <div className="mt-3 p-2 bg-blue-50 rounded-md">
                        <p className="text-xs text-blue-800">
                            {t('syntax.onboarding.skipTip')}
                        </p>
                    </div>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '.syntax-description',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        {t('syntax.onboarding.step1Title')}
                    </h3>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.step1Content')}
                    </p>
                    <p className="text-xs text-gray-600 italic">
                        {t('syntax.onboarding.step1Question')}
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '.syntax-main-clause',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        {t('syntax.onboarding.step2Title')}
                    </h3>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.step2Content1')}
                    </p>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.step2Content2')}
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '.syntax-subordinate',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        {t('syntax.onboarding.step3Title')}
                    </h3>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.step3Content1')}
                    </p>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.step3Content2')}
                    </p>
                    <p className="text-xs text-gray-600 italic">
                        {t('syntax.onboarding.step3Question')}
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '.syntax-controls',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        {t('syntax.onboarding.step4Title')}
                    </h3>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.step4Content')}
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• {t('syntax.onboarding.step4Collapse')}</li>
                        <li>• {t('syntax.onboarding.step4Expand')}</li>
                    </ul>
                    <p className="text-xs text-gray-600 mt-2 italic">
                        {t('syntax.onboarding.step4Tip')}
                    </p>
                </div>
            ),
            placement: 'left',
        },
        {
            target: '.syntax-legend',
            content: (
                <div className="space-y-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        {t('syntax.onboarding.step5Title')}
                    </h3>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.step5Content1')}
                    </p>
                    <p className="text-sm text-gray-700">
                        {t('syntax.onboarding.step5Content2')}
                    </p>
                    <div className="mt-3 p-2 bg-green-50 rounded-md">
                        <p className="text-xs text-green-800">
                            {t('syntax.onboarding.step5Done')}
                        </p>
                    </div>
                </div>
            ),
            placement: 'top',
        },
    ];

    return (
        <Joyride
            steps={steps}
            run={runTour}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#3b82f6', // Blue 500
                    textColor: '#1f2937', // Gray 800
                    backgroundColor: '#ffffff',
                    overlayColor: 'rgba(0, 0, 0, 0.4)',
                    arrowColor: '#ffffff',
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: 8,
                    fontSize: 14,
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                buttonNext: {
                    backgroundColor: '#3b82f6',
                    fontSize: 14,
                    padding: '8px 16px',
                    borderRadius: 6,
                },
                buttonBack: {
                    color: '#6b7280',
                    marginRight: 10,
                },
                buttonSkip: {
                    color: '#6b7280',
                },
            }}
            locale={{
                back: t('syntax.onboarding.back'),
                close: t('syntax.onboarding.close'),
                last: t('syntax.onboarding.last'),
                next: t('syntax.onboarding.next'),
                skip: t('syntax.onboarding.skip'),
            }}
        />
    );
}

/**
 * Hook to check if user has seen the onboarding
 */
export function useHasSeenOnboarding(): [boolean, () => void] {
    const [hasSeen, setHasSeen] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem(STORAGE_KEY) === 'true';
    });

    const markAsSeen = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, 'true');
            setHasSeen(true);
        }
    };

    return [hasSeen, markAsSeen];
}
