import { cn } from '@/lib/utils';

interface EditorFieldProps {
    label: string;
    children: React.ReactNode;
    /** Optional description shown below the label. */
    hint?: string;
    /** Optional error message; renders red below the input. */
    error?: string | null;
    /** Optional warning message; renders amber below the input. */
    warning?: string | null;
    /** Stretches across the full row in a 2-col grid. */
    fullWidth?: boolean;
}

/**
 * Shared label + body wrapper used across the v1.7 style-guide editor
 * tabs. Keeps the tab files lean and the layout consistent.
 */
export function EditorField({ label, children, hint, error, warning, fullWidth = false }: EditorFieldProps) {
    return (
        <div className={cn('space-y-1', fullWidth && 'sm:col-span-2')}>
            <label className="block text-[12px] font-medium text-foreground">{label}</label>
            {hint && (
                <p className="text-[10.5px] text-muted-foreground leading-snug">{hint}</p>
            )}
            {children}
            {error && (
                <p className="text-[10.5px] text-destructive leading-snug">{error}</p>
            )}
            {warning && !error && (
                <p className="text-[10.5px] text-warning leading-snug">{warning}</p>
            )}
        </div>
    );
}

export const editorInputClasses =
    'w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50';
