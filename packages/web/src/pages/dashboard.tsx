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
    Calendar,
    NotebookPen,
    Wand2,
    Sparkles,
    Crown,
    AlertTriangle,
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
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePageBalance } from '@/hooks/usePageBalance';
import { libraryService } from '@dosfilos/application';
import {
    LibraryResourceEntity,
    ProjectColor,
    formatPassageReference,
    type ExegeticalPaper,
    type SermonEntity,
    type FacultyProject,
} from '@dosfilos/domain';
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
const MAX_AGENDA_ITEMS = 6;
const MAX_RECENT_SERMONS = 6;
const MAX_EXEGESIS_PAPERS = 4;
const AGENDA_HORIZON_DAYS = 14;

/**
 * Dashboard — refactored as a command-center layout (May 2026).
 *
 * Hierarchy:
 *   1. Hero bar — greeting + plan/balance chip (closes the loop with billing)
 *   2. Two-column grid (xl+):
 *        Left:  Active projects (primary work surface)
 *        Right: Weekly agenda (next preaching dates + exegesis in progress)
 *   3. Two-column grid (xl+):
 *        Left:  Exegesis in progress (papers not assembled yet)
 *        Right: Recent material (sermons, deduplicated by source)
 *   4. Compact ecosystem strip (single row)
 *
 * Stacks vertically on narrower screens. Density tuned for the 1440px+
 * laptop the typical pastor uses to write sermons; mobile users mostly
 * land on the project list directly.
 */
export function DashboardPage() {
    const { user } = useFirebase();
    const { t, i18n } = useTranslation('dashboard');
    const navigate = useNavigate();

    // Data sources
    const { sermons } = useSermons();
    const { sessions: facultySessions } = useFacultySessions();
    const { projects } = useFacultyProjects();
    const { sessions: greekSessions } = useGreekSessions();
    const { sessions: hebrewSessions } = useHebrewSessions();
    const { papers: exegeticalPapers } = useExegesisPapers();
    const [resources, setResources] = useState<LibraryResourceEntity[]>([]);
    const [showCreateProject, setShowCreateProject] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        libraryService
            .getUserResources(user.uid)
            .then((rs) => setResources(rs))
            .catch((err) => console.error('Error loading library:', err));
    }, [user?.uid]);

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
    const activeLanguage: 'es' | 'en' = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    const activeProjects = useMemo(
        () =>
            [...(projects ?? [])]
                .filter((p) => !p.archivedAt && !p.deletedAt)
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, MAX_ACTIVE_PROJECTS),
        [projects]
    );

    const sessionsByProject = useMemo(() => {
        const map = new Map<string, number>();
        for (const s of facultySessions ?? []) {
            if (s.projectId) map.set(s.projectId, (map.get(s.projectId) ?? 0) + 1);
        }
        return map;
    }, [facultySessions]);

    /**
     * Recent material — deduplicated by `sourceSermonId` so a draft and
     * its published copy collapse into one row (the pre-refactor list
     * was repeating "Extranjeros con Propósito" 5+ times because each
     * publish creates a copy that points to the original via
     * sourceSermonId). Picks the most recently-updated of the group as
     * the representative; surfaces a count badge when there are siblings.
     */
    const recentSermons = useMemo(() => {
        const groups = new Map<string, SermonEntity[]>();
        for (const sermon of sermons) {
            const key = sermon.sourceSermonId ?? sermon.id;
            const existing = groups.get(key) ?? [];
            existing.push(sermon);
            groups.set(key, existing);
        }
        const reps = Array.from(groups.values()).map((siblings) => {
            const sorted = [...siblings].sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            return { primary: sorted[0]!, versions: siblings.length };
        });
        return reps
            .sort(
                (a, b) =>
                    new Date(b.primary.updatedAt).getTime() - new Date(a.primary.updatedAt).getTime()
            )
            .slice(0, MAX_RECENT_SERMONS);
    }, [sermons]);

    /**
     * Weekly agenda — sermons with a `scheduledDate` in the next
     * AGENDA_HORIZON_DAYS days, sorted ascending by date. Pure
     * forward-looking: past-dated scheduled sermons fall off
     * (`preachingHistory` carries the audit trail for those).
     */
    const upcomingAgenda = useMemo(() => {
        const now = Date.now();
        const horizon = now + AGENDA_HORIZON_DAYS * 24 * 60 * 60 * 1000;
        return sermons
            .filter((s) => s.scheduledDate && new Date(s.scheduledDate).getTime() >= now)
            .filter((s) => new Date(s.scheduledDate!).getTime() <= horizon)
            .sort(
                (a, b) =>
                    new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()
            )
            .slice(0, MAX_AGENDA_ITEMS);
    }, [sermons]);

    /**
     * Exegesis in progress — papers in `'configuring'` or `'in-progress'`
     * phase, not archived. Most recently updated first. Hidden when the
     * user has no papers (no point teasing the feature on the dashboard
     * if they haven't engaged with it yet).
     */
    const inProgressExegesis = useMemo(
        () =>
            [...(exegeticalPapers ?? [])]
                .filter((p) => !p.archivedAt && p.phase !== 'assembled' && p.phase !== 'archived')
                .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                .slice(0, MAX_EXEGESIS_PAPERS),
        [exegeticalPapers]
    );

    const ecosystemMetrics = [
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
            <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-5 lg:py-6 space-y-6">
                {/* HERO — greeting + plan/balance chip */}
                <DashboardHero
                    name={firstName}
                    eyebrow={t('header.eyebrow')}
                    activeProjectsCount={activeProjects.length}
                    upcomingCount={upcomingAgenda.length}
                    onNewProject={() => setShowCreateProject(true)}
                    newProjectLabel={t('activeProjects.newProject')}
                />

                {onboarding.shouldShowBanner && <ActivationBanner />}

                {/* PRIMARY GRID — projects + weekly agenda.
                    `items-start` so the right column (often shorter
                    when empty) doesn't stretch to match the projects
                    column. Without it the empty agenda card overflows
                    visually into the next row. */}
                <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5 items-start">
                    <ProjectsSection
                        projects={activeProjects}
                        sessionsByProject={sessionsByProject}
                        onNewProject={() => setShowCreateProject(true)}
                        navigate={navigate}
                        t={t}
                    />
                    <WeeklyAgenda
                        sermons={upcomingAgenda}
                        navigate={navigate}
                        t={t}
                    />
                </div>

                {/* SECONDARY GRID — exegesis + recent material.
                    Same items-start reasoning as the primary grid. */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                    <ExegesisInProgressSection
                        papers={inProgressExegesis}
                        language={activeLanguage}
                        navigate={navigate}
                        t={t}
                    />
                    <RecentMaterialSection
                        groups={recentSermons}
                        navigate={navigate}
                        t={t}
                    />
                </div>

                {/* TERTIARY — compact ecosystem strip */}
                <EcosystemStrip metrics={ecosystemMetrics} t={t} />
            </div>

            <OnboardingWelcomeModal
                isOpen={showWelcome}
                onClose={() => setShowWelcome(false)}
            />
            <CelebrationModal
                isOpen={showCelebration}
                onClose={() => setShowCelebration(false)}
            />

            {showCreateProject && (
                <ProjectEditDialog onClose={() => setShowCreateProject(false)} />
            )}
        </div>
    );
}

// ── Hero ────────────────────────────────────────────────────────────────

interface DashboardHeroProps {
    name: string;
    eyebrow: string;
    activeProjectsCount: number;
    upcomingCount: number;
    onNewProject: () => void;
    newProjectLabel: string;
}

/**
 * Two-row hero: greeting + dynamic context line on the left
 * (X proyectos activos · Y sermones esta semana), plan/balance chip on
 * the right. Replaces the literary subtitle with operational data —
 * the user's question on landing is "what do I have to do today",
 * not "what is this product".
 */
function DashboardHero({
    name,
    eyebrow,
    activeProjectsCount,
    upcomingCount,
    onNewProject,
    newProjectLabel,
}: DashboardHeroProps) {
    const { t } = useTranslation('dashboard');
    return (
        <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 pb-3 border-b border-border/60">
            <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-medium mb-1">
                    {eyebrow}
                </div>
                <h1 className="font-reading text-[24px] md:text-[28px] leading-tight tracking-[-0.01em] text-foreground">
                    {t('header.greeting', { name })}
                </h1>
                <p className="text-[13px] text-muted-foreground mt-1">
                    {activeProjectsCount === 0
                        ? t('hero.contextEmpty')
                        : `${t('hero.contextProjects', { count: activeProjectsCount })} · ${t('hero.contextUpcoming', { count: upcomingCount })}`}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <PlanBalanceChip />
                <Button
                    onClick={onNewProject}
                    className="bg-foreground hover:bg-foreground/90 text-background font-medium gap-1.5 shrink-0"
                >
                    <Plus className="h-4 w-4" />
                    {newProjectLabel}
                </Button>
            </div>
        </header>
    );
}

/**
 * Plan + balance chip shown in the hero. Pulls subscription planId
 * from the user profile and live balance from React Query so post-
 * extraction decreases reflect immediately.
 *
 * Tone changes:
 *   - balance == 0 → destructive (action required, comprar packs)
 *   - balance < 20% of plan std quota → warning
 *   - normal → muted neutral
 *
 * Hidden entirely for free-plan users (no quota to surface).
 */
function PlanBalanceChip() {
    const { t } = useTranslation('dashboard');
    const { profile } = useUserProfile();
    const { data: balance } = usePageBalance();

    if (!profile?.subscription) return null;
    const planId = profile.subscription.planId;
    if (planId === 'free') return null;
    if (!balance) return null;

    const std = balance.standardPagesAvailable;
    const planLow = balance.planStandardPages > 0 && balance.planStandardPages < 200;
    const tone = std === 0
        ? 'border-destructive/40 bg-destructive/10 text-destructive'
        : planLow
            ? 'border-warning/40 bg-warning/10 text-warning-subtle-foreground'
            : 'border-border bg-card text-muted-foreground';

    return (
        <Link
            to="/dashboard/subscription"
            className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-foreground/40',
                tone,
            )}
            title={t('hero.planChipTooltip')}
        >
            <Crown className="h-3 w-3" />
            <span className="capitalize">{planId}</span>
            <span className="text-border">·</span>
            <Wand2 className="h-3 w-3" />
            <span className="tabular-nums">{std.toLocaleString()}</span>
            <Sparkles className="h-3 w-3 ml-0.5" />
            <span className="tabular-nums">{balance.premiumPagesAvailable.toLocaleString()}</span>
            {std === 0 && <AlertTriangle className="h-3 w-3 ml-0.5" />}
        </Link>
    );
}

// ── Section header ──────────────────────────────────────────────────────

function SectionHeader({
    eyebrow,
    count,
    actionLabel,
    actionHref,
}: {
    eyebrow: string;
    count?: number;
    actionLabel?: string;
    actionHref?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-medium inline-flex items-center gap-2">
                <span>{eyebrow}</span>
                {count !== undefined && count > 0 && (
                    <>
                        <span className="text-border normal-case tracking-normal">·</span>
                        <span className="text-muted-foreground normal-case tracking-normal font-mono">
                            {count}
                        </span>
                    </>
                )}
            </div>
            {actionHref && actionLabel && (
                <Link
                    to={actionHref}
                    className="text-[12px] text-muted-foreground hover:text-indigo-600 inline-flex items-center gap-1 shrink-0"
                >
                    {actionLabel}
                    <ArrowUpRight className="h-3 w-3" />
                </Link>
            )}
        </div>
    );
}

// ── Projects section ────────────────────────────────────────────────────

function ProjectsSection({
    projects,
    sessionsByProject,
    onNewProject,
    navigate,
    t,
}: {
    projects: FacultyProject[];
    sessionsByProject: Map<string, number>;
    onNewProject: () => void;
    navigate: ReturnType<typeof useNavigate>;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    return (
        <section>
            <SectionHeader
                eyebrow={t('activeProjects.eyebrow')}
                count={projects.length}
                actionLabel={projects.length > 0 ? t('activeProjects.viewAll') : undefined}
                actionHref={projects.length > 0 ? '/dashboard/projects' : undefined}
            />

            {projects.length === 0 ? (
                <div className="bg-muted/40 border border-border/60 rounded-xl px-6 py-10 text-center">
                    <FolderKanban className="h-6 w-6 text-muted-foreground/70 mx-auto mb-3" />
                    <h3 className="font-reading text-[18px] text-foreground mb-2">
                        {t('activeProjects.empty.title')}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-muted-foreground max-w-md mx-auto mb-4">
                        {t('activeProjects.empty.subtitle')}
                    </p>
                    <Button
                        onClick={onNewProject}
                        className="bg-foreground hover:bg-foreground/90 text-background font-medium gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        {t('activeProjects.empty.create')}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projects.map((project) => {
                        const sessionCount = sessionsByProject.get(project.id) ?? 0;
                        const sourceCount = project.sourceIds?.length ?? 0;
                        return (
                            <article
                                key={project.id}
                                onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                                className="group bg-card border border-border/60 rounded-xl p-4 cursor-pointer hover:border-border hover:shadow-sm transition-all flex flex-col gap-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className={cn(
                                            'h-2.5 w-2.5 rounded-full',
                                            COLOR_DOT[project.color] ?? 'bg-slate-400'
                                        )}
                                    />
                                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                    <h3 className="font-reading text-[16px] leading-tight text-foreground line-clamp-2">
                                        {project.title}
                                    </h3>
                                    {project.contextNote && (
                                        <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
                                            {project.contextNote}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                                    <span>
                                        {t('activeProjects.card.sessions', { count: sessionCount })}
                                    </span>
                                    <span className="text-border">·</span>
                                    <span>
                                        {t('activeProjects.card.sources', { count: sourceCount })}
                                    </span>
                                    <span className="ml-auto tabular-nums">
                                        {new Date(project.updatedAt).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

// ── Weekly agenda ───────────────────────────────────────────────────────

function WeeklyAgenda({
    sermons,
    navigate,
    t,
}: {
    sermons: SermonEntity[];
    navigate: ReturnType<typeof useNavigate>;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    return (
        <section>
            <SectionHeader
                eyebrow={t('agenda.eyebrow')}
                count={sermons.length}
                actionLabel={t('agenda.viewAll')}
                actionHref="/dashboard/plans"
            />

            {sermons.length === 0 ? (
                // Don't stretch empty card with h-full — when the
                // sibling column (projects) is tall, h-full on the
                // empty card overflows visually into the next row.
                // Better to let the card sit at natural height with
                // blank space below than to push into the following
                // section. Keep the centered visual feel via padding,
                // not via flex justify-center.
                <div className="bg-muted/40 border border-border/60 rounded-xl px-5 py-10 text-center">
                    <Calendar className="h-5 w-5 text-muted-foreground/70 mx-auto mb-2" />
                    <p className="text-[12.5px] text-muted-foreground max-w-[260px] mx-auto">
                        {t('agenda.empty')}
                    </p>
                </div>
            ) : (
                <ul className="border border-border/60 rounded-xl divide-y divide-border/40 overflow-hidden bg-card">
                    {sermons.map((sermon) => {
                        const date = new Date(sermon.scheduledDate!);
                        const dayLabel = date.toLocaleDateString(undefined, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                        });
                        const daysFromNow = Math.ceil(
                            (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                        );
                        const proximity =
                            daysFromNow <= 1
                                ? 'text-warning font-medium'
                                : daysFromNow <= 7
                                    ? 'text-foreground'
                                    : 'text-muted-foreground';
                        return (
                            <li key={sermon.id}>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-muted/40 transition-colors group"
                                >
                                    <div className="flex flex-col items-center w-12 shrink-0">
                                        <span className={cn('text-[10px] uppercase tracking-wide', proximity)}>
                                            {dayLabel.split(',')[0]}
                                        </span>
                                        <span className={cn('text-[16px] font-bold tabular-nums leading-none mt-0.5', proximity)}>
                                            {date.getDate()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-foreground truncate group-hover:text-indigo-600 transition-colors">
                                            {sermon.title}
                                        </p>
                                        {sermon.bibleReferences?.[0] && (
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {sermon.bibleReferences[0]}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

// ── Exegesis in progress ────────────────────────────────────────────────

function ExegesisInProgressSection({
    papers,
    language,
    navigate,
    t,
}: {
    papers: ExegeticalPaper[];
    language: 'es' | 'en';
    navigate: ReturnType<typeof useNavigate>;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    return (
        <section>
            <SectionHeader
                eyebrow={t('exegesis.eyebrow')}
                count={papers.length}
                actionLabel={t('exegesis.viewAll')}
                actionHref="/dashboard/exegesis"
            />

            {papers.length === 0 ? (
                <div className="bg-muted/40 border border-border/60 rounded-xl px-5 py-7 text-center">
                    <NotebookPen className="h-5 w-5 text-muted-foreground/70 mx-auto mb-2" />
                    <p className="text-[12.5px] text-muted-foreground max-w-[300px] mx-auto mb-3">
                        {t('exegesis.empty')}
                    </p>
                    <Link
                        to="/dashboard/exegesis"
                        className="text-[12px] text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                    >
                        {t('exegesis.emptyCta')}
                        <ArrowUpRight className="h-3 w-3" />
                    </Link>
                </div>
            ) : (
                <ul className="border border-border/60 rounded-xl divide-y divide-border/40 overflow-hidden bg-card">
                    {papers.map((paper) => {
                        const passage = formatPassageReference(paper.passage, language);
                        const phaseLabel = t(`exegesis.phase.${paper.phase}`);
                        const phaseTone =
                            paper.phase === 'in-progress'
                                ? 'bg-info-subtle text-info-subtle-foreground border-info/30'
                                : 'bg-warning-subtle text-warning-subtle-foreground border-warning/30';
                        return (
                            <li key={paper.id}>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/dashboard/exegesis/${paper.id}`)}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors group"
                                >
                                    <NotebookPen className="h-4 w-4 text-muted-foreground/70 shrink-0 group-hover:text-indigo-600 transition-colors" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-foreground truncate group-hover:text-indigo-600 transition-colors">
                                            {paper.title || passage}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground tabular-nums">
                                            {paper.updatedAt.toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'text-[10px] font-medium rounded-full border px-2 py-0.5 shrink-0',
                                            phaseTone,
                                        )}
                                    >
                                        {phaseLabel}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

// ── Recent material (deduplicated) ──────────────────────────────────────

function RecentMaterialSection({
    groups,
    navigate,
    t,
}: {
    groups: Array<{ primary: SermonEntity; versions: number }>;
    navigate: ReturnType<typeof useNavigate>;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    return (
        <section>
            <SectionHeader
                eyebrow={t('recentMaterial.eyebrow')}
                count={groups.length}
                actionLabel={groups.length > 0 ? t('recentMaterial.viewAll') : undefined}
                actionHref={groups.length > 0 ? '/dashboard/sermons' : undefined}
            />

            {groups.length === 0 ? (
                <div className="bg-muted/40 border border-border/60 rounded-xl px-5 py-7 text-center">
                    <FileText className="h-5 w-5 text-muted-foreground/70 mx-auto mb-2" />
                    <p className="text-[12.5px] text-muted-foreground max-w-[300px] mx-auto">
                        {t('recentMaterial.empty')}
                    </p>
                </div>
            ) : (
                <ul className="border border-border/60 rounded-xl divide-y divide-border/40 overflow-hidden bg-card">
                    {groups.map(({ primary, versions }) => {
                        const status = primary.status as 'published' | 'draft' | 'archived' | 'working';
                        return (
                            <li key={primary.id}>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/dashboard/sermons/${primary.id}`)}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors group"
                                >
                                    <FileText className="h-4 w-4 text-muted-foreground/70 shrink-0 group-hover:text-indigo-600 transition-colors" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-foreground truncate group-hover:text-indigo-600 transition-colors">
                                            {primary.title}
                                            {versions > 1 && (
                                                <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                                                    ({t('recentMaterial.versions', { count: versions })})
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground tabular-nums">
                                            {new Date(primary.updatedAt).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'text-[10px] uppercase tracking-[0.1em] font-medium px-1.5 py-0.5 rounded shrink-0',
                                            status === 'published' &&
                                                'bg-success-subtle text-success-subtle-foreground border border-success/30',
                                            (status === 'draft' || status === 'working') &&
                                                'bg-muted text-muted-foreground',
                                            status === 'archived' &&
                                                'bg-warning-subtle text-warning-subtle-foreground border border-warning/30'
                                        )}
                                    >
                                        {t(`recentMaterial.status.${status}`)}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

// ── Ecosystem strip (compact) ───────────────────────────────────────────

function EcosystemStrip({
    metrics,
    t,
}: {
    metrics: Array<{ key: string; icon: typeof BookOpen; label: string; count: number; href: string }>;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    return (
        <section>
            <SectionHeader eyebrow={t('ecosystem.eyebrow')} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {metrics.map(({ key, icon: Icon, label, count, href }) => (
                    <Link
                        key={key}
                        to={href}
                        className="group bg-card border border-border/60 rounded-lg px-4 py-2.5 flex items-center gap-3 hover:border-border hover:shadow-sm transition-all"
                    >
                        <div className="h-8 w-8 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                                {label}
                            </div>
                            <div className="text-[13px] font-medium text-foreground tabular-nums">
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
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-indigo-600 transition-colors" />
                    </Link>
                ))}
            </div>
        </section>
    );
}
