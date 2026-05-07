import { useState, useEffect, useRef } from 'react';
import { RichSermonEditor } from '../ui/RichSermonEditor';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { Wand2, Sparkles, Quote, BookOpen, GraduationCap, Heart, Loader2, Minimize2, Maximize2, List, Check, X, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MicroActionType } from '@dosfilos/application';

interface FacultyDocumentEditorProps {
    markdown: string;
    onChange: (markdown: string) => void;
    onMicroAction: (actionType: MicroActionType, selectedText: string, context: string, customPrompt?: string) => Promise<string>;
    isProcessing?: boolean;
    isZenMode?: boolean;
    onToggleZenMode?: () => void;
}

export function FacultyDocumentEditor({ markdown, onChange, onMicroAction, isProcessing, isZenMode, onToggleZenMode }: FacultyDocumentEditorProps) {
    const { t } = useTranslation(['faculty', 'common']);
    const editorRef = useRef<MDXEditorMethods>(null);
    const [selection, setSelection] = useState<{ text: string; rect: DOMRect | null }>({ text: '', rect: null });
    const containerRef = useRef<HTMLDivElement>(null);
    const bubbleMenuRef = useRef<HTMLDivElement>(null);
    const isInteractingWithBubbleRef = useRef(false);
    const clearSelectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Preview state
    const [previewState, setPreviewState] = useState<{ originalText: string; newText: string } | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [savedRange, setSavedRange] = useState<Range | null>(null);

    // Listen to selection changes to position the bubble menu
    useEffect(() => {
        const handleInteractionStart = (e: Event) => {
            if (bubbleMenuRef.current?.contains(e.target as Node)) {
                isInteractingWithBubbleRef.current = true;
                if (clearSelectionTimeoutRef.current) {
                    clearTimeout(clearSelectionTimeoutRef.current);
                    clearSelectionTimeoutRef.current = null;
                }
            } else {
                isInteractingWithBubbleRef.current = false;
            }
        };

        const handleSelectionChange = () => {
            // Do not update selection if we are in preview mode or processing
            if (previewState || isProcessing) return;

            // Ignore selection changes if interacting with the bubble menu
            if (isInteractingWithBubbleRef.current || bubbleMenuRef.current?.contains(document.activeElement)) {
                return;
            }

            const sel = window.getSelection();
            
            // Safeguard: if selection is explicitly inside the bubble menu, ignore it.
            if (sel && sel.anchorNode && bubbleMenuRef.current?.contains(sel.anchorNode)) {
                return;
            }

            if (sel && sel.rangeCount > 0 && !sel.isCollapsed && containerRef.current?.contains(sel.anchorNode)) {
                const text = sel.toString().trim();
                if (text.length > 0) {
                    if (clearSelectionTimeoutRef.current) {
                        clearTimeout(clearSelectionTimeoutRef.current);
                        clearSelectionTimeoutRef.current = null;
                    }
                    const range = sel.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setSelection({ text, rect });
                    setSavedRange(range.cloneRange());
                    return;
                }
            }
            
            // Delay clearing to allow mousedown/focus events to update our interaction refs
            // When Lexical loses focus (e.g., clicking our input box), it clears selection which triggers this.
            // By delaying, we give the browser time to focus the input box and trigger mousedown.
            if (clearSelectionTimeoutRef.current) {
                clearTimeout(clearSelectionTimeoutRef.current);
            }
            
            clearSelectionTimeoutRef.current = setTimeout(() => {
                if (isInteractingWithBubbleRef.current || bubbleMenuRef.current?.contains(document.activeElement)) {
                    return;
                }
                setSelection({ text: '', rect: null });
                setSavedRange(null);
            }, 150);
        };

        document.addEventListener('pointerdown', handleInteractionStart, true);
        document.addEventListener('mousedown', handleInteractionStart, true);
        document.addEventListener('selectionchange', handleSelectionChange);
        
        return () => {
            if (clearSelectionTimeoutRef.current) {
                clearTimeout(clearSelectionTimeoutRef.current);
            }
            document.removeEventListener('pointerdown', handleInteractionStart, true);
            document.removeEventListener('mousedown', handleInteractionStart, true);
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [previewState, isProcessing]);

    const handleActionClick = async (actionType: MicroActionType, prompt?: string) => {
        if (!selection.text) return;

        // Context is simply the whole markdown for now, or could be extracted around the selection
        const context = markdown;

        try {
            const newText = await onMicroAction(actionType, selection.text, context, prompt);
            
            // Enter preview mode instead of replacing immediately
            setPreviewState({
                originalText: selection.text,
                newText: newText
            });

            setCustomPrompt(''); // Reset input
        } catch (error) {
            console.error('Failed to process micro action', error);
        }
    };

    const acceptPreview = () => {
        if (!previewState) return;

        if (savedRange) {
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(savedRange);
            editorRef.current?.focus();
        }

        // Delay slightly to let Lexical sync the restored DOM selection
        setTimeout(() => {
            editorRef.current?.insertMarkdown(previewState.newText);
            
            // Allow editor to apply changes before reading back
            setTimeout(() => {
                if (editorRef.current) {
                    onChange(editorRef.current.getMarkdown());
                }
            }, 100);
        }, 10);

        setPreviewState(null);
        setSelection({ text: '', rect: null });
        setSavedRange(null);
        window.getSelection()?.removeAllRanges();
    };

    const rejectPreview = () => {
        setPreviewState(null);
        setSelection({ text: '', rect: null });
        setSavedRange(null);
        window.getSelection()?.removeAllRanges();
    };

    return (
        <div ref={containerRef} className="relative h-full w-full flex flex-col bg-background rounded-lg border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Wand2 className="w-4 h-4" />
                    {t('editor.title', 'Editor de Co-autoría')}
                </div>
                <div className="flex items-center gap-2">
                    {isProcessing && (
                        <div className="flex items-center gap-2 text-sm text-primary mr-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('editor.processing', 'Procesando...')}
                        </div>
                    )}
                    {onToggleZenMode && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs" 
                            onClick={onToggleZenMode}
                            title={isZenMode ? "Salir de Modo Enfoque" : "Modo Enfoque"}
                        >
                            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <RichSermonEditor
                    ref={editorRef}
                    markdown={markdown}
                    onChange={onChange}
                    className={cn("h-full", isProcessing && "opacity-70 pointer-events-none transition-opacity")}
                />
            </div>

            {/* Floating AI Interface (Menu / Processing / Preview) */}
            {selection.rect && selection.text && (
                <div
                    ref={bubbleMenuRef}
                    className="fixed z-50 flex flex-col bg-background border shadow-xl rounded-lg animate-in fade-in zoom-in-95 overflow-hidden"
                    style={{
                        top: selection.rect.bottom + 10,
                        left: Math.min(Math.max(selection.rect.left + (selection.rect.width / 2) - 200, 10), window.innerWidth - 410),
                        width: '400px'
                    }}
                >
                    {isProcessing ? (
                        <div className="p-4 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-sm font-medium">Tu asistente está trabajando en el texto...</p>
                        </div>
                    ) : previewState ? (
                        <div className="p-4 flex flex-col gap-3">
                            <div className="flex items-center gap-2 font-semibold text-primary">
                                <Sparkles className="w-4 h-4" />
                                Vista Previa
                            </div>
                            <div className="max-h-48 overflow-y-auto bg-muted/30 rounded p-3 text-sm border whitespace-pre-wrap">
                                {previewState.newText}
                            </div>
                            <div className="flex justify-end gap-2 mt-1">
                                <Button variant="outline" size="sm" onClick={rejectPreview} onMouseDown={(e) => e.preventDefault()}>
                                    <X className="w-4 h-4 mr-1" /> Rechazar
                                </Button>
                                <Button size="sm" onClick={acceptPreview} onMouseDown={(e) => e.preventDefault()}>
                                    <Check className="w-4 h-4 mr-1" /> Aceptar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-2 flex flex-col gap-2">
                            <div className="flex items-center gap-1 border-b pb-2">
                                <div className="px-2 text-xs font-semibold text-primary/70 flex items-center gap-1 border-r mr-1">
                                    <Sparkles className="w-3 h-3" />
                                    Asistente
                                </div>
                                <input
                                    type="text"
                                    placeholder="Pide a tu asistente que modifique este texto..."
                                    className="flex-1 min-w-0 text-xs h-7 px-2 rounded border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && customPrompt.trim()) {
                                            handleActionClick('CUSTOM', customPrompt.trim());
                                        }
                                    }}
                                />
                                <Button 
                                    variant="default" 
                                    size="icon" 
                                    className="h-7 w-7 shrink-0"
                                    disabled={!customPrompt.trim()}
                                    onClick={() => handleActionClick('CUSTOM', customPrompt.trim())}
                                    onMouseDown={(e) => e.preventDefault()}
                                >
                                    <Send className="w-3 h-3" />
                                </Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('REWRITE')} onMouseDown={(e) => e.preventDefault()}>
                                    <Wand2 className="w-3 h-3 mr-1" /> {t('editor.actions.rewrite', 'Mejorar')}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('EXPAND')} onMouseDown={(e) => e.preventDefault()}>
                                    <BookOpen className="w-3 h-3 mr-1" /> {t('editor.actions.expand', 'Desarrollar')}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('SUMMARIZE')} onMouseDown={(e) => e.preventDefault()}>
                                    <Minimize2 className="w-3 h-3 mr-1" /> {t('editor.actions.summarize', 'Resumir')}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('BULLET_POINTS')} onMouseDown={(e) => e.preventDefault()}>
                                    <List className="w-3 h-3 mr-1" /> {t('editor.actions.bullets', 'Bullets')}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('QUOTE_SEARCH')} onMouseDown={(e) => e.preventDefault()}>
                                    <Quote className="w-3 h-3 mr-1" /> {t('editor.actions.quote', 'Citar')}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('MAKE_ACADEMIC')} onMouseDown={(e) => e.preventDefault()}>
                                    <GraduationCap className="w-3 h-3 mr-1" /> {t('editor.actions.academic', 'Académico')}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('MAKE_PASTORAL')} onMouseDown={(e) => e.preventDefault()}>
                                    <Heart className="w-3 h-3 mr-1" /> {t('editor.actions.pastoral', 'Pastoral')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
