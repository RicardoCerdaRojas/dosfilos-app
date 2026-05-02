import { useState } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import {
    SOURCE_TYPE_GROUPS,
    type SourceRequirement,
    type SourceType,
} from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

/**
 * Editable row for a single `SourceRequirement` (sourceType + min/max
 * + justification). Shared between the paper-setup rubric editor
 * (`RubricSubStep`) and the user-rubric template editor
 * (`UserRubricEditDialog`).
 *
 * Pure controlled component — owns no state; the parent passes the
 * current value, an onChange patch, and an onRemove handler.
 */
export interface RequirementRowProps {
    requirement: SourceRequirement;
    onChange: (patch: Partial<SourceRequirement>) => void;
    onRemove: () => void;
}

export function RequirementRow({ requirement, onChange, onRemove }: RequirementRowProps) {
    const { t } = useTranslation('exegesis');
    return (
        <li className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                        {t(`sourceTypes.${requirement.sourceType}.label`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground italic">
                        {t(`sourceTypes.${requirement.sourceType}.examples`)}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
                    aria-label={t('paperSetup.subSteps.rubric.requirements.removeRequirement')}
                    title={t('paperSetup.subSteps.rubric.requirements.removeRequirement')}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">
                        {t('paperSetup.subSteps.rubric.requirements.minLabel')}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={requirement.minimum}
                        onChange={(e) => onChange({ minimum: Math.max(0, Number(e.target.value || 0)) })}
                        className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">
                        {t('paperSetup.subSteps.rubric.requirements.maxLabel')}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={requirement.maximum ?? ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            onChange({ maximum: v === '' ? null : Math.max(0, Number(v)) });
                        }}
                        placeholder={t('paperSetup.subSteps.rubric.requirements.maxUnlimited')}
                        className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                </div>
            </div>
            <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">
                    {t('paperSetup.subSteps.rubric.requirements.justificationLabel')}
                </label>
                <textarea
                    value={requirement.justification}
                    onChange={(e) => onChange({ justification: e.target.value })}
                    placeholder={t('paperSetup.subSteps.rubric.requirements.justificationPlaceholder')}
                    rows={2}
                    className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
                />
            </div>
        </li>
    );
}

export interface AddRequirementButtonProps {
    availableTypes: ReadonlyArray<SourceType>;
    onAdd: (type: SourceType) => void;
}

export function AddRequirementButton({ availableTypes, onAdd }: AddRequirementButtonProps) {
    const { t } = useTranslation('exegesis');
    const [picking, setPicking] = useState(false);

    if (availableTypes.length === 0) {
        return (
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Info className="h-3 w-3" />
                {t('paperSetup.subSteps.rubric.requirements.duplicateError')}
            </p>
        );
    }

    if (!picking) {
        return (
            <button
                type="button"
                onClick={() => setPicking(true)}
                className="inline-flex items-center gap-1 text-xs text-success hover:text-success-subtle-foreground"
            >
                <Plus className="h-3 w-3" />
                {t('paperSetup.subSteps.rubric.requirements.addRequirement')}
            </button>
        );
    }

    return (
        <select
            autoFocus
            onChange={(e) => {
                const v = e.target.value as SourceType;
                if (v) {
                    onAdd(v);
                    setPicking(false);
                }
            }}
            onBlur={() => setPicking(false)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
            <option value="">— {t('paperSetup.subSteps.rubric.requirements.addRequirement')} —</option>
            {SOURCE_TYPE_GROUPS.map(group => {
                const groupAvailable = group.types.filter(typ => availableTypes.includes(typ as SourceType)) as ReadonlyArray<SourceType>;
                if (groupAvailable.length === 0) return null;
                return (
                    <optgroup key={group.groupKey} label={t(`sourceTypeGroups.${group.groupKey}`)}>
                        {groupAvailable.map(typ => (
                            <option key={typ} value={typ}>{t(`sourceTypes.${typ}.label`)}</option>
                        ))}
                    </optgroup>
                );
            })}
        </select>
    );
}
