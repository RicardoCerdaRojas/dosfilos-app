import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Sparkles, BookOpen, Lightbulb, ArrowLeft } from 'lucide-react';
import { useGeneratorChat } from '@/hooks/useGeneratorChat';
import { QuickAction } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { sermonService, generatorChatService } from '@dosfilos/application';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';

export function SermonTutorPage() {
    const { t } = useTranslation('sermons');
    const navigate = useNavigate();
    const { user } = useFirebase();
    
    // State
    const [isGenerating, setIsGenerating] = useState(false);
    const [input, setInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{passage: string, idea: string, hasDraft: boolean, title: string, contentMarkdown: string} | null>(null);
    
    // Auto-scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, setMessages, isLoading: isChatLoading, handleSendMessage } = useGeneratorChat({
        phase: 'brainstorming' as any,
        content: null,
        config: { passage: analysisResult?.passage || 'General', rules: { targetAudience: 'general', tone: 'pastoral' } },
        user: { id: user?.uid || 'temp-user' }
    });

    // Auto scroll behavior
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isChatLoading]);

    // Reset initially
    useEffect(() => {
        setMessages([]);
        setIsGenerating(false);
        setInput('');
        setAnalysisResult(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleQuickAction = (action: QuickAction) => {
        handleSendMessage(action.label);
    };

    const handleAnalyze = async () => {
        if (messages.length === 0) {
            toast.error('No hay conversación para analizar.');
            return;
        }
        setIsAnalyzing(true);
        try {
            const result = await generatorChatService.analyzeChatForSermon();
            setAnalysisResult(result);
        } catch (error) {
            toast.error('Error al analizar la conversación.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    /**
     * Lleva lo que salió de la conversación al estudio pastoral de 8 pasos.
     *
     * Acá vivían DOS caminos que creaban un sermón sintético y lo abrían en
     * el editor, saltándose el estudio entero:
     *
     *   - `handleSaveDraft` guardaba como sermón el borrador que el chat
     *     había redactado durante la conversación.
     *   - `handleExpressGeneration` encadenaba tres llamadas al modelo
     *     (exégesis → homilética → redacción) desde un pasaje y una idea, y
     *     etiquetaba el resultado `AI Generated`.
     *
     * Ninguno creaba semilla, ninguno pasaba por el portón de fidelidad, y
     * ambos desembocaban en `/edit` en vez del wizard. Era la última puerta
     * del producto que producía un sermón sin que el pastor estudiara — y
     * se le ofrecía al usuario recién terminado el onboarding.
     *
     * Lo que la conversación produjo NO se tira: el pasaje ancla el estudio,
     * y la idea (más el borrador esbozado, si lo hubo) viaja a
     * `preacherNotes`, que es el campo para "ideas a medio formar y material
     * personal". Ahí lo tiene a mano cuando llegue al Paso 3, después del
     * estudio — que es cuando el sermón se escribe.
     */
    const handleTakeToStudy = async () => {
        if (!user?.uid) {
            toast.error(t('tutor.errors.notSignedIn'));
            return;
        }
        if (!analysisResult?.passage?.trim()) {
            toast.error(t('tutor.errors.missingPassage'));
            return;
        }

        setIsGenerating(true);
        try {
            const notes = [
                analysisResult.idea?.trim()
                    ? `${t('tutor.notes.ideaPrefix')} ${analysisResult.idea.trim()}`
                    : '',
                analysisResult.hasDraft && analysisResult.contentMarkdown?.trim()
                    ? `${t('tutor.notes.draftPrefix')}\n\n${analysisResult.contentMarkdown.trim()}`
                    : '',
            ]
                .filter(Boolean)
                .join('\n\n');

            // `SermonEntity` exige un título de 5 caracteres o más; los
            // títulos cortos que devuelve el análisis (o su ausencia) se
            // completan con el pasaje en vez de reventar la creación.
            const rawTitle = analysisResult.title?.trim() || '';
            const title = rawTitle.length >= 5 ? rawTitle : analysisResult.passage.trim();

            const newSermon = await sermonService.createSermon({
                userId: user.uid,
                title,
                // Vacío a propósito: el cuerpo lo escribe el pastor en el
                // Paso 3. Antes acá iba el sermón que el modelo redactó.
                content: '',
                bibleReferences: [analysisResult.passage.trim()],
                status: 'draft',
                wizardProgress: {
                    currentStep: 1,
                    passage: analysisResult.passage.trim(),
                    lastSaved: new Date(),
                    ...(notes ? { personalization: { preacherNotes: notes } } : {}),
                },
            });

            toast.success(t('tutor.toast.studyStarted'));
            navigate(`/dashboard/sermons/generate?id=${newSermon.id}`);
        } catch (error) {
            console.error('[tutor] take to study failed:', error);
            toast.error(t('tutor.errors.studyStartFailed'));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 dark:bg-zinc-950 font-sans">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/sermons')} className="hover:bg-slate-100 dark:hover:bg-zinc-800">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
                            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-none tracking-tight">Tutor de Predicación</h1>
                            <p className="text-[13px] text-muted-foreground mt-1 font-medium">Asistente teológico e ideas</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden relative">
                {/* Chat Main Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-0">
                    
                    {/* Native scrollable messages area */}
                    <div className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth" id="chat-container">
                        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-28">
                            {messages.length === 0 && (
                                <div className="text-center py-20 text-muted-foreground space-y-8 animate-in fade-in duration-700">
                                    <div className="h-16 w-16 mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-2xl flex items-center justify-center rotate-3 transform transition-transform hover:rotate-6">
                                        <Sparkles className="h-8 w-8 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">¡Hola! Soy tu asistente de predicación.</h2>
                                        <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                            Cuentame qué tienes en mente, sobre qué quieres predicar o elige una de las sugerencias para comenzar a desarrollar tu sermón.
                                        </p>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto pt-4">
                                        <Button variant="outline" className="h-auto py-2.5 px-5 rounded-full bg-white dark:bg-zinc-900 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all text-sm font-medium text-slate-700 dark:text-zinc-300 hover:text-indigo-700 dark:hover:text-indigo-300" onClick={() => handleQuickAction({ id: '1', label: t('tutor.prompts.idea') })}>
                                            <Lightbulb className="mr-2.5 h-4 w-4 text-amber-500" />
                                            {t('tutor.actions.idea')}
                                        </Button>
                                        <Button variant="outline" className="h-auto py-2.5 px-5 rounded-full bg-white dark:bg-zinc-900 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all text-sm font-medium text-slate-700 dark:text-zinc-300 hover:text-indigo-700 dark:hover:text-indigo-300" onClick={() => handleQuickAction({ id: '2', label: t('tutor.prompts.passage') })}>
                                            <BookOpen className="mr-2.5 h-4 w-4 text-blue-500" />
                                            {t('tutor.actions.passage')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i} className={cn("flex w-full gap-4 group", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                    {msg.role !== 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 dark:from-indigo-900 dark:to-purple-900 dark:border-indigo-800 flex items-center justify-center shrink-0 mt-3 shadow-sm">
                                            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                    )}
                                    <div className={cn(
                                            "relative text-[15px] leading-relaxed",
                                            msg.role === 'user'
                                                ? "bg-indigo-600 text-white rounded-3xl rounded-tr-sm px-6 py-3.5 max-w-[85%] md:max-w-[70%] shadow-sm font-medium"
                                                : "flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl rounded-tl-sm px-6 py-5"
                                        )}
                                    >
                                        {msg.role === 'user' ? (
                                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                        ) : (
                                            <div className="prose prose-slate prose-sm md:prose-base dark:prose-invert max-w-none break-words">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isChatLoading && (
                                <div className="flex w-full gap-4 justify-start animate-in fade-in zoom-in duration-300">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 dark:from-indigo-900 dark:to-purple-900 dark:border-indigo-800 flex items-center justify-center shrink-0 mt-3 shadow-sm">
                                        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl rounded-tl-sm px-6 py-5 flex items-center gap-2 h-[60px]">
                                        <div className="flex gap-1.5 align-middle">
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-2" />
                        </div>
                    </div>

                    {/* Floating Input Area */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-zinc-950 dark:via-zinc-950 to-transparent pt-12 pb-6 px-4 pointer-events-none">
                        <div className="max-w-4xl mx-auto relative pointer-events-auto">
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!input.trim() || isChatLoading) return;
                                    const msg = input;
                                    setInput('');
                                    await handleSendMessage(msg);
                                }}
                                className="relative flex items-center shadow-lg rounded-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition-all"
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe tu idea, pasaje o pregunta aquí..."
                                    className="border-0 focus-visible:ring-0 rounded-none h-14 pl-6 pr-14 text-[15px] bg-transparent font-medium"
                                    disabled={isChatLoading || isGenerating}
                                />
                                <div className="absolute right-2 top-2">
                                    <Button 
                                        type="submit" 
                                        size="icon" 
                                        className={cn(
                                            "h-10 w-10 rounded-full transition-all duration-300 shadow-sm",
                                            input.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-100 text-slate-400 dark:bg-zinc-800"
                                        )}
                                        disabled={isChatLoading || isGenerating || !input.trim()}
                                    >
                                        {isChatLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                                    </Button>
                                </div>
                            </form>
                            <div className="text-center mt-3 text-[12px] text-slate-400 font-medium">
                                Tu tutor puede cometer errores. Considera verificar la información importante obtenida en tu investigación.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Dynamic Context Panel */}
                <div className="w-[380px] lg:w-[420px] shrink-0 border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-10 transition-all duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
                        <h3 className="font-semibold flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
                            <BookOpen className="h-5 w-5 text-indigo-500" />
                            Convertir a Sermón
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 bg-slate-50/30 dark:bg-zinc-950/30">
                        {isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 text-center px-4">
                                    Analizando la conversación para extraer el contexto del sermón...
                                </p>
                            </div>
                        ) : !analysisResult ? (
                            <div className="flex flex-col gap-4 text-center py-8">
                                <div className="mx-auto w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                    <Sparkles className="h-6 w-6 text-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-foreground">{t('tutor.extract.title')}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t('tutor.extract.body')}
                                    </p>
                                </div>
                                <Button 
                                    className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 font-medium" 
                                    onClick={handleAnalyze}
                                    disabled={messages.length === 0}
                                >
                                    {t('tutor.extract.cta')}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-4 p-5 bg-card border border-border rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-foreground text-sm">
                                            {t('tutor.extracted.title')}
                                        </h4>
                                        <Button variant="ghost" size="sm" onClick={handleAnalyze} className="h-8 text-xs px-2">
                                            {t('tutor.extracted.reanalyze')}
                                        </Button>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-muted-foreground">
                                            {t('tutor.passageLabel')}
                                        </Label>
                                        <Input
                                            value={analysisResult.passage}
                                            onChange={(e) => setAnalysisResult({ ...analysisResult, passage: e.target.value })}
                                            className="h-9 text-sm"
                                            placeholder={t('tutor.passagePlaceholder')}
                                        />
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <Label className="text-xs font-bold text-muted-foreground">
                                            {t('tutor.ideaLabel')}
                                        </Label>
                                        <Textarea
                                            value={analysisResult.idea}
                                            onChange={(e) => setAnalysisResult({ ...analysisResult, idea: e.target.value })}
                                            className="resize-none h-24 text-sm"
                                            placeholder={t('tutor.ideaPlaceholder')}
                                        />
                                    </div>
                                </div>

                                {/* Una sola salida. Antes había dos —guardar el
                                    borrador que el chat redactó, o generarlo
                                    entero de una— y ninguna pasaba por el
                                    estudio. Lo que salió de la conversación
                                    entra como notas del predicador, no como
                                    sermón. */}
                                <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
                                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                                        {t('tutor.handoff.explainer')}
                                    </p>
                                    <Button
                                        className="w-full h-12 gap-2 text-[15px] font-semibold rounded-xl"
                                        onClick={handleTakeToStudy}
                                        disabled={!analysisResult.passage.trim() || isGenerating || isChatLoading}
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <BookOpen className="h-5 w-5" />
                                        )}
                                        {t('tutor.handoff.cta')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
