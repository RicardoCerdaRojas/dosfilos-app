import { useCallback, useId, useRef, useState, type DragEvent } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
    /**
     * Comma-separated list of accepted MIME types or extensions, exactly
     * as you'd pass to `<input type="file" accept>`. Validation against
     * dropped files matches by extension only (drag-drop doesn't always
     * carry MIME).
     *
     * @example ".pdf,.epub" or "application/pdf,.pdf,application/epub+zip,.epub"
     */
    accept?: string;
    /** Currently selected file, or null when empty. Parent owns the state. */
    value: File | null;
    /** Fired with the selected file or null when cleared. */
    onChange: (file: File | null) => void;
    /** Disables click + drop while busy (e.g. mid-upload). */
    disabled?: boolean;
    /**
     * Soft cap shown as warning copy when exceeded — not enforced
     * (the upload pipeline applies the real cap). Display only.
     */
    maxSizeMB?: number;
    /** Optional helper line under the empty-state CTA. */
    hint?: string;
    /** Visual size variant. `'compact'` keeps the box ~88px tall for inline forms. */
    size?: 'compact' | 'default';
    className?: string;
    /** Used as the input's `id` so a wrapping `<Label htmlFor>` works. */
    id?: string;
    /**
     * Override the empty-state CTA. Defaults to a Spanish string —
     * pass a translated value when used inside an i18n'd page.
     */
    emptyLabel?: string;
    /** Override the clear-file aria-label / title. */
    clearLabel?: string;
}

/**
 * Drag-and-drop file picker primitive. Replaces the native
 * `<input type="file">` whose styling never matches the rest of the
 * app. Single-file only (multi-file is a future extension).
 *
 * Empty state: dashed border, icon + click/drop CTA, plus optional
 * accept hint and size cap warning.
 *
 * Filled state: file name + size, an "X" to clear, and the same
 * surface acts as a click target to swap the file.
 */
export function FileDropzone({
    accept,
    value,
    onChange,
    disabled = false,
    maxSizeMB,
    hint,
    size = 'default',
    className,
    id,
    emptyLabel = 'Arrastra un archivo o haz click para seleccionar',
    clearLabel = 'Quitar archivo',
}: FileDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const fallbackId = useId();
    const inputId = id ?? fallbackId;
    const [dragOver, setDragOver] = useState(false);

    const open = useCallback(() => {
        if (disabled) return;
        inputRef.current?.click();
    }, [disabled]);

    const handleFiles = useCallback((files: FileList | null) => {
        const file = files?.[0] ?? null;
        if (!file) return;
        onChange(file);
    }, [onChange]);

    const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
    }, [disabled, handleFiles]);

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled) return;
        setDragOver(true);
    }, [disabled]);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const sizeClass = size === 'compact' ? 'py-3 px-3' : 'py-6 px-4';
    const oversize = maxSizeMB !== undefined && value !== null && (value.size / 1024 / 1024) > maxSizeMB;

    return (
        <div className={cn('w-full', className)}>
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept={accept}
                disabled={disabled}
                onChange={(e) => handleFiles(e.target.files)}
                className="sr-only"
            />
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                onClick={open}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        open();
                    }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    'rounded-lg border-2 border-dashed transition-colors flex items-center gap-3',
                    sizeClass,
                    disabled
                        ? 'opacity-50 cursor-not-allowed border-border bg-muted/20'
                        : 'cursor-pointer',
                    !disabled && dragOver && 'border-primary bg-primary/5',
                    !disabled && !dragOver && (value
                        ? 'border-success/40 bg-success-subtle/30 hover:bg-success-subtle/50'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent/40'),
                )}
            >
                {value ? (
                    <>
                        <FileText className="h-5 w-5 text-success shrink-0" aria-hidden />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {value.name}
                            </p>
                            <p className={cn(
                                'text-[11px]',
                                oversize ? 'text-warning-subtle-foreground' : 'text-muted-foreground',
                            )}>
                                {(value.size / 1024 / 1024).toFixed(1)} MB
                                {oversize && maxSizeMB !== undefined && ` · supera ${maxSizeMB} MB`}
                            </p>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(null);
                                    if (inputRef.current) inputRef.current.value = '';
                                }}
                                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors shrink-0"
                                aria-label={clearLabel}
                                title={clearLabel}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div className="rounded-md bg-primary/10 p-2 shrink-0">
                            <Upload className="h-4 w-4 text-primary" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                                {emptyLabel}
                            </p>
                            {hint && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {hint}
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
