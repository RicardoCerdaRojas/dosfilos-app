import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useAllUsers } from '@/hooks/admin/useAllUsers';
import { useDeleteUser } from '@/hooks/admin/useDeleteUser';
import { useDisableUser } from '@/hooks/admin/useDisableUser';
import { useEnableUser } from '@/hooks/admin/useEnableUser';
import { useResendWelcomeEmail } from '@/hooks/admin/useResendWelcomeEmail';
import { useBulkUserAction } from '@/hooks/admin/useBulkUserAction';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';
import { ChangePlanDialog } from '@/components/admin/ChangePlanDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Search,
    Filter,
    Loader2,
    Download,
    User as UserIcon,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { UserTableRow } from './users/UserTableRow';
import { DisableUserDialog } from './users/DisableUserDialog';
import { DeleteUserDialog } from './users/DeleteUserDialog';
import { BulkActionsToolbar } from './users/BulkActionsToolbar';
import { SortableHeader } from './users/SortableHeader';
import { UserStatsHeader } from './users/UserStatsHeader';
import { UserTableSkeletonRow, UserStatsSkeleton } from './users/UserTableSkeleton';
import { GrantCreditsDialog } from '@/components/admin/GrantCreditsDialog';
import { ExtendTrialDialog } from '@/components/admin/ExtendTrialDialog';
import type { User, UserFilters, UserSortOptions, UserAdminStatus } from '@dosfilos/domain';

const STATUS_FILTER_VALUES = [
    'all', 'active', 'trialing', 'cancelled', 'past_due', 'disabled',
] as const;
type StatusFilterValue = typeof STATUS_FILTER_VALUES[number];

const PLAN_FILTER_VALUES = ['all', 'free', 'basic', 'pro', 'team'] as const;
type PlanFilterValue = typeof PLAN_FILTER_VALUES[number];

const SORT_FIELDS = ['displayName', 'createdAt', 'lastLoginAt', 'engagementScore'] as const;
type SortField = typeof SORT_FIELDS[number];

/**
 * Parse URL search params into filter state. Defaults are applied when a key
 * is missing or holds an unknown value, keeping the UI resilient to manual
 * URL edits or stale bookmarks.
 */
function parseFiltersFromUrl(params: URLSearchParams) {
    const search = params.get('q') ?? '';
    const planRaw = params.get('plan') as PlanFilterValue | null;
    const statusRaw = params.get('status') as StatusFilterValue | null;
    const sortFieldRaw = params.get('sortField') as SortField | null;
    const sortDir = params.get('sortDir');

    const plan: PlanFilterValue =
        planRaw && (PLAN_FILTER_VALUES as readonly string[]).includes(planRaw) ? planRaw : 'all';
    const status: StatusFilterValue =
        statusRaw && (STATUS_FILTER_VALUES as readonly string[]).includes(statusRaw) ? statusRaw : 'all';

    let sort: UserSortOptions | null = null;
    if (sortFieldRaw && (SORT_FIELDS as readonly string[]).includes(sortFieldRaw)) {
        sort = {
            field: sortFieldRaw,
            direction: sortDir === 'asc' ? 'asc' : 'desc',
        };
    }

    return { search, plan, status, sort };
}

export function UserManagement() {
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const navigate = useNavigate();
    const { t } = useTranslation('admin');
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Filters / sort: derived from URL so they survive refresh + share-link ──
    const initial = useMemo(() => parseFiltersFromUrl(searchParams), [searchParams]);
    const [searchQuery, setSearchQuery] = useState(initial.search);
    const [planFilter, setPlanFilter] = useState<PlanFilterValue>(initial.plan);
    const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(initial.status);
    const [sort, setSort] = useState<UserSortOptions | null>(initial.sort);

    // Sync state changes back to the URL (debounced for the search input so we
    // don't pollute history on every keystroke).
    useEffect(() => {
        const handle = setTimeout(() => {
            const next = new URLSearchParams();
            if (searchQuery) next.set('q', searchQuery);
            if (planFilter !== 'all') next.set('plan', planFilter);
            if (statusFilter !== 'all') next.set('status', statusFilter);
            if (sort) {
                next.set('sortField', sort.field);
                next.set('sortDir', sort.direction);
            }
            setSearchParams(next, { replace: true });
        }, 250);
        return () => clearTimeout(handle);
    }, [searchQuery, planFilter, statusFilter, sort, setSearchParams]);

    // ── Modals + per-user mutation state ─────────────────────────────────────
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
    const { deleteUser, isLoading: isDeleting } = useDeleteUser();

    const [userToDisable, setUserToDisable] = useState<User | null>(null);
    const { disableUser, isLoading: isDisabling } = useDisableUser();
    const { enableUser, isLoading: isEnabling } = useEnableUser();

    const { resendEmail, isLoading: isResending } = useResendWelcomeEmail();

    const [planChangeUser, setPlanChangeUser] = useState<User | null>(null);
    const [grantCreditsUser, setGrantCreditsUser] = useState<User | null>(null);
    const [extendTrialUser, setExtendTrialUser] = useState<User | null>(null);

    // ── Bulk selection ───────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { runBulk, isLoading: isBulkRunning } = useBulkUserAction();

    const filters: UserFilters = useMemo(() => ({
        searchQuery: searchQuery || undefined,
        planId: planFilter !== 'all' ? planFilter : undefined,
        status: statusFilter !== 'all' ? (statusFilter as UserAdminStatus) : undefined,
    }), [searchQuery, planFilter, statusFilter]);

    const { users, allUsers, loading: usersLoading } = useAllUsers(filters, sort ?? undefined);

    // Drop selections that no longer match the visible filtered set so a
    // change in filters can't bulk-affect users that aren't on screen.
    useEffect(() => {
        if (selectedIds.size === 0) return;
        const visible = new Set(users.map(u => u.id));
        let dirty = false;
        const next = new Set<string>();
        for (const id of selectedIds) {
            if (visible.has(id)) next.add(id);
            else dirty = true;
        }
        if (dirty) setSelectedIds(next);
    }, [users, selectedIds]);

    const allVisibleSelected = users.length > 0 && users.every(u => selectedIds.has(u.id));
    const someVisibleSelected = users.some(u => selectedIds.has(u.id));

    const toggleSelected = useCallback((id: string, selected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (selected) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const toggleAllVisible = (selected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            for (const u of users) {
                if (selected) next.add(u.id);
                else next.delete(u.id);
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const runBulkAction = async (action: 'disable' | 'enable') => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        const result = await runBulk(action, ids);
        if (result && result.failed === 0) clearSelection();
    };

    // ── Sort handling ────────────────────────────────────────────────────────
    const handleSort = (field: UserSortOptions['field']) => {
        setSort(prev => {
            if (!prev || prev.field !== field) return { field, direction: 'asc' };
            if (prev.direction === 'asc') return { field, direction: 'desc' };
            return null; // third click resets
        });
    };

    // ── CSV export ───────────────────────────────────────────────────────────
    const filtersActive = !!searchQuery || planFilter !== 'all' || statusFilter !== 'all';
    const handleExportCSV = () => {
        if (!users.length) return;

        const headers = [
            t('users.csvHeaders.email'),
            t('users.csvHeaders.name'),
            t('users.csvHeaders.plan'),
            t('users.csvHeaders.status'),
            t('users.csvHeaders.engagement'),
            t('users.csvHeaders.lastLogin'),
            t('users.csvHeaders.registeredAt'),
        ];
        const rows = users.map((user) => [
            user.email,
            user.displayName || '',
            user.subscription?.planId || 'free',
            user.subscription?.status || 'active',
            user.analytics?.engagementScore || 0,
            user.analytics?.lastLoginAt ? new Date(user.analytics.lastLoginAt).toISOString() : '',
            new Date(user.createdAt).toISOString(),
        ]);

        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-${new Date().toISOString().split('T')[0]}${filtersActive ? '-filtered' : ''}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // ── Per-user action handlers ─────────────────────────────────────────────
    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setIsDetailsModalOpen(true);
    };

    const handleViewActivity = (userId: string) => {
        navigate(`/dashboard/admin/users/${userId}`);
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setDeleteConfirmEmail('');
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        if (deleteConfirmEmail !== userToDelete.email) return;
        const success = await deleteUser(userToDelete.id);
        if (success) {
            setUserToDelete(null);
            setDeleteConfirmEmail('');
        }
    };

    const handleConfirmDisable = async () => {
        if (!userToDisable) return;
        const success = await disableUser(userToDisable.id, userToDisable.email);
        if (success) setUserToDisable(null);
    };

    const handleEnableUser = async (user: User) => {
        await enableUser(user.id, user.email);
    };

    const handleChangePlanClick = (user: User) => setPlanChangeUser(user);

    const handleChangePlanFromModal = (userId: string) => {
        const user = allUsers.find(u => u.id === userId);
        if (user) setPlanChangeUser(user);
    };

    if (authLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalCount = allUsers.length;
    const visibleCount = users.length;
    const subtitleKey = filtersActive && visibleCount !== totalCount ? 'users.subtitleVisible' : 'users.subtitle';
    const subtitleParams = filtersActive && visibleCount !== totalCount
        ? { count: visibleCount, visible: visibleCount, total: totalCount }
        : { count: totalCount, total: totalCount };

    return (
        <div className="px-8 py-10 max-w-[1500px] mx-auto space-y-8">
            <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4 min-w-0">
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/admin/analytics')} className="mt-1 shrink-0">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('users.backToAnalytics')}
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('users.title')}</h1>
                        <p className="text-sm text-muted-foreground mt-2">{t(subtitleKey, subtitleParams)}</p>
                    </div>
                </div>

                <Button onClick={handleExportCSV} disabled={!users.length} className="shrink-0">
                    <Download className="h-4 w-4 mr-2" />
                    {filtersActive
                        ? t('users.exportCsvFiltered', { count: visibleCount })
                        : t('users.exportCsv')}
                </Button>
            </div>

            {usersLoading && allUsers.length === 0
                ? <UserStatsSkeleton />
                : <UserStatsHeader users={allUsers} />}

            <Card className="p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('users.filters.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Filter cluster lives in its own flex row so the two selects always sit side-by-side
                        with a fixed gap. Previously each was a direct child of the parent flex which made
                        them overflow into each other at certain widths. */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as PlanFilterValue)}>
                            <SelectTrigger className="w-full md:w-44">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder={t('users.filters.plan')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('users.filters.allPlans')}</SelectItem>
                                <SelectItem value="free">{t('users.planLabels.free')}</SelectItem>
                                <SelectItem value="basic">{t('users.planLabels.basic')}</SelectItem>
                                <SelectItem value="pro">{t('users.planLabels.pro')}</SelectItem>
                                <SelectItem value="team">{t('users.planLabels.team')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}>
                            <SelectTrigger className="w-full md:w-44">
                                <SelectValue placeholder={t('users.filters.status')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('users.filters.allStatuses')}</SelectItem>
                                <SelectItem value="active">{t('users.filters.active')}</SelectItem>
                                <SelectItem value="trialing">{t('users.filters.trialing')}</SelectItem>
                                <SelectItem value="past_due">{t('users.filters.pastDue')}</SelectItem>
                                <SelectItem value="cancelled">{t('users.filters.cancelled')}</SelectItem>
                                <SelectItem value="disabled">{t('users.filters.disabled')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            <BulkActionsToolbar
                selectedCount={selectedIds.size}
                onClear={clearSelection}
                onDisable={() => runBulkAction('disable')}
                onEnable={() => runBulkAction('enable')}
                isRunning={isBulkRunning}
            />

            {usersLoading && users.length === 0 ? (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10" />
                                <TableHead>{t('users.table.user')}</TableHead>
                                <TableHead>{t('users.table.activity')}</TableHead>
                                <TableHead>{t('users.table.engagement')}</TableHead>
                                <TableHead>{t('users.table.lastLogin')}</TableHead>
                                <TableHead className="text-right">{t('users.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[0, 1, 2, 3, 4].map(i => <UserTableSkeletonRow key={i} />)}
                        </TableBody>
                    </Table>
                </Card>
            ) : users.length === 0 ? (
                <Card className="p-12 text-center">
                    <UserIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground">{t('users.empty.title')}</h2>
                    <p className="text-muted-foreground mt-2">
                        {filtersActive ? t('users.empty.noResults') : t('users.empty.noUsers')}
                    </p>
                </Card>
            ) : (
                <Card>
                    <Table>
                        {/* `[&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:font-semibold [&_th]:text-muted-foreground`
                            on the header gives table column titles a clear caption tier — distinct from row content
                            and from page H1. Was inheriting the default font-medium foreground, which read as "another
                            row" rather than a section label. */}
                        <TableHeader className="[&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:font-semibold [&_th]:text-muted-foreground [&_th]:h-12">
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={allVisibleSelected}
                                        data-state={someVisibleSelected && !allVisibleSelected ? 'indeterminate' : undefined}
                                        onCheckedChange={(c) => toggleAllVisible(c === true)}
                                        aria-label={t('users.table.selectAllAria')}
                                    />
                                </TableHead>
                                <SortableHeader
                                    label={t('users.table.user')}
                                    field="displayName"
                                    currentSort={sort}
                                    onSort={handleSort}
                                />
                                <TableHead>{t('users.table.activity')}</TableHead>
                                <SortableHeader
                                    label={t('users.table.engagement')}
                                    field="engagementScore"
                                    currentSort={sort}
                                    onSort={handleSort}
                                />
                                <SortableHeader
                                    label={t('users.table.lastLogin')}
                                    field="lastLoginAt"
                                    currentSort={sort}
                                    onSort={handleSort}
                                />
                                <TableHead className="text-right pr-4">{t('users.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <UserTableRow
                                    key={user.id}
                                    user={user}
                                    isResending={isResending}
                                    isEnabling={isEnabling}
                                    isDisabling={isDisabling}
                                    isSelected={selectedIds.has(user.id)}
                                    onToggleSelected={toggleSelected}
                                    onViewActivity={handleViewActivity}
                                    onViewDetails={handleViewDetails}
                                    onChangePlan={handleChangePlanClick}
                                    onResendEmail={resendEmail}
                                    onEnable={handleEnableUser}
                                    onDisable={(u) => setUserToDisable(u)}
                                    onDelete={handleDeleteClick}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <UserDetailsModal
                user={selectedUser}
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedUser(null);
                }}
                onChangePlan={handleChangePlanFromModal}
                onGrantCredits={(userId) => {
                    const u = allUsers.find(user => user.id === userId);
                    if (u) {
                        setIsDetailsModalOpen(false);
                        setSelectedUser(null);
                        setGrantCreditsUser(u);
                    }
                }}
                onExtendTrial={(userId) => {
                    const u = allUsers.find(user => user.id === userId);
                    if (u) {
                        setIsDetailsModalOpen(false);
                        setSelectedUser(null);
                        setExtendTrialUser(u);
                    }
                }}
                onViewAuditLog={(userId) => {
                    setIsDetailsModalOpen(false);
                    setSelectedUser(null);
                    navigate(`/dashboard/admin/audit-log?target=${userId}`);
                }}
            />

            <ChangePlanDialog
                user={planChangeUser}
                isOpen={!!planChangeUser}
                onClose={() => setPlanChangeUser(null)}
                // `useAllUsers` uses an onSnapshot listener so the row auto-updates
                // when the cloud function writes. The empty onSuccess just guarantees
                // the dialog closes and the success toast fires consistently — a
                // future hook can attach an explicit refetch here if we ever drop the
                // real-time listener.
                onSuccess={() => setPlanChangeUser(null)}
            />

            <GrantCreditsDialog
                user={grantCreditsUser}
                isOpen={!!grantCreditsUser}
                onClose={() => setGrantCreditsUser(null)}
            />

            <ExtendTrialDialog
                user={extendTrialUser}
                isOpen={!!extendTrialUser}
                onClose={() => setExtendTrialUser(null)}
            />

            <DisableUserDialog
                user={userToDisable}
                isDisabling={isDisabling}
                onCancel={() => setUserToDisable(null)}
                onConfirm={handleConfirmDisable}
            />

            <DeleteUserDialog
                user={userToDelete}
                confirmEmail={deleteConfirmEmail}
                isDeleting={isDeleting}
                onConfirmEmailChange={setDeleteConfirmEmail}
                onCancel={() => { setUserToDelete(null); setDeleteConfirmEmail(''); }}
                onConfirm={handleConfirmDelete}
            />

        </div>
    );
}
