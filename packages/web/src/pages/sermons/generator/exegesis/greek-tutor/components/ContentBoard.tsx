import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface BoardContent {
    type: 'morphology' | 'recognition' | 'context' | 'significance' | 'chat';
    title: string;
    content: string;
    timestamp: Date;
}

export interface ContentBoardProps {
    content: BoardContent | null;
    isLoading: boolean;
    onCopy?: () => void;
    onExport?: () => void;
}

/**
 * Content board - main display area showing tutor responses.
 * Follows Single Responsibility - renders markdown content with utilities.
 */
export const ContentBoard: React.FC<ContentBoardProps> = ({
    content,
    isLoading,
    onCopy,
    onExport
}) => {
    // Empty state
    if (!content && !isLoading) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-gradient-to-br from-background via-muted/20 to-background">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                        <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Pizarra del Tutor</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Selecciona una acción del panel lateral o escribe una pregunta para comenzar.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                        Consultando con el tutor...
                    </p>
                </div>
            </div>
        );
    }

    // Content display
    if (!content) return null;

    return (
        <div className="h-full flex flex-col">
            {/* Header with title and actions */}
            <div className="px-6 py-4 border-b bg-background/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold">{content.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {content.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {onCopy && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onCopy}
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                        </Button>
                    )}
                    {onExport && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExport}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                    )}
                </div>
            </div>

            {/* Scrollable content area */}
            <ScrollArea className="flex-1">
                <div className="p-2 max-w-4xl mx-auto">
                    <Card className="p-6 md:p-8 shadow-sm">
                        <div className="prose prose-slate dark:prose-invert max-w-none 
                                      prose-headings:font-bold prose-headings:tracking-tight
                                      prose-p:leading-relaxed prose-li:leading-relaxed
                                      prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                      prose-strong:text-foreground prose-strong:font-semibold
                                      prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content.content}
                            </ReactMarkdown>
                        </div>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
};
