import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Props {
    /** Controlled justification value. */
    value: string;
    onChange: (value: string) => void;
    /** Minimum trimmed length required to enable publish (ADR-029 §Q5). */
    minChars: number;
    disabled?: boolean;
}

/**
 * Phase 3 PR 2 (ADR-029 §Q5) — soft-block override justification field.
 *
 * The pastor must write at least `minChars` characters explaining why they
 * publish despite partial-support findings. The justification is persisted
 * as the `GateOverride` audit record (see `SermonService.enforceFidelityGate`).
 */
export function FidelityOverrideForm({ value, onChange, minChars, disabled }: Props) {
    const { t } = useTranslation('sermonDetail');
    const length = value.trim().length;
    const remaining = Math.max(0, minChars - length);
    const met = length >= minChars;

    return (
        <div className="space-y-2">
            <Label htmlFor="fidelity-override-reason">{t('fidelityGate.override.label')}</Label>
            <Textarea
                id="fidelity-override-reason"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('fidelityGate.override.placeholder', { min: minChars })}
                disabled={disabled}
                rows={4}
                aria-describedby="fidelity-override-counter"
            />
            <div
                id="fidelity-override-counter"
                className="flex items-center justify-between text-xs"
            >
                <span className="text-muted-foreground">
                    {remaining > 0 ? t('fidelityGate.override.remaining', { remaining }) : ''}
                </span>
                <span className={cn(met ? 'text-success-subtle-foreground' : 'text-muted-foreground')}>
                    {t('fidelityGate.override.counter', { count: length, min: minChars })}
                </span>
            </div>
        </div>
    );
}
