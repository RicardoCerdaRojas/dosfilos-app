import React from 'react';
import { Sparkles, MessageSquareQuote, Trash2, Loader2, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '@/i18n';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ActiveAgent {
    name: string;
}

interface FacultyChatMessagesProps {
    messages: ChatMessage[];
    isNewSession: boolean;
    isStreaming: boolean;
    isSending: boolean;
    isDeleting: boolean;
    streamingMessage: string;
    activeAgents: ActiveAgent[];
    agentNameForNew: string;
    onDeleteMessage: (messageId: string) => void;
}

export function FacultyChatMessages({
    messages,
    isNewSession,
    isStreaming,
    isSending,
    isDeleting,
    streamingMessage,
    activeAgents,
    agentNameForNew,
    onDeleteMessage,
}: FacultyChatMessagesProps) {
    const { t } = useTranslation('faculty');

    return (
        <>
            {/* New-session blank state */}
            {isNewSession && !isStreaming && !isSending && (
                <div className="text-center py-20 text-slate-500">
                    <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 mb-2">{t('chat.emptyNewTitle', { agentName: agentNameForNew })}</h3>
                    <p className="max-w-md mx-auto">{t('chat.emptyNewDescription')}</p>
                </div>
            )}

            {/* Existing session blank state */}
            {!isNewSession && messages.length === 0 && !isStreaming && !isSending && (
                <div className="text-center py-20 text-slate-500">
                    <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 mb-2">{t('chat.emptyExistingTitle')}</h3>
                    <p className="max-w-md mx-auto">{t('chat.emptyExistingDescription')}</p>
                </div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
                <div key={i} className={cn("flex w-full gap-4 group", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    {msg.role !== 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 dark:from-indigo-900 dark:to-indigo-800 flex items-center justify-center shrink-0 mt-3 shadow-sm">
                            <MessageSquareQuote className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
                        </div>
                    )}
                    <div className={cn(
                        "relative text-[15px] leading-relaxed",
                        msg.role === 'user'
                            ? "bg-indigo-600 text-white rounded-3xl rounded-tr-sm px-6 py-3.5 max-w-[85%] md:max-w-[70%] shadow-sm font-medium"
                            : "flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl rounded-tl-sm px-6 py-5"
                    )}>
                        {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        ) : (
                            <div className="prose prose-slate prose-sm md:prose-base dark:prose-invert max-w-none break-words">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        )}

                        {msg.id && (
                            <button
                                onClick={() => onDeleteMessage(msg.id)}
                                disabled={isDeleting}
                                className={cn(
                                    "absolute top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30",
                                    msg.role === 'user' ? "-left-10 text-slate-400 hover:text-rose-500" : "right-2 text-slate-400 hover:text-rose-500"
                                )}
                                title={t('chat.deleteMessage')}
                            >
                                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {/* Streaming / loading indicator */}
            {(isStreaming || isSending) && (
                <div className="flex w-full gap-4 justify-start animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 flex items-center justify-center shrink-0 mt-3 shadow-sm">
                        <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl rounded-tl-sm px-6 py-5">
                        <div className="text-xs text-indigo-500 font-semibold mb-2 flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3" />
                            {activeAgents.length > 0
                                ? activeAgents.map(a => a.name).join(' + ')
                                : t('chat.selectingSpecialist')}
                        </div>
                        {streamingMessage ? (
                            <div className="prose prose-slate prose-sm md:prose-base dark:prose-invert max-w-none break-words">
                                <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />
                            </div>
                        ) : (
                            <div className="flex gap-1.5 align-middle h-6 items-center">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
