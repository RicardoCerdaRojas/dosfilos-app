import { useTranslation } from '@/i18n';
import type { StyleManifestValidationIssue, TransliterationRules } from '@dosfilos/domain';
import { Switch } from '@/components/ui/switch';
import { EditorField, editorInputClasses } from './EditorField';
import { issueLabel } from './issueLabel';

interface TransliterationTabProps {
    /** null when the guide doesn't define transliteration rules. */
    value: TransliterationRules | null;
    onChange: (next: TransliterationRules | null) => void;
    issues: ReadonlyArray<StyleManifestValidationIssue>;
    disabled: boolean;
}

const SCHEME_PRESETS: ReadonlyArray<string> = [
    'SBL',
    'Latinized',
    'Library of Congress',
    'IPA',
    'ALA-LC',
];

/**
 * v1.7 — Transliteration tab. The whole sub-object is nullable
 * (some guides don't specify transliteration). The first toggle
 * "Tiene reglas de transliteración" creates a default object the
 * user can then edit; switching off again clears the field.
 */
export function TransliterationTab({ value, onChange, issues, disabled }: TransliterationTabProps) {
    const { t } = useTranslation('exegesis');

    const enabled = value !== null;
    const schemeError = issueLabel(issues, 'transliteration.scheme', 'error', t);

    const handleToggleEnabled = (next: boolean) => {
        if (next) {
            onChange({
                scheme: 'SBL',
                useDiacritics: true,
                bodyRequiresTransliteration: false,
            });
        } else {
            onChange(null);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground leading-snug">
                {t('directory.styleGuides.editor.transliteration.intro')}
            </p>

            <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground">
                        {t('directory.styleGuides.editor.transliteration.enabledLabel')}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                        {t('directory.styleGuides.editor.transliteration.enabledHint')}
                    </p>
                </div>
                <Switch checked={enabled} onCheckedChange={handleToggleEnabled} disabled={disabled} />
            </div>

            {enabled && value && (
                <div className="space-y-4 rounded-md border border-border bg-card p-4">
                    <EditorField
                        label={t('directory.styleGuides.editor.transliteration.schemeLabel')}
                        hint={t('directory.styleGuides.editor.transliteration.schemeHint')}
                        error={schemeError}
                        fullWidth
                    >
                        <input
                            type="text"
                            value={value.scheme}
                            onChange={(e) => onChange({ ...value, scheme: e.target.value })}
                            disabled={disabled}
                            className={editorInputClasses}
                            list="transliteration-scheme-presets"
                        />
                        <datalist id="transliteration-scheme-presets">
                            {SCHEME_PRESETS.map(s => <option key={s} value={s} />)}
                        </datalist>
                        <div className="flex flex-wrap gap-1 pt-1">
                            {SCHEME_PRESETS.map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onChange({ ...value, scheme: preset })}
                                    disabled={disabled}
                                    className="text-[10.5px] px-2 py-0.5 rounded border border-border bg-card hover:bg-accent"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </EditorField>

                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-foreground">
                                {t('directory.styleGuides.editor.transliteration.diacriticsLabel')}
                            </p>
                            <p className="text-[10.5px] text-muted-foreground">
                                {t('directory.styleGuides.editor.transliteration.diacriticsHint')}
                            </p>
                        </div>
                        <Switch
                            checked={value.useDiacritics}
                            onCheckedChange={(checked) => onChange({ ...value, useDiacritics: checked })}
                            disabled={disabled}
                        />
                    </div>

                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-foreground">
                                {t('directory.styleGuides.editor.transliteration.bodyRequiredLabel')}
                            </p>
                            <p className="text-[10.5px] text-muted-foreground">
                                {t('directory.styleGuides.editor.transliteration.bodyRequiredHint')}
                            </p>
                        </div>
                        <Switch
                            checked={value.bodyRequiresTransliteration}
                            onCheckedChange={(checked) =>
                                onChange({ ...value, bodyRequiresTransliteration: checked })
                            }
                            disabled={disabled}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
