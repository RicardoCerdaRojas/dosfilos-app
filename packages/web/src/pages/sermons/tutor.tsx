import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Sparkles, BookOpen, Lightbulb, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useGeneratorChat } from '@/hooks/useGeneratorChat';
import { QuickAction } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { sermonGeneratorService, sermonService, generatorChatService } from '@dosfilos/application';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';

export function SermonTutorPage() {
    const { t, i18n } = useTranslation('sermons');
    const activeLanguage: 'es' | 'en' = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';
    const navigate = useNavigate();
    const { user } = useFirebase();
    
    // State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState<string>('');
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
        setGenerationStep('');
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

    const handleSaveDraft = async () => {
        if (!user?.uid || !analysisResult || !analysisResult.hasDraft) return;

        setIsGenerating(true);
        setGenerationStep('Guardando sermón...');
        try {
            const newSermon = await sermonService.createSermon({
                userId: user.uid,
                title: analysisResult.title || 'Sermón sin título',
                content: analysisResult.contentMarkdown,
                bibleReferences: analysisResult.passage ? [analysisResult.passage] : [],
                status: 'draft',
                tags: ['AI Generated'],
            });
            toast.success(t('sermonCreatedSuccess'));
            navigate(`/dashboard/sermons/${newSermon.id}/edit`);
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Error al guardar el sermón');
        } finally {
            setIsGenerating(false);
            setGenerationStep('');
        }
    };

    const handleExpressGeneration = async () => {
        if (!user?.uid) {
            toast.error('Debes iniciar sesión para guardar el sermón');
            return;
        }

        if (!analysisResult?.passage?.trim() || !analysisResult?.idea?.trim()) {
            toast.error(t('tutor.errors.missingFields'));
            return;
        }

        setIsGenerating(true);
        try {
            // Step 1: Exegesis
            setGenerationStep(t('tutor.steps.exegesis'));
            const { exegesis } = await sermonGeneratorService.generateExegesis(
                analysisResult.passage,
                { targetAudience: 'general', tone: 'pastoral', customInstructions: `Enfoque: ${analysisResult.idea}` },
                undefined,
                undefined,
                activeLanguage,
            );

            // Step 2: Homiletics
            setGenerationStep(t('tutor.steps.homiletics'));
            const { homiletics } = await sermonGeneratorService.generateHomiletics(
                exegesis,
                { targetAudience: 'general', tone: 'pastoral', customInstructions: `Idea central: ${analysisResult.idea}` },
                undefined,
                undefined,
                activeLanguage,
            );

            // Step 3: Drafting
            setGenerationStep(t('tutor.steps.drafting'));
            const { draft } = await sermonGeneratorService.generateSermonDraft(
                homiletics,
                { targetAudience: 'general', tone: 'pastoral' },
                undefined,
                undefined,
                activeLanguage,
            );

            // Success
            setGenerationStep(t('tutor.steps.success'));
            
            // Format for the editor
            const fullContent = `
                <h1>${draft.title}</h1>
                <hr />
                <h2>Introducción</h2>
                ${draft.introduction}
                <hr />
                <h2>Desarrollo</h2>
                ${draft.body.map(point => `
                    <h3>${point.point}</h3>
                    ${point.content}
                `).join('')}
                <hr />
                <h2>Conclusión</h2>
                ${draft.conclusion}
            `;

            const newSermon = await sermonService.createSermon({
                userId: user.uid,
                title: draft.title,
                content: fullContent,
                bibleReferences: [analysisResult.passage],
                status: 'draft',
                tags: ['AI Generated'],
            });
            
            toast.success(t('sermonCreatedSuccess'));
            navigate(`/dashboard/sermons/${newSermon.id}/edit`);

        } catch (error) {
            console.error('Generation failed:', error);
            toast.error(t('tutor.errors.generationFailed'));
        } finally {
            setIsGenerating(false);
            setGenerationStep('');
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
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Extraer de la conversación</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Cuando tengas definido tu sermón en el chat, analiza la conversación para extraer el pasaje y la idea, o para guardar el sermón si ya está redactado.
                                    </p>
                                </div>
                                <Button 
                                    className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 font-medium" 
                                    onClick={handleAnalyze}
                                    disabled={messages.length === 0}
                                >
                                    Analizar Conversación
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {analysisResult.hasDraft ? (
                                    <div className="space-y-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl">
                                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <h4 className="font-semibold">Borrador de Sermón Detectado</h4>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-slate-500">Título Sugerido</Label>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{analysisResult.title || 'Sermón sin título'}</p>
                                        </div>
                                        <Button 
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-all shadow-green-600/20" 
                                            onClick={handleSaveDraft}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
                                            Guardar y Editar Sermón
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-4 p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Contexto Extraído</h4>
                                                <Button variant="ghost" size="sm" onClick={handleAnalyze} className="h-8 text-xs px-2 text-indigo-600">Re-analizar</Button>
                                            </div>
                                            
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500">Pasaje Bíblico</Label>
                                                <Input 
                                                    value={analysisResult.passage}
                                                    onChange={(e) => setAnalysisResult({...analysisResult, passage: e.target.value})}
                                                    className="h-9 text-sm focus-visible:ring-indigo-500" 
                                                    placeholder="Ej. Juan 3:16"
                                                />
                                            </div>
                                            
                                            <div className="space-y-1.5 pt-2">
                                                <Label className="text-xs font-bold text-slate-500">Idea Central / Tema</Label>
                                                <Textarea 
                                                    value={analysisResult.idea}
                                                    onChange={(e) => setAnalysisResult({...analysisResult, idea: e.target.value})}
                                                    className="resize-none h-24 text-sm focus-visible:ring-indigo-500"
                                                    placeholder="¿De qué trata el sermón?"
                                                />
                                            </div>
                                        </div>

                                        {isGenerating ? (
                                            <div className="space-y-4 p-5 bg-gradient-to-br from-indigo-50/80 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
                                                <div className="absolute inset-0 bg-white/20 dark:bg-white/5 animate-pulse" />
                                                <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300 font-bold relative z-10 text-[15px]">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    Creando borrador...
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-2.5">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                                                        <p className="text-[13px] font-medium text-indigo-800/80 dark:text-indigo-200/80">{generationStep || 'Analizando pasaje y teología'}</p>
                                                    </div>
                                                    <div className="h-2 bg-indigo-200/50 dark:bg-indigo-900/50 overflow-hidden rounded-full">
                                                        <div className="h-full bg-indigo-500 rounded-full w-full animate-[pulse_1s_ease-in-out_infinite]" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button 
                                                className="w-full h-14 gap-2 text-[15px] font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 rounded-2xl transition-all hover:shadow-lg hover:shadow-indigo-500/30" 
                                                onClick={handleExpressGeneration}
                                                disabled={!analysisResult.passage || !analysisResult.idea || isChatLoading}
                                            >
                                                <Sparkles className="h-5 w-5" />
                                                Generar Sermón
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
