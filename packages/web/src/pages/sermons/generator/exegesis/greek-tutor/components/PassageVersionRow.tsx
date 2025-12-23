import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
                        <div className="flex flex-wrap gap-2">
                            {words.map((word) => (
                                <button
                                    key={word.id}
                                    onClick={() => !word.isInUnits && onWordClick(word)}
                                    disabled={word.isInUnits}
                                    className={cn(
                                        'font-greek text-lg transition-colors rounded px-1 py-0.5',
                                        word.isInUnits && 'opacity-50 cursor-not-allowed bg-green-100 dark:bg-green-900/30',
                                        !word.isInUnits && 'hover:bg-primary/10 cursor-pointer',
                                        highlightedWordId === word.id && 'bg-primary/20 ring-2 ring-primary'
                                    )}
                                    title={word.isInUnits ? 'Ya está en las unidades de estudio' : `Click para estudiar: ${word.transliteration}`}
                                >
                                    {word.greek}
                                </button>
                            ))}
                        </div>
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
