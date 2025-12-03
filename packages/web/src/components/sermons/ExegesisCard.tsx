import { ExegeticalStudy } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { KeyWordCard } from '@/components/sermons/KeyWordCard';
import { InsightCard } from '@/components/sermons/InsightCard';
import { BookOpen, MapPin, Users } from 'lucide-react';

interface ExegesisCardProps {
    exegesis: ExegeticalStudy;
}

export function ExegesisCard({ exegesis }: ExegesisCardProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Proposición Exegética - Destacada */}
            <Card className="p-6 border-primary/20 bg-primary/5">
                <h3 className="text-sm font-medium text-primary mb-2">Proposición Exegética</h3>
                <p className="text-lg font-semibold leading-relaxed">{exegesis.exegeticalProposition}</p>
            </Card>

            {/* Contexto */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Contexto
                </h3>
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Histórico-Cultural
                        </h4>
                        <p className="text-sm leading-relaxed">{exegesis.context.historical}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Literario
                        </h4>
                        <p className="text-sm leading-relaxed">{exegesis.context.literary}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Audiencia Original
                        </h4>
                        <p className="text-sm leading-relaxed">{exegesis.context.audience}</p>
                    </div>
                </div>
            </Card>

            {/* Palabras Clave */}
            {exegesis.keyWords && exegesis.keyWords.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">Palabras Clave</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {exegesis.keyWords.map((word, index) => (
                            <KeyWordCard key={index} keyWord={word} />
                        ))}
                    </div>
                </div>
            )}

            {/* Consideraciones Pastorales */}
            {exegesis.pastoralInsights && exegesis.pastoralInsights.length > 0 && (
                <InsightCard insights={exegesis.pastoralInsights} />
            )}
        </div>
    );
}
