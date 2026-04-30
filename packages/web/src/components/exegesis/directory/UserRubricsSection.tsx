import { FileCheck2, Star, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { useUserRubrics } from '@/hooks/exegesis/useUserRubrics';
import type { UserRubric } from '@dosfilos/domain';

/**
 * Directory section listing the user's rubric templates.
 *
 * v1 scope:
 *   - Read-only list with displayName + provenance + isDefault
 *     badge + counts of source requirements / structural
 *     expectations.
 *   - Actions per row: set as default, delete (with confirm).
 *   - Templates are CREATED via the paper-setup "save as template"
 *     button. A standalone editor (create rubric without a paper
 *     context) is v1.5 work — keeps this surface focused.
 *   - Empty state nudges the student toward saving from a paper.
 */
export function UserRubricsSection() {
    const { t } = useTranslation('exegesis');
    const { rubrics, isLoading, deleteRubric, setDefault } = useUserRubrics();

    const handleSetDefault = async (rubricId: string) => {
        try {
            await setDefault.mutateAsync(rubricId);
            toast.success(t('directory.rubrics.toast.defaultSet'));
        } catch (err) {
            console.error('[exegesis] set default rubric failed:', err);
            toast.error(t('directory.rubrics.toast.defaultFailed'));
        }
    };

    const handleDelete = async (rubric: UserRubric) => {
        if (!window.confirm(t('directory.rubrics.deleteConfirm', { name: rubric.displayName }))) return;
        try {
            await deleteRubric.mutateAsync(rubric.id);
            toast.success(t('directory.rubrics.toast.deleted'));
        } catch (err) {
            console.error('[exegesis] delete rubric failed:', err);
            toast.error(t('directory.rubrics.toast.deleteFailed'));
        }
    };

    return (
        <section>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 rounded-full bg-primary" />
                <h2 className="text-xl font-bold text-foreground font-serif">
                    {t('directory.rubrics.title')}
                </h2>
            </div>
            <p className="text-sm text-muted-foreground pl-3 mb-6">
                {t('directory.rubrics.subtitle')}
            </p>

            {isLoading ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-8 py-8 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-success" />
                    {t('directory.rubrics.loading')}
                </div>
            ) : rubrics.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-8 py-10 text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-success-subtle text-success flex items-center justify-center mb-3">
                        <FileCheck2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                        {t('directory.rubrics.empty.title')}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        {t('directory.rubrics.empty.body')}
                    </p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {rubrics.map(r => (
                        <li
                            key={r.id}
                            className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
                        >
                            <div className="shrink-0 w-9 h-9 rounded-full bg-success-subtle text-success flex items-center justify-center">
                                <FileCheck2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-foreground truncate">
                                        {r.displayName}
                                    </h3>
                                    {r.isDefault && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-success-subtle text-success-subtle-foreground px-2 py-0.5">
                                            <Star className="h-2.5 w-2.5 fill-current" />
                                            {t('directory.rubrics.defaultBadge')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                    {t(`paperSetup.subSteps.rubric.provenance.${r.rubric.provenance}`)}
                                    {' · '}
                                    {t('directory.rubrics.requirementsCount', { count: r.rubric.sourceRequirements.length })}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                {!r.isDefault && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetDefault(r.id)}
                                        disabled={setDefault.isPending}
                                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent disabled:opacity-50"
                                        title={t('directory.rubrics.setDefault')}
                                    >
                                        <Star className="h-3 w-3" />
                                        {t('directory.rubrics.setDefault')}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDelete(r)}
                                    disabled={deleteRubric.isPending}
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent disabled:opacity-50"
                                    title={t('directory.rubrics.delete')}
                                    aria-label={t('directory.rubrics.delete')}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
