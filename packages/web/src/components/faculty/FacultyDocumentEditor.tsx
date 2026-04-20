import { useState, useEffect, useRef } from 'react';
import { RichSermonEditor } from '../ui/RichSermonEditor';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { Wand2, Sparkles, Quote, BookOpen, GraduationCap, Heart, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MicroActionType } from '@dosfilos/application';

interface FacultyDocumentEditorProps {
    markdown: string;
    onChange: (markdown: string) => void;
    onMicroAction: (actionType: MicroActionType, selectedText: string, context: string) => Promise<string>;
    isProcessing?: boolean;
}

export function FacultyDocumentEditor({ markdown, onChange, onMicroAction, isProcessing }: FacultyDocumentEditorProps) {
    const { t } = useTranslation(['faculty', 'common']);
    const editorRef = useRef<MDXEditorMethods>(null);
    const [selection, setSelection] = useState<{ text: string; rect: DOMRect | null }>({ text: '', rect: null });
    const containerRef = useRef<HTMLDivElement>(null);

    // Listen to selection changes to position the bubble menu
    useEffect(() => {
        const handleSelectionChange = () => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed && containerRef.current?.contains(sel.anchorNode)) {
                const text = sel.toString().trim();
                if (text.length > 0) {
                    const range = sel.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setSelection({ text, rect });
                    return;
                }
            }
            // Clear selection if empty or outside
            setSelection({ text: '', rect: null });
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const handleActionClick = async (actionType: MicroActionType) => {
        if (!selection.text) return;

        // Context is simply the whole markdown for now, or could be extracted around the selection
        const context = markdown;

        try {
            const newText = await onMicroAction(actionType, selection.text, context);
            
            // Replace text in the editor
            // Since MDXEditor doesn't expose a simple "replaceSelection" yet, we might have to do it via markdown replacement
            // This is a naive replacement. For a more robust approach, we could use the Lexical instance if accessible,
            // or just replace the first occurrence of the selected text in the markdown.
            const updatedMarkdown = markdown.replace(selection.text, newText);
            onChange(updatedMarkdown);
            
            // Clear selection
            setSelection({ text: '', rect: null });
            window.getSelection()?.removeAllRanges();
            
        } catch (error) {
            console.error('Failed to process micro action', error);
        }
    };

    return (
        <div ref={containerRef} className="relative h-full w-full flex flex-col bg-background rounded-lg border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Wand2 className="w-4 h-4" />
                    {t('editor.title', 'Editor de Co-autoría')}
                </div>
                {isProcessing && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('editor.processing', 'Procesando con IA...')}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                <RichSermonEditor
                    ref={editorRef}
                    markdown={markdown}
                    onChange={onChange}
                    className={cn("h-full", isProcessing && "opacity-70 pointer-events-none transition-opacity")}
                />
            </div>

            {/* AI Bubble Menu */}
            {selection.rect && selection.text && !isProcessing && (
                <div
                    className="fixed z-50 flex items-center gap-1 p-1 bg-background border shadow-lg rounded-md animate-in fade-in zoom-in-95"
                    style={{
                        top: selection.rect.top - 48,
                        left: selection.rect.left + (selection.rect.width / 2),
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="px-2 text-xs font-semibold text-primary/70 flex items-center gap-1 border-r mr-1">
                        <Sparkles className="w-3 h-3" />
                        IA
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('REWRITE')}>
                        <Wand2 className="w-3 h-3 mr-1" /> {t('editor.actions.rewrite', 'Mejorar')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('EXPAND')}>
                        <BookOpen className="w-3 h-3 mr-1" /> {t('editor.actions.expand', 'Desarrollar')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('QUOTE_SEARCH')}>
                        <Quote className="w-3 h-3 mr-1" /> {t('editor.actions.quote', 'Citar')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('MAKE_ACADEMIC')}>
                        <GraduationCap className="w-3 h-3 mr-1" /> {t('editor.actions.academic', 'Académico')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleActionClick('MAKE_PASTORAL')}>
                        <Heart className="w-3 h-3 mr-1" /> {t('editor.actions.pastoral', 'Pastoral')}
                    </Button>
                </div>
            )}
        </div>
    );
}
