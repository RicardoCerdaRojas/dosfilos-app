import { AlertCircle } from 'lucide-react';
import { StepValidationResult } from '@dosfilos/domain';
import { cn } from '@/lib/utils';

interface Props {
    stepNumber: number;
    title: string;
    subtitle: string;
    passage: string;
    validation?: StepValidationResult;
    children: React.ReactNode;
}

/**
 * Shared frame for each PastoralSeed sub-step. Compact header (single
 * row) + body + validator footer. The passage label is rendered inline
 * with the step header to save vertical space — the older two-row
 * layout duplicated information already present in the wizard's
 * breadcrumb + global pipeline header.
 */
export function StepShell({ stepNumber, title, subtitle, passage, validation, children }: Props) {
    const valid = validation?.valid ?? false;
    const reasons = validation?.reasons ?? [];
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                        Paso {stepNumber}
                    </span>
                    <h2 className="text-lg font-semibold font-serif">{title}</h2>
                </div>
                <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                    {passage}
                </span>
            </div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            <div>{children}</div>
            {!valid && reasons.length > 0 && (
                <div
                    className={cn(
                        'flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400',
                        'border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-md p-3',
                    )}
                >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <ul className="space-y-1 list-disc list-inside">
                        {reasons.map((r) => (
                            <li key={r}>{r}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
