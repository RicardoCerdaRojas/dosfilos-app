import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Search, GraduationCap, Library, ScrollText, HeartHandshake,
    Mic, Send, Sparkles, ArrowRight, Loader2, BookOpen, Brain, MessageCircle, Users,
    Paperclip, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFacultyAgents, useFacultySessions } from '../../hooks/faculty';
import { useFirebase } from '@/context/firebase-context';
import { AIAgent, resolveLocalized } from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { FreeStarterCard } from './components/FreeStarterCard';
import { setPendingFacultyInput } from './utils/pendingFacultyInput';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result ?? '');
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(file);
    });
}

// Icon + i18n key map. Both label and prompt are resolved per-render so the
// chip row reflects the active locale without a remount.
const QUICK_PROMPT_KEYS: Array<{ key: 'outline' | 'counseling' | 'exegesis' | 'theology'; icon: React.ElementType }> = [
    { key: 'outline', icon: BookOpen },
    { key: 'counseling', icon: HeartHandshake },
    { key: 'exegesis', icon: ScrollText },
    { key: 'theology', icon: Brain },
];

// Role-specific icon config — each agent has its own palette
const ICON_CONFIG: Record<string, { icon: React.ElementType; bg: string; text: string; ring: string }> = {
    'book-a':          { icon: Library,       bg: 'bg-sky-100 dark:bg-sky-900/40',      text: 'text-sky-700 dark:text-sky-300',      ring: 'ring-sky-200 dark:ring-sky-700' },
    'scroll':          { icon: ScrollText,    bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-700 dark:text-amber-300',  ring: 'ring-amber-200 dark:ring-amber-700' },
    'heart-handshake': { icon: HeartHandshake,bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-700' },
    'mic':             { icon: Mic,           bg: 'bg-rose-100 dark:bg-rose-900/40',    text: 'text-rose-700 dark:text-rose-300',    ring: 'ring-rose-200 dark:ring-rose-700' },
    'library':         { icon: Library,       bg: 'bg-slate-100 dark:bg-slate-800',     text: 'text-slate-700 dark:text-slate-300',  ring: 'ring-slate-200 dark:ring-slate-600' },
    'users':           { icon: Users,         bg: 'bg-violet-100 dark:bg-violet-900/40',text: 'text-violet-700 dark:text-violet-300',ring: 'ring-violet-200 dark:ring-violet-700' },
};
const DEFAULT_ICON_CONFIG = ICON_CONFIG['users'];

export function FacultyDirectoryPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [orchestratorInput, setOrchestratorInput] = useState('');
    const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: agents = [], isLoading: isLoadingAgents } = useFacultyAgents();
    const { user } = useFirebase();
    const { sessions, isLoading: isLoadingSessions } = useFacultySessions();
    const { t, i18n } = useTranslation('faculty');
    const activeLanguage: SupportedLanguage = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    // Build / tear down the object URL whenever the staged file changes.
    useEffect(() => {
        if (!pendingAttachment) {
            setAttachmentPreview(null);
            return;
        }
        const url = URL.createObjectURL(pendingAttachment);
        setAttachmentPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [pendingAttachment]);

    // Clipboard paste — anywhere on the directory page, an image
    // pasted into the OS clipboard lands in the orchestrator input
    // slot. Mirrors the FacultyChatInput behavior so the entry point
    // and the chat body offer the same affordance.
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    if (blob) {
                        if (blob.size > MAX_ATTACHMENT_BYTES) {
                            toast.error(t('directory.attachment.tooLarge'));
                            return;
                        }
                        const ext = blob.type.split('/')[1] || 'png';
                        setPendingAttachment(new File([blob], `pasted.${ext}`, { type: blob.type }));
                        toast.info(t('directory.attachment.pastedToast'));
                        e.preventDefault();
                        return;
                    }
                }
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [t]);

    const handlePickFile = (file: File | null) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error(t('directory.attachment.unsupportedType'));
            return;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
            toast.error(t('directory.attachment.tooLarge'));
            return;
        }
        setPendingAttachment(file);
    };

    // Free-tier starter card — visible only until the user fires their first
    // query. Hito 5.1: closes the activation gap that the existing always-on
    // chips weren't moving the needle on.
    const planId = user?.subscription?.planId;
    const isFreeTier = !planId || planId === 'free';
    const showFreeStarter = isFreeTier && !isLoadingSessions && sessions.length === 0;

    // When this directory is opened from a project workspace
    // (`/dashboard/faculty?projectId=...`), every link to `/faculty/new` MUST
    // carry the projectId forward — otherwise the new session is born orphan
    // and the orchestrator can't scope RAG to the project's source set.
    const projectIdFromUrl = searchParams.get('projectId');
    const newSessionQuery = (extra: string) => {
        const params = new URLSearchParams(extra);
        if (projectIdFromUrl) params.set('projectId', projectIdFromUrl);
        const q = params.toString();
        return q ? `?${q}` : '';
    };

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [orchestratorInput]);

    // Lazy navigation — no session created until the user sends a first message.
    // When an image attachment is staged, route through sessionStorage so the
    // chat page can replay create-session-and-send-with-attachment cleanly
    // (URL params can't carry binary).
    const handleStartOrchestrated = async (question: string) => {
        const q = question.trim();
        // Allow attachment-only sends — image alone can be the prompt.
        if ((!q && !pendingAttachment) || agents.length === 0) return;

        if (pendingAttachment) {
            try {
                const base64 = await fileToBase64(pendingAttachment);
                setPendingFacultyInput({
                    question: q,
                    attachment: {
                        mimeType: pendingAttachment.type || 'image/png',
                        base64,
                        filename: pendingAttachment.name,
                        sizeBytes: pendingAttachment.size,
                    },
                });
                setPendingAttachment(null);
                navigate(`/dashboard/faculty/new${newSessionQuery('')}`);
                return;
            } catch (err) {
                console.error('[FacultyDirectory] failed to encode attachment:', err);
                toast.error(t('directory.attachment.encodeFailed'));
                return;
            }
        }

        navigate(`/dashboard/faculty/new${newSessionQuery(`q=${encodeURIComponent(q)}`)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleStartOrchestrated(orchestratorInput);
        }
    };

    const handleStartSession = (agent: AIAgent) => {
        const name = resolveLocalized(agent.name, activeLanguage);
        navigate(`/dashboard/faculty/new${newSessionQuery(`agent=${agent.id}&agentName=${encodeURIComponent(name)}`)}`);
    };

    const filteredAgents = agents.filter(agent => {
        const q = searchQuery.toLowerCase();
        return resolveLocalized(agent.name, activeLanguage).toLowerCase().includes(q)
            || resolveLocalized(agent.expertiseArea, activeLanguage).toLowerCase().includes(q);
    });

    const isBusy = isLoadingAgents;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 font-sans overflow-y-auto">

            {/* ── Hero + Orchestrator Input ─────────────────────────────────────── */}
            {/*
                Color rationale: deep slate-900 (matches the app's sidebar dark navy) +
                warm amber accents (gold = wisdom, knowledge — ministerial gravitas).
                Replaces the previous vivid indigo/fuchsia which felt more "tech startup".
            */}
            <div className="relative pt-14 pb-16 px-6 sm:px-12 lg:px-20 bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-white overflow-hidden shrink-0" style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b, #0f172a)' }}>
                {/* Subtle warm texture overlay */}
                <div className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(251,191,36,0.3) 2px, rgba(251,191,36,0.3) 3px)' }}
                />
                {/* Warm amber glow — top right */}
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
                {/* Muted slate glow — bottom left */}
                <div className="absolute -bottom-32 -left-16 w-72 h-72 bg-slate-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />

                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-300 text-sm font-medium mb-5 backdrop-blur-sm">
                        <GraduationCap className="w-4 h-4" />
                        <span>{t('directory.badge')}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight font-serif drop-shadow-md">
                        {t('directory.heroTitle')}
                    </h1>
                    <p className="text-slate-300/80 mb-8 text-base leading-relaxed">
                        {t('directory.heroSubtitle')}
                    </p>

                    {/* Orchestrator input */}
                    <div className="bg-white/[0.07] backdrop-blur-md border border-white/[0.12] rounded-2xl p-2 shadow-2xl shadow-black/40">
                        {pendingAttachment && attachmentPreview && (
                            <div className="flex items-center gap-2 px-2 pt-1.5 pb-1 mb-1 border-b border-white/[0.08]">
                                <img
                                    src={attachmentPreview}
                                    alt={pendingAttachment.name}
                                    className="h-10 w-10 object-cover rounded-md border border-white/[0.12]"
                                />
                                <div className="flex-1 min-w-0 text-[11px]">
                                    <div className="text-slate-200 truncate">{pendingAttachment.name}</div>
                                    <div className="text-slate-400">{(pendingAttachment.size / 1024).toFixed(0)} KB</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPendingAttachment(null)}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/[0.05] transition-colors"
                                    aria-label={t('directory.attachment.remove')}
                                    title={t('directory.attachment.remove')}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-end gap-2">
                            <Sparkles className="h-5 w-5 text-amber-400/80 shrink-0 mb-3 ml-2" />
                            <textarea
                                ref={inputRef}
                                value={orchestratorInput}
                                onChange={e => setOrchestratorInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('directory.inputPlaceholder')}
                                rows={1}
                                className="flex-1 resize-none bg-transparent text-white placeholder:text-slate-400/70 text-[15px] leading-relaxed outline-none py-2.5 px-1 max-h-40 overflow-y-hidden"
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => {
                                    handlePickFile(e.target.files?.[0] ?? null);
                                    e.target.value = '';
                                }}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isBusy || agents.length === 0}
                                className="shrink-0 h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-amber-300 hover:bg-white/[0.08]"
                                title={t('directory.attachment.attachLabel')}
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => void handleStartOrchestrated(orchestratorInput)}
                                disabled={(!orchestratorInput.trim() && !pendingAttachment) || isBusy || agents.length === 0}
                                className="shrink-0 h-10 w-10 p-0 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 shadow-sm transition-all"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Quick prompt chips */}
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {QUICK_PROMPT_KEYS.map(({ key, icon: Icon }) => {
                            const label = t(`directory.quickPrompts.${key}.label`);
                            const prompt = t(`directory.quickPrompts.${key}.prompt`);
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleStartOrchestrated(prompt)}
                                    disabled={isBusy || agents.length === 0}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.12] text-slate-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-40"
                                >
                                    <Icon className="h-3 w-3" />
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {showFreeStarter && (
                        <FreeStarterCard
                            onPickPrompt={handleStartOrchestrated}
                            disabled={isBusy || agents.length === 0}
                        />
                    )}
                </div>
            </div>

            {/* ── Direct Specialists Section ────────────────────────────────────── */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
                {/* Section header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-5 rounded-full bg-amber-500" />
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">
                                {t('directory.specialistsTitle')}
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 pl-3">
                            {t('directory.specialistsSubtitle')}
                        </p>
                    </div>
                    <div className="relative w-full md:w-72 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder={t('directory.specialistsSearchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:ring-amber-500 rounded-full shadow-sm text-sm"
                        />
                    </div>
                </div>

                {isLoadingAgents ? (
                    <div className="py-16 flex justify-center items-center">
                        <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
                    </div>
                ) : filteredAgents.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p>{t('directory.specialistsEmpty')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredAgents.map((agent) => {
                            const cfg = ICON_CONFIG[agent.icon ?? ''] ?? DEFAULT_ICON_CONFIG;
                            const IconComponent = cfg.icon;
                            return (
                                <div
                                    key={agent.id}
                                    className="group relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-zinc-800 hover:shadow-xl hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
                                    onClick={() => !isBusy && handleStartSession(agent)}
                                >
                                    {/* Subtle corner accent */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-100/60 dark:from-slate-800/30 to-transparent rounded-bl-full -z-10 transition-transform group-hover:scale-125" />

                                    {/* Icon — small circle, role-specific color, subtle hover scale */}
                                    <div className={cn(
                                        'mb-4 w-12 h-12 rounded-full flex items-center justify-center ring-2 transition-transform duration-200 group-hover:scale-110 shadow-sm',
                                        cfg.bg, cfg.text, cfg.ring
                                    )}>
                                        <IconComponent className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 mb-6">
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{resolveLocalized(agent.name, activeLanguage)}</h2>
                                        <p className={cn('text-sm font-medium mb-3', cfg.text)}>{resolveLocalized(agent.expertiseArea, activeLanguage)}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{resolveLocalized(agent.description, activeLanguage)}</p>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/50 flex items-center justify-between mt-auto">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('directory.card.directSession')}</span>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                            {t('directory.card.start')}
                                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

// Alias used by FacultyChatPage to embed this as the home state
export { FacultyDirectoryPage as FacultyHomeContent };
