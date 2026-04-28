import React from 'react';
import { Sparkles, MessageSquareQuote, Trash2, Loader2, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useTranslation } from '@/i18n';
import type { SourceReference, ConcreteResponseMode, SupportedLanguage } from '@dosfilos/domain';
import { resolveLocalized } from '@dosfilos/domain';
import { extractCitations, CitationSup, Bibliography, wrapLanguageRuns, transformCallouts, Callout, wrapScriptureRefs, ScriptureRef } from '@/lib/citations';
import { useModeMeta } from './FacultyChatHeader';
import { useAuthorization } from '@/hooks/useAuthorization';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: SourceReference[];
    modeUsed?: ConcreteResponseMode;
    modeWasAuto?: boolean;
}

/**
 * Small badge shown below a response when the mode was auto-inferred by the router.
 * Non-intrusive hint so the user understands why a particular style/length was chosen
 * and can override if needed.
 */
function InferredModeBadge({ mode }: { mode: ConcreteResponseMode }) {
    const { t } = useTranslation('faculty');
    const modeMeta = useModeMeta();
    const meta = modeMeta[mode];
    if (!meta) return null;
    const Icon = meta.icon;
    return (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            <span>{t('chat.inferredModeLabel')}</span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <Icon className={cn("h-3 w-3", meta.iconColor)} />
                {meta.label}
            </span>
        </div>
    );
}

/**
 * Renders an assistant message: transforms inline citations into numbered superscripts
 * with a Popover preview, and appends a Bibliography panel at the bottom.
 */
function AssistantMessageContent({ content, sources, isAdmin }: { content: string; sources?: SourceReference[]; isAdmin: boolean }) {
    const { rendered, citations, protectedSourcesCount } = React.useMemo(() => {
        // Pipeline: citations → scripture refs → callouts → hebrew/greek language tagging.
        // Order matters: citations have a latin format that scripture regex won't match;
        // scripture must run before language tagging so the wrapping span stays intact.
        //
        // Gating: non-admin users only see citations whose source has `publiclyCitable=true`
        // (per-document flag managed by admin in Core Library). Citations of private/
        // pending-licensed material are stripped entirely from the prose, and those
        // sources are excluded from the Bibliography panel.
        const step1 = extractCitations(content, sources ?? [], { onlyCitableSources: !isAdmin });
        const step2 = wrapScriptureRefs(step1.rendered);
        const step3 = transformCallouts(step2);
        const step4 = wrapLanguageRuns(step3);
        // Count protected sources (only relevant for non-admin readers — admin
        // sees the real attribution in the citation list itself).
        const protectedCount = isAdmin
            ? 0
            : (sources ?? []).filter(s => s.publiclyCitable !== true).length;
        return { rendered: step4, citations: step1.citations, protectedSourcesCount: protectedCount };
    }, [content, sources, isAdmin]);

    return (
        <>
            <div className={cn(
                "prose prose-slate prose-sm md:prose-base dark:prose-invert max-w-none break-words",
                // Reading-optimized serif body for long-form theology
                "font-reading",
                // Generous leading for prose paragraphs (long-form reading comfort)
                "prose-p:leading-[1.75]",
                // Tighter leading AND margins inside lists — dense bullets read better than airy ones
                "prose-li:leading-normal prose-li:my-0.5",
                "prose-ul:my-3 prose-ol:my-3",
                // Paragraphs nested inside list items should not add extra vertical gap
                "prose-li:marker:text-slate-400",
                // Tighter, modern sans-serif for headings to contrast with serif body
                "prose-headings:font-sans prose-headings:tracking-tight",
                "prose-h2:mt-5 prose-h2:mb-2 prose-h3:mt-4 prose-h3:mb-1.5",
                // Subtle indigo accent for strong emphasis
                "prose-strong:text-slate-900 dark:prose-strong:text-slate-100",
                // Tables (paradigms, conjugations) — cleaner borders
                "prose-table:text-sm prose-th:bg-slate-50 dark:prose-th:bg-zinc-800/60"
            )}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                        sup: (props: any) => <CitationSup citations={citations} {...props} />,
                        div: (props: any) => {
                            if (props['data-callout']) return <Callout {...props} />;
                            return <div {...props} />;
                        },
                        span: (props: any) => {
                            if (props['data-scripture']) return <ScriptureRef {...props} />;
                            return <span {...props} />;
                        },
                    }}
                >
                    {rendered}
                </ReactMarkdown>
            </div>
            <Bibliography citations={citations} protectedSourcesCount={protectedSourcesCount} />
        </>
    );
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
    const { t, language } = useTranslation('faculty');
    const activeLanguage: SupportedLanguage = language === 'en' ? 'en' : 'es';
    // Citations are gated to admin users while book licensing approval is pending.
    // Non-admin users see the prose without inline `(Autor, "Título", p. N)` markers
    // and without the Bibliography panel.
    // Admin sees citations from all sources; non-admin only sees citations whose
    // source is marked `publiclyCitable=true` in the Core Library.
    const { isAdmin } = useAuthorization();

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
                            <>
                                <AssistantMessageContent content={msg.content} sources={msg.sources} isAdmin={isAdmin} />
                                {msg.modeWasAuto && msg.modeUsed && <InferredModeBadge mode={msg.modeUsed} />}
                            </>
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
                                ? activeAgents.map(a => resolveLocalized(a.name, activeLanguage)).join(' + ')
                                : t('chat.selectingSpecialist')}
                        </div>
                        {streamingMessage ? (
                            <div className="relative">
                                <AssistantMessageContent content={streamingMessage} isAdmin={isAdmin} />
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
