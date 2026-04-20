import React from 'react';
import { Send, Loader2 } from 'lucide-react';
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
}: FacultyChatInputProps) {
    const { t } = useTranslation('faculty');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e as unknown as React.FormEvent);
        }
    };

    return (
        <div className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-zinc-950 dark:via-zinc-950 to-transparent pt-12 pb-6 px-4 pointer-events-none",
            isHidden && "hidden"
        )}>
            <div className="max-w-3xl mx-auto relative pointer-events-auto">
                <form
                    onSubmit={onSubmit}
                    className="relative flex items-end shadow-lg rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 focus-within:border-indigo-300/70 dark:focus-within:border-indigo-500/50 focus-within:shadow-indigo-100 dark:focus-within:shadow-indigo-950/30 transition-all overflow-hidden"
                >
                    <Textarea
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isLoading ? t('chat.inputLoading') : t('chat.inputPlaceholder')}
                        className="border-0 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ring-0 rounded-none w-full min-h-[56px] max-h-[200px] py-4 pl-6 pr-14 text-[15px] bg-transparent font-medium shadow-none resize-none transition-[height]"
                        style={{ fieldSizing: 'content' } as React.CSSProperties}
                        disabled={isSending || isStreaming || isLoading}
                    />
                    <div className="absolute right-2 bottom-2">
                        <Button
                            type="submit"
                            size="icon"
                            className={cn(
                                "h-10 w-10 rounded-full transition-all duration-300 shadow-sm",
                                input.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-100 text-slate-400 dark:bg-zinc-800"
                            )}
                            disabled={isSending || isStreaming || isLoading || !input.trim()}
                        >
                            {(isSending || isStreaming) && !streamingMessage
                                ? <Loader2 className="h-5 w-5 animate-spin" />
                                : <Send className="h-4 w-4 ml-0.5" />
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
