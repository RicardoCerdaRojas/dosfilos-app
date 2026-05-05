import { useTranslation } from '@/i18n';
import type { QuotationRules, StyleManifestValidationIssue } from '@dosfilos/domain';
import { EditorField, editorInputClasses } from './EditorField';
import { issueLabel } from './issueLabel';

interface QuotationsTabProps {
    value: QuotationRules;
    onChange: (next: QuotationRules) => void;
    issues: ReadonlyArray<StyleManifestValidationIssue>;
    disabled: boolean;
}

const QUOTE_MARK_PRESETS: ReadonlyArray<{ value: string; label: string }> = [
    { value: '"', label: '"…" (recta)' },
    { value: '“', label: '“…” (curva)' },
    { value: '«', label: '«…» (francesa)' },
    { value: '„', label: '„…“ (alemana)' },
];

const SECONDARY_MARK_PRESETS: ReadonlyArray<{ value: string; label: string }> = [
    { value: "'", label: "'…' (recta)" },
    { value: '‘', label: '‘…’ (curva)' },
    { value: '"', label: '"…" (recta)' },
    { value: '“', label: '“…” (curva)' },
];

const ELLIPSIS_PRESETS: ReadonlyArray<string> = ['...', '. . .', '…'];

const BRACKETS_PRESETS: ReadonlyArray<{ value: '[]' | '()'; label: string }> = [
    { value: '[]', label: '[ texto ]' },
    { value: '()', label: '( texto )' },
];

export function QuotationsTab({ value, onChange, issues, disabled }: QuotationsTabProps) {
    const { t } = useTranslation('exegesis');

    const thresholdError = issueLabel(issues, 'quotations.blockQuoteThresholdWords', 'error', t);
    const primaryError = issueLabel(issues, 'quotations.primaryQuoteMark', 'error', t);
    const secondaryError = issueLabel(issues, 'quotations.secondaryQuoteMark', 'error', t);

    return (
        <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground leading-snug">
                {t('directory.styleGuides.editor.quotations.intro')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditorField
                    label={t('directory.styleGuides.editor.quotations.thresholdLabel')}
                    hint={t('directory.styleGuides.editor.quotations.thresholdHint')}
                    error={thresholdError}
                >
                    <input
                        type="number"
                        min={1}
                        max={500}
                        value={value.blockQuoteThresholdWords}
                        onChange={(e) =>
                            onChange({
                                ...value,
                                blockQuoteThresholdWords: Number.parseInt(e.target.value, 10) || 0,
                            })
                        }
                        disabled={disabled}
                        className={editorInputClasses}
                    />
                </EditorField>

                <EditorField
                    label={t('directory.styleGuides.editor.quotations.bracketsLabel')}
                    hint={t('directory.styleGuides.editor.quotations.bracketsHint')}
                >
                    <select
                        value={value.interpolationBrackets}
                        onChange={(e) =>
                            onChange({
                                ...value,
                                interpolationBrackets: e.target.value as '[]' | '()',
                            })
                        }
                        disabled={disabled}
                        className={editorInputClasses}
                    >
                        {BRACKETS_PRESETS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </EditorField>

                <EditorField
                    label={t('directory.styleGuides.editor.quotations.primaryLabel')}
                    hint={t('directory.styleGuides.editor.quotations.primaryHint')}
                    error={primaryError}
                >
                    <input
                        type="text"
                        value={value.primaryQuoteMark}
                        onChange={(e) => onChange({ ...value, primaryQuoteMark: e.target.value })}
                        disabled={disabled}
                        className={`${editorInputClasses} font-serif text-base text-center`}
                        maxLength={3}
                    />
                    <PresetRow
                        presets={QUOTE_MARK_PRESETS}
                        onPick={(v) => onChange({ ...value, primaryQuoteMark: v })}
                        disabled={disabled}
                    />
                </EditorField>

                <EditorField
                    label={t('directory.styleGuides.editor.quotations.secondaryLabel')}
                    hint={t('directory.styleGuides.editor.quotations.secondaryHint')}
                    error={secondaryError}
                >
                    <input
                        type="text"
                        value={value.secondaryQuoteMark}
                        onChange={(e) => onChange({ ...value, secondaryQuoteMark: e.target.value })}
                        disabled={disabled}
                        className={`${editorInputClasses} font-serif text-base text-center`}
                        maxLength={3}
                    />
                    <PresetRow
                        presets={SECONDARY_MARK_PRESETS}
                        onPick={(v) => onChange({ ...value, secondaryQuoteMark: v })}
                        disabled={disabled}
                    />
                </EditorField>

                <EditorField
                    label={t('directory.styleGuides.editor.quotations.ellipsisLabel')}
                    hint={t('directory.styleGuides.editor.quotations.ellipsisHint')}
                    fullWidth
                >
                    <input
                        type="text"
                        value={value.ellipsis}
                        onChange={(e) => onChange({ ...value, ellipsis: e.target.value })}
                        disabled={disabled}
                        className={`${editorInputClasses} font-mono text-center`}
                        maxLength={10}
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                        {ELLIPSIS_PRESETS.map(preset => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => onChange({ ...value, ellipsis: preset })}
                                disabled={disabled}
                                className="text-[10.5px] px-2 py-0.5 rounded border border-border bg-card hover:bg-accent font-mono"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </EditorField>
            </div>

            <PreviewBox value={value} t={t} />
        </div>
    );
}

function PresetRow({
    presets,
    onPick,
    disabled,
}: {
    presets: ReadonlyArray<{ value: string; label: string }>;
    onPick: (v: string) => void;
    disabled: boolean;
}) {
    return (
        <div className="flex flex-wrap gap-1 pt-1">
            {presets.map(preset => (
                <button
                    key={preset.label}
                    type="button"
                    onClick={() => onPick(preset.value)}
                    disabled={disabled}
                    className="text-[10.5px] px-1.5 py-0.5 rounded border border-border bg-card hover:bg-accent"
                >
                    {preset.label}
                </button>
            ))}
        </div>
    );
}

function PreviewBox({ value, t }: { value: QuotationRules; t: (key: string) => string }) {
    const sample = t('directory.styleGuides.editor.quotations.previewSample');
    return (
        <div className="rounded-md border border-info/30 bg-info-subtle/40 px-3 py-2.5 space-y-1">
            <p className="text-[10.5px] uppercase tracking-wide text-info-subtle-foreground font-semibold">
                {t('directory.styleGuides.editor.quotations.previewTitle')}
            </p>
            <p className="text-[12.5px] text-foreground font-serif">
                {value.primaryQuoteMark}
                {sample}
                {value.secondaryQuoteMark}cita interna{value.secondaryQuoteMark}
                {value.primaryQuoteMark}
            </p>
        </div>
    );
}
