import { useTranslation } from '@/i18n';
import {
    extractPlaceholders,
    KNOWN_TEMPLATE_PLACEHOLDERS,
    type BibliographyRules,
    type StyleManifestValidationIssue,
} from '@dosfilos/domain';
import { EditorField, editorInputClasses } from './EditorField';
import { Switch } from '@/components/ui/switch';
import { issueLabel } from './issueLabel';

interface BibliographyTabProps {
    value: BibliographyRules;
    onChange: (next: BibliographyRules) => void;
    issues: ReadonlyArray<StyleManifestValidationIssue>;
    disabled: boolean;
}

export function BibliographyTab({ value, onChange, issues, disabled }: BibliographyTabProps) {
    const { t } = useTranslation('exegesis');

    const entryError = issueLabel(issues, 'bibliography.entryTemplate', 'error', t);
    const entryWarning = issueLabel(issues, 'bibliography.entryTemplate', 'warning', t);
    const placeholders = extractPlaceholders(value.entryTemplate);

    return (
        <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground leading-snug">
                {t('directory.styleGuides.editor.bibliography.intro')}
            </p>

            <EditorField
                label={t('directory.styleGuides.editor.bibliography.entryLabel')}
                hint={t('directory.styleGuides.editor.bibliography.entryHint')}
                error={entryError}
                warning={entryWarning}
                fullWidth
            >
                <input
                    type="text"
                    value={value.entryTemplate}
                    onChange={(e) => onChange({ ...value, entryTemplate: e.target.value })}
                    disabled={disabled}
                    className={`${editorInputClasses} font-mono text-[12px]`}
                />
                {placeholders.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                        {placeholders.map((p, i) => (
                            <code
                                key={`${p}-${i}`}
                                className={`text-[9.5px] px-1 py-0.5 rounded border ${
                                    KNOWN_TEMPLATE_PLACEHOLDERS.has(p)
                                        ? 'bg-success-subtle border-success/30 text-success-subtle-foreground'
                                        : 'bg-warning-subtle border-warning/40 text-warning-subtle-foreground'
                                }`}
                            >
                                {`{${p}}`}
                            </code>
                        ))}
                    </div>
                )}
            </EditorField>

            <EditorField
                label={t('directory.styleGuides.editor.bibliography.sortByLabel')}
                hint={t('directory.styleGuides.editor.bibliography.sortByHint')}
                fullWidth
            >
                <select
                    value={value.sortBy}
                    onChange={(e) => onChange({ ...value, sortBy: e.target.value as BibliographyRules['sortBy'] })}
                    disabled={disabled}
                    className={editorInputClasses}
                >
                    <option value="author-surname">
                        {t('directory.styleGuides.editor.bibliography.sortByAuthorSurname')}
                    </option>
                    <option value="order-of-appearance">
                        {t('directory.styleGuides.editor.bibliography.sortByOrderOfAppearance')}
                    </option>
                </select>
            </EditorField>

            <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground">
                        {t('directory.styleGuides.editor.bibliography.dashLabel')}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                        {t('directory.styleGuides.editor.bibliography.dashHint')}
                    </p>
                </div>
                <Switch
                    checked={value.useDashForRepeatedAuthors}
                    onCheckedChange={(checked) => onChange({ ...value, useDashForRepeatedAuthors: checked })}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}
