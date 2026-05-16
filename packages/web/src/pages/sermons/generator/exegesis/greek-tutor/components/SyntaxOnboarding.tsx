import React, { useEffect, useMemo, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/components/theme-provider';

interface SyntaxOnboardingProps {
    run: boolean;
    onComplete: () => void;
}

const STORAGE_KEY = 'greek-tutor-syntax-onboarding-seen';

/**
 * Interactive 5-step tour using react-joyride. Brand colors are read
 * from CSS vars at runtime so the tour follows light/dark themes.
 */
export function SyntaxOnboarding({ run, onComplete }: SyntaxOnboardingProps) {
    const { t } = useTranslation('greekTutor');
    const { theme } = useTheme();
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

    const joyrideStyles = useMemo(() => {
        const getVar = (name: string) =>
            getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        const primary = `hsl(${getVar('--primary')})`;
        const primaryFg = `hsl(${getVar('--primary-foreground')})`;
        const foreground = `hsl(${getVar('--foreground')})`;
        const mutedFg = `hsl(${getVar('--muted-foreground')})`;
        const card = `hsl(${getVar('--card')})`;
        return {
            options: {
                primaryColor: primary,
                textColor: foreground,
                backgroundColor: card,
                overlayColor: 'rgba(0, 0, 0, 0.5)',
                arrowColor: card,
                zIndex: 10000,
            },
            tooltip: {
                borderRadius: 10,
                fontSize: 14,
            },
            tooltipContainer: {
                textAlign: 'left' as const,
            },
            buttonNext: {
                backgroundColor: primary,
                color: primaryFg,
                fontSize: 14,
                padding: '8px 16px',
                borderRadius: 6,
            },
            buttonBack: {
                color: mutedFg,
                marginRight: 10,
            },
            buttonSkip: {
                color: mutedFg,
            },
        };
    }, [theme]);

    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="space-y-2 text-left">
                    <h2 className="text-lg font-bold text-foreground">
                        👋 {t('syntax.onboarding.welcome')}
                    </h2>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.intro')}
                    </p>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.steps')}
                    </p>
                    <div className="mt-3 p-2 rounded-md bg-primary/10">
                        <p className="text-xs text-primary">
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
                    <h3 className="text-base font-semibold text-foreground">
                        {t('syntax.onboarding.step1Title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.step1Content')}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
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
                    <h3 className="text-base font-semibold text-foreground">
                        {t('syntax.onboarding.step2Title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.step2Content1')}
                    </p>
                    <p className="text-sm text-foreground/85">
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
                    <h3 className="text-base font-semibold text-foreground">
                        {t('syntax.onboarding.step3Title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.step3Content1')}
                    </p>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.step3Content2')}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
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
                    <h3 className="text-base font-semibold text-foreground">
                        {t('syntax.onboarding.step4Title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.step4Content')}
                    </p>
                    <ul className="text-sm text-foreground/85 space-y-1 ml-4">
                        <li>• {t('syntax.onboarding.step4Collapse')}</li>
                        <li>• {t('syntax.onboarding.step4Expand')}</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">
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
                    <h3 className="text-base font-semibold text-foreground">
                        {t('syntax.onboarding.step5Title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.step5Content1')}
                    </p>
                    <p className="text-sm text-foreground/85">
                        {t('syntax.onboarding.step5Content2')}
                    </p>
                    <div className="mt-3 p-2 rounded-md bg-success-subtle/40">
                        <p className="text-xs text-success-subtle-foreground">
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
            styles={joyrideStyles}
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
