import { SourceReference } from '@dosfilos/application';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ChatSourcesDisplayProps {
    sources: SourceReference[];
}

export function ChatSourcesDisplay({ sources }: ChatSourcesDisplayProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!sources || sources.length === 0) {
        return null;
    }

    // Deduplicate sources by title+page
    const uniqueSources = sources.filter((source, index, self) => 
        index === self.findIndex(s => 
            s.title === source.title && s.page === source.page
        )
    );

    return (
        <div className="mt-2 border-t pt-2 border-blue-200">
            <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <BookOpen className="h-3 w-3 mr-1" />
                {uniqueSources.length} fuente(s) de biblioteca
                {isExpanded ? (
                    <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                    <ChevronDown className="h-3 w-3 ml-1" />
                )}
            </Button>
            
            {isExpanded && (
                <div className="mt-1 space-y-1.5 pl-2">
                    {uniqueSources.map((source, index) => (
                        <div 
                            key={index}
                            className="text-xs bg-blue-50 rounded p-1.5 border border-blue-100"
                        >
                            <div className="font-medium text-gray-800">
                                {source.title}
                                {source.page && (
                                    <span className="text-gray-500 font-normal"> (p. {source.page})</span>
                                )}
                            </div>
                            {source.author && (
                                <div className="text-gray-500">por {source.author}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
