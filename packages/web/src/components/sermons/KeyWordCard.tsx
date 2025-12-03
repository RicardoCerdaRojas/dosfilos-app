import { KeyWord } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';

interface KeyWordCardProps {
    keyWord: KeyWord;
}

export function KeyWordCard({ keyWord }: KeyWordCardProps) {
    return (
        <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="space-y-3">
                {/* Original + Transliteration */}
                <div>
                    <div className="text-lg font-semibold text-primary">{keyWord.original}</div>
                    <div className="text-sm text-muted-foreground italic">({keyWord.transliteration})</div>
                </div>

                {/* Morphology - Now with better wrapping */}
                <div className="bg-secondary/50 rounded-md px-3 py-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Morfología:</div>
                    <div className="text-xs leading-relaxed break-words">
                        {keyWord.morphology}
                    </div>
                </div>

                {/* Syntactic Function */}
                <div>
                    <span className="text-xs font-medium text-muted-foreground">Función: </span>
                    <span className="text-xs leading-relaxed">{keyWord.syntacticFunction}</span>
                </div>

                {/* Significance */}
                <p className="text-sm leading-relaxed pt-2 border-t text-foreground/90">
                    {keyWord.significance}
                </p>
            </div>
        </Card>
    );
}
