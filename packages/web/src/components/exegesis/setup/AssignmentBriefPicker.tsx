import { useState } from 'react';
import { Bookmark, BookmarkCheck, Check, ChevronDown, Loader2, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useUserAssignmentBriefs } from '@/hooks/exegesis/useUserAssignmentBriefs';
import { toast } from 'sonner';

interface AssignmentBriefPickerProps {
    /** Current textarea value — used for the "Save as template" action. */
    currentBody: string;
    /** Apply the chosen template's body. */
    onApply: (body: string) => void;
}

/**
 * Lightweight picker for the create wizard's Step 5. Mirrors
 * `RubricTemplatePicker` shape without its system-defaults section
 * (briefs are user-only — no system catalog). Renders:
 *
 *   - Trigger button "Cargar plantilla" with default name when one
 *     exists.
 *   - Popover list of the user's saved briefs (default starred first).
 *   - Inline "Save current as template" button under the trigger when
 *     the textarea has substantive content (≥30 chars).
 *
 * The picker doesn't OWN the textarea — `onApply` writes back to the
 * parent's state. Same separation as `RubricTemplatePicker`.
 */
export function AssignmentBriefPicker({ currentBody, onApply }: AssignmentBriefPickerProps) {
    const { t } = useTranslation('exegesis');
    const { briefs, isLoading, createBrief, deleteBrief, setDefault } = useUserAssignmentBriefs();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const sorted = [...briefs].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (b.isDefault && !a.isDefault) return 1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    const defaultBrief = sorted.find(b => b.isDefault) ?? null;
    const triggerLabel = defaultBrief
        ? t('create.brief.templates.defaultLabel', { name: defaultBrief.displayName })
        : t('create.brief.templates.pickLabel');

    const canSave = currentBody.trim().length >= 30;

    const handleSave = async () => {
        if (!canSave) return;
        const name = window.prompt(t('create.brief.templates.namePrompt'));
        if (!name?.trim()) return;
        setSaving(true);
        try {
            await createBrief.mutateAsync({
                displayName: name.trim(),
                body: currentBody,
                markAsDefault: briefs.length === 0,
            });
            toast.success(t('create.brief.templates.savedToast', { name: name.trim() }));
        } catch (err) {
            console.error('[exegesis] save brief failed:', err);
            toast.error(t('create.brief.templates.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (briefId: string, name: string) => {
        if (!window.confirm(t('create.brief.templates.confirmDelete', { name }))) return;
        try {
            await deleteBrief.mutateAsync(briefId);
            toast.success(t('create.brief.templates.deletedToast'));
        } catch (err) {
            console.error('[exegesis] delete brief failed:', err);
            toast.error(t('create.brief.templates.deleteFailed'));
        }
    };

    const handleApply = (body: string) => {
        onApply(body);
        setOpen(false);
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                    >
                        <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[260px]">{triggerLabel}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[300px] max-h-[360px] overflow-hidden border border-border shadow-xl rounded-lg"
                >
                    <div className="px-3 py-2 border-b border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('create.brief.templates.listHeader')}
                        </p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto py-1">
                        {isLoading && (
                            <p className="px-3 py-4 text-xs text-muted-foreground inline-flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {t('create.brief.templates.loading')}
                            </p>
                        )}
                        {!isLoading && sorted.length === 0 && (
                            <p className="px-3 py-4 text-xs text-muted-foreground italic">
                                {t('create.brief.templates.empty')}
                            </p>
                        )}
                        {sorted.map(b => (
                            <div
                                key={b.id}
                                className="group flex items-start gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleApply(b.body)}
                                    className="flex-1 min-w-0 text-left"
                                >
                                    <div className="flex items-center gap-1.5">
                                        {b.isDefault ? (
                                            <BookmarkCheck className="h-3.5 w-3.5 text-success shrink-0" />
                                        ) : (
                                            <Bookmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        )}
                                        <span className="text-[13px] font-medium text-foreground truncate">
                                            {b.displayName}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                        {b.body}
                                    </p>
                                </button>
                                <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!b.isDefault && (
                                        <button
                                            type="button"
                                            title={t('create.brief.templates.markDefault')}
                                            onClick={() => setDefault.mutate(b.id)}
                                            className={cn(
                                                'inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-success hover:bg-success-subtle transition-colors',
                                            )}
                                        >
                                            <Check className="h-3 w-3" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        title={t('create.brief.templates.delete')}
                                        onClick={() => handleDelete(b.id, b.displayName)}
                                        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={!canSave || saving}
                className="inline-flex items-center gap-1.5 text-[12px]"
                title={canSave ? undefined : t('create.brief.templates.saveDisabledTooltip')}
            >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t('create.brief.templates.saveCta')}
            </Button>
        </div>
    );
}
