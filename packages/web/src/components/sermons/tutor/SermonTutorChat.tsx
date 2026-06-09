import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { AIChatMessage } from '@dosfilos/domain';
import { useFacultyChat } from '@/hooks/faculty/useFacultyChat';
import { SermonTutorComposer } from './SermonTutorComposer';

interface SermonTutorChatProps {
    sessionId: string;
    /** Ephemeral grounding (current sermon) injected into every question. */
    sermonContext: string;
    /** Question captured before the session existed; auto-sent once loaded. */
    pendingFirstMessage: string | null;
    onConsumePending: () => void;
}

/**
 * Interactive tutor transcript for the sermon editor. Renders the persisted
 * conversation + the live streaming reply, and sends follow-up questions with
 * the sermon as transient context. Requires a real session id.
 */
export const SermonTutorChat: React.FC<SermonTutorChatProps> = ({
    sessionId,
    sermonContext,
    pendingFirstMessage,
    onConsumePending,
}) => {
    const { t } = useTranslation('sermonDetail');
    const { session, sendMessage, isSending, streamingMessage, isStreaming } = useFacultyChat(sessionId);
    const scrollRef = useRef<HTMLDivElement>(null);
    const sentPendingRef = useRef(false);

    const ask = (text: string) => {
        sendMessage({ message: text, ephemeralContext: sermonContext }).catch(() => {
            /* errors surfaced via toast inside the hook */
        });
    };

    // Auto-send the question the pastor typed before the session existed, once
    // the freshly created session has loaded.
    useEffect(() => {
        if (pendingFirstMessage && session && !sentPendingRef.current) {
            sentPendingRef.current = true;
            ask(pendingFirstMessage);
            onConsumePending();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingFirstMessage, session]);

    // Keep the transcript pinned to the latest message / streaming chunk.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [session?.messages.length, streamingMessage]);

    const messages = session?.messages ?? [];
    const showThinking = isSending && !isStreaming;

    return (
        <div className="flex flex-col h-full min-h-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto divide-y divide-border/50">
                {messages.length === 0 && !isStreaming && !showThinking ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                        <p className="text-sm font-medium text-foreground">{t('tutorPanel.emptyTitle')}</p>
                        <p className="text-xs text-muted-foreground">{t('tutorPanel.emptyBody')}</p>
                    </div>
                ) : (
                    messages.map((msg: AIChatMessage) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div key={msg.id} className={cn('px-3 py-3', isUser ? 'bg-muted/30' : 'bg-background')}>
                                <span
                                    className={cn(
                                        'text-[10px] font-bold uppercase tracking-wider',
                                        isUser ? 'text-muted-foreground' : 'text-info',
                                    )}
                                >
                                    {isUser ? t('tutorPanel.you') : t('tutorPanel.tutor')}
                                </span>
                                <div className="text-xs leading-relaxed text-foreground/90 mt-1">
                                    {isUser ? (
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    ) : (
                                        <div className="prose prose-xs prose-slate dark:prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Live streaming reply */}
                {isStreaming && (
                    <div className="px-3 py-3 bg-background">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-info">
                            {t('tutorPanel.tutor')}
                        </span>
                        <div className="prose prose-xs prose-slate dark:prose-invert max-w-none break-words mt-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{streamingMessage || '…'}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {showThinking && (
                    <div className="px-3 py-3 text-xs text-muted-foreground italic">{t('tutorPanel.thinking')}</div>
                )}
            </div>

            <SermonTutorComposer onSend={ask} disabled={isSending || isStreaming} autoFocus />
        </div>
    );
};
