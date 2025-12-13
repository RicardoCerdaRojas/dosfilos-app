import { useState } from 'react';
import { RAGSource } from '@dosfilos/domain';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface RAGSourcesDisplayProps {
    sources?: RAGSource[];
    className?: string;
}

export function RAGSourcesDisplay({ sources, className }: RAGSourcesDisplayProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!sources || sources.length === 0) {
        return null;
    }

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={`border rounded-lg border-blue-200 bg-blue-50/50 ${className || ''}`}
        >
            <div className="flex items-center justify-between px-4 py-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-blue-700">
                    <BookOpen className="h-4 w-4" />
                    Fuentes de Biblioteca Utilizadas ({sources.length})
                </h4>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-700">
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 space-y-2">
                    {sources.map((source, index) => (
                        <div 
                            key={index}
                            className="text-sm bg-white rounded-lg p-2 border border-blue-100"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                        {source.title}
                                        {source.page && (
                                            <span className="text-gray-500 font-normal"> (p. {source.page})</span>
                                        )}
                                    </p>
                                    {source.author && (
                                        <p className="text-xs text-gray-500">por {source.author}</p>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 italic">
                                → {source.usedFor}
                            </p>
                        </div>
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
