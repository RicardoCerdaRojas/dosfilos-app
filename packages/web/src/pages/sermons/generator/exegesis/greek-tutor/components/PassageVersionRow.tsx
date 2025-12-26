import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { PassageWord } from '@dosfilos/domain';
import { cn } from '@/lib/utils';

interface PassageVersionRowProps {
    version: 'rv60' | 'greek' | 'transliteration';
    text: string;
    words?: PassageWord[];
    isVisible: boolean;
    onToggle: () => void;
    onWordClick?: (word: PassageWord) => void;
    highlightedWordId?: string;
}

const VERSION_LABELS = {
    rv60: 'RV60 (Español)',
    greek: 'Griego Original',
    transliteration: 'Transliteración'
};

/**
 * Individual row for displaying one version of the passage
 * Includes toggle switch and word selection for Greek version
 */
export const PassageVersionRow: React.FC<PassageVersionRowProps> = ({
    version,
    text,
    words,
    isVisible,
    onToggle,
    onWordClick,
    highlightedWordId
}) => {
    return (
        <Card className={cn(!isVisible && 'opacity-60')}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor={`toggle-${version}`} className="text-sm font-semibold cursor-pointer">
                        {VERSION_LABELS[version]}
                    </Label>
                    <Switch
                        id={`toggle-${version}`}
                        checked={isVisible}
                        onCheckedChange={onToggle}
                    />
                </div>
            </CardHeader>

            {isVisible && (
                <CardContent>
                    {/* Greek version with selectable words */}
                    {version === 'greek' && words && onWordClick ? (
                        <TooltipProvider delayDuration={200}>
                            <div className="flex flex-wrap gap-2">
                                {words.map((word) => (
                                    <Tooltip key={word.id}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => !word.isInUnits && onWordClick(word)}
                                                disabled={word.isInUnits}
                                                className={cn(
                                                    'font-greek text-lg transition-colors rounded px-1 py-0.5',
                                                    word.isInUnits && 'opacity-50 cursor-not-allowed bg-green-100 dark:bg-green-900/30',
                                                    !word.isInUnits && 'hover:bg-primary/10 cursor-pointer',
                                                    highlightedWordId === word.id && 'bg-primary/20 ring-2 ring-primary'
                                                )}
                                            >
                                                {word.greek}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent 
                                            side="top" 
                                            className="bg-popover border-border shadow-lg p-3 max-w-xs"
                                        >
                                            <div className="space-y-2">
                                                {/* Greek Word - Large and prominent */}
                                                <div className="pb-2 border-b border-border">
                                                    <p className="font-greek text-xl font-bold text-popover-foreground">
                                                        {word.greek}
                                                    </p>
                                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                                        {word.transliteration}
                                                    </p>
                                                </div>
                                                
                                                {/* Translation */}
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">
                                                        RV60
                                                    </p>
                                                    <p className="text-sm text-popover-foreground">
                                                        {word.spanish}
                                                    </p>
                                                </div>
                                                
                                                {/* Lemma (if available) */}
                                                {word.lemma && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">
                                                            Lema
                                                        </p>
                                                        <p className="text-sm font-mono text-popover-foreground">
                                                            {word.lemma}
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {/* Status Badge */}
                                                <div className="pt-2 border-t border-border">
                                                    {word.isInUnits ? (
                                                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
                                                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            <p className="text-xs font-medium">Ya en tus unidades</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-primary">
                                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                                            </svg>
                                                            <p className="text-xs font-medium">Click para estudiar</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </TooltipProvider>
                    ) : (
                        /* RV60 and Transliteration - plain text */
                        <p className={cn(
                            'text-base leading-relaxed',
                            version === 'transliteration' && 'font-mono text-muted-foreground'
                        )}>
                            {text}
                        </p>
                    )}
                </CardContent>
            )}
        </Card>
    );
};
