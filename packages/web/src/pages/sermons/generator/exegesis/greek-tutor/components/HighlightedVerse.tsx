import React from 'react';
import { Card } from '@/components/ui/card';

export interface HighlightedVerseProps {
    verseText: string;
    highlightedWord: string;
    reference: string;
}

/**
 * Component for displaying Bible verses with specific Greek words highlighted.
 * Following Single Responsibility - handles verse rendering with word emphasis.
 */
export const HighlightedVerse: React.FC<HighlightedVerseProps> = ({
    verseText,
    highlightedWord,
    reference
}) => {
    // Simple string replacement to highlight the word
    // In a more complex implementation, this could use regex for better matching
    const renderHighlightedText = () => {
        if (!highlightedWord || !verseText) {
            return <span>{verseText}</span>;
        }

        // Split by the highlighted word (case-insensitive)
        const parts = verseText.split(new RegExp(`(${highlightedWord})`, 'gi'));
        
        return (
            <span>
                {parts.map((part, idx) => {
                    // Check if this part matches the highlighted word
                    if (part.toLowerCase() === highlightedWord.toLowerCase()) {
                        return (
                            <mark 
                                key={idx}
                                className="bg-primary/20 text-primary font-bold px-1 rounded"
                            >
                                {part}
                            </mark>
                        );
                    }
                    return <span key={idx}>{part}</span>;
                })}
            </span>
        );
    };

    return (
        <Card className="p-6 bg-gradient-to-br from-muted/30 to-background border-l-4 border-l-primary">
            <div className="space-y-3">
                {/* Reference */}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">📖</span>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                        {reference}
                    </p>
                </div>
                
                {/* Verse Text */}
                <p className="text-base leading-relaxed text-foreground">
                    {renderHighlightedText()}
                </p>
            </div>
        </Card>
    );
};
