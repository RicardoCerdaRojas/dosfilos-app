import { useState } from 'react';
import { ChevronDown, ChevronUp, Heart } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizard } from './WizardContext';
import type { SermonPersonalization } from '@dosfilos/domain';

/**
 * Pastoral personalization slots for the wizard: situational context,
 * congregation, emphasis, illustrations, preacher notes. Mirrors what
 * Faculty's `SermonOutlinePreviewModal` already collects, so wizard
 * sermons can reach the same occasion-aware quality (funerals,
 * weddings, crisis preaching) without forcing the user through Faculty.
 *
 * `tone` is intentionally omitted — narrative voice lives in
 * `GenerationRules.tone` (pastoral / expositivo / narrativo) already
 * surfaced in `PromptSettings`. Personalization.tone is Faculty's
 * occasion-posture vocabulary (doxological / confrontational / …) and
 * would create a confusing second tone selector here.
 */
export function SermonPersonalizationPanel() {
    const { rules, setRules } = useWizard();
    const [isOpen, setIsOpen] = useState(false);

    const personalization = rules.personalization ?? {};
    const populatedCount = countPopulated(personalization);

    const update = <K extends keyof SermonPersonalization>(
        key: K,
        value: SermonPersonalization[K],
    ) => {
        setRules({
            ...rules,
            personalization: { ...personalization, [key]: value },
        });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card">
            <div className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Heart className="h-4 w-4 text-primary" />
                        Contexto Pastoral (Opcional)
                    </h3>
                    {!isOpen && (
                        <p className="text-sm text-muted-foreground">
                            {populatedCount === 0
                                ? 'Funeral, boda, crisis, énfasis, anécdotas… cuanto más le digas, más a la medida queda el sermón.'
                                : `${populatedCount} ${populatedCount === 1 ? 'campo completado' : 'campos completados'}`}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!isOpen && populatedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            Activo
                        </Badge>
                    )}
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>

            <CollapsibleContent className="px-4 pb-4 space-y-4">
                <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    Estos campos se inyectan al prompt antes de generar el borrador.
                    Faculty ya los acepta — ahora el asistente del wizard también.
                </p>

                <div className="space-y-2">
                    <Label>Contexto situacional</Label>
                    <Textarea
                        value={personalization.situationalContext ?? ''}
                        onChange={(e) => update('situationalContext', e.target.value)}
                        placeholder="Ej: Será predicado en un culto de funeral, o después de una crisis en la comunidad…"
                        className="h-20"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Congregación</Label>
                    <Textarea
                        value={personalization.congregationDescription ?? ''}
                        onChange={(e) => update('congregationDescription', e.target.value)}
                        placeholder="Ej: 80 personas, reformados, nivel teológico medio-alto"
                        className="h-16"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Énfasis pastoral</Label>
                    <Textarea
                        value={personalization.pastoralEmphasis ?? ''}
                        onChange={(e) => update('pastoralEmphasis', e.target.value)}
                        placeholder="¿Qué quieres que la congregación sienta, entienda o haga al terminar el sermón?"
                        className="h-20"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Ilustraciones del predicador</Label>
                    <Textarea
                        value={personalization.illustrations ?? ''}
                        onChange={(e) => update('illustrations', e.target.value)}
                        placeholder="Anécdotas personales, historias de la congregación, o testimonios que quieras incluir…"
                        className="h-24"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Notas del predicador</Label>
                    <Textarea
                        value={personalization.preacherNotes ?? ''}
                        onChange={(e) => update('preacherNotes', e.target.value)}
                        placeholder="Ideas sueltas, argumentos que quieras desarrollar, énfasis particulares…"
                        className="h-24"
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function countPopulated(p: SermonPersonalization): number {
    let n = 0;
    if (p.situationalContext?.trim()) n++;
    if (p.congregationDescription?.trim()) n++;
    if (p.pastoralEmphasis?.trim()) n++;
    if (p.illustrations?.trim()) n++;
    if (p.preacherNotes?.trim()) n++;
    return n;
}
