import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Languages,
    MessageSquareQuote,
    FolderKanban,
    ArrowUpRight,
    FileText,
    Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { useSermons } from '@/hooks/use-sermons';
import { useFacultySessions } from '@/hooks/faculty/useFacultySessions';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { useGreekSessions } from '@/hooks/useGreekSessions';
import { useHebrewSessions } from '@/hooks/useHebrewSessions';
import { libraryService } from '@dosfilos/application';
import { LibraryResourceEntity, ProjectColor } from '@dosfilos/domain';
import { OnboardingWelcomeModal, ActivationBanner, CelebrationModal } from '@/components/onboarding';
import { ProjectEditDialog } from '@/pages/faculty/ProjectEditDialog';
import { cn } from '@/lib/utils';

const COLOR_DOT: Record<ProjectColor, string> = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
    slate: 'bg-slate-500',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
};

const MAX_ACTIVE_PROJECTS = 6;

/**
 * Dashboard — project-first workshop overview.
 *
 * Hierarchy:
 *   1. Greeting header
 *   2. Active projects (primary content — what you're working on)
 *   3. Recent material (artifacts produced)
 *   4. Ecosystem (compact row of pillars — secondary)
 */
export function DashboardPage() {
    const { user } = useFirebase();
    const { t } = useTranslation('dashboard');
    const navigate = useNavigate();

    // Data sources
    const { sermons } = useSermons();
    const { sessions: facultySessions } = useFacultySessions();
    const { projects } = useFacultyProjects();
    const { sessions: greekSessions } = useGreekSessions();
    const { sessions: hebrewSessions } = useHebrewSessions();
    const [resources, setResources] = useState<LibraryResourceEntity[]>([]);
    const [showCreateProject, setShowCreateProject] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        libraryService
            .getUserResources(user.uid)
            .then((rs) => setResources(rs))
            .catch((err) => console.error('Error loading library:', err));
    }, [user?.uid]);

    // Onboarding modals
    const onboarding = useOnboardingState();
    const [showWelcome, setShowWelcome] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    useEffect(() => {
        if (onboarding.shouldShowWelcome) setShowWelcome(true);
        if (onboarding.shouldShowCelebration) setShowCelebration(true);
    }, [onboarding.shouldShowWelcome, onboarding.shouldShowCelebration]);

    const firstName =
        user?.displayName?.split(' ')[0] ||
        (user?.email ? user.email.split('@')[0] : 'amigo');

    // Sort projects by recent activity (updatedAt), excluding archived & trashed
    const activeProjects = useMemo(
        () =>
            [...(projects ?? [])]
                .filter((p) => !p.archivedAt && !p.deletedAt)
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, MAX_ACTIVE_PROJECTS),
        [projects]
    );

    // Sessions count per project — aggregated client-side
    const sessionsByProject = useMemo(() => {
        const map = new Map<string, number>();
        for (const s of facultySessions ?? []) {
            if (s.projectId) map.set(s.projectId, (map.get(s.projectId) ?? 0) + 1);
        }
        return map;
    }, [facultySessions]);

    const latestSermons = useMemo(
        () =>
            [...sermons]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 6),
        [sermons]
    );

    // Compact ecosystem row data
    const ecosystem = [
        {
            key: 'library',
            icon: BookOpen,
            label: t('pillars.library.eyebrow'),
            count: resources.length,
            href: '/dashboard/library',
        },
        {
            key: 'languages',
            icon: Languages,
            label: t('pillars.languages.eyebrow'),
            count: greekSessions.length + hebrewSessions.length,
            href: '/dashboard/greek-tutor',
        },
        {
            key: 'faculty',
            icon: MessageSquareQuote,
            label: t('pillars.faculty.eyebrow'),
            count: facultySessions.length,
            href: '/dashboard/faculty',
        },
    ];

    return (
        <div className="min-h-full bg-background text-foreground antialiased">
            <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-5 lg:py-6 space-y-7">
                {/* Compact greeting bar — single row with primary action */}
                <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-2 border-b border-border/60">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-medium mb-1">
                            {t('header.eyebrow')}
                        </div>
                        <h1 className="font-reading text-[22px] md:text-[26px] leading-tight tracking-[-0.01em] text-foreground">
                            {t('header.greeting', { name: firstName })}{' '}
                            <span className="text-muted-foreground font-normal">
                                {t('header.subtitle')}
                            </span>
                        </h1>
                    </div>
                    <Button
                        onClick={() => setShowCreateProject(true)}
                        className="bg-foreground hover:bg-foreground/90 text-background font-medium gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        {t('activeProjects.newProject')}
                    </Button>
                </header>

                {onboarding.shouldShowBanner && <ActivationBanner />}

                {/* PRIMARY — Active projects */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-medium inline-flex items-center gap-2">
                            <span>{t('activeProjects.eyebrow')}</span>
                            <span className="text-border normal-case tracking-normal">·</span>
                            <span className="text-muted-foreground normal-case tracking-normal font-mono">
                                {activeProjects.length}
                            </span>
                        </div>
                        {activeProjects.length > 0 && (
                            <Link
                                to="/dashboard/projects"
                                className="text-[13px] text-muted-foreground hover:text-indigo-600 inline-flex items-center gap-1"
                            >
                                {t('activeProjects.viewAll')}
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        )}
                    </div>

                    {activeProjects.length === 0 ? (
                        <div className="bg-muted/40 border border-border/60 rounded-xl px-6 py-10 text-center">
                            <FolderKanban className="h-6 w-6 text-muted-foreground/70 mx-auto mb-3" />
                            <h3 className="font-reading text-[20px] text-foreground mb-2">
                                {t('activeProjects.empty.title')}
                            </h3>
                            <p className="text-[14px] leading-relaxed text-muted-foreground max-w-md mx-auto mb-5">
                                {t('activeProjects.empty.subtitle')}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Button
                                    onClick={() => setShowCreateProject(true)}
                                    className="bg-foreground hover:bg-foreground/90 text-background font-medium gap-1.5"
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('activeProjects.empty.create')}
                                </Button>
                                <Link
                                    to="/dashboard/faculty"
                                    className="text-[13px] text-muted-foreground hover:text-indigo-600"
                                >
                                    {t('activeProjects.empty.explore')} →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
                            {activeProjects.map((project) => {
                                const sessionCount = sessionsByProject.get(project.id) ?? 0;
                                const sourceCount = project.sourceIds?.length ?? 0;
                                return (
                                    <article
                                        key={project.id}
                                        onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                                        className="group bg-card border border-border/60 rounded-xl p-5 cursor-pointer hover:border-border hover:shadow-sm transition-all flex flex-col gap-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={cn(
                                                    'h-2.5 w-2.5 rounded-full',
                                                    COLOR_DOT[project.color] ?? 'bg-slate-400'
                                                )}
                                            />
                                            <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <h3 className="font-reading text-[19px] leading-tight text-foreground line-clamp-2">
                                                {project.title}
                                            </h3>
                                            {project.contextNote && (
                                                <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                                                    {project.contextNote}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 pt-2 border-t border-border/40 text-[12px] text-muted-foreground">
                                            <span>
                                                {t('activeProjects.card.sessions', { count: sessionCount })}
                                            </span>
                                            <span className="text-border">·</span>
                                            <span>
                                                {t('activeProjects.card.sources', { count: sourceCount })}
                                            </span>
                                            <span className="ml-auto">
                                                {new Date(project.updatedAt).toLocaleDateString(
                                                    undefined,
                                                    { month: 'short', day: 'numeric' }
                                                )}
                                            </span>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* SECONDARY — Recent material (sermons) */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-medium inline-flex items-center gap-2">
                            <span>{t('recentMaterial.eyebrow')}</span>
                            <span className="text-border normal-case tracking-normal">·</span>
                            <span className="text-muted-foreground normal-case tracking-normal font-mono">
                                {latestSermons.length}
                            </span>
                        </div>
                        {latestSermons.length > 0 && (
                            <Link
                                to="/dashboard/sermons"
                                className="text-[13px] text-muted-foreground hover:text-indigo-600 inline-flex items-center gap-1 shrink-0"
                            >
                                {t('recentMaterial.viewAll')}
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        )}
                    </div>

                    {latestSermons.length === 0 ? (
                        <div className="bg-muted/40 border border-border/60 rounded-xl px-6 py-8 text-center">
                            <FileText className="h-5 w-5 text-muted-foreground/70 mx-auto mb-2" />
                            <p className="text-[13.5px] text-muted-foreground max-w-md mx-auto">
                                {t('recentMaterial.empty')}
                            </p>
                        </div>
                    ) : (
                        <div className="border border-border/60 rounded-xl divide-y divide-border/40 overflow-hidden bg-card">
                            {latestSermons.map((sermon) => {
                                const status = sermon.status as 'published' | 'draft' | 'archived';
                                return (
                                    <button
                                        key={sermon.id}
                                        onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                                        className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-muted/40 transition-colors group"
                                    >
                                        <FileText className="h-4 w-4 text-muted-foreground/70 shrink-0 group-hover:text-indigo-600 transition-colors" />
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <div className="text-[14px] font-medium text-foreground truncate group-hover:text-indigo-600 transition-colors">
                                                {sermon.title}
                                            </div>
                                            <div className="text-[12px] text-muted-foreground">
                                                {new Date(sermon.updatedAt).toLocaleDateString(
                                                    undefined,
                                                    { year: 'numeric', month: 'short', day: 'numeric' }
                                                )}
                                            </div>
                                        </div>
                                        <span
                                            className={cn(
                                                'text-[11px] uppercase tracking-[0.12em] font-medium px-2 py-0.5 rounded-full shrink-0',
                                                status === 'published' &&
                                                    'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
                                                status === 'draft' &&
                                                    'bg-muted text-muted-foreground',
                                                status === 'archived' &&
                                                    'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                                            )}
                                        >
                                            {t(`recentMaterial.status.${status}`)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* TERTIARY — Compact ecosystem row */}
                <section className="space-y-3 pt-1">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-medium">
                        {t('ecosystem.eyebrow')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {ecosystem.map(({ key, icon: Icon, label, count, href }) => (
                            <Link
                                key={key}
                                to={href}
                                className="group bg-card border border-border/60 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-border hover:shadow-sm transition-all"
                            >
                                <div className="h-9 w-9 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                                    <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                                        {label}
                                    </div>
                                    <div className="text-[14px] font-medium text-foreground">
                                        {count > 0
                                            ? key === 'library'
                                                ? t('pillars.library.metric', { count })
                                                : key === 'languages'
                                                  ? t('pillars.languages.greekSessions', { count })
                                                  : t('pillars.faculty.metric', { count })
                                            : key === 'languages'
                                              ? t('pillars.languages.noGreek')
                                              : t(`pillars.${key}.empty`)}
                                    </div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-indigo-600 transition-colors" />
                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            {/* Onboarding modals */}
            <OnboardingWelcomeModal
                isOpen={showWelcome}
                onClose={() => setShowWelcome(false)}
            />
            <CelebrationModal
                isOpen={showCelebration}
                onClose={() => setShowCelebration(false)}
            />

            {/* Quick project create */}
            {showCreateProject && (
                <ProjectEditDialog onClose={() => setShowCreateProject(false)} />
            )}
        </div>
    );
}
