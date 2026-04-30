import { useMemo } from 'react';
import { SOURCE_TYPE_GROUPS, type SourceType } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

/**
 * Grouped source-type selector used by the corpus sub-step's upload
 * form and by the inline edit row on existing sources.
 *
 * Renders a native `<select>` with `<optgroup>` per academic family
 * (Primary text / Lexical / Commentaries / Background /
 * Methodological). The native control gives us free keyboard
 * navigation, screen-reader compatibility, and mobile-friendly
 * touch targets — building a custom dropdown for 13 options would
 * cost a lot for marginal value.
 *
 * Each option label includes a short example list ("BDAG, HALOT,
 * LSJ") so the student picks the right type without having to
 * cross-reference docs. Description text lives in tooltips
 * surrounding the select; this component focuses on the picker
 * itself.
 *
 * Pure controlled component — `value` + `onChange` only. The
 * component does NOT validate against the rubric; the parent's gap
 * card handles that and surfaces requirement nudges.
 */
interface SourceTypePickerProps {
    value: SourceType;
    onChange: (next: SourceType) => void;
    /** Disables the picker (e.g. while uploading). */
    disabled?: boolean;
    /** Optional CSS classes appended to the `<select>`. */
    className?: string;
    /** Optional id for label/aria associations. */
    id?: string;
}

export function SourceTypePicker({ value, onChange, disabled, className, id }: SourceTypePickerProps) {
    const { t } = useTranslation('exegesis');

    // Stable option list — computed once per locale change. Each
    // entry already includes the localized label + a compact examples
    // hint so the dropdown is self-explanatory.
    const groupedOptions = useMemo(() => {
        return SOURCE_TYPE_GROUPS.map(group => ({
            groupKey: group.groupKey,
            groupLabel: t(`sourceTypeGroups.${group.groupKey}`),
            types: group.types.map(type => ({
                value: type,
                label: t(`sourceTypes.${type}.label`),
                examples: t(`sourceTypes.${type}.examples`),
            })),
        }));
    }, [t]);

    return (
        <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value as SourceType)}
            disabled={disabled}
            className={[
                'rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 disabled:opacity-50',
                className ?? '',
            ].join(' ')}
        >
            {groupedOptions.map(group => (
                <optgroup key={group.groupKey} label={group.groupLabel}>
                    {group.types.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label} — {opt.examples}
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
}
