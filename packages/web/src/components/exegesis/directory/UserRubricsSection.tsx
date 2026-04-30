import { useState } from 'react';
import { FileCheck2, Star, Trash2, Loader2, Plus, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
    const [showCreateForm, setShowCreateForm] = useState(false);

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
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                        {t('directory.rubrics.empty.body')}
                    </p>
                    <Button
                        type="button"
                        onClick={() => setShowCreateForm(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        {t('directory.rubrics.createCta')}
                    </Button>
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

            {rubrics.length > 0 && !showCreateForm && (
                <div className="mt-3 flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateForm(true)}
                        className="text-xs"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        {t('directory.rubrics.createCta')}
                    </Button>
                </div>
            )}

            {showCreateForm && (
                <div className="mt-4">
                    <CreateRubricForm onDone={() => setShowCreateForm(false)} />
                </div>
            )}
        </section>
    );
}

// ── Inline Create-from-text form ───────────────────────────────────────

function CreateRubricForm({ onDone }: { onDone: () => void }) {
    const { t, i18n } = useTranslation('exegesis');
    const { createFromText } = useUserRubrics();
    const [name, setName] = useState('');
    const [mode, setMode] = useState<'blank' | 'paste'>('blank');
    const [rawText, setRawText] = useState('');
    const language: 'es' | 'en' = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    const trimmedText = rawText.trim();
    const submitting = createFromText.isPending;
    const canSubmit = name.trim().length >= 3
        && (mode === 'blank' || trimmedText.length >= 30)
        && !submitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        try {
            await createFromText.mutateAsync({
                displayName: name.trim(),
                rawText: mode === 'paste' ? trimmedText : undefined,
                language,
            });
            toast.success(t('directory.rubrics.toast.created'));
            setName('');
            setRawText('');
            setMode('blank');
            onDone();
        } catch (err: any) {
            console.error('[exegesis] create rubric from text failed:', err);
            const isOverload = err?.isExegesisOverload === true;
            toast.error(isOverload
                ? t('directory.rubrics.toast.overloaded')
                : t('directory.rubrics.toast.createFailed'));
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-muted/40 p-4 space-y-3"
        >
            <h3 className="text-sm font-semibold text-foreground">
                {t('directory.rubrics.create.title')}
            </h3>

            <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                    {t('directory.rubrics.create.nameLabel')}
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    placeholder={t('directory.rubrics.create.namePlaceholder')}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                    {t('directory.rubrics.create.modeLabel')}
                </label>
                <div className="flex gap-2">
                    <ModeOption
                        active={mode === 'blank'}
                        onClick={() => setMode('blank')}
                        label={t('directory.rubrics.create.modeBlank')}
                    />
                    <ModeOption
                        active={mode === 'paste'}
                        onClick={() => setMode('paste')}
                        label={t('directory.rubrics.create.modePaste')}
                    />
                </div>
            </div>

            {mode === 'paste' && (
                <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                        {t('directory.rubrics.create.textLabel')}
                    </label>
                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={6}
                        disabled={submitting}
                        placeholder={t('directory.rubrics.create.textPlaceholder')}
                        className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
                    />
                    {trimmedText.length > 0 && trimmedText.length < 30 && (
                        <p className="text-[11px] text-warning-subtle-foreground mt-1 inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t('directory.rubrics.create.tooShort')}
                        </p>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-muted-foreground italic">
                    {mode === 'blank'
                        ? t('directory.rubrics.create.blankHint')
                        : t('directory.rubrics.create.pasteHint')}
                </p>
                <div className="flex gap-1.5">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onDone}
                        disabled={submitting}
                        className="text-xs"
                    >
                        {t('setup.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                    >
                        {submitting ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        {t('directory.rubrics.create.submit')}
                    </Button>
                </div>
            </div>
        </form>
    );
}

function ModeOption({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                    ? 'border-success bg-success-subtle text-success-subtle-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent',
            ].join(' ')}
            aria-pressed={active}
        >
            {label}
        </button>
    );
}
