import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { StyleManifestValidationIssue } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { editorInputClasses } from './EditorField';
import { issueLabelByPrefix } from './issueLabel';

interface AdditionalRulesTabProps {
    value: ReadonlyArray<string>;
    onChange: (next: ReadonlyArray<string>) => void;
    issues: ReadonlyArray<StyleManifestValidationIssue>;
    disabled: boolean;
}

/**
 * v1.7 — Free-form additional rules. Each entry is a single localized
 * sentence. Editor is a list with inline `+ Agregar` / `🗑 quitar`.
 *
 * Validation hits per-row warnings (empty / duplicate). They don't
 * block save — the editor still lets the user push through, but the
 * row is highlighted so they see what's happening.
 */
export function AdditionalRulesTab({ value, onChange, issues, disabled }: AdditionalRulesTabProps) {
    const { t } = useTranslation('exegesis');

    const warnings = issueLabelByPrefix(issues, 'additionalRules.', 'warning', t);

    const handleEdit = (idx: number, text: string) => {
        const next = [...value];
        next[idx] = text;
        onChange(next);
    };
    const handleRemove = (idx: number) => {
        const next = value.filter((_, i) => i !== idx);
        onChange(next);
    };
    const handleAdd = () => {
        onChange([...value, '']);
    };

    return (
        <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground leading-snug">
                {t('directory.styleGuides.editor.additionalRules.intro')}
            </p>

            {value.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-3">
                    {t('directory.styleGuides.editor.additionalRules.empty')}
                </p>
            ) : (
                <ul className="space-y-2" role="list">
                    {value.map((rule, idx) => {
                        const warning = warnings.get(`additionalRules.${idx}`);
                        return (
                            <li key={idx} className="space-y-1">
                                <div className="flex items-start gap-2">
                                    <textarea
                                        value={rule}
                                        onChange={(e) => handleEdit(idx, e.target.value)}
                                        disabled={disabled}
                                        rows={2}
                                        className={`${editorInputClasses} resize-y min-h-[44px]`}
                                        placeholder={t('directory.styleGuides.editor.additionalRules.placeholder')}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemove(idx)}
                                        disabled={disabled}
                                        className="text-muted-foreground hover:text-destructive shrink-0"
                                        aria-label={t('directory.styleGuides.editor.additionalRules.remove')}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                    </Button>
                                </div>
                                {warning && (
                                    <p className="text-[10.5px] text-warning leading-snug pl-1">{warning}</p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={disabled}
                className="text-xs gap-1.5"
            >
                <Plus className="h-3 w-3" aria-hidden />
                {t('directory.styleGuides.editor.additionalRules.add')}
            </Button>
        </div>
    );
}
