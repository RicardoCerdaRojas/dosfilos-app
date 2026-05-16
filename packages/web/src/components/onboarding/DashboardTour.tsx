import { useEffect, useMemo, useState } from 'react';
import Joyride, { CallBackProps, STATUS, type Step } from 'react-joyride';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { useTheme } from '@/components/theme-provider';

const STORAGE_KEY_PREFIX = 'dashboard_tour_completed_';

/**
 * Spotlight tour shown once after a user finishes (or skips) the onboarding
 * wizard. Walks the 3 sidebar groups + the floating help button so the user
 * has a spatial map of the surface before they start clicking around.
 *
 * Triggered by `useDashboardTourTrigger` from DashboardLayout — this component
 * is purely the renderer + the persistence write on finish.
 *
 * Targets are CSS classes attached to the sidebar group containers and the FAB:
 *   .tour-target-study / -work / -resources / -help
 *
 * Marking the tour complete is idempotent — re-running it manually requires
 * clearing the localStorage key (or hitting it from a future "replay" button).
 */
interface DashboardTourProps {
    run: boolean;
    onComplete: () => void;
}

export function DashboardTour({ run, onComplete }: DashboardTourProps) {
    const { t } = useTranslation('dashboard');
    const { theme } = useTheme();

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
                overlayColor: 'rgba(0, 0, 0, 0.55)',
                arrowColor: card,
                zIndex: 10000,
            },
            tooltip: {
                borderRadius: 10,
                fontSize: 14,
                padding: '14px 16px',
            },
            tooltipContainer: {
                textAlign: 'left' as const,
            },
            buttonNext: {
                backgroundColor: primary,
                color: primaryFg,
                fontSize: 13,
                padding: '8px 14px',
                borderRadius: 6,
            },
            buttonBack: {
                color: mutedFg,
                marginRight: 8,
                fontSize: 13,
            },
            buttonSkip: {
                color: mutedFg,
                fontSize: 13,
            },
        };
    }, [theme]);

    const steps: Step[] = [
        {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
                <div className="space-y-2 text-left">
                    <h2 className="text-base font-bold text-foreground">
                        {t('tour.welcome.title')}
                    </h2>
                    <p className="text-sm text-foreground/85">
                        {t('tour.welcome.body')}
                    </p>
                </div>
            ),
        },
        {
            target: '.tour-target-study',
            placement: 'right',
            content: (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">
                        {t('tour.study.title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('tour.study.body')}
                    </p>
                </div>
            ),
        },
        {
            target: '.tour-target-work',
            placement: 'right',
            content: (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">
                        {t('tour.work.title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('tour.work.body')}
                    </p>
                </div>
            ),
        },
        {
            target: '.tour-target-resources',
            placement: 'right',
            content: (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">
                        {t('tour.resources.title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('tour.resources.body')}
                    </p>
                </div>
            ),
        },
        {
            target: '.tour-target-help',
            placement: 'left',
            content: (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">
                        {t('tour.help.title')}
                    </h3>
                    <p className="text-sm text-foreground/85">
                        {t('tour.help.body')}
                    </p>
                </div>
            ),
        },
    ];

    const handleCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            onComplete();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            scrollToFirstStep
            disableOverlayClose
            callback={handleCallback}
            styles={joyrideStyles}
            locale={{
                back: t('tour.nav.back'),
                close: t('tour.nav.close'),
                last: t('tour.nav.finish'),
                next: t('tour.nav.next'),
                skip: t('tour.nav.skip'),
            }}
        />
    );
}

/**
 * Controls when the tour fires. Returns `{ run, markComplete }`. The tour
 * runs when:
 *   - the user is authenticated
 *   - the welcome wizard has been completed (`onboarding_welcome_completed_{uid}` in localStorage)
 *   - the tour has NOT yet been completed for this user
 * A small delay lets the dashboard render its sidebar before the spotlight
 * tries to locate its targets.
 *
 * Polls localStorage briefly so the tour fires as soon as the wizard marks
 * completion in the same session (no full reload required).
 */
export function useDashboardTourTrigger() {
    const { user } = useFirebase();
    const [run, setRun] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        const welcomeKey = `onboarding_welcome_completed_${user.uid}`;
        const tourKey = `${STORAGE_KEY_PREFIX}${user.uid}`;
        if (localStorage.getItem(tourKey) === 'true') return;

        // Poll once per second up to 30s — handles the case where the wizard
        // is still open and completion will happen mid-session. Cleared on
        // unmount + on tour start.
        const interval = window.setInterval(() => {
            const welcomeDone = localStorage.getItem(welcomeKey) === 'true';
            const tourDone = localStorage.getItem(tourKey) === 'true';
            if (welcomeDone && !tourDone) {
                window.clearInterval(interval);
                // Tiny delay so sidebar finishes mounting after wizard close.
                window.setTimeout(() => setRun(true), 600);
            }
        }, 1000);

        // Cap polling at 30s to avoid leaking timers for users who never finish.
        const cap = window.setTimeout(() => window.clearInterval(interval), 30_000);
        return () => {
            window.clearInterval(interval);
            window.clearTimeout(cap);
        };
    }, [user?.uid]);

    const markComplete = () => {
        setRun(false);
        if (user?.uid) {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.uid}`, 'true');
        }
    };

    return { run, markComplete };
}
