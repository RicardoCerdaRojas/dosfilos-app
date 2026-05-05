import { useTranslation } from '@/i18n';
import {
    extractPlaceholders,
    KNOWN_TEMPLATE_PLACEHOLDERS,
    type FootnoteRules,
    type StyleManifestValidationIssue,
} from '@dosfilos/domain';
import { EditorField, editorInputClasses } from './EditorField';
import { Switch } from '@/components/ui/switch';
import { issueLabel } from './issueLabel';

interface FootnotesTabProps {
    value: FootnoteRules;
    onChange: (next: FootnoteRules) => void;
    issues: ReadonlyArray<StyleManifestValidationIssue>;
    disabled: boolean;
}

/**
 * v1.7 — Footnotes section of the style-guide editor. Templates,
 * ibid rules, and a placeholder hint banner so the user knows which
 * `{tokens}` the post-processor recognizes.
 *
 * Examples (`FootnoteExample[]`) are intentionally NOT editable from
 * this tab — they're just demonstrations the extractor produced. The
 * v1.5 spec treats them as snapshot, not source-of-truth.
 */
export function FootnotesTab({ value, onChange, issues, disabled }: FootnotesTabProps) {
    const { t } = useTranslation('exegesis');

    const firstError = issueLabel(issues, 'footnotes.firstMentionTemplate', 'error', t);
    const firstWarning = issueLabel(issues, 'footnotes.firstMentionTemplate', 'warning', t);
    const subsequentError = issueLabel(issues, 'footnotes.subsequentMentionTemplate', 'error', t);
    const subsequentWarning = issueLabel(issues, 'footnotes.subsequentMentionTemplate', 'warning', t);

    return (
        <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground leading-snug">
                {t('directory.styleGuides.editor.footnotes.intro')}
            </p>

            <PlaceholderHint t={t} />

            <EditorField
                label={t('directory.styleGuides.editor.footnotes.firstLabel')}
                hint={t('directory.styleGuides.editor.footnotes.firstHint')}
                error={firstError}
                warning={firstWarning}
                fullWidth
            >
                <input
                    type="text"
                    value={value.firstMentionTemplate}
                    onChange={(e) => onChange({ ...value, firstMentionTemplate: e.target.value })}
                    disabled={disabled}
                    className={`${editorInputClasses} font-mono text-[12px]`}
                />
                <PlaceholderPreview template={value.firstMentionTemplate} />
            </EditorField>

            <EditorField
                label={t('directory.styleGuides.editor.footnotes.subsequentLabel')}
                hint={t('directory.styleGuides.editor.footnotes.subsequentHint')}
                error={subsequentError}
                warning={subsequentWarning}
                fullWidth
            >
                <input
                    type="text"
                    value={value.subsequentMentionTemplate}
                    onChange={(e) => onChange({ ...value, subsequentMentionTemplate: e.target.value })}
                    disabled={disabled}
                    className={`${editorInputClasses} font-mono text-[12px]`}
                />
                <PlaceholderPreview template={value.subsequentMentionTemplate} />
            </EditorField>

            <fieldset className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                <legend className="text-[12px] font-medium text-foreground px-1">
                    {t('directory.styleGuides.editor.footnotes.ibidLegend')}
                </legend>

                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-foreground">
                            {t('directory.styleGuides.editor.footnotes.ibidEnabledLabel')}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                            {t('directory.styleGuides.editor.footnotes.ibidEnabledHint')}
                        </p>
                    </div>
                    <Switch
                        checked={value.ibid.enabled}
                        onCheckedChange={(checked) =>
                            onChange({ ...value, ibid: { ...value.ibid, enabled: checked } })
                        }
                        disabled={disabled}
                    />
                </div>

                {value.ibid.enabled && (
                    <>
                        <EditorField label={t('directory.styleGuides.editor.footnotes.ibidLabelLabel')} fullWidth>
                            <input
                                type="text"
                                value={value.ibid.label}
                                onChange={(e) =>
                                    onChange({ ...value, ibid: { ...value.ibid, label: e.target.value } })
                                }
                                disabled={disabled}
                                className={editorInputClasses}
                            />
                        </EditorField>

                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-foreground">
                                    {t('directory.styleGuides.editor.footnotes.allowPageOverrideLabel')}
                                </p>
                                <p className="text-[10.5px] text-muted-foreground">
                                    {t('directory.styleGuides.editor.footnotes.allowPageOverrideHint')}
                                </p>
                            </div>
                            <Switch
                                checked={value.ibid.allowPageOverride}
                                onCheckedChange={(checked) =>
                                    onChange({ ...value, ibid: { ...value.ibid, allowPageOverride: checked } })
                                }
                                disabled={disabled}
                            />
                        </div>
                    </>
                )}
            </fieldset>
        </div>
    );
}

function PlaceholderHint({ t }: { t: (key: string) => string }) {
    const placeholders = Array.from(KNOWN_TEMPLATE_PLACEHOLDERS);
    return (
        <details className="rounded-md border border-info/30 bg-info-subtle/40 px-3 py-2">
            <summary className="text-[11px] font-medium text-info-subtle-foreground cursor-pointer">
                {t('directory.styleGuides.editor.footnotes.placeholderHintTitle')}
            </summary>
            <div className="flex flex-wrap gap-1 mt-2">
                {placeholders.map(p => (
                    <code
                        key={p}
                        className="text-[10.5px] px-1.5 py-0.5 rounded bg-card border border-border font-mono"
                    >
                        {`{${p}}`}
                    </code>
                ))}
            </div>
        </details>
    );
}

function PlaceholderPreview({ template }: { template: string }) {
    const placeholders = extractPlaceholders(template);
    if (placeholders.length === 0) return null;
    return (
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
    );
}
