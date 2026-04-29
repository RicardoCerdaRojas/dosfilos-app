import React, { useRef, useState } from 'react';
import { Send, Loader2, Paperclip, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface FacultyChatInputProps {
    input: string;
    isSending: boolean;
    isStreaming: boolean;
    isLoading: boolean;
    streamingMessage: string;
    isHidden: boolean;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    /** File the user has staged for the next send (one image, MVP). */
    attachment: File | null;
    onAttach: (file: File | null) => void;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_BYTES = 5 * 1024 * 1024;

function isAcceptedImage(file: File): boolean {
    return ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith('image/');
}

export function FacultyChatInput({
    input,
    isSending,
    isStreaming,
    isLoading,
    streamingMessage,
    isHidden,
    onInputChange,
    onSubmit,
    attachment,
    onAttach,
}: FacultyChatInputProps) {
    const { t } = useTranslation('faculty');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Build / tear down the object URL whenever the staged file changes.
    React.useEffect(() => {
        if (!attachment) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(attachment);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [attachment]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e as unknown as React.FormEvent);
        }
    };

    /**
     * Pasting an image (e.g. a screenshot) lands here as a clipboard item
     * of `kind: 'file'` with a mime type like `image/png`. We hijack only
     * those items — any text portion of the paste is left for the textarea
     * to handle natively.
     */
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    // Clipboard images often arrive with a generic name like
                    // "image.png". That's fine for the badge.
                    e.preventDefault();
                    acceptFile(file);
                    return;
                }
            }
        }
    };

    const acceptFile = (file: File): boolean => {
        if (!isAcceptedImage(file)) {
            alert(t('chat.attachment.unsupportedType'));
            return false;
        }
        if (file.size > MAX_BYTES) {
            alert(t('chat.attachment.tooLarge'));
            return false;
        }
        onAttach(file);
        return true;
    };

    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) acceptFile(file);
        // Reset input so the same file can be re-selected after removal.
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Only collapse the highlight when we leave the form, not its children.
        if (e.currentTarget === e.target) setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) acceptFile(file);
    };

    const disabled = isSending || isStreaming || isLoading;
    const canSubmit = (input.trim().length > 0 || !!attachment) && !disabled;

    return (
        <div className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-zinc-950 dark:via-zinc-950 to-transparent pt-12 pb-6 px-4 pointer-events-none",
            isHidden && "hidden"
        )}>
            <div className="max-w-3xl mx-auto relative pointer-events-auto">
                <form
                    onSubmit={onSubmit}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        "relative flex flex-col shadow-lg rounded-3xl bg-white dark:bg-zinc-900 border transition-all overflow-hidden",
                        isDragging
                            ? "border-indigo-400 dark:border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900/50"
                            : "border-slate-200/80 dark:border-zinc-800 focus-within:border-indigo-300/70 dark:focus-within:border-indigo-500/50 focus-within:shadow-indigo-100 dark:focus-within:shadow-indigo-950/30"
                    )}
                >
                    {attachment && previewUrl && (
                        <div className="px-4 pt-3">
                            <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 p-2 pr-3">
                                <img
                                    src={previewUrl}
                                    alt={attachment.name}
                                    className="h-14 w-14 rounded-lg object-cover"
                                />
                                <div className="flex flex-col text-[12px] leading-tight pt-1 max-w-[220px]">
                                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{attachment.name}</span>
                                    <span className="text-slate-500 dark:text-slate-400">{formatBytes(attachment.size)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onAttach(null)}
                                    className="ml-1 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    title={t('chat.attachment.remove')}
                                    aria-label={t('chat.attachment.remove')}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative flex items-end">
                        <Textarea
                            value={input}
                            onChange={(e) => onInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={isLoading ? t('chat.inputLoading') : t('chat.inputPlaceholder')}
                            className="border-0 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ring-0 rounded-none w-full min-h-[56px] max-h-[200px] py-4 pl-14 pr-14 text-[15px] bg-transparent font-medium shadow-none resize-none transition-[height]"
                            style={{ fieldSizing: 'content' } as React.CSSProperties}
                            disabled={disabled}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled}
                            className="absolute left-2 bottom-2 h-10 w-10 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                            title={t('chat.attachment.attach')}
                            aria-label={t('chat.attachment.attach')}
                        >
                            <Paperclip className="h-5 w-5" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFilePick}
                            className="hidden"
                        />
                        <div className="absolute right-2 bottom-2">
                            <Button
                                type="submit"
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-full transition-all duration-300 shadow-sm",
                                    canSubmit ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-100 text-slate-400 dark:bg-zinc-800"
                                )}
                                disabled={!canSubmit}
                            >
                                {(isSending || isStreaming) && !streamingMessage
                                    ? <Loader2 className="h-5 w-5 animate-spin" />
                                    : <Send className="h-4 w-4 ml-0.5" />
                                }
                            </Button>
                        </div>
                    </div>

                    {isDragging && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-indigo-50/80 dark:bg-indigo-950/40 rounded-3xl">
                            <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                <ImageIcon className="h-4 w-4" />
                                {t('chat.attachment.dropHere')}
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
